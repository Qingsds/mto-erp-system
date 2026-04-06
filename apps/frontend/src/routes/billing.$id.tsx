import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/billing/$id")({
  component: Outlet,
})
