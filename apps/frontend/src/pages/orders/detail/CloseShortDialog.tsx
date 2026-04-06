/**
 * 短交结案确认弹窗。
 *
 * 要求用户明确填写原因，并展示数量与金额影响，
 * 避免高风险动作被一键提交。
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatOrderNo } from "@/hooks/api/useOrders"

interface CloseShortDialogProps {
  open: boolean
  orderId: number
  pendingQty: number
  settlementAmount: number
  canViewMoney: boolean
  isSubmitting: boolean
  onConfirm: (reason: string) => Promise<void>
  onOpenChange: (open: boolean) => void
}

function formatCurrency(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function CloseShortDialog({
  open,
  orderId,
  pendingQty,
  settlementAmount,
  canViewMoney,
  isSubmitting,
  onConfirm,
  onOpenChange,
}: CloseShortDialogProps) {
  const [reason, setReason] = useState("")

  const trimmedReason = reason.trim()

  const handleConfirm = async () => {
    if (!trimmedReason) return
    await onConfirm(trimmedReason)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!isSubmitting) {
          if (!nextOpen) {
            setReason("")
          }
          onOpenChange(nextOpen)
        }
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            确认短交结案 {formatOrderNo(orderId)}
          </DialogTitle>
          <DialogDescription>
            结案后，当前订单将不再进入后续发货流程，请先确认数量
            {canViewMoney ? "与金额影响" : "影响"}。
          </DialogDescription>
        </DialogHeader>

        <div className={`grid gap-3 ${canViewMoney ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className='border border-border bg-muted/30 px-3 py-2.5'>
            <p className='text-[11px] text-muted-foreground'>
              本次转为短交的待发数量
            </p>
            <p className='mt-1 text-sm font-semibold text-foreground'>
              {pendingQty} 件
            </p>
          </div>
          {canViewMoney && (
            <div className='border border-border bg-muted/30 px-3 py-2.5'>
              <p className='text-[11px] text-muted-foreground'>
                按已发数量结算的订单金额
              </p>
              <p className='mt-1 text-sm font-semibold text-foreground'>
                ¥{formatCurrency(settlementAmount)}
              </p>
            </div>
          )}
        </div>

        <div className='space-y-2'>
          <div>
            <p className='text-sm font-medium text-foreground'>
              结案原因
            </p>
            <p className='mt-1 text-xs text-muted-foreground'>
              请填写客户确认、缺料、取消尾项等真实原因，后续审计会直接显示该说明。
            </p>
          </div>

          <Input
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder='请输入短交结案原因'
            className='h-10'
            maxLength={80}
          />
        </div>

        <DialogFooter className='gap-2'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            variant='destructive'
            onClick={() => { void handleConfirm() }}
            disabled={!trimmedReason || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <i className='ri-loader-4-line mr-1.5 animate-spin' />
                结案中…
              </>
            ) : (
              <>
                <i className='ri-close-circle-line mr-1.5' />
                确认短交结案
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
