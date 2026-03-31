/**
 * routes/deliveries.tsx
 *
 * 职责：
 * - 注册发货单列表父路由 /deliveries
 * - 在路径为子路由时渲染 Outlet
 */

import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router"
import {
  DeliveriesPage,
  type DeliveriesPageSearch,
} from "@/pages/deliveries/DeliveriesPage"
import { validateDeliveriesPageSearch } from "@/pages/deliveries/list/search"

/**
 * 发货单父路由组件：
 * - /deliveries 显示发货单列表
 * - /deliveries/$id 显示发货单详情
 */
function DeliveriesRouteComponent() {
  const matchRoute = useMatchRoute()
  const isDetailRoute = !!matchRoute({ to: "/deliveries/$id" })
  const search = Route.useSearch()

  return isDetailRoute ? <Outlet /> : <DeliveriesPage search={search} />
}

export const Route = createFileRoute("/deliveries")({
  validateSearch: (
    search: Record<string, unknown>,
  ): DeliveriesPageSearch => validateDeliveriesPageSearch(search),
  component: DeliveriesRouteComponent,
})
