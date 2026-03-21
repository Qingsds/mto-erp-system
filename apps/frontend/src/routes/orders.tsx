/**
 * routes/orders.tsx
 *
 * 职责：
 * - 注册订单列表父路由 /orders
 * - 在路径为子路由时渲染 Outlet
 */

import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { OrdersPage } from "@/pages/orders/OrdersPage"

/**
 * 订单父路由组件：
 * - /orders 显示订单列表
 * - /orders/* 显示子路由内容
 */
function OrdersRouteComponent() {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const isChildRoute = pathname !== "/orders" && pathname.startsWith("/orders/")
  return isChildRoute ? <Outlet /> : <OrdersPage />
}

export const Route = createFileRoute("/orders")({
  component: OrdersRouteComponent,
})
