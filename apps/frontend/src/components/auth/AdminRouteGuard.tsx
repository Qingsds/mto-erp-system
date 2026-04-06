/**
 * 管理员路由守卫。
 *
 * 仅用于前端页面层的显式拦截；
 * 后端仍以角色鉴权作为最终边界。
 */

import type { ReactNode } from "react"
import { Navigate } from "@tanstack/react-router"
import { useAuthStore } from "@/store/auth.store"
import { useIsAdmin } from "@/lib/permissions"

interface AdminRouteGuardProps {
  children: ReactNode
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isAdmin = useIsAdmin()

  if (!hasHydrated) {
    return null
  }

  if (!isAdmin) {
    return <Navigate to='/' replace />
  }

  return <>{children}</>
}
