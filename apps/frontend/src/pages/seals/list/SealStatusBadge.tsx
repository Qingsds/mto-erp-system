/**
 * 印章状态徽章。
 */

import { cn } from "@/lib/utils"
import {
  getSealStatusClassName,
  getSealStatusLabel,
} from "../shared"

export function SealStatusBadge({
  isActive,
}: {
  isActive: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-xs font-medium",
        getSealStatusClassName(isActive),
      )}
    >
      {getSealStatusLabel(isActive)}
    </span>
  )
}
