import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: () => <div>Dashboard 页面入口</div>,
})
