import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { AdminRouteGuard } from "@/components/auth/AdminRouteGuard"
import { DocumentsPage } from "@/pages/documents/DocumentsPage"

function DocumentsRouteComponent() {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const isChildRoute = pathname !== "/documents" && pathname.startsWith("/documents/")

  return (
    <AdminRouteGuard>
      {isChildRoute ? <Outlet /> : <DocumentsPage />}
    </AdminRouteGuard>
  )
}

export const Route = createFileRoute("/documents")({
  component: DocumentsRouteComponent,
})
