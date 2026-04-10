/**
 * 文档盖章列表页共享配置。
 */

import type { DocumentStatusType } from "@erp/shared-types"

export type ManagedDocumentFilter = "all" | DocumentStatusType

export const MANAGED_DOCUMENT_STATUS_LABEL: Record<ManagedDocumentFilter, string> = {
  all: "全部",
  DRAFT: "待盖章",
  SIGNED: "已归档",
}

export function formatManagedDocumentDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
