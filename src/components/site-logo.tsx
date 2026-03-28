/**
 * 站点字标图示：与 `public/logo.svg` 同源矢量，使用 `currentColor` 以随顶栏主题变化。
 */
export function SiteLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 124"
      fill="none"
      className={className}
      aria-hidden
    >
      <g
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M38 8 L31 20" />
        <path d="M62 8 L69 20" />
        <path d="M20 30 C36 24 52 24 68 30 C52 36 36 38 20 34" />
        <path d="M22 36 C40 42 58 42 80 34" />
        <path d="M18 46 C40 38 62 40 82 48 C64 58 42 58 24 52" />
        <path d="M50 42 L50 78" />
        <path d="M28 56 C44 50 60 52 72 62 C56 70 36 68 24 62" />
        <path d="M34 64 C48 60 58 64 66 72 C54 80 40 78 30 72" />
        <path d="M50 74 C48 90 46 108 44 118" />
      </g>
    </svg>
  );
}
