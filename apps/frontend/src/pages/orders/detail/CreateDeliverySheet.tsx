/**
 * CreateDeliverySheet.tsx
 *
 * 职责：
 * - 封装创建发货单抽屉容器
 * - 管理发货数量输入、待发数量校验与提交 payload 组装
 */

import { useEffect, useMemo, useRef, useState } from "react"
import type { CreateDeliveryRequest } from "@erp/shared-types"
import { FilePreviewDialog } from "@/components/common/FilePreviewDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ErpSheet } from "@/components/common/ErpSheet"
import { formatOrderNo, type OrderDetail } from "@/hooks/api/useOrders"
import {
  cleanupStashedDeliveryPhoto,
  DELIVERY_PHOTO_ACCEPT,
  DELIVERY_PHOTO_HELP_TEXT,
  DELIVERY_PHOTO_MAX_COUNT,
  type StashedDeliveryPhoto,
  useStashDeliveryPhoto,
  validateDeliveryPhotoFile,
} from "@/hooks/api/useDeliveries"
import { useFilePreviewDialog } from "@/hooks/common/useFilePreviewDialog"
import { toast } from "@/lib/toast"

interface CreateDeliveryPanelProps {
  /** 当前订单详情（含所有订单行）。 */
  order: OrderDetail
  /** 提交创建请求时的 loading 状态。 */
  isSubmitting: boolean
  /** 关闭抽屉回调。 */
  onCancel: () => void
  /** 提交创建发货单回调。 */
  onSubmit: (payload: CreateDeliveryRequest) => Promise<void>
  /** 抽屉是否打开。 */
  open: boolean
}

type LocalStashedPhoto = StashedDeliveryPhoto & {
  localPreviewUrl: string
}

