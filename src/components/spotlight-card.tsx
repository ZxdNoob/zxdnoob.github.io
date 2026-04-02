'use client';

import { useCallback, useRef, type ReactNode } from 'react';

/**
 * Spotlight Card：鼠标跟随的“聚光灯”卡片。
 *
 * 机制：
 * - 监听 `onMouseMove`，把鼠标在卡片内的相对坐标写入 CSS 变量
 * - `globals.css` 的 `.spotlight-card::after` 使用 radial-gradient 读取变量绘制光斑
 *
 * 这样做的好处：
 * - 把“绘制”交给 CSS（GPU 友好），JS 只更新两个变量
 * - 不依赖 canvas，不会增加复杂度
 *
 * 注意：
 * - 该效果只在 hover 触发；移动端无鼠标时自然不会出现，避免干扰
 */
export function SpotlightCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--spotlight-x', `${x}px`);
    el.style.setProperty('--spotlight-y', `${y}px`);
  }, []);

  return (
    <div
      ref={ref}
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
    >
      {children}
    </div>
  );
}
