/**
 * 兼容旧导入路径的薄入口。
 *
 * 印章管理页实际实现已拆到 `list/` 目录，
 * 路由层继续从这里导入，避免扩散改动范围。
 */

export { SealsPage } from "./list/SealsPage"
