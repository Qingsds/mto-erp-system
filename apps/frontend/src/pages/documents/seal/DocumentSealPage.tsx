/**
 * 通用文档盖章页。
 *
 * 页面只负责编排三段状态：
 * - 上传源文件
 * - 进入共享签章工作台
 * - 盖章完成后的结果查看
 */

import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { FilePreviewDialog } from "@/components/common/FilePreviewDialog"
import { TopLevelPageHeaderWrapper } from "@/components/common/TopLevelPageHeaderWrapper"
import { TopLevelPageTitle } from "@/components/common/TopLevelPageTitle"
import { TopLevelPageWrapper } from "@/components/common/TopLevelPageWrapper"
import { SealWorkbench } from "@/components/documents/seal-workbench/SealWorkbench"
import { Button } from "@/components/ui/button"
import {
  buildDocumentFileUrl,
  useGetManagedDocument,
  useDocumentSealPreview,
  useUploadSourceDocument,
  type ManagedDocumentItem,
} from "@/hooks/api/useDocuments"
import { useExecuteSeal } from "@/hooks/api/useSeals"
import { useFilePreviewDialog } from "@/hooks/common/useFilePreviewDialog"
import { downloadBlob, resolveActionMessage } from "@/lib/files"
import request from "@/lib/utils/request"
import { toast } from "@/lib/toast"
import { SignedDocumentResultPanel } from "./SignedDocumentResultPanel"
import { SourceUploadPanel } from "./SourceUploadPanel"
import { MAX_SEALABLE_DOCUMENT_SIZE_BYTES, formatSealableFileSize } from "./shared"

async function fetchSignedDocumentBlob(documentId: number) {
  return request.get<Blob, Blob>(buildDocumentFileUrl(documentId), {
    responseType: "blob",
  })
}

interface DocumentSealPageProps {
  documentId?: number
}

