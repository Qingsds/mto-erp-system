import { useMemo, useState } from "react"
import { useQueries, useQueryClient } from "@tanstack/react-query"
import type { CreateBillingRequest, ApiResponse } from "@erp/shared-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ErpSheet } from "@/components/common/ErpSheet"
import {
  useGetDeliveries,
  DELIVERIES_KEYS,
  type DeliveryDetail,
} from "@/hooks/api/useDeliveries"
import { useCreateBilling, decimalToNum } from "@/hooks/api/useBilling"
import request from "@/lib/utils/request"
import { cn } from "@/lib/utils"

/** 优先快照单价，为 0 时回退零件价格字典（优先"标准价"，兜底第一个可用值）。 */
function resolveUnitPrice(unitPrice: string, commonPrices: Record<string, number>): number {
  const snapshot = decimalToNum(unitPrice)
  if (snapshot > 0) return snapshot
  if (commonPrices["标准价"] != null && commonPrices["标准价"] > 0) return commonPrices["标准价"]
  const first = Object.values(commonPrices).find(v => v > 0)
  return first ?? 0
}

interface ExtraItem {
  desc: string
  amount: string
}

interface CreateBillingPanelProps {
  onCancel: () => void
  onSuccess: () => void
}

function CreateBillingPanel({ onCancel, onSuccess }: CreateBillingPanelProps) {
  const [customerInput, setCustomerInput] = useState("")
  const [searchedCustomer, setSearchedCustomer] = useState("")
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<number>>(new Set())
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set())
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([])

  const createBilling = useCreateBilling()

  const { data: deliveriesData, isFetching: fetchingDeliveries } = useGetDeliveries(
    { customerName: searchedCustomer, pageSize: 50 },
  )
  const deliveries = searchedCustomer ? (deliveriesData?.data ?? []) : []

  const detailQueries = useQueries({
    queries: [...selectedDeliveryIds].map(id => ({
      queryKey: DELIVERIES_KEYS.detail(id),
      queryFn: () =>
        request
          .get<unknown, ApiResponse<DeliveryDetail>>(`/api/deliveries/${id}`)
          .then(res => res.data!),
    })),
  })

  const billedItemIds = useMemo(() => {
    const ids = new Set<number>()
    for (const q of detailQueries) {
      if (q.data) {
        for (const item of q.data.items) {
          if (item.billingItem != null) ids.add(item.id)
        }
      }
    }
    return ids
  }, [detailQueries])

  const allDetailItems = useMemo(
    () => detailQueries.flatMap(q => q.data?.items ?? []),
    [detailQueries],
  )

  const estimatedTotal = useMemo(() => {
    let total = 0
    for (const item of allDetailItems) {
      if (selectedItemIds.has(item.id)) {
        const unitPrice = resolveUnitPrice(item.orderItem.unitPrice, item.orderItem.part.commonPrices)
        total += item.shippedQty * unitPrice
      }
    }
    for (const extra of extraItems) {
      const v = parseFloat(extra.amount)
      if (!isNaN(v) && v > 0) total += v
    }
    return total
  }, [allDetailItems, selectedItemIds, extraItems])

  const toggleDelivery = (id: number) => {
    setSelectedDeliveryIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // 取消选择发货单时，同步取消其下所有发货项
        const detail = detailQueries.find(q => q.data?.id === id)
        if (detail?.data) {
          setSelectedItemIds(prevItems => {
            const nextItems = new Set(prevItems)
            for (const item of detail.data!.items) nextItems.delete(item.id)
            return nextItems
          })
        }
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleItem = (itemId: number) => {
    if (billedItemIds.has(itemId)) return
    setSelectedItemIds(prev => {
      const next = new Set(prev)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })
  }

  const addExtraItem = () => setExtraItems(prev => [...prev, { desc: "", amount: "" }])
  const removeExtraItem = (i: number) => setExtraItems(prev => prev.filter((_, idx) => idx !== i))
  const updateExtraItem = (i: number, field: keyof ExtraItem, value: string) => {
    setExtraItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const validExtraItems = extraItems.filter(e => e.desc.trim() && parseFloat(e.amount) > 0)
  const canSubmit = selectedItemIds.size > 0 && searchedCustomer.length > 0

  const handleSubmit = async () => {
    if (!canSubmit) return
    const payload: CreateBillingRequest = {
      customerName: searchedCustomer,
      deliveryItemIds: [...selectedItemIds],
      extraItems: validExtraItems.map(e => ({ desc: e.desc.trim(), amount: parseFloat(e.amount) })),
    }
    await createBilling.mutateAsync(payload)
    onSuccess()
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 客户搜索 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">客户名称</label>
        <div className="flex gap-2">
          <Input
            value={customerInput}
            onChange={e => setCustomerInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setSearchedCustomer(customerInput.trim())}
            placeholder="输入客户名称后点击搜索"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setSearchedCustomer(customerInput.trim())}
            disabled={!customerInput.trim()}
          >
            <i className="ri-search-line mr-1" />搜索
          </Button>
        </div>
      </div>

      {/* 发货单选择 */}
      {searchedCustomer && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {fetchingDeliveries ? "搜索中…" : `找到 ${deliveries.length} 张发货单（最多显示 50 张）`}
          </p>
          {deliveries.length === 0 && !fetchingDeliveries ? (
            <p className="text-sm text-muted-foreground text-center py-3 rounded-lg border border-dashed border-border">
              该客户暂无发货记录
            </p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
              {deliveries.map(d => (
                <button
                  key={d.id}
                  onClick={() => toggleDelivery(d.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer",
                    selectedDeliveryIds.has(d.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <div className={cn(
                    "h-4 w-4 rounded border-2 shrink-0 transition-colors flex items-center justify-center",
                    selectedDeliveryIds.has(d.id)
                      ? "border-primary bg-primary"
                      : "border-muted-foreground",
                  )}>
                    {selectedDeliveryIds.has(d.id) && (
                      <i className="ri-check-line text-[10px] text-primary-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono">DEL-{String(d.id).padStart(6, "0")}</p>
                    <p className="text-[11px] text-muted-foreground">{d.deliveryDate.slice(0, 10)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 发货项选择 */}
      {selectedDeliveryIds.size > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">选择计费明细</p>
          <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
            {detailQueries.some(q => q.isLoading) ? (
              <p className="text-sm text-muted-foreground text-center py-3">加载明细中…</p>
            ) : (
              allDetailItems.map(item => {
                const isBilled = billedItemIds.has(item.id)
                const isSelected = selectedItemIds.has(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    disabled={isBilled}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                      isBilled
                        ? "border-border bg-muted/40 opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "border-primary bg-primary/5 cursor-pointer"
                          : "border-border hover:bg-accent cursor-pointer",
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center",
                      isBilled
                        ? "border-muted-foreground bg-muted"
                        : isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground",
                    )}>
                      {(isSelected || isBilled) && (
                        <i className={cn(
                          "text-[10px]",
                          isBilled ? "ri-minus-line text-muted-foreground" : "ri-check-line text-primary-foreground",
                        )} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.orderItem.part.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{item.orderItem.part.partNumber}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono">{item.shippedQty} 件</p>
                      {isBilled && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1">已计费</span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* 附加费用 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">附加费用（可选）</p>
          <Button type="button" variant="ghost" size="sm" onClick={addExtraItem}>
            <i className="ri-add-line mr-1" />添加
          </Button>
        </div>
        {extraItems.map((extra, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={extra.desc}
              onChange={e => updateExtraItem(i, "desc", e.target.value)}
              placeholder="费用说明（如：运费）"
              className="flex-1"
            />
            <Input
              type="number"
              value={extra.amount}
              onChange={e => updateExtraItem(i, "amount", e.target.value)}
              placeholder="金额"
              className="w-28 font-mono"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeExtraItem(i)}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <i className="ri-delete-bin-line" />
            </Button>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">已选 {selectedItemIds.size} 条明细</span>
        <span className="font-mono font-semibold">
          预估 ¥{estimatedTotal.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex items-stretch gap-2">
        <Button
          className="h-10 flex-1"
          onClick={handleSubmit}
          disabled={!canSubmit || createBilling.isPending}
        >
          {createBilling.isPending ? (
            <><i className="ri-loader-4-line animate-spin mr-1.5" />创建中…</>
          ) : (
            <><i className="ri-bank-card-line mr-1.5" />创建对账单</>
          )}
        </Button>
        <Button type="button" variant="outline" className="h-10 shrink-0" onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  )
}

interface CreateBillingSheetProps {
  open: boolean
  seed: number
  onOpenChange: (open: boolean) => void
}

export function CreateBillingSheet({ open, seed, onOpenChange }: CreateBillingSheetProps) {
  return (
    <ErpSheet
      open={open}
      onOpenChange={onOpenChange}
      title="新建对账单"
      description="选择发货明细，系统将自动计算应收金额"
      width={620}
    >
      <CreateBillingPanel
        key={seed}
        onCancel={() => onOpenChange(false)}
        onSuccess={() => onOpenChange(false)}
      />
    </ErpSheet>
  )
}
