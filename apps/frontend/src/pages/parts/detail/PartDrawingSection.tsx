import { Button } from "@/components/ui/button"
import { PART_DRAWING_HELP_TEXT, type PartDrawing } from "@/hooks/api/useParts"
import { PartDrawingHistory } from "./PartDrawingHistory"
import { PartDrawingPreview } from "./PartDrawingPreview"

interface PartDrawingSectionProps {
  latestDrawing?: PartDrawing
  drawings: PartDrawing[]
  localPreviewUrl: string | null
  uploadError: string | null
  isUploading: boolean
  isMobile: boolean
  onUploadClick: () => void
  onImagePreview: (src: string, title: string) => void
}

export function PartDrawingSection({
  latestDrawing,
  drawings,
  localPreviewUrl,
  uploadError,
  isUploading,
  isMobile,
  onUploadClick,
  onImagePreview,
}: PartDrawingSectionProps) {
  return (
    <div className='flex w-full shrink-0 flex-col gap-3 lg:w-80 xl:w-96 lg:gap-4'>
      <section className='border border-border bg-card'>
        <div className='border-b border-border px-3 py-2.5 sm:px-4 sm:py-3'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <h2 className='text-sm font-semibold'>工程图纸</h2>
              <p className='mt-1 text-xs text-muted-foreground'>
                {PART_DRAWING_HELP_TEXT}，上传后旧版本自动归档
              </p>
            </div>
            <Button
              size='sm'
              variant='outline'
              className='h-8 shrink-0 px-2.5 text-xs'
              onClick={onUploadClick}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <i className='ri-loader-4-line mr-1 animate-spin' />
                  上传中
                </>
              ) : (
                <>
                  <i className='ri-upload-2-line mr-1' />
                  上传图纸
                </>
              )}
            </Button>
          </div>
        </div>
        <div className='p-3 sm:p-4'>
          <PartDrawingPreview
            drawing={latestDrawing}
            localPreviewUrl={localPreviewUrl}
            onUploadClick={onUploadClick}
            isUploading={isUploading}
            errorMessage={uploadError}
            onImagePreview={onImagePreview}
          />
        </div>
      </section>
      <PartDrawingHistory drawings={drawings} isMobile={isMobile} />
    </div>
  )
}
