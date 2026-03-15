import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/deliveries')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/deliveries"!</div>
}
