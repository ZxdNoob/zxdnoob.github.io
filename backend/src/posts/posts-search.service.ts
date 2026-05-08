/**
 * 文章全文检索服务（RAG 数据源）。
 *
 * ## 为什么自己实现 FTS5 + 轻量混合检索
 * - 纯中文站点常常因为「无空格分词」让默认 LIKE 搜索效果一般
 * - SQLite FTS5 自带 unicode61 / trigram tokenizer，覆盖英文 + 中文短语命中
 * - 在此之上叠一层 **char-3gram Jaccard 相似度** 作为「语义近邻」，与 FTS5 用 RRF 融合：
 *   * 不需要任何 embedding 服务、不需要 native 模块、零额外部署成本
 *   * 召回率显著优于单跑 BM25（FTS5 短语命中失败时由 Jaccard 兜底）
 *   * 内存占用可控：每篇文章约 1k-5k 个 trigrams，全库 ~10-50MB（个人博客规模毫无压力）
 *
 * ## 表结构
 * - `posts_fts(slug, title, description, content, tags)`：FTS5 虚拟表
 * - 通过 trigger 与 `posts` 表同步（INSERT / UPDATE / DELETE）
 *
 * ## 公开能力
 * - `searchSummaries(q, limit)`：内部走 hybrid（FTS5 ∪ Jaccard，RRF 融合）
 * - `findRelevantPassages(q, limit)`：返回正文片段（snippet）+ slug + 标题；
 *    若 FTS5 无命中，则用 Jaccard 选出 top 文章再做 snippet 兜底
 * - `findRelated(slug, limit)`：相关阅读 — Jaccard + tag/series 加权评分
 * - `pickDailyHighlight(date)`：今日精选 — 基于日期 + slug 的确定性 hash 选一篇
 *
 * ## 安全
 * - 所有用户查询都通过 FTS5 MATCH 的参数化绑定 + 转义处理，避免 FTS5 语法注入
 */

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { PostEntity } from '../database/post.entity';
import { readingMinutesFromMarkdown } from './reading-minutes';
import type {
  PostSearchHit,
  PostSearchPassage,
  PostSummary,
} from './types/post.types';

interface FtsRow {
  slug: string;
  title: string;
  date: string;
  description: string;
  series: string | null;
  content: string;
  tags: string | null;
  draft: number | boolean;
  rank: number;
}

interface PassageRow {
  slug: string;
  title: string;
  date: string;
  description: string;
  snippet: string;
  rank: number;
}

interface PostIndexEntry {
  post: PostEntity;
  /** char-3gram + 词级 bigram 集合 */
  grams: Set<string>;
}

/**
 * TypeORM DataSource.query 的返回类型默认是 `Promise<any>`，
 * 这里给它一个泛型化包装，避免触发 ESLint 的 no-unsafe-* 规则。
 */
async function rawQuery<T>(
  dataSource: DataSource,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const rows: unknown = await dataSource.query(sql, params);
  return Array.isArray(rows) ? (rows as T[]) : [];
}

