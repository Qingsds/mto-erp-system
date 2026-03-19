import {
  createFileRoute,
  Outlet,
  useMatchRoute,
} from "@tanstack/react-router"
import { PartsPage } from "@/pages/parts/PartsPage"

export const Route = createFileRoute("/parts")({
  component: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const matchRoute = useMatchRoute()
    const isDetailRoute = !!matchRoute({ to: "/parts/$id" })

    return isDetailRoute ? <Outlet /> : <PartsPage />
  },
})
