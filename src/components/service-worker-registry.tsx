'use client';

/**
 * Service Worker 注册器（生产环境 + HTTPS only）。
 *
 * - dev 环境跳过：避免 HMR 与 SW 冲突造成「改了代码不刷新」
 * - 用户主动断网刷新时，由 SW 兜底返回缓存的首页 / 已访问过的文章
 * - 当检测到新 SW 安装好但还没激活时，会通过 toast 提示「站点已更新」给用户主动刷新
 */

import { useEffect } from 'react';

export function ServiceWorkerRegistry() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    if (
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost'
    ) {
      /** SW 仅在 HTTPS 或 localhost 工作 */
      return;
    }

    let cancelled = false;
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        if (cancelled) return;
        /** 监听更新：装好新 SW 但还没激活时，给用户一次「立即更新」机会 */
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (
              installing.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              /** 已有 controller → 说明是更新（而不是首次注册） */
              showUpdateToast(() => {
                installing.postMessage('SKIP_WAITING');
              });
            }
          });
        });
        /** controllerchange = 新 SW 已经激活；安静地刷新当前页让访问到最新 HTML */
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (sessionStorage.getItem('sw-just-updated') === '1') return;
          sessionStorage.setItem('sw-just-updated', '1');
          window.location.reload();
        });
      })
      .catch(() => {
        /** 注册失败不影响主流程，安静失败 */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

/** 轻量原生 toast；不依赖项目 toast 系统，避免在 layout 里引入额外组件循环 */
function showUpdateToast(onConfirm: () => void) {
  if (typeof document === 'undefined') return;
  /** 简单去重：只允许一次提示存在 */
  if (document.querySelector('[data-sw-update]')) return;
  const root = document.createElement('div');
  root.setAttribute('data-sw-update', '');
  root.style.cssText = [
    'position:fixed',
    'bottom:90px',
    'right:16px',
    'z-index:80',
    'max-width:300px',
    'padding:12px 14px',
    'border-radius:14px',
    'font-size:13px',
    'line-height:1.5',
    'color:#fff',
    'background:#0c0a09',
    'box-shadow:0 8px 28px rgba(0,0,0,0.18)',
    'display:flex',
    'flex-direction:column',
    'gap:8px',
  ].join(';');
  root.innerHTML = `
    <span style="font-weight:600">站点已发布新版本</span>
    <span style="opacity:0.78">点下面按钮立刻应用最新内容</span>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button data-confirm style="flex:1;padding:6px 10px;border:0;border-radius:9px;background:#f59e0b;color:#0c0a09;font-weight:700;cursor:pointer">立即更新</button>
      <button data-dismiss style="padding:6px 10px;border:0;border-radius:9px;background:transparent;color:#fff;opacity:0.7;cursor:pointer">稍后</button>
    </div>
  `;
  const dismiss = () => root.remove();
  root
    .querySelector<HTMLButtonElement>('[data-confirm]')
    ?.addEventListener('click', () => {
      onConfirm();
      dismiss();
    });
  root
    .querySelector<HTMLButtonElement>('[data-dismiss]')
    ?.addEventListener('click', dismiss);
  document.body.appendChild(root);
}
