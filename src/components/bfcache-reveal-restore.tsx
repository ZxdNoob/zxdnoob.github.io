'use client';

import { useEffect } from 'react';

function revealAll() {
  document
    .querySelectorAll<HTMLElement>('[data-reveal]:not(.revealed)')
    .forEach((el) => el.classList.add('revealed'));
}

/**
 * bfcache / 返回兜底：
 * 部分浏览器从 `/sitemap.xml` 返回时会恢复旧 DOM，但 IntersectionObserver 动效不一定重跑，
 * 导致 `[data-reveal]` 永久停留在隐藏态（opacity: 0）。
 *
 * 这里在 `pageshow`/`popstate` 时多次尝试 reveal，覆盖不同浏览器的恢复时序。
 */
export function BfcacheRevealRestore() {
  useEffect(() => {
    function runBurst() {
      revealAll();
      requestAnimationFrame(() => {
        revealAll();
        requestAnimationFrame(() => revealAll());
      });
      window.setTimeout(revealAll, 0);
      window.setTimeout(revealAll, 50);
      window.setTimeout(revealAll, 250);
    }

    function onPageShow() {
      runBurst();
    }

    function onPopState() {
      runBurst();
    }

    runBurst();
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  return null;
}
