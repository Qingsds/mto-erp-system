/**
 * 兼容旧导入路径的薄入口。
 *
 * 财务对账列表页实际实现已拆到 `list/` 目录，
 * 路由层继续从这里导入，避免扩散改动范围。
 */

export { BillingPage } from "./list/BillingPage"
