'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type RevealVariant = 'default' | 'scale';

/**
 * 滚动显隐（Scroll Reveal）包装组件。
 *
 * ## 为什么不用纯 CSS？
 * - 纯 CSS 很难做到“进入视口时才触发一次动画”（尤其在复杂布局/长列表里）
 * - IntersectionObserver 是浏览器原生能力，性能好、无需监听 scroll
 *
 * ## 可访问性与动效偏好
 * - 遵循 `prefers-reduced-motion: reduce`：用户不希望动画时，直接显示内容
 *
 * ## 和样式的配合
 * - 该组件只负责在合适时机加上 `.revealed`
 * - 具体的过渡曲线/位移在 `globals.css` 的 `[data-reveal]` 规则中统一管理
 */
export function ScrollReveal({
  children,
  variant = 'default',
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) {
      el.classList.add('revealed');
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (delay > 0) {
              window.setTimeout(
                () => entry.target.classList.add('revealed'),
                delay,
              );
            } else {
              entry.target.classList.add('revealed');
            }
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      data-reveal={variant}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
      // 保证 SSR/CSR 首次渲染属性一致，避免 hydration mismatch
      className={[className, 'revealed'].filter(Boolean).join(' ')}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
