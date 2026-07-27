import { useState } from "react"
import { MobileActionBar } from "@/components/common/MobileActionBar"
import { StatusFilterBar } from "@/components/common/TableToolbar"
import { TopLevelPageHeaderWrapper } from "@/components/common/TopLevelPageHeaderWrapper"
import { TopLevelPageTitle } from "@/components/common/TopLevelPageTitle"
import { Button } from "@/components/ui/button"
import { useIsAdmin } from "@/lib/permissions"
import { CreateMergedOrderDialog } from "./CreateMergedOrderDialog"
import { MergedOrderMobileCard } from "./mergedOrdersList"
import { OrdersMobileCard } from "./OrdersMobileCard"
import type { OrdersPageSearch } from "./search"
import { useOrderMergeSelection } from "./useOrderMergeSelection"
import { useOrdersPageController } from "./useOrdersPageController"

const PAGE_SIZE = 20

interface OrdersMobileProps {
  search: OrdersPageSearch
}

export function OrdersMobile({ search }: OrdersMobileProps) {
  const isAdmin = useIsAdmin()
  const [selectionMode, setSelectionMode] = useState(false)
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const mergeSelection = useOrderMergeSelection()
  const {
    keyword,
    statusFilter,
    tab,
    page,
    orders,
    drafts,
    mergedOrders,
    totalCount,
    totalPages,
    statusTabs,
    hasActiveFilters,
    isLoading,
    isFetching,
    setKeyword,
    setStatusFilter,
    setPage,
    resetFilters,
    openDetail,
    openDraft,
    openMergedOrder,
    openCreate,
  } = useOrdersPageController({ search, pageSize: PAGE_SIZE })

  const hasRows = tab === "drafts"
    ? drafts.length > 0
    : tab === "merged"
      ? mergedOrders.length > 0
      : orders.length > 0
  const showActionBar = tab !== "merged"
  const cancelSelection = () => {
    mergeSelection.clearSelection()
    setSelectionMode(false)
  }

  return (
    <div className='flex h-full flex-col'>
      <TopLevelPageHeaderWrapper
        inset='page'
        bodyClassName='items-end justify-between'
        padding='mobile'
      >
        <TopLevelPageTitle
          title='订单管理'
          subtitle={
            isFetching && !isLoading
              ? "加载中…"
              : tab === "drafts"
                ? `共 ${totalCount} 条草稿`
                : tab === "merged"
                  ? `共 ${totalCount} 条合并订单`
                  : `共 ${totalCount} 条订单`
          }
          titleClassName='text-base'
        />
        {hasActiveFilters && (
          <Button
            variant='ghost'
            size='sm'
            className='h-8 px-2 text-xs'
            onClick={resetFilters}
          >
            重置
          </Button>
        )}
      </TopLevelPageHeaderWrapper>

      <div className='shrink-0 border-b border-border bg-background px-4 pb-3'>
        <div className='mt-3 flex h-10 items-center gap-2 border border-input bg-muted px-3'>
          <i className='ri-search-line shrink-0 text-sm text-muted-foreground' />
          <input
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder={
              tab === "merged" ? "搜索合并单号、客户或备注…" : "搜索客户名称…"
            }
            className='min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground'
          />
          {keyword && (
            <button
              type='button'
              onClick={() => setKeyword("")}
              className='cursor-pointer border-none bg-transparent p-0 text-muted-foreground'
            >
              <i className='ri-close-line text-xs' />
            </button>
          )}
        </div>
        <StatusFilterBar
          className='mt-2 px-0 py-0'
          tabs={statusTabs}
          value={statusFilter}
          onChange={next => {
            if (next !== statusFilter && selectionMode) cancelSelection()
            setStatusFilter(next)
          }}
        />
      </div>

      <div className='flex-1 overflow-y-auto px-4 py-3'>
        <div className={showActionBar ? "flex flex-col gap-3 pb-28" : "flex flex-col gap-3 pb-4"}>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className='border border-border bg-card px-3 py-3'>
                <div className='h-3.5 w-28 animate-pulse bg-muted' />
                <div className='mt-2 h-3 w-20 animate-pulse bg-muted' />
                <div className='mt-4 h-3.5 w-24 animate-pulse bg-muted' />
              </div>
            ))
          ) : !hasRows ? (
            <div className='flex flex-col items-center justify-center border border-dashed border-border px-5 py-14 text-center'>
              <i className={`${tab === "merged" ? "ri-links-line" : "ri-file-list-3-line"} mb-3 text-3xl text-muted-foreground/40`} />
              <p className='text-sm font-medium'>
                {hasActiveFilters
                  ? "没有匹配的记录"
                  : tab === "drafts"
                    ? "还没有订单草稿"
                    : tab === "merged"
                      ? "还没有合并订单"
                      : "还没有订单数据"}
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                {hasActiveFilters
                  ? "可以调整关键词或状态后重试。"
                  : tab === "merged"
                    ? "管理员可在正式订单中选择同客户订单进行合并。"
                    : "从新建订单开始录入第一笔业务。"}
              </p>
              {hasActiveFilters && (
                <Button
                  variant='outline'
                  className='mt-4 h-10 w-full'
                  onClick={resetFilters}
                >
                  清空筛选
                </Button>
              )}
            </div>
          ) : (
            <>
              {tab === "drafts"
                ? drafts.map(draft => (
                    <button
                      key={draft.id}
                      type='button'
                      className='w-full border border-border bg-card px-3 py-3 text-left'
                      onClick={() => openDraft(draft.id)}
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-medium'>
                            {draft.customerName?.trim() || "未选择客户"}
                          </p>
                          <p className='mt-1 text-xs text-muted-foreground'>
                            明细 {draft.itemCount} 项 · 交期 {draft.targetDate?.slice(0, 10) || "—"}
                          </p>
                        </div>
                        <span className='shrink-0 text-[11px] text-muted-foreground'>
                          {draft.updatedAt.slice(0, 10)}
                        </span>
                      </div>
                    </button>
                  ))
                : tab === "merged"
                  ? mergedOrders.map(item => (
                      <MergedOrderMobileCard
                        key={item.id}
                        item={item}
                        onClick={() => openMergedOrder(item.id)}
                      />
                    ))
                  : orders.map(order => {
                      const disabledReason = mergeSelection.getDisabledReason(order)
                      return (
                        <OrdersMobileCard
                          key={order.id}
                          order={order}
                          onClick={() => openDetail(order.id)}
                          selected={mergeSelection.selectedIds.has(order.id)}
                          selectionDisabledReason={disabledReason}
                          onSelectionChange={
                            isAdmin && selectionMode
                              ? () => mergeSelection.toggleOrder(order)
                              : undefined
                          }
                        />
                      )
                    })}

              {totalPages > 1 && (
                <div className='flex items-center justify-between border border-border bg-background px-3 py-2 text-xs text-muted-foreground'>
                  <span>第 {page} / {totalPages} 页</span>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 px-2 text-xs'
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      上一页
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 px-2 text-xs'
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showActionBar && (
        <MobileActionBar
          summary={selectionMode ? (
            <div className='flex items-center justify-between text-xs'>
              <span className='text-muted-foreground'>仅可选择同一客户订单</span>
              <span className='font-mono font-semibold'>
                已选 {mergeSelection.selectedOrders.length} 张
              </span>
            </div>
          ) : undefined}
        >
          {isAdmin && tab === "orders" && selectionMode ? (
            <>
              <Button variant='outline' className='h-11 flex-1' onClick={cancelSelection}>
                取消选择
              </Button>
              <Button
                className='h-11 flex-[1.4]'
                disabled={mergeSelection.selectedOrders.length < 2}
                onClick={() => setMergeDialogOpen(true)}
              >
                <i className='ri-links-line mr-1.5' />
                合并订单
              </Button>
            </>
          ) : (
            <>
              <Button className='h-11 flex-1' onClick={openCreate}>
                <i className='ri-add-line mr-2' />
                新建订单
              </Button>
              {isAdmin && tab === "orders" && (
                <Button
                  variant='outline'
                  className='h-11 flex-1'
                  onClick={() => setSelectionMode(true)}
                >
                  <i className='ri-links-line mr-2' />
                  选择合并
                </Button>
              )}
            </>
          )}
        </MobileActionBar>
      )}

      <CreateMergedOrderDialog
        open={mergeDialogOpen}
        orders={mergeSelection.selectedOrders}
        onOpenChange={setMergeDialogOpen}
        onCreated={mergedOrder => {
          cancelSelection()
          openMergedOrder(mergedOrder.id)
        }}
      />
    </div>
  )
}
