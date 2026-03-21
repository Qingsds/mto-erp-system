/**
 * routes/deliveries.tsx
 *
 * 职责：
 * - 注册发货单列表父路由 /deliveries
 * - 在路径为子路由时渲染 Outlet
 */

import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router"
import { DeliveriesPage } from "@/pages/deliveries/DeliveriesPage"

/**
 * 发货单父路由组件：
 * - /deliveries 显示发货单列表
 * - /deliveries/$id 显示发货单详情
 */
function DeliveriesRouteComponent() {
  const matchRoute = useMatchRoute()
  const isDetailRoute = !!matchRoute({ to: "/deliveries/$id" })

  return isDetailRoute ? <Outlet /> : <DeliveriesPage />
}

export const Route = createFileRoute("/deliveries")({
  component: DeliveriesRouteComponent,
})

