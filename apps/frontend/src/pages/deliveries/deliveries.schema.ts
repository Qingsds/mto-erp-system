/**
 * deliveries.schema.ts
 *
 * 职责：
 * - 定义发货单页面使用的状态展示映射
 */

/** 发货状态标签映射。 */
export const DELIVERY_STATUS_LABEL: Record<string, string> = {
  SHIPPED: "已发货",
}

/** 发货状态样式映射。 */
export const DELIVERY_STATUS_STYLE: Record<string, string> = {
  SHIPPED:
    "text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900",
}

/** 发货状态图标映射。 */
export const DELIVERY_STATUS_ICON: Record<string, string> = {
  SHIPPED: "ri-truck-fill",
}
