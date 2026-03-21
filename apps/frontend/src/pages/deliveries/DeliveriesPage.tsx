/**
 * DeliveriesPage.tsx
 *
 * 职责：
 * - 发货单列表页面入口
 * - 根据端类型切换 Desktop/Mobile 组件
 */

import { useUIStore } from "@/store/ui.store"
import { DeliveriesDesktop } from "./list/DeliveriesDesktop"
import { DeliveriesMobile } from "./list/DeliveriesMobile"

/**
 * 发货管理列表页。
 */
export function DeliveriesPage() {
  const { isMobile } = useUIStore()

  return isMobile ? <DeliveriesMobile isActive /> : <DeliveriesDesktop isActive />
}
