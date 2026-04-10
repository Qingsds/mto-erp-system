/**
 * 文档盖章一级页桌面主视图。
 */

import { EmptyStateBlock } from "@/components/common/EmptyStateBlock"
import { TopLevelPageHeaderWrapper } from "@/components/common/TopLevelPageHeaderWrapper"
import { TopLevelPageTitle } from "@/components/common/TopLevelPageTitle"
import { TopLevelPageWrapper } from "@/components/common/TopLevelPageWrapper"
import { StatusFilterBar } from "@/components/common/TableToolbar"
import { Button } from "@/components/ui/button"
import { ManagedDocumentCard } from "./ManagedDocumentCard"
import type { useDocumentsPageController } from "./useDocumentsPageController"

type DocumentsPageController = ReturnType<typeof useDocumentsPageController>

interface DocumentsDesktopProps {
  controller: DocumentsPageController
}

export function DocumentsDesktop({ controller }: DocumentsDesktopProps) {
  const {
    documents,
    total,
    subtitle,
    statusFilter,
    statusTabs,
    actionError,
    isLoading,
    previewingDocumentId,
    downloadingDocumentId,
    openCreate,
    continueSeal,
    previewPdf,
    downloadPdf,
    clearActionError,
    setStatusFilter,
  } = controller

  return (
    <TopLevelPageWrapper fillHeight>
      <div className='flex flex-1 flex-col overflow-hidden'>
        <TopLevelPageHeaderWrapper
          bodyClassName='items-end justify-between'
          padding='desktop'
        >
          <TopLevelPageTitle
            title='文档盖章'
            subtitle={subtitle}
          />

          <Button size='sm' onClick={openCreate}>
            <i className='ri-add-line mr-1.5' />
            上传并盖章
          </Button>
        </TopLevelPageHeaderWrapper>

        <StatusFilterBar
          className='border-b border-border py-3'
          tabs={statusTabs}
          value={statusFilter}
          onChange={setStatusFilter}
        />

        <div className='flex-1 overflow-y-auto py-4'>
          {actionError && (
            <div className='mb-4 border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
              <div className='flex items-start justify-between gap-3'>
                <span>{actionError}</span>
                <button
                  type='button'
                  className='text-destructive/70 transition-colors hover:text-destructive'
                  onClick={clearActionError}
                >
                  <i className='ri-close-line text-base' />
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3'>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className='h-[180px] border border-border bg-card animate-pulse'
                />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <EmptyStateBlock
              icon='ri-file-paper-2-line'
              title={total === 0 ? "还没有文档记录" : "当前筛选下暂无文档"}
              description={
                total === 0
                  ? "上传 PDF 后会先保存为草稿，再进入盖章工作台。"
                  : "可以切换状态筛选，或继续上传新的待盖章文件。"
              }
              action={(
                <Button className='h-9' onClick={openCreate}>
                  <i className='ri-add-line mr-1.5' />
                  上传并盖章
                </Button>
              )}
              contentClassName='py-16'
            />
          ) : (
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3'>
              {documents.map(document => (
                <ManagedDocumentCard
                  key={document.id}
                  document={document}
                  isPreviewing={previewingDocumentId === document.id}
                  isDownloading={downloadingDocumentId === document.id}
                  onContinueSeal={continueSeal}
                  onPreviewPdf={documentItem => void previewPdf(documentItem)}
                  onDownloadPdf={documentItem => void downloadPdf(documentItem)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </TopLevelPageWrapper>
  )
}
