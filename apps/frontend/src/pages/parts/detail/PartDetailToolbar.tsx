import { DetailPageToolbar } from "@/components/common/DetailPageToolbar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PartDetailToolbarProps {
  partName: string
  partNumber: string
  isEditing: boolean
  canManage: boolean
  onBack: () => void
  onToggleEdit: () => void
}

/**
 * 零件详情页顶栏。
 *
 * 保留零件业务自己的“编辑 / 查看”切换，
 * 结构壳复用通用详情页顶栏组件。
 */
export function PartDetailToolbar({
  partName,
  partNumber,
  isEditing,
  canManage,
  onBack,
  onToggleEdit,
}: PartDetailToolbarProps) {
  return (
    <DetailPageToolbar
      title={partName}
      subtitle={partNumber}
      backLabel=''
      onBack={onBack}
      actions={
        canManage
          ? (
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
            )
          : undefined
      }
    />
  )
}
