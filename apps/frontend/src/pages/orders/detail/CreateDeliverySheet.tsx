/**
 * CreateDeliverySheet.tsx
 *
 * 职责：
 * - 封装创建发货单抽屉容器
 * - 管理发货数量输入、待发数量校验与提交 payload 组装
 */

import { useMemo, useState } from "react"
import type { CreateDeliveryRequest } from "@erp/shared-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ErpSheet } from "@/components/common/ErpSheet"
import { formatOrderNo, type OrderDetail } from "@/hooks/api/useOrders"

interface CreateDeliveryPanelProps {
  /** 当前订单详情（含所有订单行）。 */
  order: OrderDetail
  /** 提交创建请求时的 loading 状态。 */
  isSubmitting: boolean
  /** 关闭抽屉回调。 */
  onCancel: () => void
  /** 提交创建发货单回调。 */
  onSubmit: (payload: CreateDeliveryRequest) => Promise<void>
}

function CreateDeliveryPanel({
  order,
  isSubmitting,
  onCancel,
  onSubmit,
}: CreateDeliveryPanelProps) {
  const [remark, setRemark] = useState("")
  const [qtyByOrderItemId, setQtyByOrderItemId] = useState<Record<number, string>>(() => {
    const next: Record<number, string> = {}
    for (const item of order.items) next[item.id] = "0"
    return next
  })

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
    await onSubmit({
      orderId: order.id,
      remark: remark.trim() || undefined,
      items: selectedItems.map(v => ({ orderItemId: v.orderItemId, quantity: v.quantity })),
    })
  }

  return (
    <div className="flex flex-col gap-4">
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
          <div key={item.id} className="rounded-lg border border-border bg-card px-3 py-2.5">
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
            <div className="mt-2 flex items-center gap-2">
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

      <Separator />

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">已选择 {selectedItems.length} 行</span>
        <span className="font-mono font-semibold">合计 {selectedQty} 件</span>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || selectedItems.length === 0 || hasInvalidQty}
        >
          {isSubmitting ? (
            <>
              <i className="ri-loader-4-line animate-spin mr-1.5" />
              创建中…
            </>
          ) : (
            <>
              <i className="ri-truck-line mr-1.5" />
              创建发货单
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
      </div>
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
        onCancel={() => onOpenChange(false)}
        onSubmit={onSubmit}
      />
    </ErpSheet>
  )
}
