/**
 * deliveries.utils.ts
 *
 * 职责：
 * - 提供发货单模块的通用格式化与搜索辅助函数
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

/**
 * 归一化搜索关键字（去空格并转小写）。
 */
export function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase()
}
