import { createFileRoute } from "@tanstack/react-router"
import { AdminRouteGuard } from "@/components/auth/AdminRouteGuard"
import { UsersPage } from "@/pages/users/UsersPage"

export const Route = createFileRoute("/users")({
  component: () => (
    <AdminRouteGuard>
      <UsersPage />
    </AdminRouteGuard>
  ),
})
