import { createFileRoute } from "@tanstack/react-router"
import { OrdersPage }       from "@/pages/orders/OrdersPage"
 
export const Route = createFileRoute("/orders")({
  component: OrdersPage,
})
 