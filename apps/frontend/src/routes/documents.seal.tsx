import { createFileRoute } from "@tanstack/react-router"
import { AdminRouteGuard } from "@/components/auth/AdminRouteGuard"
import { DocumentSealPage } from "@/pages/documents/seal/DocumentSealPage"

interface DocumentsSealSearch {
  documentId?: number
}

function DocumentsSealRouteComponent() {
  const { documentId } = Route.useSearch()

  return (
    <AdminRouteGuard>
      <DocumentSealPage documentId={documentId} />
    </AdminRouteGuard>
  )
}

export const Route = createFileRoute("/documents/seal")({
  validateSearch: (search: Record<string, unknown>): DocumentsSealSearch => {
    const rawId = Number(search.documentId)
    return Number.isInteger(rawId) && rawId > 0 ? { documentId: rawId } : {}
  },
  component: DocumentsSealRouteComponent,
})
