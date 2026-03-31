/**
 * DeliveryStatusBadge.tsx
 *
 * 职责：
 * - 统一渲染发货状态徽章
 * - 供列表页和详情页复用
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
  className?: string
}

export function DeliveryStatusBadge({
  status,
  className,
}: DeliveryStatusBadgeProps) {
  const label = DELIVERY_STATUS_LABEL[status] ?? status
  const icon = DELIVERY_STATUS_ICON[status] ?? "ri-information-line"
  const style =
    DELIVERY_STATUS_STYLE[status] ??
    "text-muted-foreground bg-muted border-border"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        style,
        className,
      )}
    >
      <i className={cn(icon, "text-[11px]")} />
      {label}
    </span>
  )
}
