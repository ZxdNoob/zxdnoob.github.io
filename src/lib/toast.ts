/**
 * 全局 Toast：命令式 API，风格对齐 sonner（success / error / info / warning / message）。
 * 与 `<ToastViewport />` 配合使用；仅在客户端事件内调用即可。
 */

export type ToastVariant = "default" | "success" | "error" | "info" | "warning";

export type ToastRecord = {
  id: string;
  message: string;
  variant: ToastVariant;
  leaving?: boolean;
};

let seq = 0;
function nextId() {
  return `toast-${++seq}-${Date.now().toString(36)}`;
}

let items: ToastRecord[] = [];
const listeners = new Set<() => void>();

/** `useSyncExternalStore` 要求服务端快照引用稳定，不能每次 `return []` */
const serverSnapshot: ToastRecord[] = [];

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ToastRecord[] {
  return items;
}

function getServerSnapshot(): ToastRecord[] {
  return serverSnapshot;
}

function remove(id: string) {
  items = items.filter((t) => t.id !== id);
  emit();
}

/** 退场动画后再移除 */
function dismiss(id: string) {
  const t = items.find((x) => x.id === id);
  if (!t || t.leaving) return;
  items = items.map((x) => (x.id === id ? { ...x, leaving: true } : x));
  emit();
  window.setTimeout(() => remove(id), 220);
}

function push(
  message: string,
  variant: ToastVariant,
  durationMs: number | undefined,
): string {
  const id = nextId();
  const duration = durationMs ?? 4000;
  items = [...items, { id, message, variant }];
  emit();
  if (duration > 0) {
    window.setTimeout(() => dismiss(id), duration);
  }
  return id;
}

export const toastState = {
  subscribe,
  getSnapshot,
  getServerSnapshot,
};

export const toast = {
  /** 默认中性样式 */
  message: (message: string, opts?: { duration?: number }) =>
    push(message, "default", opts?.duration),
  success: (message: string, opts?: { duration?: number }) =>
    push(message, "success", opts?.duration),
  error: (message: string, opts?: { duration?: number }) =>
    push(message, "error", opts?.duration),
  info: (message: string, opts?: { duration?: number }) =>
    push(message, "info", opts?.duration),
  warning: (message: string, opts?: { duration?: number }) =>
    push(message, "warning", opts?.duration),
  dismiss,
};
