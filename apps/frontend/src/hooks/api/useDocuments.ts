/**
 * 文档模块共享接口辅助。
 *
 * 当前只暴露下载地址构造，避免业务页面之间互相依赖。
 */

import { resolveApiUrl } from "@/lib/utils/request"

export function buildDocumentFileUrl(documentId: number): string {
  return resolveApiUrl(`/api/documents/${documentId}/file`)
}

export function buildBillingPreviewUrl(billingId: number): string {
  return resolveApiUrl(`/api/documents/billing/${billingId}/preview`)
}
