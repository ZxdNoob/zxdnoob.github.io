/**
 * 文章关系图谱 viewBox 与画布尺寸常量（桌面 / 移动共享）。
 */

export const WIDTH = 1100;
export const HEIGHT = 640;

export type GraphViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

export const DEFAULT_VIEW_BOX: GraphViewBox = {
  minX: 0,
  minY: 0,
  width: WIDTH,
  height: HEIGHT,
};

const VIEW_MIN_WIDTH = WIDTH / 18;
const VIEW_MAX_WIDTH = WIDTH * 12;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function clampGraphViewBox(vb: GraphViewBox): GraphViewBox {
  const w = clamp(vb.width, VIEW_MIN_WIDTH, VIEW_MAX_WIDTH);
  const h = w * (HEIGHT / WIDTH);
  const minXM = Math.min(0, WIDTH - w);
  const maxXM = Math.max(0, WIDTH - w);
  const minYM = Math.min(0, HEIGHT - h);
  const maxYM = Math.max(0, HEIGHT - h);
  return {
    minX: clamp(vb.minX, minXM, maxXM),
    minY: clamp(vb.minY, minYM, maxYM),
    width: w,
    height: h,
  };
}

export function zoomViewBoxAtPoint(
  vb: GraphViewBox,
  cx: number,
  cy: number,
  widthMultiplier: number,
): GraphViewBox {
  const nw = clamp(vb.width / widthMultiplier, VIEW_MIN_WIDTH, VIEW_MAX_WIDTH);
  const ratio = nw / vb.width;
  return clampGraphViewBox({
    minX: cx - (cx - vb.minX) * ratio,
    minY: cy - (cy - vb.minY) * ratio,
    width: nw,
    height: nw * (HEIGHT / WIDTH),
  });
}

export function zoomViewBoxCenter(
  vb: GraphViewBox,
  direction: 'in' | 'out',
): GraphViewBox {
  const cx = vb.minX + vb.width / 2;
  const cy = vb.minY + vb.height / 2;
  const step = 1.2;
  return zoomViewBoxAtPoint(vb, cx, cy, direction === 'in' ? step : 1 / step);
}
