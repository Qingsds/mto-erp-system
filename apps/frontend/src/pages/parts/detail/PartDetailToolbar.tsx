import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PartDetailToolbarProps {
  partName: string
  partNumber: string
  isEditing: boolean
  onBack: () => void
  onToggleEdit: () => void
}

/**
 * Sticky top action bar for mobile and desktop.
 * The part number stays visible on small screens to preserve ERP-level identification.
 */
export function PartDetailToolbar({
  partName,
  partNumber,
  isEditing,
  onBack,
  onToggleEdit,
}: PartDetailToolbarProps) {
  return (
    <div className='sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80'>
      <div className='mx-auto w-full max-w-7xl px-3 py-2 sm:px-6 sm:py-3 lg:px-8'>
        <div className='flex items-center justify-between gap-2'>
          <div className='min-w-0 flex flex-1 items-center gap-2.5'>
            <Button
              variant='ghost'
              size='sm'
              className='-ml-1 h-8 shrink-0 px-2 text-xs'
              onClick={onBack}
            >
              <i className='ri-arrow-left-line sm:mr-1.5' />
              <span className='hidden sm:inline'>返回零件库</span>
            </Button>
            <div className='min-w-0'>
              <h1 className='truncate text-sm font-semibold tracking-tight sm:text-base'>
                {partName}
              </h1>
              <p className='truncate font-mono text-[11px] text-muted-foreground'>
                {partNumber}
              </p>
            </div>
          </div>
          <Button
            variant={isEditing ? "secondary" : "outline"}
            size='sm'
            className='h-8 shrink-0 px-2.5 text-xs'
            onClick={onToggleEdit}
          >
            <i
              className={cn(
                "mr-1.5",
                isEditing ? "ri-eye-line" : "ri-edit-line",
              )}
            />
            {isEditing ? "查看信息" : "编辑"}
          </Button>
        </div>
      </div>
    </div>
  )
}
