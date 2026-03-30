/**
 * 列表页入口。
 *
 * 只负责根据终端类型切换桌面版和移动版实现，
 * 避免把所有渲染逻辑继续堆在根目录文件中。
 */

import { useUIStore } from "@/store/ui.store"
import { PartsDesktop } from "./PartsDesktop"
import { PartsMobile } from "./PartsMobile"

export type PartsQuickAction = "new" | "import"

export interface PartsPageProps {
  quickAction?: PartsQuickAction
}

export function PartsPage({ quickAction }: PartsPageProps) {
  const { isMobile } = useUIStore()

  return isMobile
    ? <PartsMobile quickAction={quickAction} />
    : <PartsDesktop quickAction={quickAction} />
}
