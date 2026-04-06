/**
 * 前端权限辅助。
 *
 * 统一收口：
 * - 管理员页面可见性
 * - 金额字段可见性
 * - 零件管理类写操作开关
 */

import type { UserRoleType } from "@erp/shared-types"
import { useAuthStore } from "@/store/auth.store"

export function isAdminRole(role?: UserRoleType | null) {
  return role === "ADMIN"
}

export function canViewMoney(role?: UserRoleType | null) {
  return role === "ADMIN"
}

export function useCurrentRole() {
  return useAuthStore(state => state.user?.role ?? null)
}

export function useIsAdmin() {
  const role = useCurrentRole()
  return isAdminRole(role)
}

export function useCanViewMoney() {
  const role = useCurrentRole()
  return canViewMoney(role)
}
