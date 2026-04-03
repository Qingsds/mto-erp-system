/**
 * 财务对账列表共享常量与格式化工具。
 */

import type { BillingStatusType } from "@erp/shared-types"

export type BillingFilter = BillingStatusType | "all"

export const BILLING_STATUS_LABEL: Record<BillingFilter, string> = {
  all: "全部",
  DRAFT: "草稿",
  SEALED: "已盖章",
  PAID: "已结清",
}

export const BILLING_STATUS_STYLE: Record<BillingStatusType, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SEALED: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

export function formatBillingNo(id: number): string {
  return `BIL-${String(id).padStart(6, "0")}`
}
