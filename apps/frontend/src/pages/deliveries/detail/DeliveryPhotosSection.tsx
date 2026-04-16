import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { FilePreviewDialog } from "@/components/common/FilePreviewDialog"
import type { DeliveryDetail, DeliveryPhoto } from "@/hooks/api/useDeliveries"
import {
  downloadDeliveryPhoto,
  fetchDeliveryPhotoBlob,
} from "@/hooks/api/useDeliveries"
import { useFilePreviewDialog } from "@/hooks/common/useFilePreviewDialog"

interface DeliveryPhotosSectionProps {
  delivery: DeliveryDetail
}

export function DeliveryPhotosSection({
  delivery,
}: DeliveryPhotosSectionProps) {
  const previewDialog = useFilePreviewDialog()
  const photos = useMemo(() => delivery.photos ?? [], [delivery.photos])

  if (photos.length === 0) {
    return (
      <section className='border border-border bg-card'>
        <div className='border-b border-border px-4 py-2.5'>
          <h3 className='text-sm font-semibold'>发货照片</h3>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            当前发货单未上传现场照片
          </p>
        </div>
        <div className='px-4 py-4 text-xs text-muted-foreground'>
          没有照片不影响旧数据查看和当前单据使用。
        </div>
      </section>
    )
  }

  const openPhotoPreview = async (photo: DeliveryPhoto) => {
    await previewDialog.openPreview({
      title: photo.fileName,
      fileKind: "image",
      loadPreview: () => fetchDeliveryPhotoBlob(delivery.id, photo.id),
      onDownload: () => downloadDeliveryPhoto(delivery.id, photo),
    })
  }

  return (
    <>
      <section className='border border-border bg-card'>
        <div className='border-b border-border px-4 py-2.5'>
          <h3 className='text-sm font-semibold'>发货照片</h3>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            共 {photos.length} 张现场照片，可点击预览或下载
          </p>
        </div>
        <div className='grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4'>
          {photos.map(photo => (
            <button
              key={photo.id}
              type='button'
              className='flex min-w-0 flex-col items-start border border-border bg-background px-3 py-3 text-left transition-colors hover:bg-muted/40'
              onClick={() => {
                void openPhotoPreview(photo)
              }}
            >
              <div className='flex h-24 w-full items-center justify-center border border-dashed border-border bg-muted/20 text-muted-foreground'>
                <i className='ri-image-line text-2xl' />
              </div>
              <p className='mt-2 w-full truncate text-xs font-medium text-foreground'>
                {photo.fileName}
              </p>
              <div className='mt-2 flex w-full items-center justify-between gap-2'>
                <span className='text-[11px] text-muted-foreground'>图片</span>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-7 px-2 text-xs'
                  onClick={event => {
                    event.stopPropagation()
                    void downloadDeliveryPhoto(delivery.id, photo)
                  }}
                >
                  下载
                </Button>
              </div>
            </button>
          ))}
        </div>
      </section>

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
    </>
  )
}
