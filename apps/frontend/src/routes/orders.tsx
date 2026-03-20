import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router"
import { OrdersPage } from "@/pages/orders/OrdersPage"

export const Route = createFileRoute("/orders")({
  component: () => {
    const matchRoute  = useMatchRoute()
    const isChildRoute = !!matchRoute({ to: "/orders/new", fuzzy: true })
    return isChildRoute ? <Outlet /> : <OrdersPage />
  },
})