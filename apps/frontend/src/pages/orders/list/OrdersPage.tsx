/**
 * 列表页入口。
 *
 * 只负责根据终端类型切换桌面版和移动版实现，
 * 避免把所有渲染逻辑继续堆在根目录文件中。
 */

import { useUIStore } from "@/store/ui.store"
import { OrdersDesktop } from "./OrdersDesktop"
import { OrdersMobile } from "./OrdersMobile"
import type { OrdersPageSearch } from "./search"

export interface OrdersPageProps {
  search: OrdersPageSearch
}

export function OrdersPage({ search }: OrdersPageProps) {
  const { isMobile } = useUIStore()

  return isMobile
    ? <OrdersMobile search={search} />
    : <OrdersDesktop search={search} />
}