@Injectable()
export class PostsSearchService implements OnApplicationBootstrap {
  /** trigram 索引（slug → grams Set + post），用于混合检索与相关阅读 */
  private gramIndex: PostIndexEntry[] = [];
  /** 索引最近一次构建时间；超过 5 分钟自动重建（个人博客写入低频，足够了） */
  private gramIndexBuiltAt = 0;
  /** 防止并发重建 */
  private gramRebuildInflight: Promise<void> | null = null;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 在 `onApplicationBootstrap` 阶段（晚于全部 `onModuleInit`，含 SeedService）建索引，
   * 这样首次启动种子数据写完后能被自动回填。失败不影响主接口可用。
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.ensureSchema();
      await this.rebuildIndex();
      await this.rebuildGramIndex();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[posts-search] 索引初始化失败：${msg}`);
    }
  }

  private async ensureSchema(): Promise<void> {
    /**
     * FTS5 默认 unicode61 分词对中文不友好（按字符切），改用 trigram 让中文短语也能召回。
     * 老版 SQLite 不带 trigram tokenizer 时，回退到 unicode61，保证英文/拼音/标签依然能搜。
     * 详见 https://www.sqlite.org/fts5.html#tokenizers
     */
    const buildTable = async (tokenizer: string) => {
      await this.dataSource.query(`
        CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
          slug UNINDEXED,
          title,
          description,
          content,
          tags,
          tokenize = '${tokenizer}'
        );
      `);
    };
    try {
      await buildTable('trigram');
    } catch {
      await buildTable('unicode61 remove_diacritics 1');
    }

    /** 与 posts 表保持同步：插入/更新/删除时自动跟随 */
    await this.dataSource.query(`
      CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
        INSERT INTO posts_fts(slug, title, description, content, tags)
        VALUES (new.slug, new.title, new.description, new.content, COALESCE(new.tags, ''));
      END;
    `);
    await this.dataSource.query(`
      CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
        DELETE FROM posts_fts WHERE slug = old.slug;
      END;
    `);
    await this.dataSource.query(`
      CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
        DELETE FROM posts_fts WHERE slug = old.slug;
        INSERT INTO posts_fts(slug, title, description, content, tags)
        VALUES (new.slug, new.title, new.description, new.content, COALESCE(new.tags, ''));
      END;
    `);
  }

  /** 全量重建：保证种子文章/历史数据也进索引；幂等。 */
  private async rebuildIndex(): Promise<void> {
    await this.dataSource.query(`DELETE FROM posts_fts;`);
    await this.dataSource.query(`
      INSERT INTO posts_fts(slug, title, description, content, tags)
      SELECT slug, title, description, content, COALESCE(tags, '')
      FROM posts;
    `);
  }

  /**
   * 把任意文本转成 char-3gram + 词级 bigram 的集合。
   * - 中文：char-3gram（连续 3 个字符），覆盖「次世代」「数据库」等短语
   * - 英文：先做 char-3gram，再补一层 word-bigram（`react_hooks` / `next_app`），
   *   这样长英文术语 (`server-components`) 不会被切成无意义碎片
   * - tags / 标题分别加更高权重 → 在拼接源串里写多次
   */
  private toGrams(text: string): Set<string> {
    const cleaned = text
      .toLowerCase()
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const set = new Set<string>();
    if (!cleaned) return set;
    const len = cleaned.length;
    const max = Math.min(
      len,
      24_000,
    ); /** 避免极长正文吃内存：取前 24k 字符已够分类 */
    for (let i = 0; i < max - 2; i += 1) {
      const c0 = cleaned.charCodeAt(i);
      /** 跳过空白起头的 trigram，减少无意义噪声 */
      if (c0 === 32) continue;
      set.add(cleaned.slice(i, i + 3));
    }
    /** word bigram：英文 / 数字术语联合 */
    const words = cleaned.split(/[^a-z0-9_+#-]+/).filter((w) => w.length >= 2);
    for (let i = 0; i < words.length - 1; i += 1) {
      set.add(`${words[i]}_${words[i + 1]}`);
    }
    return set;
  }

  /** Jaccard 相似度 = |A ∩ B| / |A ∪ B|；O(min(|A|,|B|)) */
  private jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    const [small, big] = a.size <= b.size ? [a, b] : [b, a];
    let inter = 0;
    for (const x of small) if (big.has(x)) inter += 1;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
  }

  /**
   * 重建 trigram 索引；线程安全（同一时刻只允许一个重建任务）。
   * 用 `PostEntity` 直接读全库 — 个人博客规模数十～数百篇，全表扫成本极低。
   */
  private async rebuildGramIndex(): Promise<void> {
    if (this.gramRebuildInflight) return this.gramRebuildInflight;
    this.gramRebuildInflight = (async () => {
      const repo = this.dataSource.getRepository(PostEntity);
      const rows = await repo.find({ where: { draft: false } });
      const next: PostIndexEntry[] = [];
      for (const post of rows) {
        /** 标题与描述写多次：等效于「重要度加权」，提升 query 命中标题时的总相似度 */
        const source = [
          post.title,
          post.title,
          post.title,
          post.description,
          post.description,
          (post.tags ?? []).join(' '),
          post.series ?? '',
          post.content,
        ].join('\n');
        next.push({ post, grams: this.toGrams(source) });
      }
      this.gramIndex = next;
      this.gramIndexBuiltAt = Date.now();
    })();
    try {
      await this.gramRebuildInflight;
    } finally {
      this.gramRebuildInflight = null;
    }
  }

  /** 确保索引存在且新鲜；超过 5 分钟自动 lazy 重建 */
  private async ensureGramIndex(): Promise<PostIndexEntry[]> {
    const FIVE_MIN = 5 * 60 * 1000;
    if (
      this.gramIndex.length === 0 ||
      Date.now() - this.gramIndexBuiltAt > FIVE_MIN
    ) {
      await this.rebuildGramIndex();
    }
    return this.gramIndex;
  }

  /**
   * FTS5 查询语法过滤：
   * - 去掉 FTS 特殊字符（双引号 / 星号 / 加号 / 减号 / 圆括号），统一用空格切分
   * - 每个 token 用双引号包裹做 phrase 匹配，token 之间 `OR`，再 + 整体 phrase OR 提升相关性
   */
  private buildMatchExpr(raw: string): string | null {
    const cleaned = raw
      .replace(/[\u201c\u201d"]/g, ' ')
      .replace(/[*+\-(){}[\]:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return null;
    const tokens = cleaned
      .split(' ')
      .filter((t) => t.length > 0)
      .slice(0, 8);
    if (tokens.length === 0) return null;

    const phraseAll = `"${cleaned.replace(/"/g, ' ')}"`;
    const orPhrases = tokens
      .map((t) => `"${t.replace(/"/g, ' ')}"`)
      .join(' OR ');
    return tokens.length === 1 ? phraseAll : `${phraseAll} OR ${orPhrases}`;
  }

  /** FTS5 BM25 加权：title 比 content 权重高，让标题命中更靠前 */
  private readonly BM25_WEIGHTS = 'bm25(posts_fts, 0.0, 12.0, 6.0, 3.0, 4.0)';

  /** 内部：仅做 FTS5 BM25 检索（hybrid 的一路输入） */
  private async ftsSearch(
    query: string,
    limit: number,
  ): Promise<PostSearchHit[]> {
    const match = this.buildMatchExpr(query);
    if (!match) return [];
    const rows = await rawQuery<FtsRow>(
      this.dataSource,
      `
        SELECT p.slug, p.title, p.date, p.description, p.series, p.tags, p.content, p.draft,
               ${this.BM25_WEIGHTS} AS rank
        FROM posts_fts f
        JOIN posts p ON p.slug = f.slug
        WHERE posts_fts MATCH ? AND p.draft = 0
        ORDER BY rank
        LIMIT ?
      `,
      [match, limit],
    );
    return rows.map((row) => this.toHit(row));
  }

  /** 内部：仅做 char-3gram Jaccard 检索（hybrid 的另一路） */
  private async jaccardSearch(
    query: string,
    limit: number,
    minScore = 0.012,
  ): Promise<{ post: PostEntity; score: number }[]> {
    const queryGrams = this.toGrams(query);
    if (queryGrams.size === 0) return [];
    const index = await this.ensureGramIndex();
    const ranked = index
      .map((entry) => ({
        post: entry.post,
        score: this.jaccard(queryGrams, entry.grams),
      }))
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return ranked;
  }

  /**
   * Hybrid 检索：FTS5 与 Jaccard 用 RRF (Reciprocal Rank Fusion) 合并。
   * - RRF 鲁棒性强：不需要把两种得分归一化到同尺度
   * - k = 60 是文献常用值（来自 Cormack et al., 2009）
   * - 每路各取 top 24，融合后取前 limit
   */
  private async hybridSearch(
    query: string,
    limit: number,
  ): Promise<PostSearchHit[]> {
    const safeLimit = Math.min(20, Math.max(1, Math.round(limit)));
    const POOL = 24;
    const k = 60;

    const [ftsHits, jaccardHits] = await Promise.all([
      this.ftsSearch(query, POOL),
      this.jaccardSearch(query, POOL),
    ]);

    if (ftsHits.length === 0 && jaccardHits.length === 0) return [];

    /** slug → { rrfScore, hit, jaccardScore? } */
    const fused = new Map<
      string,
      { hit: PostSearchHit; rrf: number; jaccard?: number }
    >();
    ftsHits.forEach((hit, i) => {
      fused.set(hit.slug, { hit, rrf: 1 / (k + i) });
    });
    jaccardHits.forEach((entry, i) => {
      const slug = entry.post.slug;
      const existing = fused.get(slug);
      if (existing) {
        existing.rrf += 1 / (k + i);
        existing.jaccard = entry.score;
      } else {
        const hit = this.entityToHit(entry.post, entry.score);
        fused.set(slug, { hit, rrf: 1 / (k + i), jaccard: entry.score });
      }
    });

    const sorted = [...fused.values()].sort((a, b) => b.rrf - a.rrf);
    return sorted.slice(0, safeLimit).map(({ hit, rrf, jaccard }) => ({
      ...hit,
      score: Number(((rrf + (jaccard ?? 0)) * 100).toFixed(3)),
    }));
  }

  /** 公开：按 query 检索文章摘要列表（hybrid） */
  async searchSummaries(query: string, limit = 8): Promise<PostSearchHit[]> {
    return this.hybridSearch(query, limit);
  }

  /**
   * 公开：返回最相关的若干段正文 snippet（带 <mark> 高亮可被前端解析或剥离）。
   *
   * 流程：
   * 1. 先尝试 FTS5 snippet 路径（精度最高）
   * 2. 若返回空（query 没法被 FTS5 切出 phrase），则用 Jaccard 选 top 文章 →
   *    本地手工抽 snippet（在 description / 标题附近截取一段，保证有溯源链接）
   *
   * Agent RAG 流程：拿到 passages → 拼成 context → 与用户 query 一起喂给 LLM。
   */
  async findRelevantPassages(
    query: string,
    limit = 6,
  ): Promise<PostSearchPassage[]> {
    const safeLimit = Math.min(12, Math.max(1, Math.round(limit)));
    const ftsPassages = await this.ftsRelevantPassages(query, safeLimit);
    if (ftsPassages.length > 0) return ftsPassages;

    /** Jaccard 兜底：取 top 4 文章，每篇截一段「最像 query 的窗口」作为 snippet */
    const jaccardHits = await this.jaccardSearch(query, Math.min(safeLimit, 4));
    return jaccardHits.map(({ post }) => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      description: post.description,
      snippet: this.makeWindowSnippet(post.content, query),
      url: `/blog/${post.slug}`,
    }));
  }

  private async ftsRelevantPassages(
    query: string,
    limit: number,
  ): Promise<PostSearchPassage[]> {
    const match = this.buildMatchExpr(query);
    if (!match) return [];
    const rows = await rawQuery<PassageRow>(
      this.dataSource,
      `
        SELECT p.slug, p.title, p.date, p.description,
               snippet(posts_fts, 3, '<mark>', '</mark>', '…', 60) AS snippet,
               ${this.BM25_WEIGHTS} AS rank
        FROM posts_fts f
        JOIN posts p ON p.slug = f.slug
        WHERE posts_fts MATCH ? AND p.draft = 0
        ORDER BY rank
        LIMIT ?
      `,
      [match, limit],
    );
    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      date: row.date,
      description: row.description,
      snippet: row.snippet ?? '',
      url: `/blog/${row.slug}`,
    }));
  }

  /** 在正文里找一个最像 query 的窗口（用于 Jaccard 兜底场景） */
  private makeWindowSnippet(
    content: string,
    query: string,
    windowSize = 200,
  ): string {
    const text = content.replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ');
    const lcText = text.toLowerCase();
    const lcQuery = query.toLowerCase().trim();
    if (!lcQuery) return text.slice(0, windowSize);

    /** 优先精确包含 */
    const exactIdx = lcText.indexOf(lcQuery);
    if (exactIdx >= 0) {
      const start = Math.max(0, exactIdx - 60);
      const end = Math.min(text.length, exactIdx + lcQuery.length + 140);
      const slice = text.slice(start, end);
      return `${start > 0 ? '…' : ''}${slice}${end < text.length ? '…' : ''}`;
    }

    /** 否则按字符 trigram 找最佳窗口 */
    const queryGrams = this.toGrams(query);
    if (queryGrams.size === 0) return text.slice(0, windowSize);

    let bestStart = 0;
    let bestHits = -1;
    const step = 60;
    for (let s = 0; s < text.length; s += step) {
      const win = text.slice(s, s + windowSize);
      let hits = 0;
      for (const g of queryGrams) {
        if (win.includes(g)) hits += 1;
      }
      if (hits > bestHits) {
        bestHits = hits;
        bestStart = s;
      }
    }
    const slice = text.slice(bestStart, bestStart + windowSize);
    return `${bestStart > 0 ? '…' : ''}${slice}${
      bestStart + windowSize < text.length ? '…' : ''
    }`;
  }

  /**
   * 公开：相关阅读 — 给定一篇文章，返回 N 条最相关的其它文章。
   * 评分 = Jaccard × 100 + 共享 tag × 8 + 同 series × 12 + 时间衰减微调。
   */
  async findRelated(slug: string, limit = 4): Promise<PostSearchHit[]> {
    const safeLimit = Math.min(10, Math.max(1, Math.round(limit)));
    const repo = this.dataSource.getRepository(PostEntity);
    const target = await repo.findOne({ where: { slug } });
    if (!target || target.draft) return [];

    const targetGrams = this.toGrams(
      [
        target.title,
        target.title,
        target.title,
        target.description,
        target.description,
        (target.tags ?? []).join(' '),
        target.series ?? '',
        target.content,
      ].join('\n'),
    );
    const targetTags = new Set(target.tags ?? []);
    const index = await this.ensureGramIndex();
    const targetTime = Date.parse(target.date) || Date.now();

    const ranked = index
      .filter((e) => e.post.slug !== slug)
      .map((e) => {
        const jacc = this.jaccard(targetGrams, e.grams);
        const sharedTags = (e.post.tags ?? []).filter((t) =>
          targetTags.has(t),
        ).length;
        const sameSeries =
          target.series && e.post.series === target.series ? 1 : 0;
        /** 时间衰减：离当前文章时间越近，加分越多（最多 +3） */
        const otherTime = Date.parse(e.post.date) || targetTime;
        const dayDiff = Math.abs(targetTime - otherTime) / 86_400_000;
        const recency = Math.max(0, 3 - Math.log10(1 + dayDiff));
        const score =
          jacc * 100 + sharedTags * 8 + sameSeries * 12 + recency * 0.5;
        return { post: e.post, score, jaccard: jacc };
      })
      .filter((r) => r.score > 1.5 || r.jaccard >= 0.02)
      .sort((a, b) => b.score - a.score)
      .slice(0, safeLimit);

    return ranked.map(({ post, score }) => this.entityToHit(post, score));
  }

  /**
   * 公开：知识图谱 — 全库文章两两相似度，过滤后输出 nodes + links。
   *
   * - 节点 = 文章；分组（颜色用）按 `series ?? "未分类"`
   * - 边权 = Jaccard × 100 + 共享 tag × 6 + 同 series × 12
   * - 默认 threshold = 1.0（即 Jaccard ≈ 0.01 起步），保证可视化不至于断成孤岛
   * - 同一 (a,b) 对去重；空库返回 `{ nodes: [], links: [] }`
   */
  async buildGraph(threshold = 1.0): Promise<{
    nodes: Array<{
      slug: string;
      title: string;
      series: string;
      tags: string[];
      readingMinutes: number;
      url: string;
    }>;
    links: Array<{ source: string; target: string; weight: number }>;
  }> {
    const index = await this.ensureGramIndex();
    if (index.length === 0) return { nodes: [], links: [] };

    const nodes = index.map((e) => ({
      slug: e.post.slug,
      title: e.post.title,
      series: e.post.series ?? '未分类',
      tags: e.post.tags ?? [],
      readingMinutes: readingMinutesFromMarkdown(e.post.content),
      url: `/blog/${e.post.slug}`,
    }));

    const links: Array<{ source: string; target: string; weight: number }> = [];
    /** 上三角遍历：N 篇文章约 N*(N-1)/2 次 Jaccard，对个人博客（数十～数百篇）足够快 */
    for (let i = 0; i < index.length; i += 1) {
      for (let j = i + 1; j < index.length; j += 1) {
        const a = index[i];
        const b = index[j];
        const jacc = this.jaccard(a.grams, b.grams);
        const sharedTags = (a.post.tags ?? []).filter((t) =>
          (b.post.tags ?? []).includes(t),
        ).length;
        const sameSeries =
          a.post.series && b.post.series && a.post.series === b.post.series
            ? 1
            : 0;
        const weight = jacc * 100 + sharedTags * 6 + sameSeries * 12;
        if (weight >= threshold) {
          links.push({
            source: a.post.slug,
            target: b.post.slug,
            weight: Number(weight.toFixed(3)),
          });
        }
      }
    }

    /**
     * 让每个节点至少有一条边（避免孤岛）：
     * 对于没有任何邻居的节点，给它加一条「与最相似节点的弱连接」。
     */
    const degree = new Map<string, number>();
    for (const l of links) {
      degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
      degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    }
    const lonely = nodes.filter((n) => (degree.get(n.slug) ?? 0) === 0);
    for (const node of lonely) {
      const idx = index.findIndex((e) => e.post.slug === node.slug);
      if (idx < 0) continue;
      let best = { other: '', score: 0 };
      for (let k = 0; k < index.length; k += 1) {
        if (k === idx) continue;
        const score = this.jaccard(index[idx].grams, index[k].grams);
        if (score > best.score) {
          best = { other: index[k].post.slug, score };
        }
      }
      if (best.other && best.score > 0) {
        links.push({
          source: node.slug,
          target: best.other,
          weight: Number((best.score * 100 * 0.4).toFixed(3)),
        });
      }
    }

    return { nodes, links };
  }

  /**
   * 公开：今日精选 — 在已发布文章里，基于「日期 (YYYY-MM-DD) + 全库 slug」做确定性 hash 选一篇。
   * - 同一天访问站点拿到的是同一篇（缓存友好）
   * - 不同日期会自然滚动；篇数足够时不容易短时间内重复
   * - 完全没有持久化要求；服务重启不变（hash 是纯函数）
   */
  async pickDailyHighlight(
    date: Date = new Date(),
  ): Promise<PostSummary | null> {
    const repo = this.dataSource.getRepository(PostEntity);
    const rows = await repo.find({
      where: { draft: false },
      order: { date: 'DESC' },
    });
    if (rows.length === 0) return null;
    const ymd = formatYMD(date);
    const seed = `${ymd}|${rows.map((r) => r.slug).join(',')}`;
    const idx = stableHash(seed) % rows.length;
    const picked = rows[idx];
    return this.toSummaryFromEntity(picked);
  }

  private toSummaryFromEntity(row: PostEntity): PostSummary {
    return {
      slug: row.slug,
      title: row.title,
      date: row.date,
      description: row.description,
      series: row.series ?? undefined,
      tags: row.tags ?? undefined,
      draft: row.draft,
      readingMinutes: readingMinutesFromMarkdown(row.content),
    };
  }

  private entityToHit(row: PostEntity, score = 0): PostSearchHit {
    return {
      ...this.toSummaryFromEntity(row),
      score,
      url: `/blog/${row.slug}`,
    };
  }

  private toHit(row: FtsRow): PostSearchHit {
    /** SQLite simple-json 类型实际存的是 JSON 字符串；解析失败回退 null */
    let tags: string[] | null = null;
    if (row.tags) {
      try {
        const parsed = JSON.parse(row.tags) as unknown;
        if (Array.isArray(parsed)) {
          tags = parsed.filter((x): x is string => typeof x === 'string');
        }
      } catch {
        tags = null;
      }
    }
    const summary: PostSummary = {
      slug: row.slug,
      title: row.title,
      date: row.date,
      description: row.description,
      series: row.series ?? undefined,
      tags: tags ?? undefined,
      draft: Boolean(row.draft),
      readingMinutes: readingMinutesFromMarkdown(row.content),
    };
    return {
      ...summary,
      score: Math.max(0, -row.rank),
      url: `/blog/${row.slug}`,
    };
  }

  /**
   * 兜底：当 FTS5 完全无法用（比如不支持 trigram 的旧 SQLite），
   * 由 controller 调用此方法做 LIKE 模糊匹配。
   */
  async fallbackLikeSearch(query: string, limit = 8): Promise<PostSearchHit[]> {
    const q = query.trim();
    if (!q) return [];
    const safeLimit = Math.min(20, Math.max(1, Math.round(limit)));
    const repo = this.dataSource.getRepository(PostEntity);
    const like = `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%`;
    const rows = await repo
      .createQueryBuilder('p')
      .where('p.draft = :d', { d: false })
      .andWhere(
        '(p.title LIKE :q OR p.description LIKE :q OR p.content LIKE :q OR COALESCE(p.tags, "") LIKE :q)',
        { q: like },
      )
      .orderBy('p.date', 'DESC')
      .limit(safeLimit)
      .getMany();
    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      date: row.date,
      description: row.description,
      series: row.series ?? undefined,
      tags: row.tags ?? undefined,
      draft: row.draft,
      readingMinutes: readingMinutesFromMarkdown(row.content),
      score: 0,
      url: `/blog/${row.slug}`,
    }));
  }
}

/** YYYY-MM-DD（按本地时区，与种子文章 date 字段对齐） */
function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** djb2 风格的 32-bit 稳定 hash，用于「今日精选」做确定性挑选 */
function stableHash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 33 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
