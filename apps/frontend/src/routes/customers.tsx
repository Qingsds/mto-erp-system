import { createFileRoute } from "@tanstack/react-router"
import { AdminRouteGuard } from "@/components/auth/AdminRouteGuard"
import { CustomersPage } from "@/pages/customers/CustomersPage"
import { validateCustomersPageSearch } from "@/pages/customers/list/search"

export const Route = createFileRoute("/customers")({
  validateSearch: validateCustomersPageSearch,
  component: () => (
    <AdminRouteGuard>
      <CustomersPage search={Route.useSearch()} />
    </AdminRouteGuard>
  ),
})

