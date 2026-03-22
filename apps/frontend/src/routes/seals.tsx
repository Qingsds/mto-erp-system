import { createFileRoute } from "@tanstack/react-router"
import { SealsPage } from "@/pages/seals/SealsPage"

export const Route = createFileRoute("/seals")({
  component: SealsPage,
})
