import { site } from "@/lib/site";

/**
 * 页脚：版权与一句标语；可按需加入 RSS、备案号、社交链接等。
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-stone-200/80 py-10 dark:border-stone-800/80">
      <div className="mx-auto max-w-3xl px-4 text-center text-sm text-stone-500 dark:text-stone-500">
        <p>
          © {year} {site.author} · 用心记录，认真生活
        </p>
      </div>
    </footer>
  );
}
