/**
 * 通用文档盖章页共享常量。
 */

export const SEALABLE_DOCUMENT_ACCEPT =
  ".pdf,application/pdf"

export const MAX_SEALABLE_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024

export function formatSealableFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
