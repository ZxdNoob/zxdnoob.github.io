'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { recordSiteView } from '@/lib/views';

/**
 * 全站 PV 上报器：
 * - 每次页面初次进入（含刷新）上报一次
 * - 每次客户端路由切换再上报一次
 *
 * 说明：严格模式/某些场景 effect 可能触发两次，这里用 ref 避免重复上报同一次渲染。
 */
export function SiteViewRecorder() {
  const pathname = usePathname() ?? '';
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    recordSiteView().then((v) => {
      if (typeof v !== 'number') return;
      // 通知页脚等组件立即刷新显示值（避免等下一次拉取）
      window.dispatchEvent(
        new CustomEvent('site:total-views', { detail: { siteTotalViews: v } }),
      );
    });
  }, [pathname]);

  return null;
}
