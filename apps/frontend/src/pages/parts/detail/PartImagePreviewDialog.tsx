import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface PartImagePreviewDialogProps {
  previewImage: { src: string; title: string } | null
  onOpenChange: (open: boolean) => void
  onClose: () => void
}

export function PartImagePreviewDialog({
  previewImage,
  onOpenChange,
  onClose,
}: PartImagePreviewDialogProps) {
  return (
    <Dialog open={!!previewImage} onOpenChange={onOpenChange}>
      <DialogContent
        className='max-w-[calc(100vw-1.5rem)] border border-border bg-background p-3 sm:max-w-5xl'
        overlayClassName='bg-black/88'
        showCloseButton={false}
      >
        {previewImage && (
          <div className='flex flex-col gap-3'>
            <div className='flex items-center justify-between gap-3'>
              <div className='min-w-0'>
                <p className='truncate text-sm font-medium'>{previewImage.title}</p>
                <p className='text-xs text-muted-foreground'>点击空白处或右侧按钮关闭</p>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='shrink-0'
                onClick={onClose}
              >
                <i className='ri-close-line mr-1.5' />
                关闭
              </Button>
            </div>
            <div className='flex max-h-[80vh] items-center justify-center overflow-auto border border-border bg-muted/20 p-2'>
              <img
                src={previewImage.src}
                alt={previewImage.title}
                className='max-h-[75vh] w-auto max-w-full object-contain'
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
