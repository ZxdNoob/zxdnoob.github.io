"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  toastState,
  type ToastRecord,
  type ToastVariant,
} from "@/lib/toast";

function variantMeta(v: ToastVariant): {
  icon: ReactNode;
  bar: string;
  iconWrap: string;
} {
  switch (v) {
    case "success":
      return {
        bar: "bg-emerald-500",
        iconWrap: "text-emerald-600 dark:text-emerald-400",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      };
    case "error":
      return {
        bar: "bg-rose-500",
        iconWrap: "text-rose-600 dark:text-rose-400",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      };
    case "info":
      return {
        bar: "bg-sky-500",
        iconWrap: "text-sky-600 dark:text-sky-400",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      };
    case "warning":
      return {
        bar: "bg-amber-500",
        iconWrap: "text-amber-600 dark:text-amber-400",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      };
    default:
      return {
        bar: "bg-stone-400 dark:bg-stone-500",
        iconWrap: "text-stone-600 dark:text-stone-400",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 8.25v.75m0 3.75h.008v.008H12v-.008Zm0 6a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      };
  }
}

function ToastRow({ record }: { record: ToastRecord }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const meta = variantMeta(record.variant);
  const hidden = record.leaving || !entered;

  return (
    <div
      role="status"
      className={[
        "pointer-events-auto flex w-full max-w-[min(356px,calc(100vw-2rem))] items-start gap-3 overflow-hidden rounded-lg border border-stone-200/90 bg-white py-3 pl-3 pr-4 shadow-lg ring-1 ring-stone-950/5 transition duration-200 ease-out dark:border-stone-700/90 dark:bg-stone-900 dark:ring-white/10",
        hidden ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100",
        record.leaving ? "scale-[0.98]" : "",
      ].join(" ")}
    >
      <span
        className={`mt-0.5 w-1 shrink-0 self-stretch rounded-full ${meta.bar}`}
        aria-hidden
      />
      <span className={`mt-0.5 shrink-0 ${meta.iconWrap}`}>{meta.icon}</span>
      <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-stone-900 dark:text-stone-50">
        {record.message}
      </p>
    </div>
  );
}

/**
 * 固定在视口底部居中，堆叠顺序与 sonner 类似：旧在上、新在下贴近底边。
 */
export function ToastViewport() {
  const list = useSyncExternalStore(
    toastState.subscribe,
    toastState.getSnapshot,
    toastState.getServerSnapshot,
  );

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:p-6"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {list.map((t) => (
        <ToastRow key={t.id} record={t} />
      ))}
    </div>
  );
}
