/**
 * 通用签章弹窗。
 *
 * 负责：
 * - 展示可用印章
 * - 发起单据盖章
 * - 承载通用文案与 loading 状态
 *
 * 具体业务场景通过 target 参数传入，
 * 避免把对账、订单、发货等目标类型揉进组件内部。
 */

import { useState } from "react"
import type { DocumentTargetType } from "@erp/shared-types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useGetSeals, useExecuteSeal } from "@/hooks/api/useSeals"
import { cn } from "@/lib/utils"

interface ExecuteSealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: DocumentTargetType
  targetId: number
  targetLabel: string
  description: string
}

export function ExecuteSealDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetLabel,
  description,
}: ExecuteSealDialogProps) {
  const [selectedSealId, setSelectedSealId] = useState<number | null>(null)
  const { data: seals = [] } = useGetSeals()
  const activeSeals = seals.filter(seal => seal.isActive)
  const executeSeal = useExecuteSeal()

  const handleConfirm = async () => {
    if (!selectedSealId) return

    await executeSeal.mutateAsync({
      targetType,
      targetId,
      sealId: selectedSealId,
      userId: 1,
    })

    setSelectedSealId(null)
    onOpenChange(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedSealId(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>为 {targetLabel} 盖章</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-2 py-2'>
          <p className='mb-1 text-xs text-muted-foreground'>选择印章</p>
          {activeSeals.length === 0 ? (
            <div className='border border-dashed border-border bg-muted/20 px-4 py-5 text-center'>
              <p className='text-sm text-foreground'>暂无可用印章</p>
              <p className='mt-1 text-xs text-muted-foreground'>
                请先到印章管理中注册并启用印章，再返回当前单据继续盖章。
              </p>
            </div>
          ) : (
            activeSeals.map(seal => (
              <button
                key={seal.id}
                type='button'
                onClick={() => setSelectedSealId(seal.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 border px-3 py-2.5 text-left transition-colors",
                  selectedSealId === seal.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent",
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 shrink-0 border-2 transition-colors",
                    selectedSealId === seal.id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground",
                  )}
                />
                <div className='min-w-0'>
                  <p className='text-sm font-medium'>{seal.name}</p>
                  <p className='truncate text-[11px] text-muted-foreground font-mono'>
                    {seal.fileKey}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <DialogFooter className='gap-2'>
          <Button
            variant='outline'
            onClick={() => handleOpenChange(false)}
            disabled={executeSeal.isPending}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedSealId || executeSeal.isPending}
          >
            {executeSeal.isPending ? (
              <>
                <i className='ri-loader-4-line mr-1.5 animate-spin' />
                盖章中…
              </>
            ) : (
              <>
                <i className='ri-seal-line mr-1.5' />
                确认盖章
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
