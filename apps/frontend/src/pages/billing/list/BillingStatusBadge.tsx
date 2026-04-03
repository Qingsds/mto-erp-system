/**
 * 财务对账状态徽章。
 */

import type { BillingStatusType } from "@erp/shared-types"
import { cn } from "@/lib/utils"
import {
  BILLING_STATUS_LABEL,
  BILLING_STATUS_STYLE,
} from "./shared"

export function BillingStatusBadge({
  status,
}: {
  status: BillingStatusType
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-xs font-medium",
        BILLING_STATUS_STYLE[status],
      )}
    >
      {BILLING_STATUS_LABEL[status]}
    </span>
  )
}
