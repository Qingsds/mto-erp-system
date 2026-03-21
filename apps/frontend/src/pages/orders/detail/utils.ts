/**
 * utils.ts
 *
 * 职责：
 * - 提供订单详情模块内通用的格式化工具
 */

/**
 * 格式化日期时间为中文短格式。
 */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
  })
}
