"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

const BUTTON_LABELS: Record<ThemeMode, string> = {
  system: "主题：跟随系统",
  light: "主题：浅色",
  dark: "主题：深色",
};

const OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  description: string;
  Icon: () => React.JSX.Element;
}> = [
  {
    mode: "system",
    label: "跟随系统",
    description: "自动匹配系统浅色/深色",
    Icon: SystemIcon,
  },
  {
    mode: "light",
    label: "浅色",
    description: "始终使用浅色主题",
    Icon: SunIcon,
  },
  {
    mode: "dark",
    label: "深色",
    description: "始终使用深色主题",
    Icon: MoonIcon,
  },
];

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyClass(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
}

function withThemeChangeFreeze(fn: () => void) {
  const root = document.documentElement;
  root.classList.add("theme-changing");
  fn();
  window.setTimeout(() => {
    root.classList.remove("theme-changing");
  }, 120);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as ThemeMode | null;
    const initial: ThemeMode =
      stored === "light" || stored === "dark" ? stored : "system";
    const id = window.setTimeout(() => {
      setMode(initial);
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const syncSystem = useCallback(() => {
    withThemeChangeFreeze(() => applyClass(resolveIsDark("system")));
  }, []);

  useEffect(() => {
    if (!mounted) return;

    withThemeChangeFreeze(() => applyClass(resolveIsDark(mode)));

    if (mode === "system") {
      localStorage.removeItem("theme");
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", syncSystem);
      return () => mq.removeEventListener("change", syncSystem);
    }

    localStorage.setItem("theme", mode);
  }, [mode, mounted, syncSystem]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function onPointerDown(e: PointerEvent) {
      const root = rootRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && !root.contains(target)) setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (!mounted) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        aria-label={BUTTON_LABELS[mode]}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={popoverId}
      >
        {mode === "system" ? (
          <SystemIcon />
        ) : mode === "light" ? (
          <SunIcon />
        ) : (
          <MoonIcon />
        )}
      </button>

      {open && (
        <div
          id={popoverId}
          role="menu"
          aria-label="选择主题"
          className="absolute right-0 mt-2 w-[260px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl ring-1 ring-black/5 dark:ring-white/10"
        >
          <div className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
            主题
          </div>
          <div className="p-2">
            {OPTIONS.map((opt) => {
              const active = opt.mode === mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setMode(opt.mode);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    active
                      ? "bg-stone-100 text-stone-900 dark:bg-stone-800/80 dark:text-stone-50"
                      : "text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800/40",
                  ].join(" ")}
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-stone-600 dark:text-stone-300">
                    <opt.Icon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{opt.label}</span>
                      {active ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                          已选
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-500">
                      {opt.description}
                    </span>
                  </span>
                  {active ? (
                    <svg
                      className="mt-1 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    <span className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SunIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
