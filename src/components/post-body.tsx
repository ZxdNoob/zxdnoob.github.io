import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = { content: string };

/**
 * Markdown 正文：使用 `remark-gfm` 支持表格、任务列表等 GitHub 风格语法；
 * `prose` 类来自 `@tailwindcss/typography`（在 `globals.css` 中通过 `@plugin` 启用）。
 */
export function PostBody({ content }: Props) {
  return (
    <div className="prose prose-stone max-w-none dark:prose-invert prose-headings:font-serif prose-a:text-amber-800 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-amber-300 prose-pre:bg-stone-900 prose-pre:text-stone-100 dark:prose-pre:bg-stone-950">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
