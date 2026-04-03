/**
 * 财务对账列表页入口。
 *
 * 只负责切换桌面端和移动端实现，
 * 避免把状态编排和显示细节重新揉回一个大文件。
 */

import { useUIStore } from "@/store/ui.store"
import { BillingDesktop } from "./BillingDesktop"
import { BillingMobile } from "./BillingMobile"
import { useBillingPageController } from "./useBillingPageController"

export function BillingPage() {
  const { isMobile } = useUIStore()
  const controller = useBillingPageController()

  return isMobile
    ? <BillingMobile controller={controller} />
    : <BillingDesktop controller={controller} />
}
