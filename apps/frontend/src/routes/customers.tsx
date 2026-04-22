import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { AdminRouteGuard } from "@/components/auth/AdminRouteGuard"
import { CustomersPage } from "@/pages/customers/CustomersPage"
import { validateCustomersPageSearch } from "@/pages/customers/list/search"

function CustomersRouteComponent() {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const isChildRoute = pathname !== "/customers" && pathname.startsWith("/customers/")
  const search = Route.useSearch()

  return (
    <AdminRouteGuard>
      {isChildRoute ? <Outlet /> : <CustomersPage search={search} />}
    </AdminRouteGuard>
  )
}

export const Route = createFileRoute("/customers")({
  validateSearch: validateCustomersPageSearch,
  component: CustomersRouteComponent,
})
