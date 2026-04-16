// src/routes/__root.tsx
import { useAuthMe } from "@/hooks/api/useAuth"
import { Navigate, Outlet, createRootRoute, useRouterState } from "@tanstack/react-router"
import { AppLayout } from "@/components/layout/AppLayout"
import { useAuthStore } from "@/store/auth.store"

export const Route = createRootRoute({
  component: RootRouteComponent,
})

function RootRouteComponent() {
  const pathname = useRouterState({
    select: state => state.location.pathname,
  })
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isBootstrapping = useAuthStore(state => state.isBootstrapping)
  const isSessionReady = useAuthStore(state => state.isSessionReady)
  const hasSessionToken = Boolean(token)
  const hasValidSession = Boolean(token && user && isSessionReady)

  useAuthMe(Boolean(token) && hasHydrated)

  if (!hasHydrated || (hasSessionToken && (isBootstrapping || !isSessionReady))) {
    return (
      <div className='flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground'>
        正在校验登录状态...
      </div>
    )
  }

  if (pathname === "/login") {
    if (hasValidSession) {
      return <Navigate to='/' replace />
    }

    return <Outlet />
  }

  if (!hasValidSession) {
    return <Navigate to='/login' replace />
  }

  return <AppLayout />
}
