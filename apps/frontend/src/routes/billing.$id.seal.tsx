import { createFileRoute } from "@tanstack/react-router"
import { BillingSealPage } from "@/pages/billing/seal/BillingSealPage"

export const Route = createFileRoute("/billing/$id/seal")({
  component: BillingSealPage,
})
