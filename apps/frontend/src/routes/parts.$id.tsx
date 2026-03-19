import { createFileRoute } from "@tanstack/react-router"
import { PartDetailPage } from "@/pages/parts/PartDetailPage"

export const Route = createFileRoute("/parts/$id")({
  component: PartDetailPage,
})
