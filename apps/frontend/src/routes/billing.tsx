import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { AdminRouteGuard } from "@/components/auth/AdminRouteGuard"
import { BillingPage } from "@/pages/billing/BillingPage"

function BillingRouteComponent() {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const isChildRoute = pathname !== "/billing" && pathname.startsWith("/billing/")

  return (
    <AdminRouteGuard>
      {isChildRoute ? <Outlet /> : <BillingPage />}
    </AdminRouteGuard>
  )
}

export const Route = createFileRoute("/billing")({
  component: BillingRouteComponent,
})
