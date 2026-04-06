/**
 * 对账单盖章工作台共享类型与常量。
 *
 * 统一约束：
 * - 位置坐标使用相对页面尺寸的比例值
 * - 拖拽以左上角为锚点
 * - 宽度由单独比例控制，高度按印章宽高比自动换算
 */

export interface BillingSealPlacement {
  pageIndex: number
  xRatio: number
  yRatio: number
  widthRatio: number
}

export const DEFAULT_BILLING_SEAL_PLACEMENT: BillingSealPlacement = {
  pageIndex: 1,
  xRatio: 0.68,
  yRatio: 0.7,
  widthRatio: 0.2,
}

export const MIN_BILLING_SEAL_WIDTH_RATIO = 0.1
export const MAX_BILLING_SEAL_WIDTH_RATIO = 0.38

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
