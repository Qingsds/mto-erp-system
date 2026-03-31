/**
 * 列表页入口。
 *
 * 只负责根据终端类型切换桌面版和移动版实现，
 * 避免把所有渲染逻辑继续堆在根目录文件中。
 */

import { useUIStore } from "@/store/ui.store"
import { DeliveriesDesktop } from "./DeliveriesDesktop"
import { DeliveriesMobile } from "./DeliveriesMobile"
import type { DeliveriesPageSearch } from "./search"

export interface DeliveriesPageProps {
  search: DeliveriesPageSearch
}

export function DeliveriesPage({ search }: DeliveriesPageProps) {
  const { isMobile } = useUIStore()

  return isMobile
    ? <DeliveriesMobile search={search} />
    : <DeliveriesDesktop search={search} />
}
