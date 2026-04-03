import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { BillingPage } from "@/pages/billing/BillingPage"

function BillingRouteComponent() {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const isChildRoute = pathname !== "/billing" && pathname.startsWith("/billing/")

  return isChildRoute ? <Outlet /> : <BillingPage />
}

export const Route = createFileRoute("/billing")({
  component: BillingRouteComponent,
})
