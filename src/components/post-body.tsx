import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = { content: string };

export function PostBody({ content }: Props) {
  return (
    <div className="prose prose-stone max-w-none dark:prose-invert prose-headings:font-serif prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-2xl prose-h3:mt-8 prose-p:leading-[1.8] prose-a:text-[var(--accent)] prose-a:no-underline prose-a:transition-colors hover:prose-a:underline prose-blockquote:border-l-[var(--accent)] prose-blockquote:text-stone-600 dark:prose-blockquote:text-stone-400 prose-code:rounded prose-code:bg-stone-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.875em] prose-code:font-medium prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-stone-800 prose-pre:rounded-xl prose-pre:border prose-pre:border-stone-200/50 prose-pre:bg-stone-950 prose-pre:text-stone-100 dark:prose-pre:border-stone-800 dark:prose-pre:bg-stone-950 prose-img:rounded-xl prose-img:shadow-md prose-hr:border-[var(--border)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
