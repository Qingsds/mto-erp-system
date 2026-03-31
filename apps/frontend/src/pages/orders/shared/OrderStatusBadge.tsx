/**
 * 订单状态徽章。
 *
 * 统一渲染订单状态的颜色、图标和文案，
 * 供列表页、详情页等多个订单子模块复用。
 */

import type { OrderStatusType } from "@erp/shared-types"
import { cn } from "@/lib/utils"
import {
  STATUS_ICON,
  STATUS_LABEL,
  STATUS_STYLE,
} from "../orders.schema"

interface OrderStatusBadgeProps {
  status: OrderStatusType
}

export function OrderStatusBadge({
  status,
}: OrderStatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
      STATUS_STYLE[status],
    )}>
      <i className={cn(STATUS_ICON[status], "text-[11px]")} />
      {STATUS_LABEL[status]}
    </span>
  )
}