export function DocumentSealPage({ documentId }: DocumentSealPageProps) {
  const navigate = useNavigate()
  const [pageError, setPageError] = useState<string | null>(null)
  const [activeDocument, setActiveDocument] = useState<ManagedDocumentItem | null>(null)
  const [previewingSignedId, setPreviewingSignedId] = useState<number | null>(null)
  const [downloadingSignedId, setDownloadingSignedId] = useState<number | null>(null)

  const uploadDocument = useUploadSourceDocument()
  const executeSeal = useExecuteSeal()
  const previewDialog = useFilePreviewDialog()
  const draftDocumentQuery = useGetManagedDocument(documentId)
  const resolvedDocument = activeDocument ?? draftDocumentQuery.data ?? null
  const preview = useDocumentSealPreview(
    resolvedDocument?.status === "DRAFT" ? resolvedDocument.id : undefined,
  )

  useEffect(() => {
    setPageError(null)
    setActiveDocument(null)
  }, [documentId])

  useEffect(() => {
    if (draftDocumentQuery.error instanceof Error && documentId) {
      setPageError(draftDocumentQuery.error.message)
    }
  }, [documentId, draftDocumentQuery.error])

  const backToList = () => {
    setPageError(null)
    setActiveDocument(null)
    void navigate({ to: "/documents" })
  }

  const startNewSeal = () => {
    setPageError(null)
    setActiveDocument(null)
    void navigate({ to: "/documents/seal" })
  }

  const renderPreviewDialog = () => (
    <FilePreviewDialog
      open={previewDialog.open}
      onOpenChange={previewDialog.onOpenChange}
      title={previewDialog.title}
      fileKind={previewDialog.fileKind}
      previewUrl={previewDialog.previewUrl}
      isLoading={previewDialog.isLoading}
      error={previewDialog.error}
      onDownload={previewDialog.onDownload}
    />
  )

  const handleUpload = async (file: File) => {
    if (file.size > MAX_SEALABLE_DOCUMENT_SIZE_BYTES) {
      setPageError(
        `待盖章文件不能超过 ${formatSealableFileSize(MAX_SEALABLE_DOCUMENT_SIZE_BYTES)}`,
      )
      return
    }

    try {
      setPageError(null)
      const document = await uploadDocument.mutateAsync(file)
      setActiveDocument(document)
      toast.success("PDF 草稿上传成功，正在进入盖章工作台")
    } catch (error) {
      const message = await resolveActionMessage(error, "文件上传失败")
      setPageError(`文件上传失败：${message}`)
      toast.error(`文件上传失败：${message}`)
    }
  }

  const handleDownloadSigned = async (document: ManagedDocumentItem) => {
    try {
      setPageError(null)
      setDownloadingSignedId(document.id)
      const blob = await fetchSignedDocumentBlob(document.id)
      downloadBlob(document.fileName, blob)
      toast.success(`下载成功：${document.fileName}`)
    } catch (error) {
      const message = await resolveActionMessage(error, "归档 PDF 下载失败")
      setPageError(`归档 PDF 下载失败：${message}`)
      toast.error(`归档 PDF 下载失败：${message}`)
    } finally {
      setDownloadingSignedId(null)
    }
  }

  const handlePreviewSigned = async (document: ManagedDocumentItem) => {
    try {
      setPageError(null)
      setPreviewingSignedId(document.id)
      await previewDialog.openPreview({
        title: document.fileName,
        fileKind: "pdf",
        loadPreview: () => fetchSignedDocumentBlob(document.id),
        onDownload: () => handleDownloadSigned(document),
      })
    } catch (error) {
      const message = await resolveActionMessage(error, "归档 PDF 预览失败")
      setPageError(`归档 PDF 预览失败：${message}`)
      toast.error(`归档 PDF 预览失败：${message}`)
    } finally {
      setPreviewingSignedId(null)
    }
  }

  if (!resolvedDocument) {
    return (
      <>
        <TopLevelPageWrapper fillHeight>
          <div className='flex flex-1 flex-col overflow-hidden'>
            <TopLevelPageHeaderWrapper
              bodyClassName='flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'
              padding='desktop'
            >
              <TopLevelPageTitle
                title='文档盖章'
                subtitle='上传 PDF 后进入统一盖章工作台'
              />

              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-10 shrink-0 sm:h-9'
                onClick={() => navigate({ to: "/documents" })}
              >
                <i className='ri-arrow-left-line mr-1.5' />
                返回列表
              </Button>
            </TopLevelPageHeaderWrapper>

            <div className='flex-1 overflow-y-auto py-4'>
              {draftDocumentQuery.isLoading && documentId ? (
                <div className='border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground'>
                  <i className='ri-loader-4-line mr-2 animate-spin' />
                  正在加载文档草稿…
                </div>
              ) : (
              <SourceUploadPanel
                isUploading={uploadDocument.isPending}
                error={pageError}
                onUpload={handleUpload}
              />
              )}
            </div>
          </div>
        </TopLevelPageWrapper>

        {renderPreviewDialog()}
      </>
    )
  }

  if (resolvedDocument.status === "SIGNED") {
    return (
      <>
        <TopLevelPageWrapper fillHeight>
          <div className='flex flex-1 flex-col overflow-hidden'>
            <TopLevelPageHeaderWrapper
              bodyClassName='flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'
              padding='desktop'
            >
              <TopLevelPageTitle
                title='文档盖章'
                subtitle='当前文档已归档完成'
              />

              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-10 shrink-0 sm:h-9'
                onClick={backToList}
              >
                <i className='ri-arrow-left-line mr-1.5' />
                返回列表
              </Button>
            </TopLevelPageHeaderWrapper>

            <div className='flex-1 overflow-y-auto py-4'>
              {pageError && (
                <div className='border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive sm:px-4'>
                  {pageError}
                </div>
              )}

              <SignedDocumentResultPanel
                document={resolvedDocument}
                isPreviewing={previewingSignedId === resolvedDocument.id}
                isDownloading={downloadingSignedId === resolvedDocument.id}
                onPreview={() => void handlePreviewSigned(resolvedDocument)}
                onDownload={() => void handleDownloadSigned(resolvedDocument)}
                onReset={startNewSeal}
              />
            </div>
          </div>
        </TopLevelPageWrapper>

        {renderPreviewDialog()}
      </>
    )
  }

  return (
    <>
      <SealWorkbench
        shellVariant='top-level'
        title='文档盖章'
        subtitle={resolvedDocument.sourceFileName ?? resolvedDocument.fileName}
        backLabel='返回列表'
        onBack={backToList}
        sidebarTitle='盖章设置'
        sidebarSubtitle={`${resolvedDocument.sourceFileName ?? resolvedDocument.fileName} · PDF 草稿`}
        previewBytes={preview.pdfBytes}
        isPreviewLoading={preview.isLoading || preview.isFetching}
        previewError={preview.error}
        isSubmitting={executeSeal.isPending}
        submitLabel='确认盖章归档'
        submitLoadingLabel='归档中…'
        extraActions={
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-9'
            onClick={startNewSeal}
          >
            <i className='ri-refresh-line mr-1.5' />
            重新上传
          </Button>
        }
        onSubmit={async ({ sealId, placement }) => {
          try {
            setPageError(null)
            const document = await executeSeal.mutateAsync({
              targetType: "DOCUMENT",
              targetId: resolvedDocument.id,
              sealId,
              pageIndex: placement.pageIndex,
              xRatio: placement.xRatio,
              yRatio: placement.yRatio,
              widthRatio: placement.widthRatio,
            })
            setActiveDocument(document)
          } catch (error) {
            const message = await resolveActionMessage(error, "盖章归档失败")
            setPageError(`盖章归档失败：${message}`)
            throw new Error(message)
          }
        }}
      />

      {renderPreviewDialog()}
    </>
  )
}
