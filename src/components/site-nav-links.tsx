'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * 站点主导航链接。
 *
 * 由 `SiteHeader`（顶部悬浮 Dock）和移动端折叠面板共同使用。该组件只负责渲染
 * 链接列表，不再耦合搜索 / 主题切换 / 抽屉等控件 —— 这些被上移至 `SiteHeader`，
 * 以便适配「顶 / 底 / 左 / 右」四种悬浮位置。
 */
const nav = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '文章' },
  { href: '/resume', label: '简历' },
  { href: '/changelog', label: '版本历史' },
  { href: '/agent', label: 'AI 向导' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type NavOrientation = 'horizontal' | 'vertical';

interface SiteNavLinksProps {
  /** 横向（顶 / 底悬浮）或纵向（左 / 右悬浮）。 */
  orientation?: NavOrientation;
  /** 字号档位，纵向模式忽略此项以保证窄边栏可读。 */
  size?: 'sm' | 'md';
  /** 点击链接后的回调（用于关闭移动端抽屉等场景）。 */
  onNavigate?: () => void;
  className?: string;
  /** 控制 ARIA 标签，避免重复 landmark；默认 'nav'。 */
  as?: 'nav' | 'div';
  ariaLabel?: string;
}

export function SiteNavLinks({
  orientation = 'horizontal',
  size = 'md',
  onNavigate,
  className = '',
  as = 'nav',
  ariaLabel = '主导航',
}: SiteNavLinksProps) {
  const pathname = usePathname() ?? '';
  const vertical = orientation === 'vertical';

  const listCls = [
    'flex',
    vertical
      ? 'flex-col items-stretch gap-0.5'
      : 'flex-row items-center gap-0.5',
    className,
  ].join(' ');

  const items = nav.map((item) => {
    const active = isActive(pathname, item.href);
    const baseCls = [
      'relative font-medium transition-colors',
      vertical
        ? 'rounded-xl px-2 py-2 text-center text-[11px] leading-tight'
        : size === 'sm'
          ? 'rounded-full px-3 py-1.5 text-xs'
          : 'rounded-full px-3 py-2 text-sm lg:px-4',
      active
        ? 'cursor-default text-stone-900 dark:text-stone-50'
        : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-50',
    ].join(' ');
    const content = (
      <>
        {active ? (
          <span className="absolute inset-0 rounded-[inherit] bg-stone-100 dark:bg-stone-800/80" />
        ) : null}
        <span className="relative block whitespace-nowrap">{item.label}</span>
      </>
    );
    return active ? (
      <span key={item.href} aria-current="page" className={baseCls}>
        {content}
      </span>
    ) : (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={baseCls}
      >
        {content}
      </Link>
    );
  });

  if (as === 'nav') {
    return (
      <nav aria-label={ariaLabel} className={listCls}>
        {items}
      </nav>
    );
  }
  return <div className={listCls}>{items}</div>;
}
