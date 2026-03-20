import { createFileRoute } from "@tanstack/react-router"
import { OrderNewPage }    from "@/pages/orders/OrderNewPage"

export const Route = createFileRoute("/orders/new")({
  component: OrderNewPage,
})