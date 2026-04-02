'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 数字滚动计数器（用于首页统计卡片）。
 *
 * ## 交互规则
 * - 元素进入视口后才开始计数（避免在首屏外“白跑”动画）
 * - 只执行一次（`started` ref 防止重复触发）
 *
 * ## 动画实现
 * - 使用 `requestAnimationFrame`，避免 setInterval 的抖动与不准确
 * - 使用三次缓动（easeOutCubic）：开始快、结尾慢，更自然
 *
 * 注意：
 * - 这里只做展示层动画，不做任何业务计算；业务值由外部传入 `target`
 */
export function AnimatedCounter({
  target,
  suffix = '',
  duration = 1800,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();

          function step(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          }

          requestAnimationFrame(step);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}
      {suffix}
    </span>
  );
}
