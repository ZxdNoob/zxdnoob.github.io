/* 与根布局一致：在 React hydration 前执行（主题 + 悬浮导航边距/属性） */
void (function () {
  try {
    var d = document.documentElement,
      t = localStorage.getItem('theme'),
      s = matchMedia('(prefers-color-scheme:dark)').matches,
      i = t === 'dark' || (t !== 'light' && s);
    d.classList.toggle('dark', i);
    d.style.colorScheme = i ? 'dark' : 'light';
  } catch {
    /* ignore */
  }
})();

/** 与 `SiteHeader` / `applyDockVars` 保持一致，让 body 的 nav padding 与 html 标记首屏即正确 */
void (function () {
  try {
    var d = document.documentElement;
    var raw = localStorage.getItem('site-nav-dock-v1');
    var pos = 'top';
    var collapsed = false;
    if (raw) {
      try {
        var o = JSON.parse(raw);
        var p = o && o.position;
        if (p === 'top' || p === 'bottom' || p === 'left' || p === 'right') pos = p;
        if (o && o.collapsed === true) collapsed = true;
      } catch {
        /* ignore */
      }
    }
    var offset = collapsed ? '68px' : '84px';
    d.style.setProperty('--nav-pad-top', pos === 'top' ? offset : '0px');
    d.style.setProperty('--nav-pad-bottom', pos === 'bottom' ? offset : '0px');
    d.style.setProperty('--nav-pad-left', pos === 'left' ? offset : '0px');
    d.style.setProperty('--nav-pad-right', pos === 'right' ? offset : '0px');
    d.setAttribute('data-nav-dock', pos);
    if (collapsed) d.setAttribute('data-nav-collapsed', '');
    else d.removeAttribute('data-nav-collapsed');
  } catch {
    /* ignore */
  }
})();
