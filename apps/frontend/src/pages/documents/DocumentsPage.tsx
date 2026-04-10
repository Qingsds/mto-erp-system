/**
 * 文档盖章一级页入口。
 *
 * 当前统一使用同一套卡片列表结构，
 * 移动端与桌面端共享内容，避免重复维护两套记录页。
 */

import { FilePreviewDialog } from "@/components/common/FilePreviewDialog"
import { DocumentsDesktop } from "./list/DocumentsDesktop"
import { useDocumentsPageController } from "./list/useDocumentsPageController"

export function DocumentsPage() {
  const controller = useDocumentsPageController()

  return (
    <>
      <DocumentsDesktop controller={controller} />

      <FilePreviewDialog
        open={controller.previewDialog.open}
        onOpenChange={controller.previewDialog.onOpenChange}
        title={controller.previewDialog.title}
        fileKind={controller.previewDialog.fileKind}
        previewUrl={controller.previewDialog.previewUrl}
        isLoading={controller.previewDialog.isLoading}
        error={controller.previewDialog.error}
        onDownload={controller.previewDialog.onDownload}
      />
    </>
  )
}
