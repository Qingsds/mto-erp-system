import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router"
import { OrdersPage } from "@/pages/orders/OrdersPage"

function OrdersRouteComponent() {
  const matchRoute = useMatchRoute()
  const isChildRoute = !!matchRoute({ to: "/orders/new", fuzzy: true })
  return isChildRoute ? <Outlet /> : <OrdersPage />
}

export const Route = createFileRoute("/orders")({
  component: OrdersRouteComponent,
})