function CreateDeliveryPanel({
  order,
  isSubmitting,
  onCancel,
  onSubmit,
  open,
}: CreateDeliveryPanelProps) {
  const [remark, setRemark] = useState("")
  const [qtyByOrderItemId, setQtyByOrderItemId] = useState<Record<number, string>>(() => {
    const next: Record<number, string> = {}
    for (const item of order.items) next[item.id] = "0"
    return next
  })
  const [photos, setPhotos] = useState<LocalStashedPhoto[]>([])
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const latestPhotosRef = useRef<LocalStashedPhoto[]>([])
  const stashPhoto = useStashDeliveryPhoto()
  const previewDialog = useFilePreviewDialog()

  const rows = useMemo(
    () =>
      order.items.map(item => {
        const pendingQty = Math.max(item.orderedQty - item.shippedQty, 0)
        return { item, pendingQty }
      }),
    [order.items],
  )

  const selectedItems = useMemo(
    () =>
      rows
        .map(row => {
          const raw = qtyByOrderItemId[row.item.id] ?? "0"
          const quantity = Math.trunc(Number(raw))
          return { orderItemId: row.item.id, quantity, pendingQty: row.pendingQty }
        })
        .filter(v => Number.isFinite(v.quantity) && v.quantity > 0),
    [rows, qtyByOrderItemId],
  )

  const selectedQty = selectedItems.reduce((sum, v) => sum + v.quantity, 0)
  const hasInvalidQty = selectedItems.some(v => v.quantity > v.pendingQty)
  const canAddMorePhotos = photos.length < DELIVERY_PHOTO_MAX_COUNT

  const revokeLocalUrls = (targetPhotos: LocalStashedPhoto[]) => {
    for (const photo of targetPhotos) {
      if (photo.localPreviewUrl) {
        window.URL.revokeObjectURL(photo.localPreviewUrl)
      }
    }
  }

  const cleanupPhotos = async (targetPhotos = photos) => {
    if (targetPhotos.length === 0) {
      return
    }

    setIsCleaningUp(true)
    await Promise.allSettled(
      targetPhotos.map(photo => cleanupStashedDeliveryPhoto(photo.fileKey)),
    )
    revokeLocalUrls(targetPhotos)
    setIsCleaningUp(false)
  }

  useEffect(() => {
    latestPhotosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => {
      revokeLocalUrls(latestPhotosRef.current)
    }
  }, [])

  useEffect(() => {
    if (open) {
      return
    }

    void cleanupPhotos()
    setPhotos([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const fillPending = () => {
    const next: Record<number, string> = {}
    for (const row of rows) next[row.item.id] = String(row.pendingQty)
    setQtyByOrderItemId(next)
  }

  const handleQtyChange = (orderItemId: number, pendingQty: number, nextRaw: string) => {
    if (nextRaw === "") {
      setQtyByOrderItemId(prev => ({ ...prev, [orderItemId]: "" }))
      return
    }
    const nextVal = Math.trunc(Number(nextRaw))
    if (!Number.isFinite(nextVal)) return
    const clamped = Math.max(0, Math.min(pendingQty, nextVal))
    setQtyByOrderItemId(prev => ({ ...prev, [orderItemId]: String(clamped) }))
  }

  const handleSubmit = async () => {
    if (selectedItems.length === 0 || hasInvalidQty) return
    const submittedPhotos = photos.map(({ localPreviewUrl, ...photo }) => photo)

    try {
      await onSubmit({
        orderId: order.id,
        remark: remark.trim() || undefined,
        items: selectedItems.map(v => ({ orderItemId: v.orderItemId, quantity: v.quantity })),
        photos: submittedPhotos,
      })
    } catch (error) {
      await cleanupPhotos(photos)
      setPhotos([])
    }
  }

  const handleSelectFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return

    const nextFiles = Array.from(fileList)
    const remainCount = DELIVERY_PHOTO_MAX_COUNT - photos.length
    const targetFiles = nextFiles.slice(0, remainCount)

    if (nextFiles.length > remainCount) {
      toast.error(`发货照片最多上传 ${DELIVERY_PHOTO_MAX_COUNT} 张`)
    }

    for (const file of targetFiles) {
      const validationError = validateDeliveryPhotoFile(file)
      if (validationError) {
        toast.error(validationError)
        continue
      }

      try {
        const stashed = await stashPhoto.mutateAsync(file)
        const localPreviewUrl = window.URL.createObjectURL(file)
        setPhotos(prev => [...prev, { ...stashed, localPreviewUrl }])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "发货照片上传失败")
      }
    }
  }

  const handleRemovePhoto = async (target: LocalStashedPhoto) => {
    setPhotos(prev => prev.filter(photo => photo.fileKey !== target.fileKey))
    revokeLocalUrls([target])
    await cleanupStashedDeliveryPhoto(target.fileKey)
  }

  const handlePreviewPhoto = async (photo: LocalStashedPhoto) => {
    await previewDialog.openPreview({
      title: photo.fileName,
      fileKind: "image",
      previewUrl: photo.localPreviewUrl,
    })
  }

  const handleCancel = async () => {
    await cleanupPhotos()
    setPhotos([])
    onCancel()
  }

  return (
    <div className="flex min-h-full flex-col gap-3 pb-2">
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        本次发货数量会实时回写订单明细的已发数量，并驱动订单状态自动更新。
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">发货明细</p>
        <Button type="button" variant="ghost" size="sm" onClick={fillPending}>
          <i className="ri-stack-line mr-1" />
          全部按待发填充
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map(({ item, pendingQty }) => (
          <div key={item.id} className="border border-border bg-card px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.part.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                  {item.part.partNumber}
                </p>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <p>待发 {pendingQty}</p>
                <p>已发 {item.shippedQty} / 需发 {item.orderedQty}</p>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">本次发货</span>
              <Input
                type="number"
                min={0}
                max={pendingQty}
                value={qtyByOrderItemId[item.id] ?? "0"}
                onChange={e => handleQtyChange(item.id, pendingQty, e.target.value)}
                className="h-8 w-28 text-right font-mono"
              />
              <span className="text-xs text-muted-foreground">件</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">备注</label>
        <textarea
          rows={2}
          value={remark}
          onChange={e => setRemark(e.target.value)}
          placeholder="可选：物流批次说明、异常备注…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none resize-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">发货照片</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {DELIVERY_PHOTO_HELP_TEXT}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {photos.length} / {DELIVERY_PHOTO_MAX_COUNT}
          </span>
        </div>

        <input
          ref={uploadInputRef}
          type='file'
          accept={DELIVERY_PHOTO_ACCEPT}
          multiple
          capture='environment'
          className='hidden'
          onChange={event => {
            void handleSelectFiles(event.target.files)
            event.currentTarget.value = ""
          }}
        />

        <div className='flex'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-10 w-full justify-center'
            disabled={!canAddMorePhotos || stashPhoto.isPending || isSubmitting}
            onClick={() => uploadInputRef.current?.click()}
          >
            <i className='ri-camera-line mr-1.5' />
            拍照 / 从相册选择
          </Button>
        </div>

        {photos.length > 0 ? (
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
            {photos.map(photo => (
              <div
                key={photo.fileKey}
                className='border border-border bg-card'
              >
                <button
                  type='button'
                  className='block aspect-[4/3] w-full overflow-hidden border-b border-border bg-muted/30'
                  onClick={() => {
                    void handlePreviewPhoto(photo)
                  }}
                >
                  <img
                    src={photo.localPreviewUrl}
                    alt={photo.fileName}
                    className='h-full w-full object-cover'
                  />
                </button>
                <div className='flex items-start justify-between gap-2 px-2.5 py-2'>
                  <button
                    type='button'
                    className='min-w-0 flex-1 text-left'
                    onClick={() => {
                      void handlePreviewPhoto(photo)
                    }}
                  >
                    <p className='truncate text-xs font-medium text-foreground'>
                      {photo.fileName}
                    </p>
                    <p className='mt-1 text-[11px] text-muted-foreground'>
                      点击查看大图
                    </p>
                  </button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 shrink-0'
                    disabled={isSubmitting}
                    onClick={() => {
                      void handleRemovePhoto(photo)
                    }}
                  >
                    <i className='ri-delete-bin-line text-sm' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='border border-dashed border-border bg-muted/20 px-3 py-4 text-xs text-muted-foreground'>
            未上传发货照片，留空也可以直接创建发货单。
          </div>
        )}
      </div>

      <Separator />

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">已选择 {selectedItems.length} 行</span>
        <span className="font-mono font-semibold">合计 {selectedQty} 件</span>
      </div>

      <div className="flex items-stretch gap-2 pt-1">
        <Button
          type="button"
          className="h-10 min-w-0 basis-0 shrink grow overflow-hidden"
          onClick={handleSubmit}
          disabled={isSubmitting || selectedItems.length === 0 || hasInvalidQty || isCleaningUp}
        >
          {isSubmitting ? (
            <>
              <i className="ri-loader-4-line animate-spin mr-1.5 shrink-0" />
              <span className="truncate">创建中…</span>
            </>
          ) : (
            <>
              <i className="ri-truck-line mr-1.5 shrink-0" />
              <span className="truncate">创建发货单</span>
            </>
          )}
        </Button>
        <Button type="button" variant="outline" className="h-10 shrink-0" onClick={() => { void handleCancel() }}>
          <span className="truncate">取消</span>
        </Button>
      </div>

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
    </div>
  )
}

interface CreateDeliverySheetProps {
  /** 抽屉是否打开。 */
  open: boolean
  /** 抽屉重置种子，用于强制重挂载内部表单。 */
  seed: number
  /** 当前订单详情（用于生成发货 payload）。 */
  order: OrderDetail
  /** 提交创建请求时的 loading 状态。 */
  isSubmitting: boolean
  /** 抽屉开关回调。 */
  onOpenChange: (open: boolean) => void
  /** 提交创建发货单回调。 */
  onSubmit: (payload: CreateDeliveryRequest) => Promise<void>
}

export function CreateDeliverySheet({
  open,
  seed,
  order,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: CreateDeliverySheetProps) {
  return (
    <ErpSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`创建发货单 · ${formatOrderNo(order.id)}`}
      description="填写本次发货数量，系统会自动更新订单发货进度"
      width={620}
    >
      <CreateDeliveryPanel
        key={`${order.id}-${seed}`}
        order={order}
        isSubmitting={isSubmitting}
        open={open}
        onCancel={() => onOpenChange(false)}
        onSubmit={onSubmit}
      />
    </ErpSheet>
  )
}
