import { useNavigate } from "@tanstack/react-router"
import { PageContentWrapper } from "@/components/common/PageContentWrapper"
import { useUIStore } from "@/store/ui.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useReconciliationNew } from "./hooks/useReconciliationNew"
import { PageHeader } from "./new/components/PageHeader"
import { FormCard } from "./new/components/FormCard"
import { SubmitBar } from "./new/components/SubmitBar"

export function CreateBillingPage() {
  const navigate = useNavigate()
  const { isMobile } = useUIStore()
  const {
    customerInput,
    setCustomerInput,
    searchedCustomer,
    setSearchedCustomer,
    selectedDeliveryIds,
    selectedItemIds,
    extraItems,
    deliveries,
    fetchingDeliveries,
    detailQueries,
    billedItemIds,
    allDetailItems,
    estimatedTotal,
    toggleDelivery,
    toggleItem,
    addExtraItem,
    removeExtraItem,
    updateExtraItem,
    canSubmit,
    isSubmitting,
    handleSubmit,
  } = useReconciliationNew()

  const onCancel = () => navigate({ to: "/billing" })
  const onSuccess = (billingId: number) => navigate({
    to: "/billing/$id",
    params: { id: String(billingId) },
  })

  const onSubmit = () => {
    void handleSubmit(onSuccess)
  }

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <PageHeader
        title='新建对账单'
        subtitle='选择发货明细，系统将自动计算应收金额'
        onBack={onCancel}
        onCancel={onCancel}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        canSubmit={canSubmit}
      />

      <PageContentWrapper withMobileBottomInset={isMobile}>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8'>
          <aside className='flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-20 lg:w-72 xl:w-80'>
            <FormCard title='基础信息' required>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs text-muted-foreground'>客户名称</label>
                <div className='flex gap-2'>
                  <Input
                    value={customerInput}
                    onChange={e => setCustomerInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && setSearchedCustomer(customerInput.trim())}
                    placeholder='输入客户名称后点击搜索'
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='shrink-0'
                    onClick={() => setSearchedCustomer(customerInput.trim())}
                    disabled={!customerInput.trim()}
                  >
                    <i className='ri-search-line mr-1' />搜索
                  </Button>
                </div>
              </div>
              {searchedCustomer && (
                <div className='pt-2 border-t border-border'>
                  <p className='text-xs text-muted-foreground'>已选客户</p>
                  <p className='text-sm font-semibold mt-1'>{searchedCustomer}</p>
                </div>
              )}
            </FormCard>

            <FormCard title='汇总预估'>
              <div className='flex flex-col gap-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>费用项数</span>
                  <span className='font-mono'>{selectedItemIds.size} 项</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>附加费用</span>
                  <span className='font-mono'>
                    ¥{extraItems.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Separator className='my-1' />
                <div className='flex justify-between items-end'>
                  <span className='text-sm font-medium'>应收总额</span>
                  <span className='text-lg font-bold font-mono text-primary tabular-nums'>
                    ¥{estimatedTotal.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </FormCard>
          </aside>

          <div className='flex-1 min-w-0 flex flex-col gap-4'>
            {/* 发货单选择 */}
            {searchedCustomer && (
              <FormCard
                title='选择发货单'
                subtitle={fetchingDeliveries ? "搜索中…" : `找到 ${deliveries.length} 张发货单（最多显示 50 张）`}
              >
                {deliveries.length === 0 && !fetchingDeliveries ? (
                  <div className='border border-dashed border-border px-4 py-8 text-center text-muted-foreground rounded-lg'>
                    <i className='ri-filter-off-line text-2xl opacity-30' />
                    <p className='mt-2 text-sm'>该客户暂无发货记录</p>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
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
                            <i className='ri-check-line text-[10px] text-primary-foreground' />
                          )}
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='text-sm font-mono'>DEL-{String(d.id).padStart(6, "0")}</p>
                          <p className='text-[11px] text-muted-foreground'>{d.deliveryDate.slice(0, 10)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </FormCard>
            )}

            {/* 发货项选择 */}
            {selectedDeliveryIds.size > 0 && (
              <FormCard
                title='选择计费明细'
                subtitle='选择具体的发货明细项计入对账单'
              >
                <div className='flex flex-col gap-2'>
                  {detailQueries.some(q => q.isLoading) ? (
                    <div className='py-8 text-center text-sm text-muted-foreground'>加载明细中…</div>
                  ) : (
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                      {allDetailItems.map(item => {
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
                            <div className='min-w-0 flex-1'>
                              <p className='text-sm font-medium truncate'>{item.orderItem.part.name}</p>
                              <p className='text-[11px] text-muted-foreground font-mono'>{item.orderItem.part.partNumber}</p>
                            </div>
                            <div className='text-right shrink-0'>
                              <p className='text-xs font-mono'>{item.shippedQty} 件</p>
                              {isBilled && (
                                <span className='text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1'>已计费</span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </FormCard>
            )}

            {/* 附加费用 */}
            <FormCard
              title='附加费用'
              subtitle='如有运费、税费差额等，可在此处手动添加'
            >
              <div className='flex flex-col gap-3'>
                {extraItems.map((extra, i) => (
                  <div key={i} className='flex gap-2 items-center'>
                    <Input
                      value={extra.desc}
                      onChange={e => updateExtraItem(i, "desc", e.target.value)}
                      placeholder='费用说明（如：运费）'
                      className='flex-1'
                    />
                    <Input
                      type='number'
                      value={extra.amount}
                      onChange={e => updateExtraItem(i, "amount", e.target.value)}
                      placeholder='金额'
                      className='w-28 font-mono'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => removeExtraItem(i)}
                      className='shrink-0 text-muted-foreground hover:text-destructive'
                    >
                      <i className='ri-delete-bin-line' />
                    </Button>
                  </div>
                ))}
                <button
                  type='button'
                  onClick={addExtraItem}
                  className='w-full items-center justify-center gap-2 border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40 hover:text-foreground flex'
                >
                  <i className='ri-add-line text-base' />
                  <span>添加附加费用项</span>
                </button>
              </div>
            </FormCard>
          </div>
        </div>

        {isMobile && (
          <SubmitBar
            itemCount={selectedItemIds.size}
            estimatedTotal={estimatedTotal}
            isSubmitting={isSubmitting}
            canSubmit={canSubmit}
            onSubmit={onSubmit}
          />
        )}
      </PageContentWrapper>
    </div>
  )
}
