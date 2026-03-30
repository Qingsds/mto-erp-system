import { createFileRoute } from "@tanstack/react-router"
import { PartDetailPage } from "@/pages/parts/detail/PartDetailPage"

export const Route = createFileRoute("/parts/$id")({
  component: PartDetailPage,
})
