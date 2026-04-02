'use client';

/**
 * 文章页顶部阅读进度条：在 `startSelector`～`endSelector` 之间映射滚动比例为宽度。
 */
import { useEffect, useState } from 'react';

type Props = {
  /**
   * 进度从该元素顶部开始计算（一般为整篇文章容器）。
   * 找不到时默认从页面顶部开始。
   */
  startSelector?: string;
  /**
   * 进度条以该元素的“内容末尾”为 100%（当视口底部到达元素底部时）。
   * 找不到时会回退到整页滚动高度计算。
   */
  endSelector?: string;
};

/** 将进度限制在 [0,1]，避免 NaN 或越界。 */
function clamp01(v: number) {
  if (Number.isNaN(v)) return 0;
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

export function ScrollProgress({
  startSelector,
  endSelector = '#post-content',
}: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function computeProgress() {
      const { scrollTop, scrollHeight, clientHeight } =
        document.documentElement;

      const startEl = startSelector
        ? document.querySelector<HTMLElement>(startSelector)
        : null;
      const endEl = endSelector
        ? document.querySelector<HTMLElement>(endSelector)
        : null;

      if (endEl) {
        const endRect = endEl.getBoundingClientRect();
        const endBottom = endRect.bottom + window.scrollY;
        const end = endBottom - clientHeight; // 视口底部到达正文底部 => 100%

        const start = startEl
          ? startEl.getBoundingClientRect().top + window.scrollY
          : 0;

        const denom = end - start;
        if (denom <= 0) {
          setProgress(1);
          return;
        }
        setProgress(clamp01((scrollTop - start) / denom));
        return;
      }

      // Fallback: entire page scroll
      const max = scrollHeight - clientHeight;
      setProgress(clamp01(max > 0 ? scrollTop / max : 0));
    }

    window.addEventListener('scroll', computeProgress, { passive: true });
    window.addEventListener('resize', computeProgress, { passive: true });
    computeProgress();
    return () => {
      window.removeEventListener('scroll', computeProgress);
      window.removeEventListener('resize', computeProgress);
    };
  }, [startSelector, endSelector]);

  return (
    <div
      className="fixed top-0 left-0 z-[200] h-[2px] w-full bg-stone-200/80 dark:bg-stone-800/60"
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="阅读进度"
    >
      <div
        className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 dark:from-amber-400 dark:via-orange-400 dark:to-amber-300"
        style={{
          width: `${progress * 100}%`,
          transition: 'width 50ms linear',
        }}
      />
    </div>
  );
}
