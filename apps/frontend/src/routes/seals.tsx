import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { SealsPage } from "@/pages/seals/SealsPage"

function SealsRouteComponent() {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const isChildRoute = pathname !== "/seals" && pathname.startsWith("/seals/")

  return isChildRoute ? <Outlet /> : <SealsPage />
}

export const Route = createFileRoute("/seals")({
  component: SealsRouteComponent,
})
