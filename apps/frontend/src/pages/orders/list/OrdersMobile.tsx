/**
 * 移动端订单列表。
 *
 * 重点优化：
 * - 搜索、状态、页码统一走 URL
 * - 顶部筛选区压紧，单手切换更顺手
 * - 卡片区只保留高价值信息
 */

import { Button } from "@/components/ui/button"
import { StatusFilterBar } from "@/components/common/TableToolbar"
import { TopLevelPageHeaderWrapper } from "@/components/common/TopLevelPageHeaderWrapper"
import { TopLevelPageTitle } from "@/components/common/TopLevelPageTitle"
import type { OrdersPageSearch } from "./search"
import { OrdersMobileCard } from "./OrdersMobileCard"
import { useOrdersPageController } from "./useOrdersPageController"

const PAGE_SIZE = 20

interface OrdersMobileProps {
  search: OrdersPageSearch
}

export function OrdersMobile({ search }: OrdersMobileProps) {
  const {
    keyword,
    statusFilter,
    tab,
    page,
    orders,
    drafts,
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
    openCreate,
  } = useOrdersPageController({
    search,
    pageSize: PAGE_SIZE,
  })

  const rows = tab === "drafts" ? drafts : orders

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
            placeholder='搜索客户名称…'
            className='flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground'
          />
          {keyword && (
            <button
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
          onChange={setStatusFilter}
        />
      </div>

      <div className='flex-1 overflow-y-auto px-4 py-3'>
        <div className='flex flex-col gap-3 pb-4'>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className='border border-border bg-card px-3 py-3'
              >
                <div className='h-3.5 w-28 animate-pulse bg-muted' />
                <div className='mt-2 h-3 w-20 animate-pulse bg-muted' />
                <div className='mt-4 h-3.5 w-24 animate-pulse bg-muted' />
              </div>
            ))
          ) : rows.length === 0 ? (
            <div className='flex flex-col items-center justify-center border border-dashed border-border px-5 py-14 text-center'>
              <i className='ri-file-list-3-line mb-3 text-3xl text-muted-foreground/40' />
              <p className='text-sm font-medium text-foreground'>
                {tab === "drafts"
                  ? (hasActiveFilters ? "没有匹配的草稿" : "还没有订单草稿")
                  : (hasActiveFilters ? "没有匹配的订单" : "还没有订单数据")}
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                {hasActiveFilters
                  ? "可以调整关键词或状态后重试。"
                  : tab === "drafts"
                    ? "从新建订单页保存一份草稿开始。"
                    : "从新建订单开始录入第一笔业务。"}
              </p>
              <div className='mt-4 flex w-full gap-2'>
                {hasActiveFilters && (
                  <Button
                    variant='outline'
                    className='h-10 flex-1'
                    onClick={resetFilters}
                  >
                    清空筛选
                  </Button>
                )}
                <Button
                  className='h-10 flex-1'
                  onClick={openCreate}
                >
                  <i className='ri-add-line mr-1.5' />
                  新建订单
                </Button>
              </div>
            </div>
          ) : (
            <>
              {tab === "drafts"
                ? drafts.map(draft => (
                    <button
                      key={draft.id}
                      type="button"
                      className="w-full border border-border bg-card px-3 py-3 text-left"
                      onClick={() => openDraft(draft.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {draft.customerName?.trim() ? draft.customerName : "未选择客户"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            明细 {draft.itemCount} 项 · 交期 {draft.targetDate ? draft.targetDate.slice(0, 10) : "—"}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {draft.updatedAt.slice(0, 10)}
                        </span>
                      </div>
                    </button>
                  ))
                : orders.map(order => (
                    <OrdersMobileCard
                      key={order.id}
                      order={order}
                      onClick={() => openDetail(order.id)}
                    />
                  ))}

              {totalPages > 1 && (
                <div className='flex items-center justify-between border border-border bg-background px-3 py-2 text-xs text-muted-foreground'>
                  <span>
                    第 {page} / {totalPages} 页
                  </span>
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

      <div className='shrink-0 border-t border-border bg-background px-4 py-3'>
        <Button
          className='h-11 w-full'
          onClick={openCreate}
        >
          <i className='ri-add-line mr-2' />
          新建订单
        </Button>
      </div>
    </div>
  )
}
