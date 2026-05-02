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
    /**
     * 默认策略：对已存在的 seed 文章只更新“元信息”，避免覆盖数据库中可能被人工维护过的正文。
     * 若你希望把本文件中的 `content` 变更同步回数据库（例如扩写文章正文/补充答案），
     * 启动后端时设置环境变量：`SEED_FORCE_CONTENT=1`
     */
    const forceContentSync = process.env.SEED_FORCE_CONTENT === '1';

    // 仅查询 id + slug，用于判断种子文章是否已存在（按 slug 关联）
    const rows = await this.postsRepo.find({
      select: { id: true, slug: true },
    });
    const bySlug = new Map(rows.map((r) => [r.slug, r.id]));

    const toInsert: Partial<PostEntity>[] = [];
    const toUpdate: Partial<PostEntity>[] = [];

    // 遍历内置种子：无则插入；有则只更新元信息，避免覆盖用户或运维已改过的正文
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
      const updateRow: Partial<PostEntity> = {
        id,
        slug,
        title: seed.title,
        date: seed.date,
        description: seed.description,
        series: seed.series ?? null,
        tags: seed.tags ?? null,
        draft: seed.draft ?? false,
      };

      // 显式开启时，允许同步正文（content）
      if (forceContentSync) {
        updateRow.content = seed.content;
      }

      toUpdate.push(updateRow);
    }

    if (toInsert.length === 0 && toUpdate.length === 0) return;

    if (toInsert.length > 0) {
      await this.postsRepo.save(toInsert);
    }
    if (toUpdate.length > 0) {
      await this.postsRepo.save(toUpdate);
    }

    this.logger.log(
      `已同步初始文章：新增 ${toInsert.length} 篇，更新 ${toUpdate.length} 篇${forceContentSync ? '（含正文同步）' : ''}`,
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
const FE_INTERVIEW_SERIES = '前端面试准备（8 年一线工程师知识体系与学习路线）';
const JAVA_TEACHING_SERIES = 'Java 从基础到精通（初级 · 高级 · 专家路线）';

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
    slug: 'fe-interview-00-knowledge-map',
    title: '前端面试准备 00：知识体系地图（8 年工程师版）与复习节奏',
    date: '2026-04-01T09:00:00+08:00',
    description:
      '给你一张可执行的“面试知识体系地图”：从 JS/浏览器/网络/React/工程化/性能/安全/架构到项目与行为面。附 2/4/8 周复习节奏与每一块的验收标准。',
    series: FE_INTERVIEW_SERIES,
    tags: ['前端面试', '学习路线', '方法论', '复盘'],
    draft: false,
    content: `这是一套“从一线交付走到面试现场”的知识体系。目标不是把知识点背一遍，而是把能力组织成**可表达、可推导、可落地**的结构。

> 你可以把这套系列当成一个“面试用的知识图谱 + 训练营”。每篇都给**必会点**、**高频追问**、**实战落地**与**自测清单**。

## 01 面试在考什么（你要对齐的评价模型）

多数前端面试并不是在考“你记得多少 API”，而是在考四类能力：

- **基础可推导**：遇到新问题能从语言/运行时原理推导出结论（例如事件循环、闭包、原型链、渲染流水线）。
- **工程可交付**：能把复杂需求做成可维护的工程（模块边界、依赖管理、质量体系、CI、发布、回滚）。
- **性能与稳定性**：能定位问题、量化收益、做取舍（Web Vitals、长任务、内存、缓存、监控）。
- **业务与协作**：能讲清楚“我如何把需求做成结果”，以及“我如何推动团队更好”（方案、风险、里程碑、复盘）。

## 02 知识体系地图（建议按此顺序复习）

我建议用“从底向上”的顺序。每一层都依赖下层：

### A. 语言与运行时（JavaScript / TypeScript）

- JS：执行上下文、作用域链、闭包、this、原型链、类语法糖、模块系统
- 异步：Promise、微任务/宏任务、async/await、取消与超时
- 语义：相等比较、类型转换、Map/Set、迭代器、生成器
- TS：类型系统、泛型、条件类型、infer、类型体操边界与工程落地

### B. 浏览器与网络（Browser / HTTP）

- 浏览器：渲染流水线、合成层、回流重绘、事件模型、输入响应
- 存储：Cookie / localStorage / sessionStorage / IndexedDB / Cache Storage
- 网络：HTTP/1.1 vs HTTP/2 vs HTTP/3、缓存、CORS、CDN、TLS

### C. 框架与 UI（React 为主，也要懂通用思想）

- React：渲染与更新、Hooks 心智模型、并发渲染、SSR/CSR/Streaming
- 状态：本地状态、服务端状态、缓存一致性、表单复杂度
- 组件：可复用/可测试/可维护的组件设计，A11y 与交互细节

### D. 工程化（Build / Lint / Test / CI / Release）

- 构建：Tree Shaking、code splitting、依赖图、bundle 分析
- 质量：ESLint/TS、单测/集成/E2E、Mock 策略、契约测试
- 发布：灰度、回滚、版本策略、变更风险控制

### E. 性能与可观测性（Performance / Observability）

- 指标：LCP/INP/CLS、TTFB、Long Task、内存与 GC
- 手段：拆包、缓存、图片与字体、预加载、服务端渲染策略
- 可观测：埋点、日志、Tracing、告警、SLO

### F. 安全与合规（Security）

- XSS、CSRF、CSP、点击劫持、依赖供应链风险
- 权限与鉴权：Cookie/Session、JWT、SameSite、刷新与吊销

### G. 系统设计与架构（Front-end System Design）

- 模块边界、可扩展性、配置化、插件化、微前端的取舍
- 多端一致性、国际化、主题与设计 Token、组件库治理

### H. 项目表达与行为面（Project / Behavioral）

- STAR 结构讲项目：背景/目标/行动/结果/复盘
- 关键：你做了什么权衡、如何推动、如何衡量结果

## 03 2 / 4 / 8 周复习节奏（可执行）

### 2 周冲刺（已会基础，补短板）

- 第 1 周：JS + 浏览器 + 网络（每天 2 小时高强度）
- 第 2 周：React + 工程化 + 性能 + 项目表达

### 4 周稳扎稳打（大多数人最合适）

- Week 1：JS（含异步、手写题与边界）
- Week 2：浏览器/网络/安全
- Week 3：React + 状态管理 + SSR
- Week 4：工程化 + 性能 + 系统设计 + 模拟面试

### 8 周体系化（目标大厂/高阶岗位）

在 4 周基础上加：

- 深入性能与可观测（真实线上问题）
- 组件库/设计系统治理
- 架构演进（多团队协作、边界与治理）

## 04 每一块的“验收标准”（不是背完就算）

你需要能做到：

- **讲得清**：用自己的话讲清概念与边界（3 分钟/10 分钟两个版本）
- **推得出**：遇到变形题能推导而不是靠背答案
- **写得对**：能写出可运行、可测试的最小实现
- **落得下**：能给到工程落地方案与权衡（成本/收益/风险）

## 05 复盘模板（强烈建议每次练习后写）

写 5 行就够：

1. 问题是什么（原题）
2. 我第一反应是什么（哪里卡住）
3. 正确答案/关键推导
4. 易错点与边界
5. 下次如何 60 秒讲清

---

接下来每篇文章会对应上面地图的一块：先把高频考点打穿，再把“能落地的工程经验”补齐。

## 06 怎么把“会”训练成“能面试”（训练方法论）

你在准备时会遇到一个典型错觉：看懂了 ≠ 说得清 ≠ 写得对 ≠ 能在压力下稳定输出。

我建议你把训练分为三条线并行：

### A. 解释线（Explain）

目标：任何高频题都能讲出「结论 → 原理 → 边界 → 例子」。

训练法：

- **60 秒版**：一口气讲清核心结论 + 1 个关键例子
- **5 分钟版**：补上原理推导 + 边界情况 + 常见坑

### B. 编码线（Implement）

目标：能写出最小正确实现（可跑、可测），而不是“写个大概”。

训练法：

- 先写“最小实现”（先覆盖主路径）
- 再补“边界与测试”
- 最后再谈“性能与工程化”

### C. 复盘线（Review）

目标：每道题都留下可复用的“错误模式”与“纠错手段”。

训练法：

- 把错误分类：概念缺失 / 推导断层 / 边界没想到 / 表达混乱
- 针对性补齐：画图、写最小例子、整理口述模板

## 07 面试题库如何刷（从题海到结构）

### 题目分级（建议）

- **S 级（必须秒答）**：事件循环、闭包、this、原型链、React hooks、缓存、CORS
- **A 级（高频追问）**：SSR/CSR 取舍、性能指标、工程化体系、发布与回滚
- **B 级（加分项）**：系统设计、可观测、组件库治理、供应链安全

### 刷题策略

- 先刷 S 级“讲解题”（把语言组织好）
- 再刷 S 级“代码输出题”（训练推导）
- 最后刷“系统题”（工程化/架构/项目表达）

## 08 全系列统一练习模板（每篇都会用）

你会在每篇末尾看到类似结构：

- **笔试题**：选择/问答/代码输出（有标准答案）
- **编码题**：手写实现/小组件/小工具（有参考实现）
- **开放题**：工程取舍/方案设计（有回答框架）

下面给一个“跨章节的示例题”，让你感受答案的推导方式。

## 09 示例：如何写出“讲原理”的参考答案（演示）

### 题目（问答）

为什么 \`Promise.then\` 的回调通常比 \`setTimeout(fn, 0)\` 更早执行？

### 参考答案（结论 → 原理 → 推导 → 边界）

**结论**：因为 \`then\` 回调进入**微任务队列**，而 \`setTimeout\` 进入**宏任务队列**。每一轮宏任务执行完毕后，事件循环会“清空微任务”，再进入下一轮宏任务。

**原理**：浏览器/Node 都有事件循环调度机制。主线程执行一个宏任务（例如执行脚本、处理一次事件回调），期间可能产生微任务（Promise reaction）。当调用栈清空时，会先把“本轮产生的微任务”全部执行完，再去取下一个宏任务。

**推导**：因此在同一轮宏任务里创建的 \`Promise.resolve().then(...)\` 会在 \`setTimeout\` 之前运行。

**边界**：不同环境对“渲染时机”与某些任务源（例如 MessageChannel、setImmediate）的实现细节不同，但“微任务优先于下一轮宏任务”这一点是通用规律。

---

下一篇（01）开始我们进入第一块核心：JavaScript 运行时。`,
  },
  {
    slug: 'fe-interview-01-js-runtime',
    title:
      '前端面试准备 01：JavaScript 运行时——执行上下文、闭包、原型链与事件循环（能推导版）',
    date: '2026-04-01T20:30:00+08:00',
    description:
      '把 JS 面试高频点组织成“可推导”的模型：执行上下文/作用域链/this/原型链/事件循环。附典型追问、手写题拆解与易错边界。',
    series: FE_INTERVIEW_SERIES,
    tags: ['前端面试', 'JavaScript', '运行时', '异步'],
    draft: false,
    content: `这篇只做一件事：把 JS 高频题从“背答案”变成“能推导”。

你要建立的不是零散知识点，而是一套“运行时模型”：

- **执行**：代码如何进入调用栈、如何创建执行上下文
- **绑定**：this 如何确定、原型链如何查找属性
- **调度**：异步任务如何排队、何时执行（事件循环）

当你能画出这三张图（栈 / 原型链 / 队列），大多数变形题都不怕。

## 01 执行上下文：你要能画出栈

面试问“闭包是什么/this 指向是什么”，本质都离不开**执行上下文**。

你至少要讲清：

- JS 执行时维护一个**调用栈**（Call Stack）
- 每次函数调用会创建一个执行上下文：变量环境/词法环境/this 绑定
- 作用域解析遵循**词法作用域**（代码写在哪，就在哪找变量）

### 高频追问

- var/let/const 的差异为何会导致 TDZ？
- 函数声明提升 vs 函数表达式提升的本质差别？

## 02 闭包：不是“函数套函数”，是“携带了外部环境”

闭包的面试表达建议：

> 闭包是“函数 + 它创建时的词法环境”的组合。函数返回后，其外部变量仍可能被引用而不被回收。

你要能讲清两个点：

- **为什么外部变量不会销毁**：因为仍被引用（可达性）
- **代价是什么**：更长的生命周期，可能引发内存占用与泄漏

### 实战落地

- 订阅/事件监听务必在卸载时解除
- 定时器/异步回调引用大对象要小心

## 03 this：把绑定规则背成一张表

你不需要讲玄学，只要把规则说清：

- 默认绑定：严格模式下为 undefined，否则为全局对象
- 隐式绑定：obj.fn() -> this = obj（但会被“引用丢失”打断）
- 显式绑定：call/apply/bind
- new 绑定：构造调用优先级最高

易错点：

- 箭头函数没有自己的 this，捕获定义时外层 this

## 04 原型链：属性查找与继承的真实路径

必会表达：

- 每个对象都有 \`[[Prototype]]\`（可通过 \`Object.getPrototypeOf\` 观察）
- 函数有 \`prototype\` 属性，用于 new 时设置实例的原型
- 属性查找沿原型链向上，直到 null

高频追问：

- \`instanceof\` 原理是什么？
- 如何实现 \`Object.create\`？

## 05 事件循环：宏任务/微任务不是背分类，是理解“何时入队”

你要能讲清：

- 执行栈清空后，取一个宏任务执行
- 宏任务执行过程中产生的微任务会在本轮宏任务结束后**全部清空**
- DOM 渲染/绘制时机与任务队列之间的关系（不同浏览器实现细节可简述）

建议你能手写并解释：

- Promise.then 的回调为什么比 setTimeout 更早执行
- async/await 如何拆成 Promise 链

## 06 自测清单（60 秒版本）

- 我能画出调用栈解释闭包产生与释放吗？
- 我能用绑定规则解释 3 个 this 变形题吗？
- 我能说明原型链查找过程与 \`instanceof\` 原理吗？
- 我能口述事件循环执行顺序并解释原因吗？

---

下一篇我们进入 TypeScript：把“会写 TS”升级为“会用类型系统提升工程质量”。

## 07 深入：把 4 个核心模型讲清（面试可用表述）

### A. 调用栈（Call Stack）

- JS 单线程执行：同一时刻只有一个栈顶函数在跑
- 栈溢出通常来自递归或同步死循环

### B. 作用域与词法环境（Lexical Environment）

- 作用域由“代码位置”决定，不由“调用位置”决定（词法作用域）
- 闭包是函数携带词法环境导致外部变量延长生命周期

### C. 原型链（Prototype Chain）

- “查属性”走原型链，“改属性”通常在当前对象上新增/覆盖
- \`Object.create(null)\` 没有原型链（没有 \`toString\` 等）

### D. 任务队列（Task Queues）

- 宏任务：脚本、定时器、I/O、事件回调（分类会因环境不同略有差异）
- 微任务：Promise reaction、queueMicrotask（优先级更高）

## 08 笔试题（选择 / 问答 / 输出）

### 题 1（输出题）：变量提升与 TDZ

下面代码输出什么？为什么？

\`\`\`js
console.log(a);
var a = 1;

try {
  console.log(b);
} catch (e) {
  console.log('err');
}
let b = 2;
\`\`\`

#### 参考答案（原理）

**最终输出**：

- 第一段：\`undefined\`
- 第二段：\`err\`

下面按“创建阶段（声明处理）→ 执行阶段”推导。

##### 第一段为什么是 \`undefined\`

代码：

\`\`\`js
console.log(a);
var a = 1;
\`\`\`

**推导步骤**：

1. 进入脚本/函数作用域时会有“创建阶段”。\`var a\` 会被加入到当前执行上下文的 **Variable Environment**。
2. \`var\` 的语义是：**声明提升 + 立即初始化为 \`undefined\`**（所以声明前可读）。
3. 执行到 \`console.log(a)\` 时，\`a\` 已存在且值为 \`undefined\`，因此输出 \`undefined\`。
4. 下一行 \`a = 1\` 才发生赋值，改变 \`a\` 的值。

##### 第二段为什么会抛错并被 catch 到

代码：

\`\`\`js
try {
  console.log(b);
} catch (e) {
  console.log('err');
}
let b = 2;
\`\`\`

**推导步骤**：

1. \`let b\` 同样会在创建阶段被登记到当前执行上下文的 **Lexical Environment**。
2. 但 \`let/const\` 的语义是：**声明会提升，但不会初始化**。在执行到声明语句前，变量处于 **TDZ（暂时性死区）**，不可读。
3. 执行到 \`console.log(b)\` 时读取 TDZ 变量，会抛出 \`ReferenceError\`。
4. 错误被 \`catch\` 捕获，输出 \`err\`。
5. 执行到 \`let b = 2\` 时，\`b\` 才完成初始化并变为可读。

##### 易错点与加分点

- TDZ 不是“没声明”，而是“已声明但不可访问”。  
- \`const\` 同样有 TDZ，且必须初始化，否则是语法错误。  
- 在 ES Module 顶层，\`var\` 不会挂到全局对象上，但“提升 + 初始化为 undefined”的行为仍成立。

### 题 2（输出题）：this 绑定与引用丢失

\`\`\`js
const obj = {
  x: 1,
  f() {
    return this.x;
  },
};
const g = obj.f;
console.log(obj.f(), g());
\`\`\`

#### 参考答案（原理）

这题考点是：\`this\` 不是由“函数定义位置/归属对象”决定，而是由**调用点（call-site）**决定。

代码：

\`\`\`js
const obj = {
  x: 1,
  f() {
    return this.x;
  },
};
const g = obj.f;
console.log(obj.f(), g());
\`\`\`

##### 结论

- \`obj.f()\`：输出 \`1\`。
- \`g()\`：
  - 严格模式/模块模式：抛 \`TypeError\`（\`this === undefined\`，读取 \`this.x\` 报错）
  - 非严格模式：通常输出 \`undefined\`（\`this === globalThis\`，但全局一般没有 \`x\`）

##### 推导（逐步）

1) \`obj.f()\`

- 调用点是“点调用”（\`obj.f()\`）。
- 隐式绑定规则：点左侧对象作为 this。
- 所以 \`this === obj\`，\`this.x === 1\`。

2) \`g()\`

- \`const g = obj.f\` 只是把函数值赋给变量 \`g\`，**并不会携带 obj**。
- 调用点变成普通函数调用（\`g()\`）。
- 普通调用下：
  - 严格模式：\`this === undefined\`
  - 非严格模式：\`this === globalThis\`

##### 常见追问（加分）

- 如何修复引用丢失：\`obj.f.bind(obj)\` 或 \`() => obj.f()\`  
- 为什么箭头函数不适合写需要动态 this 的方法：箭头函数 this 固定为定义时外层 this。

> 面试表达要点：**隐式绑定需要“调用点”有宿主对象**，不是“函数来自哪个对象”。

### 题 3（输出题）：事件循环

\`\`\`js
console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);
\`\`\`

#### 参考答案（原理）

代码：

\`\`\`js
console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);
\`\`\`

##### 结论

输出顺序：\`1 4 3 2\`

##### 推导（事件循环）

把整段脚本当作一次“宏任务”执行：

1) 同步执行阶段（仍在当前宏任务内）

- 输出 1
- \`setTimeout\` 注册回调：进入“未来的宏任务队列”（到期后才可执行）
- \`Promise.then\` 回调：进入微任务队列
- 输出 4

2) 当前宏任务结束后：清空微任务队列

- 执行 then 回调，输出 3

3) 进入下一轮宏任务

- 执行定时器回调，输出 2

##### 易错点与边界

- \`setTimeout(fn, 0)\` 并不保证“0ms 后立刻执行”，它只是“尽快排到下一轮宏任务”，还会受最小延迟与浏览器节流影响。  
- Node.js 事件循环阶段更细，但 Promise microtask 依旧会在进入下一轮宏任务前被清空。

## 09 编码题（手写实现 + 推导）

### 题 4：实现 \`myBind\`

实现一个简化版的 \`bind\`，支持：

- 绑定 \`this\`
- 预置参数（partial application）
- 使用 \`new\` 调用时，\`this\` 绑定应被忽略（\`new\` 优先级更高）

\`\`\`js
Function.prototype.myBind = function (thisArg, ...preset) {
  // TODO
};
\`\`\`

#### 参考答案（原理 + 代码）

**目标**：实现简化版 \`bind\`，同时正确处理两类调用：

- 直接调用：\`bound()\` → \`this\` 应该是 \`thisArg\`
- 构造调用：\`new bound()\` → \`this\` 应该是新实例，忽略 \`thisArg\`

##### 原理拆解（为什么要判断 \`instanceof\`）

\`new bound()\` 会先创建新对象，然后以新对象作为 \`this\` 调用 \`bound\`。因此在 \`bound\` 里可用 \`this instanceof bound\` 判断是否构造调用，从而选择正确的 this。

##### 原型链处理（面试常追问）

为了让 \`new bound()\` 创建的实例能够访问 \`target.prototype\` 上的成员，需要让：

- \`bound.prototype\` 的原型指向 \`target.prototype\`

\`\`\`js
Function.prototype.myBind = function (thisArg, ...preset) {
  const target = this;
  function bound(...args) {
    const isNew = this instanceof bound;
    const ctx = isNew ? this : thisArg;
    return target.apply(ctx, [...preset, ...args]);
  }
  // 让 new bound() 的实例能够沿原型链访问 target.prototype
  if (target.prototype) {
    bound.prototype = Object.create(target.prototype);
    Object.defineProperty(bound.prototype, 'constructor', {
      value: bound,
      writable: true,
      configurable: true,
    });
  }
  return bound;
};
\`\`\`

### 题 5：实现 \`myInstanceof\`

\`\`\`js
function myInstanceof(obj, Ctor) {
  // TODO
}
\`\`\`

#### 参考答案（原理 + 代码）

**原理**：\`obj instanceof Ctor\` 等价于判断 \`Ctor.prototype\` 是否出现在 \`obj\` 的原型链上（沿 \`[[Prototype]]\` 向上查找）。

\`\`\`js
function myInstanceof(obj, Ctor) {
  if (obj == null) return false;
  if (typeof Ctor !== 'function') {
    throw new TypeError('Right-hand side of instanceof is not callable');
  }
  const proto = Ctor.prototype;
  let p = Object.getPrototypeOf(obj);
  while (p !== null) {
    if (p === proto) return true;
    p = Object.getPrototypeOf(p);
  }
  return false;
}
\`\`\`

##### 加分边界

- 规范里还支持 \`Ctor[Symbol.hasInstance]\` 自定义 \`instanceof\` 行为；面试可补一句“我这里实现的是默认原型链语义”。

## 10 面试官常见追问（你要准备的边界）

- Promise 链式调用的错误如何传播？（throw/return Promise.reject）
- 为什么 \`async\` 函数返回值会被包成 Promise？
- \`Object.create(null)\` 用于什么场景？（字典/Map 替代，避免原型污染）

## 11 本篇小结（你应该掌握什么）

- 能画出调用栈解释闭包与 TDZ
- 能用“调用点”解释 this
- 能用“原型链包含关系”解释 instanceof
- 能用“本轮宏任务结束清空微任务”解释事件循环`,
  },
  {
    slug: 'fe-interview-02-typescript',
    title:
      '前端面试准备 02：TypeScript 工程能力——类型系统、泛型、条件类型与“类型体操”的边界',
    date: '2026-04-02T12:00:00+08:00',
    description:
      'TS 面试别只讲 keyof/extends：要能说清类型系统能力边界、如何在团队里落地、如何避免类型体操失控。附高频类型题与工程规范。',
    series: FE_INTERVIEW_SERIES,
    tags: ['前端面试', 'TypeScript', '工程化'],
    draft: false,
    content: `TypeScript 面试的分水岭在“工程化”：你是否能把类型系统用来降低长期维护成本，而不是写一堆炫技类型。

## 01 你要掌握的 TS 不是语法，而是三层能力

- **类型建模**：如何用类型表达业务约束（而不是 any 到处飞）
- **推断与约束**：泛型、条件类型、infer 带来的可组合性
- **工程落地**：tsconfig、严格模式、边界处理、第三方类型治理

## 02 类型系统核心（面试必讲）

### A. Structural typing（结构类型）

TS 关注“形状”而不是“名义”，这会影响：

- API 兼容性
- DTO / 表单值 / 后端返回值的建模方式

### B. Narrowing（类型收窄）

你要能说清：

- \`typeof\` / \`in\` / \`instanceof\` / 自定义 type guard
- 可辨识联合（discriminated union）如何让分支天然安全

## 03 泛型与条件类型：从“会用”到“能设计”

- 泛型用于“把变化的部分参数化”
- 条件类型用于“按输入类型分支输出类型”
- infer 用于“从复杂结构中抽取类型变量”

高频题方向：

- 实现 \`DeepPartial<T>\` / \`DeepReadonly<T>\` 的思路
- \`ReturnType<T>\` / \`Parameters<T>\` 的用法与边界

## 04 类型体操的边界（非常重要）

面试里给出立场更加分：

- **不要为了炫技牺牲可读性**
- 复杂类型要写测试（tsd）或示例用法作为“契约”
- 类型复杂到影响编译速度、IDE 卡顿，就是负收益

## 05 工程落地：我会怎么在团队里推 TS

建议你能讲出一套渐进策略：

- 新模块严格模式先行（\`strict: true\`）
- 旧模块先把 any 压到边界（API 层/适配层）
- 对外 API 用可辨识联合表达状态（success/error）
- tsconfig 统一，避免项目间“各自为政”

## 06 自测清单

- 我能用联合类型 + 可辨识字段表达一个复杂状态机吗？
- 我能写出一个可复用的泛型函数并让类型推断自然工作吗？
- 我能解释为什么某些类型体操不值得做吗？

---

## 07 技术细讲：把 TS 用成“工程能力”

这一节回答面试里最常见的追问：**你在真实项目里怎么用 TS 降低维护成本？**

### A. 类型建模：先把“不可能状态”编码掉

最有价值的做法是用联合类型表达状态，让非法状态在编译期报错：

\`\`\`ts
type Loading = { status: 'loading' };
type Success<T> = { status: 'success'; data: T };
type Failure = { status: 'error'; message: string; code?: string };
type Result<T> = Loading | Success<T> | Failure;
\`\`\`

这样 UI 层的分支会天然被“状态”约束：

\`\`\`ts
function renderUser(r: Result<{ name: string }>) {
  if (r.status === 'loading') return 'loading';
  if (r.status === 'error') return r.message;
  // r 在这里被收窄为 Success
  return r.data.name;
}
\`\`\`

**原理**：可辨识联合（discriminated union）让 TS 的控制流分析能够在分支里自动收窄类型，从而避免大量非空判断与 any。

### B. 边界治理：把 any 压到“接口层/适配层”

TS 的正确姿势是：**数据进来先校验，校验后再给强类型**。

- API 层：拿到 \`unknown\`
- 校验层：runtime 校验（zod / valibot / 自写 guard）
- 业务层：使用强类型

这样你能在面试里讲清“类型系统不是安全边界，运行时校验才是”。

### C. 类型体操边界：可读性、编译性能、团队维护

你可以给面试官一个明确原则（加分）：

- 复杂类型必须“能读懂 + 有示例 + 有约束”
- 如果 IDE 明显变慢/编译明显变慢，说明类型复杂度失控
- 与其做深度类型体操，不如在边界做 runtime 校验

## 08 练习题（笔试 + 代码 + 参考答案推导）

### 题 1（笔试）：\`unknown\` 与 \`any\` 的差异是什么？为什么工程里更推荐 \`unknown\`？

#### 参考答案（原理）

- \`any\`：关闭类型检查，污染会扩散；它既能赋值给任何类型，也能被任何类型赋值。
- \`unknown\`：安全的顶层类型，**必须先收窄**（type guard）才能使用；不会把不安全传播到下游。

工程推荐 \`unknown\` 的原因是：让“不确定性”停留在边界，逼迫你做校验/收窄。

### 题 2（编码）：实现一个类型守卫 \`isNonEmptyString\`

\`\`\`ts
export function isNonEmptyString(x: unknown): x is string {
  // TODO
}
\`\`\`

#### 参考答案（原理 + 代码）

**原理**：type predicate \`x is string\` 会告诉 TS：在返回 true 的分支里，x 可被视为 string。

\`\`\`ts
export function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.trim().length > 0;
}
\`\`\`

### 题 3（编码 + 类型设计）：实现一个强类型的 \`pick\`

\`\`\`ts
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  // TODO
}
\`\`\`

#### 参考答案（原理 + 代码）

**原理**：

- \`K extends keyof T\` 约束 keys 只能选 obj 的键
- 返回类型 \`Pick<T, K>\` 保证只包含选中的键

\`\`\`ts
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = obj[k];
  return out;
}
\`\`\`

### 题 4（思考题）：什么时候不该用 TS 类型体操？

#### 参考答案（要点）

- 当类型复杂到“团队没人敢改”
- 当类型推断导致 IDE 卡顿、编译变慢
- 当问题本质是运行时不可信数据（应先 runtime 校验）

---

下一篇进入浏览器与网络：渲染流水线、缓存与 HTTP 追问会非常密集。`,
  },
  {
    slug: 'fe-interview-03-browser-network',
    title:
      '前端面试准备 03：浏览器与网络——渲染流水线、缓存、CORS、Cookie、HTTP/2（高频追问一网打尽）',
    date: '2026-04-03T14:30:00+08:00',
    description:
      '把浏览器与网络题整理成“从输入到像素”的链路：渲染流水线、回流重绘、合成、缓存策略、CORS、Cookie/SameSite、HTTP/2/3。',
    series: FE_INTERVIEW_SERIES,
    tags: ['前端面试', '浏览器', '网络', 'HTTP', '缓存'],
    draft: false,
    content: `浏览器与网络题的核心是“链路思维”：从用户输入 → JS 执行 → 网络 → 渲染 → 交互响应。

## 01 从 URL 到页面：你要能讲一条完整链路

至少包含：

- DNS/TCP/TLS（可简述）
- HTTP 请求与缓存协商
- HTML 解析构建 DOM，CSS 构建 CSSOM
- 合成 Render Tree，布局（Layout），绘制（Paint），合成（Composite）
- JS 执行可能打断渲染（同步脚本、长任务）

## 02 回流/重绘/合成：不要背概念，要会用优化手段对应

- **回流（Layout）**：几何信息变化（尺寸/位置）导致
- **重绘（Paint）**：像素变化（颜色/阴影）导致
- **合成（Composite）**：只改 transform/opacity 通常可走合成层

实战表达（加分）：

- 用 DevTools Performance/Rendering 面板验证
- 用 \`contain\` / \`will-change\`（谨慎）隔离影响范围

## 03 缓存：强缓存 + 协商缓存 + CDN

你要能说清：

- 强缓存：\`Cache-Control: max-age, s-maxage, immutable\`
- 协商缓存：\`ETag/If-None-Match\`，\`Last-Modified/If-Modified-Since\`
- CDN：边缘缓存与回源策略

高频追问：

- 为什么有时刷新还是拿到旧资源？（Service Worker、CDN、代理层）
- hash 文件名和长缓存如何配合发布？

## 04 CORS：不是“前端报错”，是浏览器安全模型

必会点：

- 简单请求 vs 预检请求（OPTIONS）
- \`Access-Control-Allow-Origin\`、\`Allow-Credentials\`
- 带 Cookie 的跨域必须：具体 Origin + \`credentials: include\`

## 05 Cookie 与 SameSite：登录态的坑集中地

必会点：

- \`HttpOnly\` 防止 JS 读取（降低 XSS 盗 Cookie）
- \`Secure\` 仅 HTTPS
- \`SameSite=Lax/Strict/None\` 对跨站请求的影响

## 06 HTTP/2/3：面试常问但别展开到失控

你能讲清即可：

- HTTP/2：多路复用、头部压缩
- HTTP/3：基于 QUIC（UDP），更快的连接建立与迁移

## 07 自测清单

- 我能讲清一次首屏加载的关键瓶颈在哪里吗？
- 我能把缓存策略讲成“发布流程的一部分”吗？
- 我能解释 CORS 预检触发条件与解决方案吗？

---

## 08 练习题（笔试 + 推导答案）

### 题 1（问答）：为什么“强缓存 + hash 文件名”适合前端静态资源发布？

#### 参考答案（原理）

- hash 文件名保证“内容变化 → 文件名变化”，从而可长期缓存（\`max-age=31536000, immutable\`）
- 发布新版本时不会污染旧版本缓存；旧页面仍能命中旧资源，新页面拉新资源
- 结合 HTML 不长缓存（或协商缓存）保证入口可更新

### 题 2（输出题）：哪些情况会触发 CORS 预检？

给出 3 个会触发预检的例子，并解释原因。

#### 参考答案（原理）

会触发预检（OPTIONS）的常见条件：

- 方法不是 GET/HEAD/POST（如 PUT/DELETE）
- POST 但 \`Content-Type\` 不是 \`application/x-www-form-urlencoded\` / \`multipart/form-data\` / \`text/plain\`
- 自定义头（如 \`Authorization\`、\`X-Token\`）

原因：浏览器要先向服务器确认“是否允许该跨域请求的真实动作”，避免直接发出可能有副作用的跨域请求。

### 题 3（编码题）：写一个“缓存优先，过期回源”的 fetch 包装（思路题）

要求：优先读 Cache Storage，没有则网络请求；网络成功后写回缓存。

#### 参考答案（原理 + 示例代码）

**原理**：Cache Storage 是 Service Worker 体系的一部分（即便不写 SW 也可用），适合缓存 GET 资源；更新策略要考虑过期与一致性。

\`\`\`js
export async function fetchCacheFirst(request) {
  const cache = await caches.open('v1');
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}
\`\`\`

---

下一篇进入 React：面试最常被追问的不是“会不会写组件”，而是你是否理解渲染与状态的本质。`,
  },
  {
    slug: 'fe-interview-04-react-core',
    title:
      '前端面试准备 04：React 核心——渲染、更新、Hooks 心智模型、并发与 SSR（面试表达模板）',
    date: '2026-04-04T16:30:00+08:00',
    description:
      '用“渲染=计算 UI”与“更新=调度”两句话讲清 React：Hooks 规则、闭包陷阱、性能优化点、并发渲染与 SSR/Streaming 的取舍。',
    series: FE_INTERVIEW_SERIES,
    tags: ['前端面试', 'React', 'Hooks', 'SSR'],
    draft: false,
    content: `React 面试最怕“讲不清自己写的东西”。这一篇给你一套表达框架。

## 01 两句话讲清 React

- **渲染（render）**：根据 state/props 计算 UI（纯计算，尽量无副作用）
- **更新（commit）**：把变化应用到宿主环境（DOM），并执行副作用（effects）

如果你能围绕这两句话解释 hooks、性能与并发，大多数追问都能接住。

## 02 Hooks 心智模型：闭包陷阱为什么会发生

必会点：

- 组件函数每次渲染都会重新执行
- effect 的回调捕获的是当次渲染的变量（闭包）
- 依赖数组是“告诉 React 何时重新订阅/重新执行副作用”

高频追问：

- 为什么不能在条件语句里调用 hooks？
- \`useMemo/useCallback\` 什么时候是负收益？
- 如何避免 stale closure？（依赖、ref、函数式 setState）

## 03 性能：先定位，再优化（别上来就 memo）

面试表达建议：

- 先说“如何定位”：React DevTools Profiler
- 再说“如何优化”：拆分组件、稳定 props、列表虚拟化、避免不必要的 state 上提

## 04 并发与 Suspense：你不需要背实现，但要会讲取舍

你要能说清：

- 并发渲染让 React 可以中断/恢复渲染（更好的响应）
- Suspense 是“声明式的加载边界”

## 05 SSR/Streaming：从“SEO”升级到“性能/体验”

你要能讲清：

- SSR 的收益：更快首屏内容到达、SEO、分享预览
- SSR 的成本：服务端负载、缓存复杂度、同构边界（浏览器 API）
- Streaming 的意义：更早把可用内容送到客户端

## 06 自测清单

- 我能解释一次“组件为什么重渲染”并给出定位方法吗？
- 我能讲清一个 effect 依赖问题的根因与修复吗？
- 我能描述 SSR 的收益与代价，并给出适用场景吗？

---

## 07 练习题（笔试 + 示例代码 + 原理）

### 题 1（问答）：为什么说“React 渲染是计算 UI，副作用属于 effect”？

#### 参考答案（原理）

- 渲染阶段可能被打断/重做（尤其在并发模式下）
- 如果在渲染阶段做副作用（订阅、请求、改 DOM），会导致重复执行、状态错乱
- effect 运行在 commit 之后，React 能保证 DOM 已经更新，并且能在依赖变化/卸载时清理

### 题 2（输出题）：stale closure

\`\`\`tsx
function Demo() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      console.log(count);
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <div>{count}</div>;
}
\`\`\`

这段代码有什么问题？如何修复？为什么？

#### 参考答案（原理）

- effect 依赖数组为空，回调捕获的是初始渲染的 \`count=0\`
- 定时器里永远读到 0，并且 \`setCount(count + 1)\` 永远设置为 1

修复方式 1：使用函数式更新（不依赖闭包里的 count）：

\`\`\`tsx
setCount((c) => c + 1);
\`\`\`

修复方式 2：把 \`count\` 放进依赖数组（会导致 interval 重建，通常不如函数式更新合适）。

### 题 3（编码题）：实现一个 \`useLatest\`

目标：解决闭包读旧值的问题。

\`\`\`ts
export function useLatest<T>(value: T) {
  // TODO
}
\`\`\`

#### 参考答案（原理 + 代码）

**原理**：ref 在组件生命周期内稳定，更新 ref 不会触发渲染，适合承载“最新值供回调读取”。

\`\`\`ts
import { useRef } from 'react';

export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
\`\`\`

---

下一篇进入工程化：构建、依赖、质量体系与发布流程，是 8 年工程师最能拉开差距的部分。`,
  },
  {
    slug: 'fe-interview-05-engineering',
    title:
      '前端面试准备 05：工程化——构建、依赖治理、质量体系、CI/CD 与发布回滚',
    date: '2026-04-05T18:30:00+08:00',
    description:
      '工程化题的本质是“可持续交付”。从构建与依赖图、代码分割、质量门禁、测试金字塔到灰度发布与回滚，把面试回答讲成“我在团队里怎么做”。',
    series: FE_INTERVIEW_SERIES,
    tags: ['前端面试', '工程化', 'CI/CD', '测试', '发布'],
    draft: false,
    content: `工程化面试要讲“体系”，而不是背工具名。

## 01 构建：你要能解释 bundle 为什么会变大

建议你能讲清：

- Tree Shaking 的前提（ESM、无副作用标记）
- code splitting 的策略（路由/组件级、预加载）
- 依赖重复（多版本）、polyfill 注入、动态 import 的边界

## 02 依赖治理：8 年工程师必谈“风险控制”

- 锁文件与可复现构建
- 升级策略：小步、可回滚、变更记录
- 供应链安全：审计、最小权限、关键依赖的替代与镜像策略

## 03 质量体系：把质量变成门禁，而不是口号

你要能讲出：

- ESLint/TS 规则为何要分层（error/warn）
- 单测/集成/E2E 的边界与投入产出
- Mock 策略：哪些用 mock，哪些用真实服务

## 04 CI/CD：把“能发布”变成“随时可发布”

面试回答建议结构：

- **触发**：PR 检查（lint/test/build）、主干合并后部署
- **产物**：构建产物与版本号（可追溯）
- **部署**：灰度、监控、自动回滚条件

## 05 自测清单

- 我能说清一次“线上事故”如何通过发布策略避免/降低影响吗？
- 我能解释我做的工程规范如何提高交付效率吗？

---

## 06 练习题（工程化题：带答案思路）

### 题 1（问答）：为什么要“主干开发 + 小步合并 + CI 门禁”？

#### 参考答案（原理）

- 主干开发降低长期分支漂移与合并冲突
- 小步合并降低风险半径，回滚成本更低
- CI 门禁让质量成为流程的一部分（可重复、可度量），而不是“靠人记得做”

### 题 2（实战题）：你会如何设计前端的发布与回滚？

至少覆盖：版本策略、灰度、监控触发回滚条件。

#### 参考答案（框架）

- 版本：构建产物带 commit SHA/版本号，可追溯
- 灰度：按用户/地域/比例逐步放量，观察核心指标
- 监控：错误率、白屏率、核心交互失败率、Vitals 回归
- 回滚：保留上一个稳定版本产物，支持一键切换；必要时功能开关兜底

---

下一篇进入性能与可观测：这是高阶岗位最喜欢深挖的部分。`,
  },
  {
    slug: 'fe-interview-06-performance-observability',
    title:
      '前端面试准备 06：性能与可观测——Web Vitals、长任务、缓存、监控与定位方法',
    date: '2026-04-05T20:00:00+08:00',
    description:
      '性能面试要讲“指标→定位→手段→验证→回归”。覆盖 Web Vitals、Long Task、资源优化、缓存、以及埋点/日志/Tracing 的前端可观测体系。',
    series: FE_INTERVIEW_SERIES,
    tags: ['前端面试', '性能优化', 'Web Vitals', '监控'],
    draft: false,
    content: `性能题最怕“我做了懒加载所以更快”。你需要一条闭环：指标、定位、手段、验证。

## 01 指标：先统一语言

建议掌握（能解释含义与常见原因）：

- LCP：最大内容绘制（图片/字体/SSR/缓存）
- INP：交互响应（长任务、事件处理、渲染阻塞）
- CLS：布局偏移（图片尺寸、动态插入）
- TTFB：后端/边缘缓存/网络

## 02 定位：用工具而不是猜

- Performance 面板：长任务、Main thread 忙在哪里
- Network：瀑布图、缓存命中、优先级
- Lighthouse：基准对比与回归

## 03 常用手段：按“瓶颈类型”选

- 资源瓶颈：图片格式/尺寸、字体子集、preload、CDN
- JS 瓶颈：拆包、减少依赖、延迟加载、避免同步大计算
- 渲染瓶颈：减少 layout thrash、避免频繁强制同步布局

## 04 可观测：把“用户慢”变成可定位问题

前端可观测至少包含：

- RUM：Vitals + 关键路径耗时
- 错误监控：JS Error、Promise rejection、资源加载失败
- 追踪：把一次用户操作串成链路（前端 span → 后端 trace）

## 05 自测清单

- 我能说清一次性能优化的“前后数据对比”吗？
- 我能描述一次线上慢问题的定位过程吗？

---

## 06 练习题（性能闭环）

### 题 1（问答）：LCP 变差的常见原因与定位手段有哪些？

#### 参考答案（原理）

- 资源：首屏大图未优化、未预加载、CDN 慢、字体阻塞
- JS：主线程长任务导致渲染延迟
- SSR：TTFB 高导致一切后移

定位手段：Performance（长任务）、Network（关键资源）、Lighthouse（机会点）、真实用户 Vitals（分布与分群）。

### 题 2（实战题）：给你一个“首屏 JS 1.5MB”的页面，你会怎么做？

#### 参考答案（步骤）

- 先度量：bundle analyzer、路由级拆包、依赖重复
- 再拆分：按路由/组件拆分，延迟加载非首屏模块
- 再优化：替换重依赖、按需引入、移除无用 polyfill
- 再验证：指标对比与回归监控

---

下一篇进入安全：XSS/CSRF/CSP 与登录态是高频坑点。`,
  },
  {
    slug: 'fe-interview-07-security',
    title: '前端面试准备 07：安全——XSS/CSRF/CSP、鉴权与前端边界（工程视角）',
    date: '2026-04-06T09:30:00+08:00',
    description:
      '安全题要讲“威胁模型”。覆盖 XSS/CSRF、CSP、Cookie/SameSite、JWT 与刷新、以及前端在鉴权链路中的边界与常见误区。',
    series: FE_INTERVIEW_SERIES,
    tags: ['前端面试', '安全', 'XSS', 'CSRF', 'CSP'],
    draft: false,
    content: `安全题的关键不是背定义，而是你能否把“攻击方式→影响→防护→工程落地”讲清。

## 01 XSS：本质是“把不可信输入当代码执行”

你要能讲清：

- 反射型/存储型/DOM 型
- 防护：输出编码、白名单渲染、避免 dangerouslySetInnerHTML
- 配合：CSP、HttpOnly Cookie、输入校验（但不要迷信）

## 02 CSRF：本质是“浏览器自动带上凭证”

你要能讲清：

- 同站凭证（Cookie）会自动携带
- 防护：SameSite、CSRF Token、双重 Cookie

## 03 CSP：把“允许执行什么”变成策略

- script-src 与 nonce/hash
- 禁用 inline script 的收益
- report-only 如何渐进上线

## 04 鉴权：前端的边界（加分点）

你要能表达立场：

- 前端做权限控制是“体验优化”，不是安全边界
- 真正的授权必须在服务端完成

## 05 自测清单

- 我能用一句话说明 XSS 与 CSRF 的差异吗？
- 我能给出一个“工程可落地”的防护组合吗？

---

## 06 练习题（安全题：有推导）

### 题 1（问答）：为什么“前端鉴权”不是安全边界？

#### 参考答案（原理）

- 前端代码与请求完全在用户控制下（可改 JS、可重放请求）
- 真正的权限校验必须在服务端（授权决策点）
- 前端做权限控制更多是“体验优化与减少误操作”，不能替代后端

### 题 2（实战题）：如何防护 XSS？请给出“组合拳”

#### 参考答案（组合）

- 默认不渲染不可信 HTML；必须渲染时做白名单 sanitization
- Cookie 设 \`HttpOnly\` + \`Secure\` + 合理 \`SameSite\`
- CSP：\`script-src\` 使用 nonce/hash，逐步上报（report-only → enforce）
- 重要操作加二次确认/风控（降低被盗用影响）

---

下一篇进入系统设计：高阶岗位会问“如何设计一个复杂前端系统”。`,
  },
  {
    slug: 'fe-interview-08-frontend-system-design',
    title:
      '前端面试准备 08：系统设计——从需求到架构（模块边界、状态、扩展性、治理）',
    date: '2026-04-06T14:00:00+08:00',
    description:
      '高阶面试常见题：设计一个控制台/低代码/组件库/多租户前端。用系统设计框架回答：边界、数据流、权限、扩展性、性能、可观测与演进。',
    series: FE_INTERVIEW_SERIES,
    tags: ['前端面试', '系统设计', '架构', '组件库'],
    draft: false,
    content: `前端系统设计题的关键不是“画框图”，而是你能否做出合理取舍并解释为什么。

## 01 回答框架（通用）

建议按这个顺序回答：

1. 需求澄清（用户/场景/规模/约束）
2. 关键实体与数据流（读写路径）
3. 模块边界（按领域而不是按技术）
4. 权限与安全（谁能做什么）
5. 性能与体验（关键链路）
6. 可观测与运维（上线后怎么保证稳定）
7. 演进路线（先做 MVP，再迭代）

## 02 模块边界：大项目最容易死在“耦合”

你可以谈：

- 领域拆分：用户、资源、权限、审计、配置…
- API 适配层：把后端变化隔离在边界
- 组件层级：基础组件 → 业务组件 → 页面

## 03 状态与缓存：复杂度来源

面试里可以强调：

- 本地状态 vs 服务端状态
- 缓存一致性与失效策略
- 表单与草稿（离线/恢复）

## 04 治理：8 年工程师的差异点

- 规范与模板（脚手架）
- 质量门禁（CI）
- 依赖与版本治理
- 设计系统与 Token（多主题/品牌）

## 05 自测清单

- 我能把一个系统设计题讲成 10 分钟结构化答案吗？
- 我能说清“为什么不用某方案”而不是只说“我用了某方案”吗？

---

## 06 系统设计练习题（含参考答案框架）

### 题：设计一个“多租户管理后台”（前端）

要求：

- 支持多租户切换（不同租户权限不同）
- 菜单/路由按权限动态
- 数据请求要带租户上下文
- 需要埋点与错误监控

#### 参考答案（原理与取舍）

**需求澄清**：

- 租户切换是否需要“记忆最近租户”
- 权限粒度：页面级/按钮级/字段级
- 权限来源：后端下发还是前端配置

**关键实体**：

- Tenant（租户）、User（用户）、Role（角色）、Permission（权限）

**模块边界**：

- auth（登录态/刷新/吊销）
- tenant（租户选择与上下文）
- permission（权限计算与守卫）
- api（请求封装：自动注入租户、重试、错误上报）
- ui（组件库/Token）

**路由与权限**：

- 路由表声明元信息（requiredPermissions）
- 进入路由前做守卫：未授权 → 403 页或重定向
- UI 按权限渲染（按钮隐藏/禁用），但关键操作仍以服务端校验为准

**可观测**：

- 关键操作埋点（切租户、创建资源、发布等）
- 错误监控（JS error、API error）
- 性能指标（首屏、交互延迟）

---

下一篇进入“项目表达与行为面”：同样的经历，讲法不同，结果完全不同。`,
  },
  {
    slug: 'fe-interview-09-project-storytelling',
    title:
      '前端面试准备 09：项目表达与行为面——用 STAR 讲清楚你的价值（含模板与示例）',
    date: '2026-04-06T20:30:00+08:00',
    description:
      '把项目经历讲成“可量化的贡献”：背景、目标、行动、结果、复盘。附简历要点提炼法、常见追问、以及把技术点转成业务价值的表达模板。',
    series: FE_INTERVIEW_SERIES,
    tags: ['前端面试', '项目', '简历', '沟通'],
    draft: false,
    content: `很多人技术不差，但面试表现像“流水账”。这篇给你一套可复用模板。

## 01 价值表达公式

你要把“我做了什么”变成：

> 我在什么约束下解决了什么关键问题，用了什么方案，带来了可量化结果，并且复盘了哪些可复用经验。

## 02 STAR 模板（建议背熟）

- S（Situation）：背景与约束（规模/团队/历史包袱）
- T（Task）：目标与指标（上线时间/性能指标/稳定性）
- A（Action）：你做了哪些关键动作（方案/拆解/推动）
- R（Result）：结果（数据/影响范围/复盘）

## 03 把技术点“翻译”成业务价值

举例（你可以换成自己的）：

- “做了代码分割” → “首屏从 4.2s 降到 2.6s，转化提升 X%”
- “加了监控” → “线上问题平均定位时间从 2 小时降到 20 分钟”
- “重构组件库” → “新页面交付速度提升，视觉一致性提升，线上样式回归减少”

## 04 高频追问（提前准备）

- 你做的方案最大的 trade-off 是什么？
- 失败过吗？怎么复盘的？
- 如果再来一次，你会怎么做？

## 05 自测清单

- 我能用 2 分钟讲一个项目并有数据支撑吗？
- 我能讲清“我在团队里推动了什么变化”吗？

---

## 06 行为面题库（高频）与参考回答原理

### 题 1：说一次你“推动变更但遇到阻力”的经历

#### 参考回答结构（原理）

- 先讲“共同目标”（交付/稳定/效率），不要先讲“对错”
- 明确阻力类型：资源不足/担心风险/认知不同
- 给出“最小可行变更”（MVP）与可回滚方案，降低心理成本
- 用数据/试点证明，而不是争论

#### 参考答案（示例回答，可按你的项目替换）

> 背景：我们有一个中后台项目，发版后偶发白屏，但排查成本很高。目标是在不影响交付节奏的前提下，把“定位时间”降下来。  
> 阻力：一开始有人担心“接入监控会增加包体/引入新风险”，也有人觉得“现在也能查，只是慢点”。
>
> 我做了三件事：  
> 1) **先对齐目标**：我们不是为了“上一个工具”，而是为了把故障定位从小时级降到分钟级，减少线上损失与加班。  
> 2) **做最小试点**：先只接入错误监控与 source map 上传，范围限定在一个低风险页面与一个版本周期，且提供开关（可一键关闭上报）。  
> 3) **用数据证明**：试点两周后，捕获了 X 次真实错误，其中 Y 次能直接定位到具体 commit/堆栈；平均定位时间从约 2 小时降到 20 分钟，同时包体增加控制在 ZKB。
>
> 结果：团队接受把监控接入写成发布流程的一部分，并且把“回归检查 + 监控看板”作为上线验收项。复盘里我也补充了规范：哪些错误必须上报、如何做采样、如何做告警降噪。

**为什么这样答更专业**：它把“推动变更”从情绪/争论，落到“目标—最小风险—可验证—可回滚”的工程逻辑上，面试官能直接映射到你的协作与交付能力。

### 题 2：说一次失败

#### 参考回答结构（原理）

- 失败不怕，怕的是没有复盘与改进机制
- 讲清“我犯了什么错 → 如何止损 → 如何防止再发生（流程/工具/门禁）”

#### 参考答案（示例回答，可按你的项目替换）

> 背景：我们曾经为了赶版本，把一个涉及路由与权限的重构在最后两天合并。上线后出现部分用户无法进入页面。  
> 我犯的错：我低估了“权限配置与灰度策略”的复杂度，把验证范围当成了“冒烟测试”级别。  
> 止损：第一时间回滚到上一版本，并在回滚后补了临时兜底（权限配置不完整时回落到安全默认）。  
> 复盘改进：  
> - **流程**：把“权限/路由变更”列为高风险变更，必须走灰度；  
> - **门禁**：增加契约测试（后端返回权限 schema 变更必须通过）；  
> - **可观测**：上线后监控“403/跳转失败率”，出现阈值自动告警；  
> - **策略**：重构拆成多次小合并，把大改动变成可回滚的小步。

**为什么这样答更专业**：它体现了你能从失败中沉淀机制（流程/门禁/监控/策略），而不是停留在“我以后会更小心”。

### 题 3：如果你和后端/产品有分歧怎么办？

#### 参考回答结构（原理）

- 把分歧从“立场”转成“约束与目标”
- 明确优先级：用户价值、风险、成本、交付周期
- 形成可验证方案（原型/实验/灰度），用结果收敛争议

#### 参考答案（示例回答，可按你的项目替换）

> 我通常按“三步”处理：  
> 1) **澄清目标与约束**：产品关注的是转化与体验，后端关注的是复杂度与稳定性，我会把分歧写成可量化的目标（例如首屏 < 2.5s、错误率 < 0.1%）与约束（人力、上线窗口、数据口径）。  
> 2) **给出可落地的选项与 trade-off**：例如方案 A 快但后续维护成本高、方案 B 交付慢但长期更稳，并把风险与回滚成本写清。  
> 3) **用可验证结果收敛**：能用原型/小流量灰度验证的，就别用会议争论。验证维度包含：指标变化、成本、是否可回滚、对现有系统影响范围。
>
> 如果仍然无法一致，我会推动在既定优先级下做决策（例如“先交付可回滚的 MVP，再迭代最优解”），并把决策记录在 PRD/技术方案里，避免反复扯皮。

**为什么这样答更专业**：它体现了你能做决策框架、给出选项、降低风险并用实验验证，而不是“靠沟通技巧”解决问题。

---

到这里，你已经有了从基础到系统设计再到项目表达的完整链路。下一步建议：拿这套模板做 2 次模拟面试，把“讲得清”打磨成肌肉记忆。`,
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
  {
    slug: 'java-00-roadmap',
    title: 'Java 路线 00：从初级到专家的三层能力模型、学习顺序与全系列索引',
    date: '2026-05-02T08:00:00+08:00',
    description:
      '面向初级、高级与资深/专家 Java 工程师的分层路线：每层该学什么、如何验收、与本系列各篇的对应关系；附统一练习模板与进阶节奏。',
    series: JAVA_TEACHING_SERIES,
    tags: ['Java', '学习路线', '方法论'],
    draft: false,
    content: `本系列把 Java 能力拆成三层：**基础交付**（初级）、**复杂系统与运行时**（高级）、**分布式、性能与架构治理**（资深/专家）。下面给出**可勾选的知识点清单**、**每篇对应的动手 Lab**与**验收口径**，便于对照补缺，做到学完能用。

---

## 01 三层模型 × 知识点明细表

### A. 初级（对应 \`java-fundamentals-*\`）

| 知识域 | 你要会的具体点 | 学以致用（交付物） |
| --- | --- | --- |
| 工具链 | \`javac\`/\`java\`、\`-cp\`/\`-classpath\`、\`--module-path\` 概念 | 命令行编译运行；读懂「找不到符号」vs「找不到类」 |
| 字节码 | \`.class\`、类加载「加载→链接→初始化」直觉 | 知道 static 初始化何时触发 |
| 构建 | Maven \`pom.xml\` 三坐标、\`src/main|test/java\` | 可重复构建；依赖冲突能定位 |
| OOP | 接口/抽象/组合、\`final\`、可见性 | 职责单一；便于单测的依赖注入构造 |
| 集合 | \`ArrayList\` 扩容、\`HashMap\` 装载因子直觉、\`LinkedHashMap\` 有序 | 按读写模式选型；不写 O(n²) 嵌套查找 |
| 契约 | \`equals\`/\`hashCode\`、\`Comparable\` | \`HashSet\`/\`HashMap\` 键稳定；排序 TreeSet |
| 泛型 | 类型参数、上界、\`? extends\`/\`? super\`（PECS） | 集合 API 不再靠强转 |
| 异常 | \`Error\` vs \`Exception\`、受检/非受检、异常链 | \`try-with-resources\`；包装后保留 cause |
| IO | \`Charset\`、\`Path\`、\`Files.lines\` 流式读 | 指定 UTF-8；大文件不 OOM |
| 时间 | \`Instant\`、\`ZonedDateTime\`、\`Duration\`、\`DateTimeFormatter\` | 存 UTC；展示按用户时区 |
| 并发入门 | \`ExecutorService\`、\`submit\`/\`invokeAll\`、\`shutdown\` | 批量任务并行；优雅退出 |

**初级验收**：实现「注册接口」：校验 + 写库 + 日志（含 requestId）+ 3 条 JUnit；能口述异常如何从 DAO 传到全局处理器。

### B. 高级（对应 \`java-advanced-*\`）

| 知识域 | 具体点 | 学以致用 |
| --- | --- | --- |
| JMM | happens-before、\`volatile\` 可见性（非复合原子） | 解释「偶发读到过期值」 |
| JUC | \`ReentrantLock\`、\`Atomic*\`、\`ConcurrentHashMap\`、\`Semaphore\` | 限流；分段统计 |
| 线程池 | 核心/最大/队列/拒绝策略、\`CallerRunsPolicy\` 含义 | 队列打满时延迟背压而不是静默丢 |
| 异步 | \`CompletableFuture\` 组合、\`orTimeout\`/\`completeOnTimeout\` | 多依赖合并；统一异常映射 |
| JVM | 堆分代、GC pause、分配速率、Metaspace | 读 GC 日志判断 Young GC 是否过密 |
| Spring | Bean 生命周期、JDK/CGLIB 代理、事务传播、\`rollbackFor\` | 定位事务不生效；缩小事务边界 |

### C. 资深/专家（对应 \`java-expert-*\`）

幂等表 + 状态机 + Outbox；RED/USE 与 SLO；限界上下文 + ADR。

---

## 02 全系列 × 推荐 Lab（务必动手）

| slug | Lab（最小可运行） |
| --- | --- |
| \`java-fundamentals-01-platform-and-jvm\` | Maven/Gradle 工程 + \`DiscountCalculator\` 纯函数 + JUnit + \`java -jar\` |
| \`java-fundamentals-02-oop-collections-generics\` | 购物车 \`Map\` + 正确 equals/hashCode + 泛型 \`max(List<T>)\` |
| \`java-fundamentals-03-exceptions-io-concurrency-intro\` | \`Files.walk\` 统计行数 + 线程池并行哈希 |
| \`java-advanced-01-juc-and-async\` | 三依赖异步合并 + 2s 超时 + 线程池隔离 |
| \`java-advanced-02-jvm-and-gc\` | 开 GC 日志压测短命对象，标 Young GC pause |
| \`java-advanced-03-spring-ecosystem\` | 自调用 vs 拆 Bean 的 \`@Transactional\` 对比 |
| \`java-expert-01-distributed-consistency\` | 订单状态机 + 幂等键 DDL + Outbox 伪代码 |
| \`java-expert-02-performance-and-observability\` | 3 个 SLI + 报警阈值 + 日志字段规范 |
| \`java-expert-03-architecture-and-ddd\` | 一页 ADR + 上下文映射草图 |

---

## 03 学习顺序

基础 01→02→03 → 进阶 01→02→03 → 精通 01→02→03。并发弱则基础 03 与进阶 01 连着做两遍。

---

## 04 课后复盘（10 分钟）

1. 写出 5 个术语各一句人话解释。  
2. 今天敲过的命令/测试输出截图或粘贴一行日志。  
3. 对应线上事故场景（字符集/事务/线程池队列满…）。  
4. 若只保留一个监控维度你选什么？  
5. 下一篇前置是否补齐？

---

## 05 节奏参考

全职初学：基础 2～3 周；进阶 3～4 周。在职：每周 3×90min，每次「一节理论 + 半套 Lab」。

下一篇：\`java-fundamentals-01-platform-and-jvm\`——从 \`javac\` 与 Maven 坐标开始搭「可测」工程。
`,
  },
  {
    slug: 'java-fundamentals-01-platform-and-jvm',
    title: 'Java 基础 01：平台、JDK、字节码与可维护的最小项目骨架',
    date: '2026-05-02T08:06:00+08:00',
    description:
      '写给初级工程师：JVM/JRE/JDK 分工、源码到字节码的路径、classpath 与模块的基础心智；用 Maven 或 Gradle 搭一个最小可测试骨架。',
    series: JAVA_TEACHING_SERIES,
    tags: ['Java', 'JVM', '基础', '工程化'],
    draft: false,
    content: `> **本篇目标**：你能脱离 IDE「黑盒运行」，说清楚「编译期 vs 运行期」错误；用 Maven **或** Gradle 搭出带测试的最小工程；遇到 \`ClassNotFoundException\` / \`NoClassDefFoundError\` 知道往哪查。

---

## 1. 知识点：JVM / JRE / JDK

| 名词 | 职责 | 你该记住的一句话 |
| --- | --- | --- |
| JVM | 执行字节码、线程、GC、JIT | 跨平台跑的是「字节码 + JVM 实现」 |
| JRE | JVM + 运行类库 | 服务器只有运行环境时可能没有 \`javac\` |
| JDK | JRE + \`javac\`、诊断工具 | 开发机永远装 JDK |

**学以致用**：终端执行 \`javac -version\` 与 \`java -version\`，确认版本一致（避免「编译用 21、运行用 17」）。

---

## 2. 知识点：从 \`.java\` 到运行的链路

1. **编译**：\`javac -d out src/com/example/App.java\` → 生成 \`out/com/example/App.class\`。  
2. **运行**：\`java -cp out com.example.App\`（注意包名对应目录）。  
3. **类加载**：加载（读字节码）→链接（校验、准备、解析）→初始化（执行 static 块）。  

**学以致用**：给 \`App\` 加一个 static 块打印日志，观察「首次主动使用类」时才初始化（对比只引用常量不一定初始化——了解即可）。

---

## 3. 知识点：\`CLASSPATH\` 与模块（JPMS）

- **classpath**：告诉 JVM 去哪找 **已编译** 的类与 jar。  
- **常见错误**：少 jar → \`NoClassDefFoundError\`（链接阶段）；错类名/错包 → \`ClassNotFoundException\`。  
- **JPMS（Java 9+）**：\`module-info.java\` 控制导出包；大型项目逐步模块化。初级先会用构建工具管理依赖，少手写超长 \`-cp\`。

**对比表（排障用）**

| 异常 | 常见触发 | 第一反应 |
| --- | --- | --- |
| \`ClassNotFoundException\` | \`Class.forName\`、ClassLoader 找不到 | 检查坐标、包名、shade 规则 |
| \`NoClassDefFoundError\` | 编译有，运行时缺传递依赖 | 查依赖树 \`mvn dependency:tree\` |

---

## 4. 动手：Maven 最小骨架（核心片段）

在空目录：

\`\`\`bash
mvn -B archetype:generate   -DgroupId=com.example   -DartifactId=demo   -DarchetypeArtifactId=maven-archetype-quickstart   -DarchetypeVersion=1.5
\`\`\`

重点看 \`pom.xml\`：

- **\`groupId\`/\`artifactId\`/\`version\`**：坐标，定位 jar。  
- **\`dependencies\`**：\`junit-jupiter\` scope \`test\`。  
- **\`maven.compiler.release\`**：锁语言级别（如 17）。

**学以致用**：把以下纯函数放进 \`src/main/java\` 并写测试（边界：负数、零、100% 边界）。

\`\`\`java
public final class DiscountCalculator {
  private DiscountCalculator() {}

  /** 返回折后价（分），四舍五入；费率 [0,1]。 */
  public static long applyPercent(long priceFen, double rate) {
    if (priceFen < 0) throw new IllegalArgumentException("price");
    if (rate < 0 || rate > 1) throw new IllegalArgumentException("rate");
    return Math.round(priceFen * (1 - rate));
  }
}
\`\`\`

\`\`\`java
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

class DiscountCalculatorTest {
  @Test
  void roundsHalfUp() {
    assertEquals(901L, DiscountCalculator.applyPercent(1000L, 0.099)); // 四舍五入
  }
}
\`\`\`

---

## 5. 知识点：\`java.time\`（务必替换 \`Date\`/\`Calendar\`）

| API | 用途 |
| --- | --- |
| \`Instant\` | UTC 时间轴上的点，适合存库/日志 |
| \`ZonedDateTime\` | 带时区的墙上时间，适合展示 |
| \`Duration\` | 两个 Instant 的间隔 |
| \`DateTimeFormatter\` | 解析/格式化（线程安全） |

**学以致用**：把「用户时区展示」与「数据库存 UTC」拆清；永远不要用手动 \`+ 8 * 3600 * 1000\`。

\`\`\`java
import java.time.*;

Instant now = Instant.now();
ZonedDateTime shanghai = now.atZone(ZoneId.of("Asia/Shanghai"));
String label = DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(shanghai);
\`\`\`

---

## 6. 知识点：字符集（线上乱码首位嫌疑）

读写文件必须显式 charset：

\`\`\`java
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

String text = Files.readString(Path.of("note.txt"), StandardCharsets.UTF_8);
Files.writeString(Path.of("out.txt"), text, StandardCharsets.UTF_8);
\`\`\`

---

## 7. 自测清单（须能口述或演示）

1. 用命令行完成「编译 + 运行」你的 \`App\`，并解释 \`-cp\` 指向哪里。  
2. 故意删掉一个依赖，复现 \`NoClassDefFoundError\`，再用 \`dependency:tree\` 解释原因。  
3. \`DiscountCalculator\` 三条测试：正常、非法费率、边界四舍五入。  
4. 写出「为何要用 \`Instant\` 存库」的一句话答案。

下一篇：\`java-fundamentals-02-oop-collections-generics\`，把集合从「背 API」变成「按复杂度与语义选型」。
`,
  },
  {
    slug: 'java-fundamentals-02-oop-collections-generics',
    title: 'Java 基础 02：面向对象、集合框架与泛型（正确用上接口与算法复杂度）',
    date: '2026-05-02T08:12:00+08:00',
    description:
      '初级必读：类/接口/抽象的分工、equals 与 hashCode 契约、List/Set/Map 选型、迭代与并发修改；泛型如何避免强制转换地狱。',
    series: JAVA_TEACHING_SERIES,
    tags: ['Java', '集合', '泛型', '基础'],
    draft: false,
    content: `> **本篇目标**：你能为业务对象正确实现 \`equals\`/\`hashCode\`；能说明 \`ArrayList\`/\`HashMap\` 常见操作复杂度；能用泛型避免强转；能解释 fail-fast 与「可变对象作 key」的坑。

---

## 1. 知识点：接口 / 抽象类 / 组合

| 机制 | 何时用 | 反模式 |
| --- | --- | --- |
| \`interface\` | 多种实现、对外契约 | 接口膨胀成「上帝接口」 |
| \`abstract class\` | 复用骨架，保留一步抽象 | 深层继承树 |
| 组合 | 「有一个」能力委托 | 仅为复用代码而继承 |

**学以致用**：价格策略 \`interface Pricing { Money quote(Order o); }\`，促销/会员各实现一类，上层只依赖接口。

---

## 2. 知识点：\`equals\` 与 \`hashCode\` 契约（逐项）

对用作 \`HashMap\`/\`HashSet\` 元素的类型：

1. **自反**：\`x.equals(x)\`。  
2. **对称**：\`x.equals(y)\` ⇒ \`y.equals(x)\`。  
3. **传递**：相等关系传递。  
4. **一致**：不变对象多次比较结果不变。  
5. **对 null 返回 false**。  
6. **hashCode 一致**：若相等，则 \`hashCode\` 必须相同；反之不必。  

**实践**：用 IDE 生成或 Java 16+ \`record\`（自动生成 equals/hashCode），并对值字段设置为 \`final\`。

**反例（必须能讲清）**：

\`\`\`java
import java.util.*;

public class BadKey {
  String name;
  BadKey(String name) { this.name = name; }
  @Override public boolean equals(Object o) {
    return o instanceof BadKey b && Objects.equals(name, b.name);
  }
  @Override public int hashCode() { return Objects.hash(name); }

  public static void main(String[] args) {
    Map<BadKey, String> map = new HashMap<>();
    BadKey k = new BadKey("a");
    map.put(k, "v");
    k.name = "b";
    System.out.println(map.get(k)); // 可能 null：破坏了 hash 桶假设
  }
}
\`\`\`

---

## 3. 知识点：List 选型

| 实现 | \`get(i)\` | 尾部 \`add\` | 头插/中间插 | 备注 |
| --- | --- | --- | --- | --- |
| \`ArrayList\` | O(1) 摊销 | 均摊 O(1) | O(n) | 默认首选；内部数组扩容（通常 1.5×） |
| \`LinkedList\` | O(n) | O(1) | O(1) 节点 | 随机访问差；多数业务不如 ArrayList |

**学以致用**：大量随机下标访问 → \`ArrayList\`；实现 LRU 常配合 \`LinkedHashMap\` 而非盲目 \`LinkedList\`。

---

## 4. 知识点：Map / Set

| 类型 | 有序性 | 底层直觉 |
| --- | --- | --- |
| \`HashMap\` | 无序 | 数组 + 链表/树 |
| \`LinkedHashMap\` | 插入顺序 | 额外双向链表 |
| \`TreeMap\` | 键排序 | 红黑树，\`O(log n)\` |

\`HashMap.get\` 平均 O(1)；\`TreeMap\` 需要 \`Comparable\` 或 \`Comparator\`。

---

## 5. 知识点：迭代与 fail-fast

\`\`\`java
List<Integer> xs = new ArrayList<>(List.of(1, 2, 3));
for (Integer x : xs) {
  if (x == 2) xs.remove(x); // ConcurrentModificationException
}
\`\`\`

正确姿势：用 \`Iterator.remove()\`、\`removeIf\`，或收集后再删。

---

## 6. 知识点：泛型与 PECS

**PECS**：Producer Extends, Consumer Super。

- 只**读出** \`T\`：\`List<? extends T>\`  
- 只**写入** \`T\`：\`List<? super T>\`  

**学以致用**：工具方法拷贝：

\`\`\`java
public static <T> void copy(List<? extends T> src, List<? super T> dst) {
  for (T t : src) dst.add(t);
}
\`\`\`

---

## 7. 知识点：\`Stream\` 初用（注意副作用）

\`\`\`java
Map<String, Long> freq = words.stream()
    .collect(Collectors.groupingBy(w -> w, Collectors.counting()));
\`\`\`

避免在 \`forEach\` 里修改外部可变集合 unless 清楚并发语义。

---

## 8. Lab：购物车

- \`record LineItem(ProductId id, int qty, Money price) {}\`  
- \`Map<ProductId, LineItem> lines\`；合并同款商品数量。  
- 覆盖 \`ProductId\` 的 equals/hashCode（或 record）。

---

## 9. 自测清单

1. 解释 \`ArrayList\` 扩容触发点与摊销意义。  
2. 为何「可变对象作 HashMap 键」危险？  
3. 写 \`static <T extends Comparable<T>> T max(List<T> xs)\` 空表抛 \`NoSuchElementException\`。  
4. fail-fast 与设计并发修改的关系？

下一篇：异常、NIO.2 与线程池入门。
`,
  },
  {
    slug: 'java-fundamentals-03-exceptions-io-concurrency-intro',
    title:
      'Java 基础 03：异常体系、try-with-resources、IO/NIO.2 入门与并发初探',
    date: '2026-05-02T08:18:00+08:00',
    description:
      '初级收尾篇：受检/非受检异常取舍、异常链与日志；现代 IO 用法；线程与 synchronized 的最小正确用法，为进阶 JUC 铺路。',
    series: JAVA_TEACHING_SERIES,
    tags: ['Java', '异常', 'IO', '并发'],
    draft: false,
    content: `> **本篇目标**：你能用异常表达失败并保留链；用 \`try-with-resources\` 关闭资源；用 \`Files\`/\`Path\` 安全读写文本；用 \`ExecutorService\` 做批量并行并正确 \`shutdown\`。

---

## 1. 知识点：异常层次

\`\`\`
Throwable
├── Error          # 严重系统问题，通常不捕获
└── Exception
    ├── RuntimeException  # 非受检：编程错误/不可恢复
    └── 其他受检异常       # 调用方必须处理或 throws
\`\`\`

**取舍**：业务可恢复 → 受检或 Result 对象；编程错误/断言失败 → 非受检。不要在循环里 \`catch\` 后空块。

**异常链**：

\`\`\`java
try {
  Files.readString(Path.of("x"));
} catch (IOException e) {
  throw new IllegalStateException("load config failed", e);
}
\`\`\`

---

## 2. 知识点：\`try-with-resources\`

\`\`\`java
try (var in = Files.newInputStream(Path.of("data.bin"))) {
  // use
}
\`\`\`

任何 \`AutoCloseable\` 适用；禁止在 finally 里重复 close 导致掩盖异常——优先 try-with-resources（支持 suppressed）。

---

## 3. 知识点：NIO.2 常用 API

| API | 说明 |
| --- | --- |
| \`Paths.get\` / \`Path.of\` | 路径 |
| \`Files.readString\` / \`writeString\` | 小文本 |
| \`Files.lines\` | \`Stream<String>\`，需 try-with-resources |
| \`Files.walk\` | 遍历树 |

**大文件**：用 \`BufferedReader\` + 行迭代，避免 \`readAllBytes()\` OOM。

\`\`\`java
long lines = 0;
try (var br = Files.newBufferedReader(Path.of("big.log"), StandardCharsets.UTF_8)) {
  while (br.readLine() != null) lines++;
}
\`\`\`

---

## 4. 知识点：并发入门

### 4.1 \`synchronized\` 保护共享可变状态

\`\`\`java
class Counter {
  private int n;
  synchronized void inc() { n++; }
  synchronized int get() { return n; }
}
\`\`\`

\`n++\` 非原子：读-改-写，必须同步或使用 \`AtomicInteger\`。

### 4.2 \`volatile\`

保证可见性，不保证 \`i++\` 复合操作原子性。

### 4.3 \`ExecutorService\`

\`\`\`java
import java.util.concurrent.*;

try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
  Future<String> f = pool.submit(() -> "ok");
  System.out.println(f.get(1, TimeUnit.SECONDS));
}
\`\`\`

**学以致用**：批量任务用 \`invokeAll\`；关闭时 \`shutdown\` + \`awaitTermination\`，任务需响应中断。

---

## 5. Lab

1. 递归统计目录下 \`.java\` 文件非空行数（跳过 \`//\`、\`/* */\` 可简化）。  
2. 用固定 4 线程池并行计算多个文件的 SHA-256 十六进制字符串，汇总到 \`Map<Path,String>\`。

---

## 6. 自测清单

1. 受检 vs 非受检各自一例。  
2. \`try-with-resources\` 与单次 finally close 的差异（suppressed）。  
3. 为何线程池必须关闭？不关闭会怎样？  
4. \`volatile\` 能否替代 \`synchronized\` 做 counter？

基础篇结束。进阶篇从 JMM 与 JUC 开始。
`,
  },
  {
    slug: 'java-advanced-01-juc-and-async',
    title: 'Java 进阶 01：JUC、线程池、CompletableFuture 与异步组合实战',
    date: '2026-05-02T08:24:00+08:00',
    description:
      '写给高级工程师：happens-before 直觉、Lock 与原子类、ExecutorService 参数含义、超时/取消/组合异步；常见踩坑与背压入门。',
    series: JAVA_TEACHING_SERIES,
    tags: ['Java', '并发', 'JUC', '异步'],
    draft: false,
    content: `> **本篇目标**：能画出 happens-before 关系；能配置 \`ThreadPoolExecutor\` 而不是只会 \`Executors.newFixedThreadPool\`；能用 \`CompletableFuture\` 组合异步并在全链路加超时；知道 MDC/trace id 在异步里会丢。

---

## 1. 知识点：JMM 与 happens-before（最小集）

- **程序次序**：同线程内语句顺序（在不重排破坏 as-if-serial 前提下）。  
- **监视器锁**：解锁 happens-before 后续加锁同锁的其他线程。  
- **\`volatile\` 写** happens-before **后续 volatile 读**。  
- **\`Thread.start\`** happens-before 新线程任何动作；**join** 返回 happens-before 后续。  

**学以致用**：解释「未同步读共享字段可能永远看到 false」的双检锁为何需要 \`volatile\` 或静态 holder。

---

## 2. 知识点：\`ReentrantLock\` vs \`synchronized\`

| 能力 | \`synchronized\` | \`ReentrantLock\` |
| --- | --- | --- |
| 可中断等待 | 否 | \`lockInterruptibly\` |
| 尝试超时 | 否 | \`tryLock\` |
| 条件队列 | \`wait/notify\` | \`Condition\` |

---

## 3. 知识点：\`ThreadPoolExecutor\` 七个参数

\`\`\`java
new ThreadPoolExecutor(
    4,                      // corePoolSize
    8,                      // maximumPoolSize
    60L, TimeUnit.SECONDS, // keepAliveTime
    new ArrayBlockingQueue<>(1000),
    Executors.defaultThreadFactory(),
    new ThreadPoolExecutor.CallerRunsPolicy()
);
\`\`\`

**必答**：任务进来先扩 core → 入队 → 扩到 max → 触发拒绝策略。**无界队列 + 固定 max** 会让 max 形同虚设。

---

## 4. 知识点：\`CompletableFuture\`

| 方法 | 含义 |
| --- | --- |
| \`supplyAsync\` | 有返回值异步 |
| \`thenApply\` | 转换 |
| \`thenCompose\` | 扁平化异步 |
| \`thenCombine\` | 合并两个独立异步 |
| \`orTimeout\` / \`completeOnTimeout\` | Java 9+ 超时 |

\`\`\`java
CompletableFuture<String> a = CompletableFuture.supplyAsync(() -> slowA(), pool);
CompletableFuture<String> b = CompletableFuture.supplyAsync(() -> slowB(), pool);
String out = a.thenCombine(b, (x, y) -> x + y).orTimeout(2, TimeUnit.SECONDS).join();
\`\`\`

**坑**：业务线程池与 IO 线程池隔离；异常用 \`exceptionally\`/\`handle\` 统一映射；MDC 需手动传递或用框架封装。

---

## 5. 知识点：\`Semaphore\` 限流

\`\`\`java
Semaphore sem = new Semaphore(10);
sem.acquire();
try {
  callRemote();
} finally {
  sem.release();
}
\`\`\`

---

## 6. 知识点：\`ConcurrentHashMap.computeIfAbsent\` 提醒

长耗时计算禁止在 \`computeIfAbsent\` 里做且锁粒度可能阻塞其他桶——热点 key 下会放大停顿。复杂场景考虑分段加载或异步刷新。

---

## 7. Lab

并行调用三个模拟延迟服务（\`Thread.sleep\`），合并 JSON 字段；全链路 2s 超时，超时返回降级对象；统计超时次数用 \`LongAdder\`。

---

## 8. 自测清单

1. 说出两条 happens-before 规则并举例。  
2. \`CallerRunsPolicy\` 对系统负载意味着什么？  
3. \`thenCompose\` 与 \`thenApply\` 区别？  
4. 为何异步链路里日志找不到 traceId？

下一篇：JVM 与 GC。
`,
  },
  {
    slug: 'java-advanced-02-jvm-and-gc',
    title: 'Java 进阶 02：JVM 运行时、GC 与调参入门（从现象到证据）',
    date: '2026-05-02T08:30:00+08:00',
    description:
      '堆/栈/元空间、对象分配与 TLAB、常见 GC 算法对比、GC 日志与 jcmd/jstack 入门；Stop-The-World 与延迟取舍，避免迷信参数大全。',
    series: JAVA_TEACHING_SERIES,
    tags: ['Java', 'JVM', 'GC', '性能'],
    draft: false,
    content: `> **本篇目标**：能说清堆、栈、元空间职责；知道 Young/Old GC 直觉；能打开 GC 日志并从 pause 与频次入手分析；避免「盲目 -Xmx」。

---

## 1. 知识点：运行时数据区（HotSpot 心智）

| 区域 | 存什么 | GC 参与 |
| --- | --- | --- |
| 虚拟机栈 | 栈帧、局部变量 | 否 |
| 堆 | 对象实例 | 是（主战场） |
| 元空间 | 类元数据 | 部分回收/卸载 |
| 直接内存 | NIO Buffer 等 | \`Cleaner\`，需警惕泄漏 |

---

## 2. 知识点：分代收集直觉

- **Young GC**：短命对象批量回收，通常频繁但 pause 较短（取决于收集器与存活）。  
- **Old/Major**：老年代不足或晋升失败触发；pause 往往更长。  
- **Full GC**：整堆压缩类操作（口语常混用）；需看具体收集器日志。

**分配速率**：单位时间新建对象量过高 → Young GC 过密 → CPU 消耗在 GC。

---

## 3. 知识点：常用 JVM 参数（JDK 11+，示例）

> 具体收集器名随 JDK 变化，以官方文档为准；原则是「先开日志，再调堆」。

\`\`\`text
-Xms2g -Xmx2g
-XX:+AlwaysPreTouch
-XX:+UseStringDeduplication   # 视场景
-Xlog:gc*:file=gc.log:time,uptime,level,tags
\`\`\`

**学以致用**：堆 \`-Xms=-Xmx\` 减少 resize；生产开启 GC 日志轮转。

---

## 4. 知识点：诊断命令（示例）

\`\`\`bash
jcmd <pid> VM.flags
jcmd <pid> GC.heap_info
jstack <pid> > threads.txt
\`\`\`

CPU 高：优先线程栈看锁与 RUNNABLE 热点；再结合剖析工具。

---

## 5. Lab

写循环分配短命 \`byte[]\`（例如 1MB × N），固定堆 512MB，打开 \`-Xlog:gc*\`，记录 Young GC 次数与最大 pause。

---

## 6. 自测清单

1. 栈溢出 vs 堆 OOM 典型栈特征？  
2. 为何「增大堆」不一定降低 pause？  
3. Young GC 过密可能说明什么？  
4. 如何用 \`jstack\` 怀疑死锁？

下一篇：Spring 事务与集成边界。
`,
  },
  {
    slug: 'java-advanced-03-spring-ecosystem',
    title: 'Java 进阶 03：Spring 生态与典型服务端架构（IoC、AOP、事务与集成）',
    date: '2026-05-02T08:36:00+08:00',
    description:
      'Spring Boot 心智：依赖注入与 Bean 生命周期、AOP 的典型用途、声明式事务传播与失效场景；与 Web、持久化、缓存、消息的常见集成边界。',
    series: JAVA_TEACHING_SERIES,
    tags: ['Java', 'Spring', '架构', '后端'],
    draft: false,
    content: `> **本篇目标**：能描述 Bean 生命周期与代理对象；能解释 \`@Transactional\` 传播、\`rollbackFor\`、只读事务；能列举至少三种「事务不生效」；能说清缓存与 DB 一致性常见路径。

---

## 1. 知识点：IoC 容器要点

- **BeanDefinition → 实例化 → 属性注入 → 初始化回调 → 就绪**。  
- **作用域**：\`singleton\`（默认）、\`prototype\`、\`request\`/\`session\`（Web）。  
- **循环依赖**：Spring 用三级缓存解决部分字段注入场景；构造器循环仍应避免——设计问题。

---

## 2. 知识点：AOP 代理

| 方式 | 适用 | 限制 |
| --- | --- | --- |
| JDK 动态代理 | 接口 | 只能代理接口方法 |
| CGLIB | 类 | \`final\` 方法不可拦截 |

**自调用陷阱**：同类 \`this.foo()\` 不走代理 → \`@Transactional\`/\`@Cacheable\` 可能失效。

**修复**：拆 \`@Service\`、自注入（谨慎）、或 \`AopContext.currentProxy()\`（需开启 expose）。

---

## 3. 知识点：\`@Transactional\`

**传播**（常用）：

| 传播 | 语义 |
| --- | --- |
| \`REQUIRED\`（默认） | 加入当前事务；无则新建 |
| \`REQUIRES_NEW\` | 挂起当前，开新事务 |
| \`NESTED\` | 嵌套保存点（DataSource 支持） |

**rollbackFor**：默认不回滚受检异常——业务异常若是 checked，必须指定。

\`\`\`java
@Transactional(rollbackFor = Exception.class)
public void placeOrder(...) { ... }
\`\`\`

**只读**：优化 hint + 避免无意写入；仍可能因驱动忽略而不绝对。

---

## 4. 知识点：事务边界设计

- 远程 RPC、发消息、跨库：**与本地事务解耦**（Outbox 见精通篇）。  
- 重逻辑移出事务：缩短锁持有，降低死锁概率。

---

## 5. 知识点：缓存三连击

| 问题 | 处置思路 |
| --- | --- |
| 穿透 | 布隆过滤器或缓存空值（短 TTL） |
| 击穿 | 热点互斥或逻辑过期 |
| 雪崩 | TTL 抖动、集群、限流 |

更新路径：**先 DB 再删缓存** 或 **订阅 binlog**——团队选一种并文档化。

---

## 6. Lab（迷你转账）

- \`transfer(from,to,amount)\`：\`REQUIRES_NEW\` 审计日志 vs \`REQUIRED\` 同事务对比。  
- 故意同类 \`private @Transactional\` 自调用观察失效。

---

## 7. 自测清单

1. 三种事务失效场景。  
2. \`REQUIRES_NEW\` 典型用途？  
3. 缓存与 DB 不一致的常见触发？  
4. JDK 代理为何导致注入自身失效？

进阶篇结束。
`,
  },
  {
    slug: 'java-expert-01-distributed-consistency',
    title: 'Java 精通 01：分布式一致性、事务模式与幂等——从理论到可交付方案',
    date: '2026-05-02T08:42:00+08:00',
    description:
      '面向资深/专家：CAP 的实践读法、BASE、2PC/Saga/TCC 的取舍、Outbox 与消息语义；Java 业务里如何实现幂等与补偿的可观测闭环。',
    series: JAVA_TEACHING_SERIES,
    tags: ['Java', '分布式', '一致性', '架构'],
    draft: false,
    content: `> **本篇目标**：能把 CAP 讲成工程取舍；能为订单类业务画状态机；能设计幂等键与去重表；能口述 Outbox 解决的原子性问题；知道至少一次投递下为何必须幂等。

---

## 1. 知识点：CAP 的工程读法

分区发生时：**一致性 vs 可用性**拉扯。多数互联网业务选择「最终一致 + 可观测补偿」，而不是强行线性一致一切读。

---

## 2. 知识点：订单状态机（示例）

| 状态 | 允许事件 | 下一状态 |
| --- | --- | --- |
| CREATED | PAY | PAID |
| PAID | SHIP | SHIPPED |
| SHIPPED | CONFIRM | DONE |

非法迁移返回业务错误码；状态迁移与幂等键同事务写入。

---

## 3. 知识点：幂等表（示意 DDL）

\`\`\`sql
CREATE TABLE idempotency (
  biz_key    VARCHAR(64) PRIMARY KEY,
  response   TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
\`\`\`

处理流程：\`INSERT\` 幂等键冲突 → 直接返回历史响应；成功则写入响应 JSON。

并发：\`PRIMARY KEY\` + 捕获 duplicate key，或用 DB 事务隔离。

---

## 4. 知识点：Saga

长事务拆本地事务 + 补偿：每笔本地事务可提交，失败执行逆操作。**要点**：补偿也要幂等；状态机记录当前步骤。

---

## 5. 知识点：Outbox

问题：**写库成功、发消息失败** → 不一致。

做法：业务事务内写 \`outbox\` 表；异步线程扫描 \`published=false\` 投递 MQ；成功后标记。

\`\`\`sql
CREATE TABLE outbox (
  id BIGSERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL
);
\`\`\`

---

## 6. 知识点：消息语义

| 语义 | 含义 | 消费者 |
| --- | --- | --- |
| at-most-once | 可能丢 | 简单 |
| at-least-once | 可能重复 | 必须幂等 |
| exactly-once | 端到端代价高 | 事务消息或幂等 + 去重 |

---

## 7. Lab

画出「下单→扣库存→支付回调」三状态机；写出幂等键命名规范（\`bizType + bizId + operation\`）；伪代码 Outbox 发布器循环。

---

## 8. 自测清单

1. Outbox 相对「先发消息后写库」解决什么？  
2. Saga 补偿失败怎么办？  
3. 为何不能用 wall clock 做全局顺序？  
4. at-least-once + 非幂等 Consumer 会怎样？
`,
  },
  {
    slug: 'java-expert-02-performance-and-observability',
    title: 'Java 精通 02：性能剖析、容量规划与可观测性（指标 · 日志 · 链路）',
    date: '2026-05-02T08:48:00+08:00',
    description:
      '专家必备：从基准测试误区到火焰图/JFR、线程与分配剖析；RED/USE 类指标、结构化日志、分布式追踪与 SLO；压测如何服务于容量决策。',
    series: JAVA_TEACHING_SERIES,
    tags: ['Java', '性能', '可观测性', 'SLO'],
    draft: false,
    content: `> **本篇目标**：能制定 RED 指标；能解释 p99 抬升而均值不变；能列出基准测试误区；能设计结构化日志字段；能把压测结论映射到扩容/限流/缓存。

---

## 1. 知识点：Golden signals（RED + 扩展）

| 信号 | 例子 |
| --- | --- |
| Rate | QPS |
| Errors | 5xx 比例 |
| Duration | p95/p99 延迟 |

Saturation：线程池队列长度、连接池等待时间、CPU runnable 队列。

---

## 2. 知识点：分位数比均值诚实

p99 变差常由尾部锁等待、GC pause、偶发慢查询引起——均值仍「好看」。

---

## 3. 知识点：基准测试误区（JMH 心智）

- 未预热 JIT  
- 死代码消除  
- 共享计数竞争  
- 测试数据不符合生产分布  

微基准结论默认「仅供参考」，上线以线上剖析为准。

---

## 4. 知识点：剖析路径

1. 外部依赖 RT / 错误率  
2. 线程栈锁竞争  
3. GC 日志 pause  
4. CPU 火焰图热点  

---

## 5. 知识点：日志字段规范（示例）

\`\`\`json
{"ts":"ISO-8601","level":"INFO","traceId":"...","spanId":"...","svc":"order","msg":"placed","orderId":"..."}
\`\`\`

规则：**稳定字段名**、**禁止拼接 PII**、采样降本。

---

## 6. 知识点：SLO 模板

- **SLI**：成功请求延迟 < 300ms 的比例  
- **SLO**：30 天内 SLI ≥ 99.9%  
- **错误预算**：1 - SLO，用于发布节奏

---

## 7. Lab

写出你负责服务的 3 个 SLI、对应的采集方式（Micrometer/Prometheus 等）、报警阈值与「仅工单不电话」的降噪策略。

---

## 8. 自测清单

1. p99 上升排查顺序？  
2. 线程池队列持续增长意味着什么？  
3. 为何日志采样要与 trace 关联？  
4. 错误预算耗尽时团队该做什么？
`,
  },
  {
    slug: 'java-expert-03-architecture-and-ddd',
    title: 'Java 精通 03：架构演进、模块化单体与领域建模（专家级的边界与治理）',
    date: '2026-05-02T08:54:00+08:00',
    description:
      '微服务不是默认答案：模块化单体、限界上下文、聚合与领域事件、API 版本化与契约测试；多团队协作下的架构治理与演进策略。',
    series: JAVA_TEACHING_SERIES,
    tags: ['Java', '架构', 'DDD', '微服务'],
    draft: false,
    content: `> **本篇目标**：能解释限界上下文；能划定聚合一致性边界；能写一页 ADR；能批判「为微服务而微服务」。

---

## 1. 知识点：模块化单体

在单部署单元内用 **Maven/Gradle 模块 + 包边界 + ArchUnit** 约束依赖，降低分布式复杂度。

---

## 2. 知识点：限界上下文（例：电商）

| 上下文 | 核心概念 | 对外接口 |
| --- | --- | --- |
| 目录 | SKU、类目 | 查询 API |
| 库存 | 预留、扣减 | 预留命令 |
| 订单 | 订单、支付状态 | 下单用例 |

上下文之间 **防腐层** 翻译 DTO，禁止领域模型泄漏。

---

## 3. 知识点：聚合

一致性边界：**一个事务修改一个聚合根**；跨聚合用最终一致（事件/消息）。

反模式：巨型聚合导致长事务、热点锁。

---

## 4. 知识点：API 演进

- 兼容字段只增不减（或通过版本隔离）  
- 破坏性变更：双写、灰度、回放测试  
- **契约测试**：消费者驱动契约（Pact）或提供者验证

---

## 5. 知识点：ADR 模板

\`\`\`text
# ADR-12：订单拆分库存上下文

## 状态
Accepted

## 上下文
单体耦合导致发布停摆...

## 决策
引入库存服务，订单通过同步 API 预留...

## 后果
+ 独立扩缩容
- RT 依赖增加，需要超时与舱壁
\`\`\`

---

## 6. Lab

为你当前系统画上下文映射（upstream/downstream）；写 ADR 记录「为何不拆支付」。

---

## 7. 自测清单

1. 聚合 vs 实体 vs 值对象职责？  
2. 防腐层解决什么？  
3. 两个「伪微服务」信号？  
4. ADR 与 RFC 差异心智？

系列闭环：回到 \`java-00-roadmap\` 做分层复盘，把 Lab 产物沉淀为团队 wiki。
`,
  },
];
