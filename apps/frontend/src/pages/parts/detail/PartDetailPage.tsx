/**
 * PartDetailPage.tsx — 零件详情页 /parts/:id
 *
 * 布局：左侧图纸管理区 | 右侧信息区（展示态 / 内联编辑态）
 * 编辑直接在右侧原位切换，无弹层。
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useParams, useNavigate } from "@tanstack/react-router"
import { FilePreviewDialog } from "@/components/common/FilePreviewDialog"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/ui.store"
import {
  PART_DRAWING_ACCEPT,
  FileType,
  useGetPart,
  useUploadDrawing,
  useUpdatePart,
  apiPricesToForm,
  downloadPartDrawingFile,
  fetchPartDrawingFileBlob,
  formPricesToApi,
  type PartDrawing,
  validatePartDrawingFile,
} from "@/hooks/api/useParts"
import { useFilePreviewDialog } from "@/hooks/common/useFilePreviewDialog"
import { PageContentWrapper } from "@/components/common/PageContentWrapper"
import { useCanViewMoney, useIsAdmin } from "@/lib/permissions"
import { PartDetailEditForm } from "./PartDetailEditForm"
import { PartDrawingSection } from "./PartDrawingSection"
import { PartDetailLoadingState } from "./PartDetailLoadingState"
import { PartDetailMobileActions } from "./PartDetailMobileActions"
import { PartReadonlyInfoSection } from "./PartDetailReadonlySection"
import { PartDetailToolbar } from "./PartDetailToolbar"
import { useUnsavedChangesGuard } from "./useUnsavedChangesGuard"
import type { PartFormValues } from "../parts.schema"

// ─── 主页面 ───────────────────────────────────────────────

export function PartDetailPage() {
  const { id } = useParams({ from: "/parts/$id" })
  const navigate = useNavigate()
  const { isMobile } = useUIStore()
  const canViewMoney = useCanViewMoney()
  const canManage = useIsAdmin()
  const partId = Number(id)

  const { data: part, isLoading } = useGetPart(partId)
  const uploadDrawing = useUploadDrawing()
  const updatePart = useUpdatePart()

  const [isEditing, setIsEditing] = useState(false)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<
    string | null
  >(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const filePreview = useFilePreviewDialog()

  const latest = part?.drawings?.find(d => d.isLatest)
  const prices = apiPricesToForm(part?.commonPrices)
  const primaryPrice = useMemo(
    () =>
      prices.find(price => price.label === "标准价") ??
      prices[0] ??
      null,
    [prices],
  )
  const editDefaultValues = useMemo<PartFormValues>(
    () => ({
      name: part?.name ?? "",
      material: part?.material ?? "",
      spec: part?.spec ?? "",
      prices:
        prices.length > 0 ? prices : [{ label: "标准价", value: 0 }],
      customerIds: part?.customers.map(customer => customer.id) ?? [],
    }),
    [part?.customers, part?.material, part?.name, part?.spec, prices],
  )

  const { confirmDiscard } = useUnsavedChangesGuard({
    enabled: isEditing && hasUnsavedChanges,
  })

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
      }
    }
  }, [localPreviewUrl])

  const clearLocalPreview = () => {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl)
    }
    setLocalPreviewUrl(null)
  }

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validationError = validatePartDrawingFile(file)
    if (validationError) {
      setUploadError(validationError)
      e.target.value = ""
      return
    }

    setUploadError(null)

    if (file.type.startsWith("image/")) {
      clearLocalPreview()
      setLocalPreviewUrl(URL.createObjectURL(file))
    } else {
      clearLocalPreview()
    }

    try {
      await uploadDrawing.mutateAsync({ partId, file })
      clearLocalPreview()
    } catch (error) {
      clearLocalPreview()
      setUploadError(
        error instanceof Error ? error.message : "图纸上传失败",
      )
    }
    e.target.value = ""
  }

  const handleSave = async (values: PartFormValues) => {
    await updatePart.mutateAsync({
      id: partId,
      name: values.name,
      material: values.material,
      spec: values.spec,
      commonPrices: formPricesToApi(values.prices),
      customerIds: values.customerIds,
    })
    setHasUnsavedChanges(false)
    setIsEditing(false)
  }

  const handleBack = useCallback(() => {
    if (!confirmDiscard()) return
    navigate({ to: "/parts" })
  }, [confirmDiscard, navigate])

  const handleEnterEditMode = useCallback(() => {
    setHasUnsavedChanges(false)
    setIsEditing(true)
  }, [])

  const handleExitEditMode = useCallback(() => {
    if (!confirmDiscard()) return
    setHasUnsavedChanges(false)
    setIsEditing(false)
  }, [confirmDiscard])

  const handleToggleEdit = useCallback(() => {
    if (isEditing) {
      handleExitEditMode()
      return
    }
    handleEnterEditMode()
  }, [handleEnterEditMode, handleExitEditMode, isEditing])

  const handlePreviewLocalImage = useCallback(
    (src: string, title: string) => {
      void filePreview.openPreview({
        title,
        fileKind: "image",
        loadPreview: async () => {
          const response = await fetch(src)
          return response.blob()
        },
      })
    },
    [filePreview],
  )

  const handlePreviewDrawing = useCallback(
    (drawing: PartDrawing) => {
      void filePreview.openPreview({
        title: drawing.fileName,
        fileKind:
          drawing.fileType === FileType.PDF ? "pdf" : "image",
        loadPreview: () => fetchPartDrawingFileBlob(drawing),
        onDownload: () => downloadPartDrawingFile(drawing),
      })
    },
    [filePreview],
  )

  // ── Loading ──
  if (isLoading) {
    return <PartDetailLoadingState />
  }

  if (!part) {
    return (
      <div className='flex flex-col flex-1 items-center justify-center gap-4 text-muted-foreground'>
        <i className='ri-error-warning-line text-4xl opacity-40' />
        <p className='text-sm'>零件不存在或已删除</p>
        <Button
          variant='outline'
          size='sm'
          onClick={() => navigate({ to: "/parts" })}
        >
          返回零件库
        </Button>
      </div>
    )
  }

  return (
    <div className='flex flex-col flex-1 overflow-hidden bg-muted/20'>
      <PartDetailToolbar
        partName={part.name}
        partNumber={part.partNumber}
        isEditing={isEditing}
        canManage={canManage}
        onBack={handleBack}
        onToggleEdit={handleToggleEdit}
      />

      <PageContentWrapper
        withMobileBottomInset={isMobile}
        className='gap-4'
      >
        <div className='flex flex-col items-stretch gap-4 lg:flex-row lg:items-start'>
          <PartDrawingSection
            latestDrawing={latest}
            drawings={part.drawings ?? []}
            localPreviewUrl={localPreviewUrl}
            uploadError={uploadError}
            isUploading={uploadDrawing.isPending}
            isMobile={isMobile}
            canUpload={canManage}
            onUploadClick={() => fileInputRef.current?.click()}
            onLocalImagePreview={handlePreviewLocalImage}
            onPreviewDrawing={handlePreviewDrawing}
          />

          <div className='w-full min-w-0 flex-1'>
            {isEditing && canManage ? (
              <section className='border border-border bg-card px-3 py-3 sm:px-5 sm:py-4'>
                <div className='mb-3 flex items-center justify-between sm:mb-4'>
                  <div>
                    <h2 className='text-base font-semibold'>
                      编辑零件信息
                    </h2>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      优先维护名称、材质、规格和价格字典。
                    </p>
                  </div>
                </div>
                <PartDetailEditForm
                  defaultValues={editDefaultValues}
                  selectedCustomers={part.customers}
                  onSave={handleSave}
                  onCancel={handleExitEditMode}
                  isSaving={updatePart.isPending}
                  onDirtyChange={setHasUnsavedChanges}
                />
              </section>
            ) : (
              <PartReadonlyInfoSection
                part={part}
                primaryPrice={primaryPrice}
                prices={prices}
                latestDrawingName={latest?.fileName}
                canViewMoney={canViewMoney}
              />
            )}
          </div>
        </div>

        {isMobile && canManage && (
          <PartDetailMobileActions
            partNumber={part.partNumber}
            isEditing={isEditing}
            onToggleEdit={handleToggleEdit}
          />
        )}
      </PageContentWrapper>

      {/* 隐藏文件 input */}
      <input
        ref={fileInputRef}
        type='file'
        accept={PART_DRAWING_ACCEPT}
        className='hidden'
        onChange={handleFileChange}
      />

      <FilePreviewDialog
        open={filePreview.open}
        onOpenChange={filePreview.onOpenChange}
        title={filePreview.title}
        fileKind={filePreview.fileKind}
        previewUrl={filePreview.previewUrl}
        isLoading={filePreview.isLoading}
        error={filePreview.error}
        onDownload={filePreview.onDownload}
      />
    </div>
  )
}
