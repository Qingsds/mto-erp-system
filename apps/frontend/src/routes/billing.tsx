import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router"
import { BillingPage } from "@/pages/billing/BillingPage"

function BillingRouteComponent() {
  const matchRoute = useMatchRoute()
  const isNewRoute = !!matchRoute({ to: "/billing/new" })

  return isNewRoute ? <Outlet /> : <BillingPage />
}

export const Route = createFileRoute("/billing")({
  component: BillingRouteComponent,
})
