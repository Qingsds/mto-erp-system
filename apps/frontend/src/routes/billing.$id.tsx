import { createFileRoute } from "@tanstack/react-router"
import { BillingDetailPage } from "@/pages/billing/detail/BillingDetailPage"

export const Route = createFileRoute("/billing/$id")({
  component: BillingDetailPage,
})
