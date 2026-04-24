import { createFileRoute } from "@tanstack/react-router"
import { OrderDraftEditPage } from "@/pages/orders/drafts/OrderDraftEditPage"

export const Route = createFileRoute("/orders/drafts/$id")({
  component: OrderDraftEditPage,
})

