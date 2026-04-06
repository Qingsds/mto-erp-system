import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { AdminRouteGuard } from "@/components/auth/AdminRouteGuard"
import { SealsPage } from "@/pages/seals/SealsPage"

function SealsRouteComponent() {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const isChildRoute = pathname !== "/seals" && pathname.startsWith("/seals/")

  return (
    <AdminRouteGuard>
      {isChildRoute ? <Outlet /> : <SealsPage />}
    </AdminRouteGuard>
  )
}

export const Route = createFileRoute("/seals")({
  component: SealsRouteComponent,
})
