/**
 * 通用签章工作台共享类型与常量。
 *
 * 统一约束：
 * - 位置坐标使用相对页面尺寸的比例值
 * - 拖拽以左上角为锚点
 * - 宽度由单独比例控制，高度按印章宽高比自动换算
 */

export interface SealPlacement {
  pageIndex: number
  xRatio: number
  yRatio: number
  widthRatio: number
}

export const SEAL_WORKBENCH_A4_ASPECT_RATIO = 210 / 297
export const SEAL_WORKBENCH_PREVIEW_MAX_WIDTH = 794
export const MIN_SEAL_WIDTH_RATIO = 0.1
export const MAX_SEAL_WIDTH_RATIO = 0.38

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/**
 * 默认把印章放在页面右下留白区域。
 *
 * 直接按页面比例给出默认值，避免首次进入工作台时盖章落到正文中间。
 */
export function createDefaultSealPlacement(pageIndex: number = 1): SealPlacement {
  return {
    pageIndex,
    xRatio: 0.72,
    yRatio: 0.8,
    widthRatio: 0.18,
  }
}
