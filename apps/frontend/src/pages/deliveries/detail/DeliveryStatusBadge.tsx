/**
 * DeliveryStatusBadge.tsx
 *
 * 职责：
 * - 渲染发货状态徽章
 */

import { cn } from "@/lib/utils"
import {
  DELIVERY_STATUS_ICON,
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_STYLE,
} from "../deliveries.schema"

interface DeliveryStatusBadgeProps {
  /** 发货状态。 */
  status: string
}

/**
 * 发货状态徽章。
 */
export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
  const label = DELIVERY_STATUS_LABEL[status] ?? status
  const icon = DELIVERY_STATUS_ICON[status] ?? "ri-information-line"
  const style =
    DELIVERY_STATUS_STYLE[status] ??
    "text-muted-foreground bg-muted border-border"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border whitespace-nowrap",
        style,
      )}
    >
      <i className={cn(icon, "text-[11px]")} />
      {label}
    </span>
  )
}
