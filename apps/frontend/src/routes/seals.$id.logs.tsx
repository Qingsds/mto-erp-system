import { createFileRoute } from "@tanstack/react-router"
import { SealLogsPage } from "@/pages/seals/SealLogsPage"

export const Route = createFileRoute("/seals/$id/logs")({
  component: SealLogsPage,
})
