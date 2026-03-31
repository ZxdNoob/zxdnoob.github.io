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

const TAILWIND_SERIES = 'TailwindCSS 从入门到精通（学习与实战路线）';

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
    title: 'TailwindCSS 路线 01：从 0 到可交付的工程化工作流',
    date: '2026-03-29T20:10:13+08:00',
    description:
      '不讲概念堆砌：用 Tailwind v4 在真实项目里把「样式入口、暗色模式、设计 Token、组件落地」一次搭顺。',
    series: TAILWIND_SERIES,
    tags: ['TailwindCSS', '前端工程化', '实战'],
    draft: false,
    content: `这一篇是“真正上手”的起点：把 TailwindCSS 安装好、接入构建管道、确认样式生效，然后给你一套**可长期维护**的落地方式（Token/暗色/组件写法）。

> 你正在看的这个仓库已经是 Next.js + Tailwind v4 的落地形态。你可以对照本文的“检查清单”，快速判断你的项目有没有接对。

## 01 TailwindCSS 到底是什么（用一句话说清）

TailwindCSS 是一套 **utility-first**（工具类优先）的 CSS 框架：

- 你不是写一堆自定义 class 再去写 CSS 文件
- 你直接在组件上写类名组合出 UI

它的核心收益不是“少写几行 CSS”，而是让团队的间距/字体/颜色/交互反馈更容易统一，且更不容易漂。

## 02 安装：以 Next.js + Tailwind v4 为例（从 0 到跑起来）

如果你是新项目：

1) 创建 Next.js（App Router）

\`\`\`bash
npx create-next-app@latest my-app
cd my-app
\`\`\`

2) 安装 Tailwind v4（以及 PostCSS 插件）

\`\`\`bash
npm i tailwindcss @tailwindcss/postcss
\`\`\`

3) 配置 PostCSS（\`postcss.config.mjs\`）

\`\`\`js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
export default config;
\`\`\`

4) 全局样式入口（\`src/app/globals.css\`）

\`\`\`css
@import "tailwindcss";
\`\`\`

5) 启动开发服务器并验证

\`\`\`bash
npm run dev
\`\`\`

验证方式：随便找个组件加上 \`className="text-red-500"\`，页面文字应该立刻变红。

> 这个仓库里你可以直接对照：根目录的 \`postcss.config.mjs\`、\`package.json\`、以及 \`src/app/globals.css\`。

## 03 常见“装了但不生效”的排错清单

如果你写了 class 但页面没变化，通常是这几类问题：

- **全局 CSS 没有被引入**：Next.js App Router 需要在 \`src/app/layout.tsx\` 引入 \`globals.css\`
- **PostCSS 插件没生效**：\`postcss.config.mjs\` 没配置 \`@tailwindcss/postcss\`
- **样式被覆盖**：你在别的 CSS 里写了更高优先级（例如全局 \`* { color: ... }\`）
- **你以为改了 class 但其实没刷新**：热更新异常时重启 dev server

## 04 第一天就该学会的 6 个用法（有例子）

### A. 布局：Flex / Grid

\`\`\`html
<div class="flex items-center justify-between gap-4">
  <div class="min-w-0">左侧</div>
  <button class="shrink-0">按钮</button>
</div>
\`\`\`

### B. 间距：padding / margin / space-*

- 外层用 \`px-4 py-3\`
- 列表用 \`space-y-2\` 比每项写 \`mt\` 更整齐

### C. 字体与排版：text-* / font-* / leading-*

\`\`\`html
<h1 class="text-3xl font-bold tracking-tight">标题</h1>
<p class="mt-2 text-sm leading-relaxed text-stone-600">说明</p>
\`\`\`

### D. 交互反馈：hover / active / focus-visible

\`\`\`html
<a class="rounded-xl px-3 py-2 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-4">
  可点击
</a>
\`\`\`

### E. 响应式：sm / md / lg（少用、用得有语义）

\`\`\`html
<div class="grid gap-4 md:grid-cols-2">
  <div>左</div>
  <div>右</div>
</div>
\`\`\`

### F. 暗色模式：优先用 Token（变量），少量用 dark:

你不想每个组件写一套 \`dark:\` 分支。更推荐：

1) 用 CSS 变量承载主题
2) 组件消费变量（\`bg-[var(--surface)]\`）

## 05 把“设计 Token”固定下来（这是可维护的关键）

建议你从 4 个变量开始（够用且不复杂）：

- \`--background\`：页面背景
- \`--surface\`：卡片/浮层背景
- \`--border\`：边框/分割线
- \`--accent\`：强调色（链接、主按钮、选中态）

放在 \`globals.css\` 的 \`:root\` 与 \`.dark\` 中。这样：

- 主题切换只改变量值
- 组件不需要写两套颜色

## 06 组件写法：从“能交付”到“可维护”的抽象顺序

建议顺序（非常实用）：

1. 先把 UI 写对（class 可以长）
2. 重复出现的组合样式 → 抽成常量字符串（仍在同文件）
3. 复用变多 → 抽成公共组件（\`Button\` / \`Badge\` / \`Card\`）
4. 最后再做变体系统（variant/size），不要一开始就追求“优雅”

## 07 本篇小结

你需要的不是“背类名”，而是一套能持续交付的样式基建：

- 安装接入正确（入口/插件/全局 CSS）
- 第一天掌握核心用法（布局/间距/排版/交互/响应式/暗色）
- 以 Token + 变量为中心做主题与统一风格

下一篇开始讲布局与响应式，但会以“团队规范/模板”的方式讲，避免把断点写成一团。`,
  },
  {
    slug: 'tailwindcss-practical-02-layout-responsive',
    title: 'TailwindCSS 路线 02：布局与响应式——把断点策略写成“团队规范”',
    date: '2026-03-29T21:00:21+08:00',
    description:
      '响应式不是到处加 sm/md/lg。用列表/详情/双栏 3 种页面模板把断点策略固化成可复用的写法。',
    series: TAILWIND_SERIES,
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
    title: 'TailwindCSS 路线 03：组件模式——从“堆 class”到可维护的 UI 组件',
    date: '2026-03-29T21:52:04+08:00',
    description:
      '你不需要 CSS-in-JS 才能组件化。用 Button/Badge/Card/Popover 4 个高频组件建立可维护的 Tailwind 组件模式。',
    series: TAILWIND_SERIES,
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
  {
    slug: 'tailwindcss-practical-00-history-and-tradeoffs',
    title:
      'TailwindCSS 路线 00A：它为何诞生——历史、优势与缺点、以及 AI 时代是否更有价值',
    date: '2026-03-29T12:00:00+08:00',
    description:
      '从“语义化 class + 手写 CSS”到“工具类优先”的转变并非偶然。讲清 Tailwind 的问题域、真实优势、常见反对意见，以及在 AI 编程时代它为什么反而更吃香。',
    series: TAILWIND_SERIES,
    tags: ['TailwindCSS', '历史', '工程化', '观点'],
    draft: false,
    content: `如果你第一次看到 Tailwind，常见反应是：

- “这不是把 CSS 写回 HTML 了吗？”
- “class 这么长，怎么维护？”
- “这跟 Bootstrap 有啥区别？”

这些质疑都很正常。要判断 Tailwind 值不值得用，你得先回答：**它到底解决了什么长期问题**。

## 01 Tailwind 出现前，我们在什么痛点里打转

在 Tailwind 之前，团队做样式常见路线是：

- BEM / SMACSS：给元素起很语义化的 class，然后写一堆 CSS 文件
- CSS Modules / Sass：每个组件有自己的样式文件
- 组件库（Bootstrap/AntD）：直接用预制组件，业务再覆盖

这些路线不是不好，而是常常在“中型项目”里出现同一种困境：

### A. 风格漂移（Design drift）

同样的“灰色文字”，A 页面用 #666，B 页面用 #777；同样的间距，有人用 12px，有人用 14px。

原因不是大家不会写 CSS，而是：

- 设计约束没有被“编码成工具”
- 每次写样式都在重新做选择题

### B. 重构成本高（Refactor cost）

当你想统一圆角/间距/颜色时，传统 CSS 往往需要：

- 找到一堆 class
- 找到它们在哪些文件里定义
- 担心选择器优先级与覆盖关系

### C. 代码评审难（Reviewability）

你在 PR 里看到了：

- JSX 里是 \`className="card"\`
- CSS 文件里是一大堆规则

评审者要理解“这张卡片长啥样”，需要跳转文件、在脑海里合成样式，成本很高。

## 02 Tailwind 的核心理念：把“可用的设计约束”做成原子工具

Tailwind 干了两件关键事：

1) 给你一套“受控”的样式取值（间距、字号、圆角、颜色…）
2) 让你在组件里直接组合这些取值，而不是发明无数自定义 class

你得到的不是“更快写 CSS”，而是：

- **更少的随意性**（减少风格漂移）
- **更强的局部性**（样式跟组件在一起，更好读）
- **更容易统一**（统一不靠喊口号，而靠工具类约束）

## 03 优势：Tailwind 到底强在哪（务实版）

### A. 可读的评审

在组件里看到 class，你就大概知道它长什么样，评审不需要去翻 CSS 文件。

### B. 重构更像“改代码”而不是“挖 CSS 坟”

你想把按钮圆角从 12 改成 16，多数情况下就是全局 Token/组件改一处。

### C. 更适合组件时代

React/Vue 时代，组件就是边界。Tailwind 让样式也更贴近这个边界。

## 04 缺点：它的真实代价是什么（别回避）

### A. class 会变长（尤其是早期）

解决方式不是“强行让它短”，而是：

- 先交付
- 重复出现的组合 → 抽常量 / 抽组件
- 颜色/主题 → 用 Token（CSS 变量）收敛

### B. 需要团队约定（否则会“工具类乱炖”）

Tailwind 并不会自动让你统一。你仍然需要：

- 统一的 Token（背景/表面/边框/强调）
- 统一的页面模板（列表/详情/双栏）
- 统一的交互反馈（hover/focus/active）

### C. 语义化 class 的丢失感

这是价值取向问题：你是更想要“class 表意”，还是更想要“取值受控 + 局部可读”。

## 05 在 AI 时代：Tailwind 是否更顺风

结论先说：**多数情况下更顺风**，原因有三点。

### A. AI 更擅长拼“已知积木”

Tailwind 的类名是稳定且可组合的“积木”。让 AI 生成 UI 时，它更容易输出正确的组合，而不是编造一堆自定义 CSS。

### B. 评审与修正更快

AI 生成的样式如果不对，你在 JSX 里就能直接改 class 完成修正，回路更短。

### C. Token + 变量是“主题化”的天然接口

当你想让 AI 按品牌色生成 UI，给它一套 Token 约束，它更容易保持一致，而不是输出到处不同的灰。

## 06 该不该用：一个简单判断法

适合 Tailwind 的场景：

- 你要做中型 Web 应用，组件会越来越多
- 你在意一致性、可维护性、可复用性
- 团队愿意接受“约束”而不是自由发挥

不适合（或需要谨慎）的场景：

- 你只做极少页面、样式需求很独特且高度定制
- 团队无法形成约定，导致工具类风格失控

下一篇（00）我们给一张“学习路线地图”，然后从 01 开始手把手安装/接入/验证，让你真正跑起来。`,
  },
  {
    slug: 'tailwindcss-practical-00-roadmap',
    title: 'TailwindCSS 路线 00：给从未用过的人——学习顺序、练习方式与避坑清单',
    date: '2026-03-30T10:00:00+08:00',
    description:
      '不需要背完文档再开工。用“目标→练习→产出”的方式，把 TailwindCSS 学成可交付能力：从工具类、布局、组件，到主题、可访问性与设计系统。',
    series: TAILWIND_SERIES,
    tags: ['TailwindCSS', '路线', '学习方法'],
    draft: false,
    content: `这一篇给你一张“学习地图”，但不是空喊口号：我会用**最少概念**把 Tailwind 的知识组织成可执行的顺序，并给你一份随时能查的**类名速查与写法套路**。

> 在开始之前，建议先读 00A（历史与取舍）。理解它解决的问题，会让你后面少走很多弯路。

## 01 你需要掌握的不是“类名”，而是 4 个能力

### 能力 A：把 UI 分解成“布局 + 排版 + 皮肤 + 交互”

每个组件都可以拆成：

- **布局**：flex/grid/间距/尺寸
- **排版**：字号/字重/行高/字距
- **皮肤**：背景/边框/阴影/圆角/颜色
- **交互**：hover/focus/active/disabled

这比背 \`px-4\`、\`py-2\` 更重要。

### 能力 B：建立 Token（变量）让全站一致

你至少要有：背景、表面、边框、强调色、focus ring。

### 能力 C：组件化与复用层级

从低到高：

- Token（变量）
- 页面模板（列表/详情/双栏）
- 基础组件（Button/Input/Card）
- 业务组件（例如 PostCard）

### 能力 D：能排错

Tailwind 上手最常见的阻塞不是“不会写”，而是“写了不生效 / 被覆盖 / dark 不对”。

## 02 学习顺序（建议严格按这个走）

- **00A**：为什么 Tailwind 会诞生（历史、取舍、AI 时代）
- **01**：安装/接入/验证 + Token/暗色/可维护写法
- **02**：布局与响应式（把断点写成团队模板）
- **03**：组件模式（Button/Badge/Card/Popover）
- **04**：表单与状态（真实业务高频）
- **05**：长文排版（Typography + Markdown）
- **06**：动效与交互反馈（质感与一致性）
- **07**：主题与 Token（从暗色走向设计系统）
- **08**：可访问性（focus、aria、键盘）
- **09**：性能与迁移（复用策略、渐进迁移）
- **10**：毕业项目（串联所有知识）

## 03 一份“够你用一年的”类名速查（最常用那部分）

### 布局

- Flex：\`flex items-center justify-between gap-4\`
- Grid：\`grid gap-4 md:grid-cols-2\`
- 宽度：\`max-w-3xl\`（正文）、\`max-w-5xl\`（列表）

### 间距

- 组件内边距：\`px-4 py-3\`
- 列表节奏：\`space-y-2\` / \`space-y-4\`

### 交互

- hover：\`hover:bg-[var(--surface)]/80\`
- focus：\`focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]\`
- active：\`active:scale-[0.98]\`（可选）

### 排版

- 标题：\`font-serif text-4xl font-bold tracking-tight\`
- 正文：\`text-sm leading-relaxed\`

## 04 写法套路：把 class 组织得“可读”

实战里推荐把 class 分组写（用数组 join）：

\`\`\`ts
const cls = [
  "rounded-2xl border px-4 py-3",
  "bg-[var(--surface)] text-stone-900 dark:text-stone-100",
  "transition-colors hover:bg-[var(--surface)]/80",
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]",
].join(" ");
\`\`\`

可读性比“短”重要；重复出现再抽常量/抽组件。

## 05 你应该怎么练（像做项目一样练）

不要做“写一堆 demo”那种练法。推荐练法：

- 每篇文章都在项目里增加 1 个可见产出（一个组件或一个页面）
- 每个产出至少覆盖：默认/hover/focus/disabled/dark
- 练完就能放进真实项目用

下一篇（01）从安装与接入开始：你会看到完整命令、配置文件和排错清单，确保你不是“看懂了”，而是真的跑起来了。`,
  },
  {
    slug: 'tailwindcss-practical-04-forms-and-states',
    title: 'TailwindCSS 路线 04：表单与状态——输入框、校验、禁用、加载一套打完',
    date: '2026-03-30T12:30:00+08:00',
    description:
      '真实业务离不开表单。用 Tailwind 把 Input/Select/Textarea/Checkbox 的默认、focus、error、disabled、dark 状态一次做成可复用规范。',
    series: TAILWIND_SERIES,
    tags: ['TailwindCSS', '表单', '组件设计', '实战'],
    draft: false,
    content: `这篇要做的事情很具体：**把表单组件做成“团队可复用的标准件”**。

你会发现表单之所以难，不是因为样式难，而是因为状态太多：

- 默认 / hover / focus
- error（校验失败）
- disabled（禁用）
- loading（提交中）
- dark（暗色）

## 01 目标与验收

**目标**：做出一套 Input 体系（至少包含 Input + Label + HelpText + ErrorText）。

**验收**：

- focus 有清晰可访问的 focus ring
- error 状态不仅变红，还能通过文案说明问题
- disabled 不可点击、颜色更淡、光标正确
- dark 模式下对比度仍然足够

## 02 一套“可落地”的表单 Token

你可以沿用全站变量（推荐）：

- \`--border\`：默认边框
- \`--focus-ring\`：聚焦外圈（建议用半透明 accent）
- \`--surface\`：输入框底色
- \`--accent\`：强调色

error 建议固定为红系（不要每个组件自选）：

- 边框：\`border-rose-500/70\`
- 文案：\`text-rose-600\`（暗色用 \`text-rose-300\`）

## 03 Input 的基类（建议作为“规范”）

下面这套 class 你可以直接拿去当作 Input 的 base：

\`\`\`ts
const inputBase =
  "w-full rounded-2xl border bg-[var(--surface)] px-4 py-3 text-sm " +
  "text-stone-900 placeholder:text-stone-400 " +
  "transition-colors " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] " +
  "disabled:cursor-not-allowed disabled:opacity-60 " +
  "dark:text-stone-100 dark:placeholder:text-stone-500";
\`\`\`

然后把边框与 error 分开：

\`\`\`ts
const inputBorder = "border-[var(--border)]/80 hover:border-[var(--border)]";
const inputError =
  "border-rose-500/70 hover:border-rose-500 focus-visible:ring-rose-500/20";
\`\`\`

## 04 练习：做一个“登录表单”

做一个最常见的登录：

- 邮箱
- 密码
- 记住我（checkbox）
- 提交按钮（loading）

要求：

- error 时输入框和提示文案一致
- 提交中按钮禁用且显示 loading
- 键盘 Tab 顺序正确
- label 用 \`<label htmlFor>\` 关联 input（可访问性）

## 05 小结

表单组件做得好，后面写业务页面会非常快，因为你只是在“拼装标准件”。下一篇我们解决长文排版：当你的内容是 Markdown、文档、说明页时，Tailwind + Typography 插件怎么用最舒服。`,
  },
  {
    slug: 'tailwindcss-practical-05-typography-longform',
    title: 'TailwindCSS 路线 05：长文排版——Typography 插件、代码块与内容规范',
    date: '2026-03-30T15:30:00+08:00',
    description:
      '博客/文档/帮助中心最考验“排版”。用 @tailwindcss/typography 把标题、段落、列表、引用、代码块的视觉节奏一次统一。',
    series: TAILWIND_SERIES,
    tags: ['TailwindCSS', '排版', 'Typography', '实战'],
    draft: false,
    content: `Tailwind 很多人只用来写“组件”，但**长文排版**往往决定了内容产品的专业感。

好消息是：这个仓库已经在用 \`prose\`（Typography 插件）来渲染文章正文。

## 01 目标与验收

**目标**：把文章正文的排版变成“全站统一且可维护”的样子。

**验收**：

- h2/h3 的间距规律，阅读不累
- 列表、引用、链接风格统一
- 代码块在浅色/深色都清晰
- 图片圆角与阴影一致（不突兀）

## 02 你应该怎么用 prose

核心规则：**用 prose 管内容，用工具类管布局**。

- 页面外层：\`max-w-3xl\`、\`px\`、\`py\`
- 正文区域：\`prose\` + 少量 \`prose-*\` 细调

## 03 练习：做一篇“排版压力测试”文章

新建一篇文章，包含：

- 三级标题（h2/h3/h4）
- 有序/无序列表（嵌套）
- 引用（blockquote）
- 表格（GFM table）
- 行内 code + 代码块（含长行）
- 1 张图片

你会非常直观地发现：哪些地方需要统一的节奏与对比。

## 04 小结

组件能让产品“可用”，排版能让内容“耐读”。下一篇我们做交互反馈：动画与过渡怎么“恰到好处”，既不花里胡哨，也不显得生硬。`,
  },
  {
    slug: 'tailwindcss-practical-06-motion-interactions',
    title: 'TailwindCSS 路线 06：动效与交互反馈——让 UI 有“质感”但不油腻',
    date: '2026-03-30T18:30:00+08:00',
    description:
      '动效不是炫技。用 transition、active scale、hover shadow、motion-reduce 让交互有质感，同时照顾减少动态效果的用户偏好。',
    series: TAILWIND_SERIES,
    tags: ['TailwindCSS', '动效', '交互', '实战'],
    draft: false,
    content: `很多 UI “看起来廉价”，问题不是配色，而是缺少一致的交互反馈：hover 没反应、点击无确认、加载没状态。

这一篇的目标：建立一套**小而一致**的动效规范。

## 01 目标与验收

**目标**：为 Button / Card / Modal 三类组件建立统一反馈。

**验收**：

- hover：背景/边框/阴影有轻变化
- active：轻微缩放（可选）
- focus：清晰的 focus ring
- motion-reduce：减少动效时仍可用（不依赖动画表达信息）

## 02 建议的“交互三件套”

你会在本仓库里频繁看到类似组合（这是好习惯）：

- \`transition-all duration-200\`
- \`hover:shadow-sm\`
- \`active:scale-[0.98]\`

关键点：**不要到处写不同的 duration**。统一是高级感的来源。

## 03 练习：给一个列表项加“可点击反馈”

把一个列表项做成 Link（或 button），满足：

- hover 边框出现
- hover 背景略亮
- focus-visible ring
- 点击 active 微缩

再加上：

- \`motion-reduce:transition-none\`（动效减少时不强制动画）

## 04 小结

动效的价值是“可感知的反馈”，不是花哨。下一篇我们进入主题系统：当你要支持多主题/品牌色/自定义配色时，Tailwind + CSS 变量如何演进成真正的设计系统。`,
  },
  {
    slug: 'tailwindcss-practical-07-theming-design-tokens',
    title: 'TailwindCSS 路线 07：主题与设计 Token——从暗色模式走向“设计系统”',
    date: '2026-03-30T21:30:00+08:00',
    description:
      '把颜色、边框、背景、阴影、圆角固化成 Token；用 CSS 变量承载主题，用 Tailwind 工具类消费 Token，让换肤/品牌色变成低成本操作。',
    series: TAILWIND_SERIES,
    tags: ['TailwindCSS', '主题', 'Design Tokens', '工程化'],
    draft: false,
    content: `当你的项目开始有“产品化”需求时，往往会出现：

- 需要多主题（浅色/深色只是开始）
- 需要品牌色（不同客户/不同子站）
- 需要统一组件的边框、阴影、圆角、间距

如果你仍然用“到处写 \`text-stone-600\`”的方式，会很痛苦。

## 01 目标与验收

**目标**：把 UI 的关键视觉约束收敛到一组 Token（CSS 变量），并让组件只消费 Token。

**验收**：

- 换主题时，只改变量值，组件不改
- 新页面的灰度、边框、底色不会漂

## 02 Token 的粒度：从少到多

建议从 8 个开始（足够覆盖大多数场景）：

- 背景：\`--background\`、\`--surface\`、\`--surface-2\`
- 文本：\`--text\`、\`--muted\`
- 边框：\`--border\`
- 强调：\`--accent\`
- 聚焦：\`--focus-ring\`

再按需要增加：

- \`--danger\`、\`--success\`
- \`--shadow\`（或固定 shadow 规范）

## 03 组件消费方式（推荐）

组件中尽量用：

- \`bg-[var(--surface)]\`
- \`border-[var(--border)]/80\`
- \`text-[color:var(--text)]\`

少量需要“语义色”的地方，再用 Tailwind 颜色（比如危险提示）。

## 04 练习：做一个“主题切换”并验证 3 个组件

切换主题后验证：

- Button（primary/secondary）
- Input（default/error）
- Card（hover）

观察：你是否做到了“只改变量不改组件”？

## 05 小结

把 Token 做对，你的 Tailwind 会越写越轻松。下一篇我们讲可访问性：focus、对比度、语义结构，这些不是加分项，而是组件可用性的底线。`,
  },
  {
    slug: 'tailwindcss-practical-08-accessibility-a11y',
    title: 'TailwindCSS 路线 08：可访问性（A11y）——Focus、对比度与语义结构',
    date: '2026-03-30T23:30:00+08:00',
    description:
      'Tailwind 不会自动让你可访问。把 focus-visible、aria、对比度、键盘可用性变成组件契约，让 UI 更可靠、更专业。',
    series: TAILWIND_SERIES,
    tags: ['TailwindCSS', 'A11y', '可访问性', '组件设计'],
    draft: false,
    content: `很多“看起来很好看”的 UI，一旦用键盘操作就崩：Tab 找不到焦点，按钮像文本，弹窗无法关闭。

这篇不讲空泛标准，只落地到你每天写的组件里。

## 01 目标与验收

**目标**：让核心交互组件满足键盘可用性与可感知焦点。

**验收**：

- 任何可交互元素都能用 Tab 聚焦
- 聚焦时有清晰 focus ring（不是靠浏览器默认蓝框随缘）
- 弹层类组件支持 Esc 关闭与点击外部关闭
- 文字与背景对比度足够（浅色/深色都可读）

## 02 Tailwind 里最该用的可访问性工具

- \`focus-visible:\`：只在键盘聚焦时显示 ring（鼠标点击不乱闪）
- \`sr-only\`：给图标按钮加可读文本
- \`aria-*\`：把状态写给辅助技术（例如 switch 的 \`aria-checked\`）

你在本仓库的组件里已经能看到一些好例子，比如按钮的 \`focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]\`。

## 03 练习：改造一个“只有图标”的按钮

做一个图标按钮（比如复制/关闭），要求：

- 有 \`aria-label\`
- 有 focus-visible ring
- hover 有反馈
- 点击区域足够大（至少 40x40 附近）

## 04 小结

A11y 不是“无障碍专用”，它会直接提升你组件的可靠性与专业感。下一篇我们聊工程层面的精通：如何控制 CSS 体积、复用策略、以及从传统 CSS 迁移到 Tailwind 的路线。`,
  },
  {
    slug: 'tailwindcss-practical-09-performance-and-migration',
    title:
      'TailwindCSS 路线 09：性能与迁移——CSS 体积、复用策略、从传统 CSS 平滑过渡',
    date: '2026-03-31T09:30:00+08:00',
    description:
      '从“能写”到“精通”的关键在工程实践：如何避免样式膨胀、如何做可维护复用、以及如何把老项目的 CSS 逐步迁移到 Tailwind。',
    series: TAILWIND_SERIES,
    tags: ['TailwindCSS', '性能', '迁移', '工程化'],
    draft: false,
    content: `你写 Tailwind 写到一定程度，会遇到两个现实问题：

1. class 越来越多，复用策略不清晰
2. 老项目迁移成本很高，不敢动

这篇给你一套“精通级”的工程方法。

## 01 目标与验收

**目标**：建立清晰的复用层级，并能在不推倒重来的情况下迁移老样式。

**验收**：

- 页面/组件新增样式不会导致全站风格漂移
- 复用点明确：什么时候抽组件、什么时候抽常量
- 迁移按页面/模块推进，能持续交付

## 02 复用层级（推荐）

从低到高：

- **Token（变量）**：颜色/边框/底色/聚焦
- **页面模板**：列表/详情/双栏
- **基础组件**：Button / Input / Card / Modal
- **业务组件**：比如 PostCard、SeriesPostList

不要跳级。否则你会在最难的位置抽象。

## 03 迁移策略：从“包围”开始

如果老项目有一堆 CSS：

1. 先用 Tailwind 把新页面写出来（不要改老页面）
2. 抽基础组件，让新页面越来越多地复用它们
3. 再逐步把老页面替换成新组件（按页面迁移）

这样不会出现“大迁移停摆”。

## 04 小结

精通 Tailwind 的标志不是你会多少类名，而是你能把它写成一套可维护的系统。最后一篇我们做毕业项目：把 Token、模板、组件、表单、排版、动效、A11y 全部串成一个可交付的小产品。`,
  },
  {
    slug: 'tailwindcss-practical-10-capstone-project',
    title:
      'TailwindCSS 路线 10：毕业项目——从 0 做一个可交付的小产品 UI（完整串联）',
    date: '2026-03-31T12:30:00+08:00',
    description:
      '用一个“设置面板 + 列表/详情 + 表单”的小产品，把 Token、响应式模板、组件模式、排版、动效与可访问性全部串起来，形成你自己的 Tailwind 基建模板。',
    series: TAILWIND_SERIES,
    tags: ['TailwindCSS', '项目', '实战', '毕业'],
    draft: false,
    content: `这篇是路线收官：我们做一个小而完整的 UI 项目，你可以把它当作未来所有项目的“起手模板”。

## 01 项目目标

做一个“偏产品化”的页面组合：

- 列表页：展示条目（卡片列表）
- 详情页：展示正文（prose 排版）
- 设置页：双栏布局（左侧导航 + 右侧表单）

要求：

- 支持暗色模式
- 组件复用（Button/Input/Card）
- 有一致的交互反馈（hover/focus/active）
- 表单有 error/disabled/loading 状态

## 02 任务拆解（按天/按阶段）

### 阶段 A：底座（半天）

- Token（变量）与暗色模式
- 页面模板（列表/详情/双栏）

### 阶段 B：基础组件（半天）

- Button（primary/secondary/ghost）
- Input（default/error/disabled）
- Card（hover/focus）

### 阶段 C：页面拼装（1 天）

- 列表页：复用 Card
- 详情页：复用 prose
- 设置页：复用 Input + Button，做校验与提交状态

### 阶段 D：打磨（半天）

- 加动效（但记得 motion-reduce）
- A11y（aria-label、focus-visible）

## 03 验收清单（你可以对照检查）

- 主题切换后，页面整体不会“碎”
- 新增页面时，你不会重新发明一套间距与灰度
- 组件改动影响范围可控（不牵一发动全身）

## 04 下一步（精通之后怎么继续）

如果你已经完成整个系列：

- 把你的 Button/Input/Card 变成一个小组件库
- 给组件加变体（size/variant）时，保持“可读性优先”
- 把 Token 抽成一份文档，写清楚用途（背景/表面/边框/强调）

至此，你已经不再是“会写 Tailwind 的人”，而是能用 Tailwind 交付并维护一套 UI 系统的人。`,
  },
];
