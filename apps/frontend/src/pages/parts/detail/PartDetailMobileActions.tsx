/**
 * 零件详情页移动端底部操作栏。
 *
 * 复用通用移动端底栏壳，提供更易触达的编辑 / 查看切换入口。
 */

import { Button } from "@/components/ui/button"
import { MobileActionBar } from "@/components/common/MobileActionBar"

interface PartDetailMobileActionsProps {
  partNumber: string
  isEditing: boolean
  onToggleEdit: () => void
}

export function PartDetailMobileActions({
  partNumber,
  isEditing,
  onToggleEdit,
}: PartDetailMobileActionsProps) {
  return (
    <MobileActionBar
      summary={
        <div className='flex items-center justify-between gap-3 text-xs'>
          <span className='font-mono text-muted-foreground'>
            {partNumber}
          </span>
          <span className='text-muted-foreground'>
            {isEditing ? "编辑中" : "查看中"}
          </span>
        </div>
      }
    >
      <Button
        type='button'
        className='h-10 w-full'
        variant={isEditing ? "secondary" : "default"}
        onClick={onToggleEdit}
      >
        <i
          className={
            isEditing
              ? "ri-eye-line mr-1.5"
              : "ri-edit-line mr-1.5"
          }
        />
        {isEditing ? "返回查看" : "编辑零件"}
      </Button>
    </MobileActionBar>
  )
}
