import { createFileRoute } from "@tanstack/react-router"
import { AdminRouteGuard } from "@/components/auth/AdminRouteGuard"
import { CustomerDetailPage } from "@/pages/customers/detail/CustomerDetailPage"

export const Route = createFileRoute("/customers/$id")({
  component: () => (
    <AdminRouteGuard>
      <CustomerDetailPage />
    </AdminRouteGuard>
  ),
})

