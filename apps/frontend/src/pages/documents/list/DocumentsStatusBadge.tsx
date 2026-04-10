/**
 * 文档盖章状态标签。
 */

import type { DocumentStatusType } from "@erp/shared-types"

interface DocumentsStatusBadgeProps {
  status: DocumentStatusType | string
}

export function DocumentsStatusBadge({ status }: DocumentsStatusBadgeProps) {
  const className =
    status === "SIGNED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700"

  return (
    <span className={`border px-2 py-0.5 text-[10px] ${className}`}>
      {status === "SIGNED" ? "已归档" : "待盖章"}
    </span>
  )
}
