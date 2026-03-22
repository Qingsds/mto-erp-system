import {
  createFileRoute,
  Outlet,
  useMatchRoute,
} from "@tanstack/react-router"
import {
  PartsPage,
  type PartsQuickAction,
} from "@/pages/parts/PartsPage"

interface PartsSearch {
  action?: PartsQuickAction
}

function normalizeAction(value: unknown): PartsQuickAction | undefined {
  return value === "new" || value === "import" ? value : undefined
}

function PartsRouteComponent() {
  const matchRoute = useMatchRoute()
  const isDetailRoute = !!matchRoute({ to: "/parts/$id" })
  const { action } = Route.useSearch()

  return isDetailRoute
    ? <Outlet />
    : <PartsPage key={action ?? "list"} quickAction={action} />
}

export const Route = createFileRoute("/parts")({
  validateSearch: (search: Record<string, unknown>): PartsSearch => {
    const action = normalizeAction(search.action)
    return action ? { action } : {}
  },
  component: PartsRouteComponent,
})
