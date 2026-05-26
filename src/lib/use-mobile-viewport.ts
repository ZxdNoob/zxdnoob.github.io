'use client';

import { useSyncExternalStore } from 'react';

/** 与 Tailwind `md`（min-width: 768px）一致 */
export const MOBILE_VIEWPORT_MQ = '(max-width: 767px)';

function subscribeMobileViewport(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia(MOBILE_VIEWPORT_MQ);
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getMobileViewportSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_VIEWPORT_MQ).matches;
}

function getMobileViewportServerSnapshot(): boolean {
  return false;
}

/** 窄屏视口（< md），SSR 首帧为 false，hydration 后与 matchMedia 对齐 */
export function useMobileViewport(): boolean {
  return useSyncExternalStore(
    subscribeMobileViewport,
    getMobileViewportSnapshot,
    getMobileViewportServerSnapshot,
  );
}
