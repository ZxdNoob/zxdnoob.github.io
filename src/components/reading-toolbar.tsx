'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  /** Optional element id to scroll back to top. */
  topAnchorId?: string;
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex h-10 w-10 items-center justify-center"
      aria-hidden
    >
      {children}
    </span>
  );
}

function Tooltip({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [place, setPlace] = useState<'top' | 'bottom'>('top');

  useEffect(() => {
    const margin = 10;

    function compute() {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let dx = 0;
      if (r.left < margin) dx += margin - r.left;
      if (r.right > window.innerWidth - margin)
        dx -= r.right - (window.innerWidth - margin);

      setOffsetX(dx);
      setPlace(r.top < margin ? 'bottom' : 'top');
    }

    // Next tick: allow layout after visibility change.
    const t = window.setTimeout(compute, 0);
    window.addEventListener('resize', compute, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', compute);
    };
  }, [text]);

  return (
    <span
      ref={ref}
      role="tooltip"
      className={[
        'pointer-events-none absolute -top-2 left-1/2 z-10',
        'whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--background)]/90 px-3 py-1 text-xs font-semibold',
        'text-stone-700 shadow-lg shadow-black/10 backdrop-blur-xl',
        'opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
        'dark:text-stone-200',
      ].join(' ')}
      style={{
        // Adaptive nudge to keep within viewport.
        transform:
          place === 'top'
            ? `translateX(calc(-50% + ${offsetX}px)) translateY(-100%)`
            : `translateX(calc(-50% + ${offsetX}px)) translateY(0%)`,
        top: place === 'top' ? undefined : 'calc(100% + 8px)',
      }}
    >
      {text}
    </span>
  );
}

export function ReadingToolbar({ topAnchorId = 'post-article' }: Props) {
  const storageKey = 'blog:immersive:v1';
  const [immersive, setImmersive] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const canFullscreen = useMemo(
    () => typeof document !== 'undefined' && !!document.documentElement,
    [],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === '1') window.setTimeout(() => setImmersive(true), 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (immersive) root.classList.add('reading-immersive');
    else root.classList.remove('reading-immersive');

    try {
      window.localStorage.setItem(storageKey, immersive ? '1' : '0');
    } catch {
      // ignore
    }

    return () => {
      root.classList.remove('reading-immersive');
    };
  }, [immersive]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setImmersive(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const thresholdPx = 480;
    let raf = 0;

    function compute() {
      raf = 0;
      setShowBackToTop(window.scrollY > thresholdPx);
    }

    function onScroll() {
      if (raf) return;
      raf = window.requestAnimationFrame(compute);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  async function toggleFullscreen(next: boolean) {
    if (!canFullscreen) return;
    try {
      if (next) {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.fullscreenElement) await document.exitFullscreen();
      }
    } catch {
      // ignore: fullscreen can be blocked by browser/user gesture rules
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[180]">
      <div className="flex items-center overflow-visible rounded-full border border-[var(--border)] bg-[var(--background)]/80 shadow-lg shadow-black/10 backdrop-blur-xl">
        {showBackToTop ? (
          <>
            <div className="group relative">
              <button
                type="button"
                className="inline-flex items-center text-stone-600 transition-colors hover:text-stone-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] dark:text-stone-300 dark:hover:text-stone-100"
                onClick={() => {
                  document.getElementById(topAnchorId)?.scrollIntoView({
                    block: 'start',
                  });
                }}
                aria-label="回到顶部"
              >
                <Icon>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 19V5" />
                    <path d="m5 12 7-7 7 7" />
                  </svg>
                </Icon>
              </button>
              <Tooltip text="回到顶部" />
            </div>

            <div className="h-6 w-px bg-[var(--border)]/80" aria-hidden />
          </>
        ) : null}

        <div className="group relative">
          <button
            type="button"
            className={[
              'inline-flex items-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
              immersive
                ? 'text-stone-900 dark:text-stone-50'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100',
            ].join(' ')}
            onClick={async () => {
              const next = !immersive;
              setImmersive(next);
              await toggleFullscreen(next);
            }}
            aria-pressed={immersive}
            aria-label={immersive ? '退出沉浸式阅读' : '进入沉浸式阅读'}
          >
            <Icon>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            </Icon>
          </button>
          <Tooltip text={immersive ? '退出沉浸式阅读' : '进入沉浸式阅读'} />
        </div>
      </div>
    </div>
  );
}
