/**
 * routes/orders.tsx
 *
 * 职责：
 * - 注册订单列表父路由 /orders
 * - 在路径为子路由时渲染 Outlet
 */

import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import {
  OrdersPage,
  type OrdersPageSearch,
} from "@/pages/orders/OrdersPage"
import { validateOrdersPageSearch } from "@/pages/orders/list/search"

/**
 * 订单父路由组件：
 * - /orders 显示订单列表
 * - /orders/* 显示子路由内容
 */
function OrdersRouteComponent() {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const isChildRoute = pathname !== "/orders" && pathname.startsWith("/orders/")
  const search = Route.useSearch()

  return isChildRoute ? <Outlet /> : <OrdersPage search={search} />
}

export const Route = createFileRoute("/orders")({
  validateSearch: (
    search: Record<string, unknown>,
  ): OrdersPageSearch => validateOrdersPageSearch(search),
  component: OrdersRouteComponent,
})
