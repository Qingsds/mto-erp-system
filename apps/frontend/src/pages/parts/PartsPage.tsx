/**
 * 兼容旧导入路径的薄入口。
 *
 * 列表页实际实现已经拆到 `list/` 目录，
 * 路由层继续从这里导入，避免一次性改太多引用。
 */

export {
  PartsPage,
  type PartsPageProps,
  type PartsQuickAction,
} from "./list/PartsPage"
