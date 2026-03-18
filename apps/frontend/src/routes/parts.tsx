import { createFileRoute } from "@tanstack/react-router"
import { PartsPage }        from "@/pages/parts/PartsPage"

export const Route = createFileRoute("/parts")({
  component: PartsPage,
})
