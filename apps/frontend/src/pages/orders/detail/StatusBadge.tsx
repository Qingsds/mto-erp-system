/**
 * StatusBadge.tsx
 *
 * 职责：
 * - 统一渲染订单状态徽章（颜色、图标、文案）
 */

import type { OrderStatusType } from "@erp/shared-types"
import { cn } from "@/lib/utils"
import { STATUS_ICON, STATUS_LABEL, STATUS_STYLE } from "../orders.schema"

interface StatusBadgeProps {
  /** 订单状态枚举值。 */
  status: OrderStatusType
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border whitespace-nowrap",
      STATUS_STYLE[status],
    )}>
      <i className={cn(STATUS_ICON[status], "text-[11px]")} />
      {STATUS_LABEL[status]}
    </span>
  )
}
