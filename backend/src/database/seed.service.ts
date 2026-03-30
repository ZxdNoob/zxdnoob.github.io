import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostEntity } from './post.entity';

/**
 * 首次启动且表为空时写入示例数据（原 `content/posts` 示例的正文）。
 * 生产环境可通过管理接口或迁移追加数据；此处仅保证开箱即用。
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepo: Repository<PostEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.postsRepo.find({
      select: { id: true, slug: true },
    });
    const bySlug = new Map(rows.map((r) => [r.slug, r.id]));

    const toInsert: Partial<PostEntity>[] = [];
    const toUpdate: Partial<PostEntity>[] = [];

    for (const seed of SEED_POSTS) {
      const slug = seed.slug;
      if (!slug) continue;

      const id = bySlug.get(slug);
      if (!id) {
        toInsert.push(seed);
        continue;
      }

      // 对已存在的 seed 文章：只同步“元信息”，避免意外覆盖正文。
      // 目前用于调整发布时间、标题、描述、系列与标签等。
      toUpdate.push({
        id,
        slug,
        title: seed.title,
        date: seed.date,
        description: seed.description,
        series: seed.series ?? null,
        tags: seed.tags ?? null,
        draft: seed.draft ?? false,
      });
    }

    if (toInsert.length === 0 && toUpdate.length === 0) return;

    if (toInsert.length > 0) {
      await this.postsRepo.save(toInsert);
    }
    if (toUpdate.length > 0) {
      await this.postsRepo.save(toUpdate);
    }

    this.logger.log(
      `已同步初始文章：新增 ${toInsert.length} 篇，更新 ${toUpdate.length} 篇`,
    );
  }
}

const WELCOME_MD = `这是一份示例文章，用来展示 **Markdown** 与阅读样式：列表、链接与代码块都会很舒服。

## 你可以这样开始

1. 在数据库中维护文章记录（本示例由 Nest + SQLite 提供）。
2. 本地运行 \`npm run dev\`（前端）与 \`npm run start:dev\`（后端），在浏览器里预览。
3. 部署时设置 \`NEXT_PUBLIC_SITE_URL\`、\`NEXT_PUBLIC_API_URL\`（或服务端 \`API_URL\`），便于站点地图与跨域。

## 代码示例

\`\`\`ts
export const hello = "写你想写的，发你想发的。";
\`\`\`

> 阅读体验的目标很简单：字要清晰、行距要透气、暗色模式要护眼。

祝写作愉快。`;

const SEED_POSTS: Partial<PostEntity>[] = [
  {
    slug: 'welcome',
    title: '欢迎来到 ZxdNoob',
    date: '2026-03-28T22:21:20+08:00',
    description:
      '博客已用 Next.js、NestJS、SQLite 与精排版体系搭好骨架，接下来只管写好每一篇。',
    content: WELCOME_MD,
    series: null,
    tags: ['站务', 'Next.js'],
    draft: false,
  },
  {
    slug: 'tailwindcss-practical-01-setup-workflow',
    title: 'TailwindCSS 实战 01：从 0 到可交付的工程化工作流',
    date: '2026-03-29T20:10:13+08:00',
    description:
      '不讲概念堆砌：用 Tailwind v4 在真实项目里把「样式入口、暗色模式、设计 Token、组件落地」一次搭顺。',
    series: 'TailwindCSS 实战',
    tags: ['TailwindCSS', '前端工程化', '实战'],
    draft: false,
    content: `这是一套「**可直接照抄到项目里**」的 TailwindCSS 实战系列。目标不是背 API，而是让你能在真实业务里：快速出 UI、统一风格、可维护、可扩展。

> 本系列默认你已经能跑起来 Next.js 项目；你可以把例子当作一个中型 Web 应用的样式基建来做。

## 01 你到底要“搭什么”

很多 Tailwind 教程停在“装依赖 + 写 class”。真正落地通常会卡在这些地方：

- 设计 Token 没有来源：颜色/圆角/间距怎么统一？
- 暗色模式做一半：页面某些地方很亮、某些地方很暗，风格碎。
- 组件写着写着像“串串香”：class 越来越长，不敢改。
- 全站风格漂移：不同页面的人写不同的灰、不同的边框。

这一篇只做一件事：搭出一套**能持续交付**的工作流。

## 02 约定：把“设计 Token”先固定下来

你需要一套“全站共用”的 Token（颜色/背景/边框/强调色），然后 Tailwind 负责把它们变成工具类。

建议你先定 4 个最核心的 CSS 变量（足够覆盖 80% 组件）：

- \`--background\`：页面背景
- \`--surface\`：卡片/浮层背景
- \`--border\`：边框/分割线
- \`--accent\`：强调色（链接、主按钮、选中态）

### 放在哪里？

最简单的做法：放到 \`src/app/globals.css\` 的 \`:root\` 与 \`.dark\` 中。这样：

- 你无需把“浅色/深色”写成两套 Tailwind 配置
- 你可以用 \`bg-[var(--surface)]\` 这种方式直接消费 Token
- 想改主题，只改变量值就行（全站同步）

## 03 暗色模式：不要“写两套 UI”

暗色模式常见误区是：每个组件都做一遍 \`dark:\` 的细节分支，导致维护成本爆炸。

更稳妥的策略是：

- **大部分颜色由 CSS 变量决定**（浅色/深色切换只换变量）
- **只有少量确实需要分叉的细节**才用 \`dark:\`

你会发现：组件 class 会短很多，而且视觉更统一。

## 04 组件写法：先保证可读性，再追求“优雅”

实战里最推荐的 3 个规则：

1. 组件先用工具类堆出正确 UI（保证交付）
2. 出现重复的“组合样式”，再抽到组件内部的常量字符串
3. 真的复用到多处，再抽公共组件（比如 \`Button\` / \`Badge\`）

不要上来就追求“把所有 class 变短”。你会把复杂度从 CSS 转移到抽象，反而更难改。

## 05 一个可复用的页面骨架（直接抄）

\`\`\`tsx
export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <header className="border-b border-[var(--border)]/60 pb-10">
        <h1 className="font-serif text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
          标题
        </h1>
        <p className="mt-4 text-lg text-stone-600 dark:text-stone-400">
          一句话说明
        </p>
      </header>

      <section className="mt-8 space-y-4">
        {/* content */}
      </section>
    </main>
  );
}
\`\`\`

关键点：全站页面风格统一，你不会每个页面都重新“设计一次”。

## 06 本篇小结

做到下面 3 条，Tailwind 才算真正落地：

- 全站有明确的 Token（变量）并统一消费方式
- 暗色模式切换成本接近 0（改变量而不是改组件）
- 页面骨架统一，后续写页面只关注业务内容

下一篇我们开始做布局与响应式：不是背 \`sm/md/lg\`，而是把断点策略定下来，避免写成一团。`,
  },
  {
    slug: 'tailwindcss-practical-02-layout-responsive',
    title: 'TailwindCSS 实战 02：布局与响应式——把断点策略写成“团队规范”',
    date: '2026-03-29T21:00:21+08:00',
    description:
      '响应式不是到处加 sm/md/lg。用列表/详情/双栏 3 种页面模板把断点策略固化成可复用的写法。',
    series: 'TailwindCSS 实战',
    tags: ['TailwindCSS', '响应式', '实战'],
    draft: false,
    content: `这一篇只解决一个痛点：**响应式写着写着就失控**。

你可能见过这样的代码：

\`\`\`html
<div class="px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
\`\`\`

看起来很“认真”，但团队里没人愿意改它。

## 01 先定一个“断点策略”

实战里最常用的策略是：只使用少量断点，并让每个断点“有语义”。

我推荐你把断点当作 4 种设备语义：

- base：手机（默认）
- sm：大屏手机/小平板（布局开始松一点）
- md：平板/小笔记本（开始出现多栏）
- lg：桌面（阅读宽度与留白达到最终形态）

> 你完全可以不用 xl/2xl，除非你真的需要。

## 02 三种页面模板（当作规范）

### A. 列表页（文章列表/商品列表/消息列表）

- 宽度：\`max-w-5xl\`
- 间距：移动端紧凑，桌面端舒展
- 列表项：卡片化，hover 轻反馈

\`\`\`tsx
<main className="mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:px-8">
  <header className="border-b border-[var(--border)]/60 pb-10">
    <h1 className="font-serif text-4xl font-bold tracking-tight">文章</h1>
    <p className="mt-4 text-lg text-stone-600 dark:text-stone-400">说明</p>
  </header>

  <div className="mt-8 space-y-2">
    {/* rows */}
  </div>
</main>
\`\`\`

### B. 详情页（文章详情/帮助文档/说明页）

- 阅读宽度更窄：\`max-w-3xl\`
- 标题与元信息：上方留足呼吸感
- 内容区：排版一致

\`\`\`tsx
<article className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
  <header className="pb-10">{/* meta + title */}</header>
  <div className="pt-2">{/* body */}</div>
</article>
\`\`\`

### C. 双栏页（设置页/控制台/编辑器）

- 移动端单列
- md 开始双栏
- 侧栏桌面端 sticky（更“产品化”）

\`\`\`tsx
<main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
  <div className="grid gap-6 md:grid-cols-[260px,1fr]">
    <aside className="md:sticky md:top-6">{/* nav */}</aside>
    <section className="min-w-0">{/* content */}</section>
  </div>
</main>
\`\`\`

## 03 间距是“节奏”，不要随手写

用一个简单约定让全站更统一：

- 纵向主节奏：\`space-y-2\`（紧凑列表）、\`space-y-4\`（常规）、\`space-y-6\`（大块内容）
- 分割线：\`border-[var(--border)]/60\`
- 圆角：统一用 \`rounded-2xl\`

## 04 小结

响应式写得舒服，不是因为你记住了所有断点，而是因为你把页面类型固定成了“模板”，每次只是套模板与填内容。下一篇我们进入组件模式：把高频组件写得可维护。`,
  },
  {
    slug: 'tailwindcss-practical-03-components-patterns',
    title: 'TailwindCSS 实战 03：组件模式——从“堆 class”到可维护的 UI 组件',
    date: '2026-03-29T21:52:04+08:00',
    description:
      '你不需要 CSS-in-JS 才能组件化。用 Button/Badge/Card/Popover 4 个高频组件建立可维护的 Tailwind 组件模式。',
    series: 'TailwindCSS 实战',
    tags: ['TailwindCSS', '组件设计', '实战'],
    draft: false,
    content: `写 Tailwind 最容易踩的坑：把所有样式都写进一个组件里，然后再也不敢改。

这篇用 4 个组件，给你一套“从小到大”的抽象路径：先交付、再抽常量、再抽组件、最后才做变体系统。

## 01 组件抽象的顺序（非常重要）

推荐顺序：

1. 先把 UI 写对（可以长）
2. 把重复的 class 抽成常量（仍在同文件）
3. 把可复用组件抽出来（\`src/components\`）
4. 最后才考虑变体系统（比如 size/variant）

## 02 Button：主/次/幽灵三件套

实战里你至少需要：

- primary：主操作（高对比）
- secondary：次要操作（边框/浅底）
- ghost：工具栏/轻操作（文字按钮）

并且要考虑：

- disabled 状态（视觉 + 交互）
- loading 状态（防止重复提交）
- size（紧凑/常规）

思路示例（不强制照抄，重点是结构）：

\`\`\`ts
const base =
  "inline-flex items-center justify-center rounded-full font-semibold transition-all active:scale-[0.98]";

const variants = {
  primary:
    "bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-stone-900 hover:bg-[var(--surface)]/70 dark:text-stone-50",
  ghost:
    "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100",
};
\`\`\`

关键点：变体是字符串，不是魔法。先让团队能读懂。

## 03 Badge：统一“标签”的视觉语言

Badge 的目标是：全站标签都长一个样。

建议约定：

- 背景：浅色用 \`stone-100\`，深色用 \`stone-800\`
- 字号：\`text-[11px]\` 或 \`text-xs\`
- 圆角：\`rounded-full\`

## 04 Card：交互一致比“好看”更重要

Card 的真正价值是：hover/边框/阴影的反馈一致。

你现在项目里的 \`PostCard\` 已经是非常实用的 Card 模板：透明边框 → hover 出现边框与轻底色。

## 05 Popover/Modal：Tailwind 管样式，交互用朴素实现

Tailwind 不解决可访问性与交互逻辑。实战里你可以先用最朴素的方案：

- fixed 盖层
- backdrop-blur 玻璃质感
- Esc 关闭
- 点击外部关闭

项目里的主题切换弹层就是这个思路，简单耐用。

## 06 小结

Tailwind 的组件化不是把 class 变短，而是把视觉语言固定、交互反馈一致化、改动范围可控。下一篇我们会做更偏“业务”的实战：表单（输入框、校验提示、按钮组）如何一口气落地成可复用规范。`,
  },
];
