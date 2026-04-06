/**
 * 印章模块共享展示配置。
 *
 * 统一管理：
 * - PNG 上传限制
 * - 状态文案与样式
 * - 记录页目标文案
 */

import type { DocumentTargetType } from "@erp/shared-types"

export const SEAL_FILE_ACCEPT = ".png,image/png"
export const MAX_SEAL_FILE_SIZE_BYTES = 10 * 1024 * 1024

export function getSealStatusLabel(isActive: boolean) {
  return isActive ? "启用中" : "已停用"
}

export function getSealStatusClassName(isActive: boolean) {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-100 text-slate-600"
}

export function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function formatSealTarget(
  targetType: DocumentTargetType | null,
  targetId: number | null,
) {
  if (!targetType || !targetId) {
    return "未识别单据"
  }

  if (targetType === "ORDER") {
    return `订单 #${targetId}`
  }
  if (targetType === "DELIVERY") {
    return `发货单 #${targetId}`
  }
  return `对账单 #${targetId}`
}
