/**
 * DeliveriesMobile.tsx
 *
 * 职责：
 * - 发货单列表移动端布局
 * - 只维护移动端展开状态与筛选输入草稿
 * - 查询、分页、状态切换统一复用 controller
 */

import { useEffect, useState } from "react"
import { StatusFilterBar } from "@/components/common/TableToolbar"
import { TopLevelPageHeaderWrapper } from "@/components/common/TopLevelPageHeaderWrapper"
import { TopLevelPageTitle } from "@/components/common/TopLevelPageTitle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_DELIVERY_FILTERS,
  type DeliveryFilters,
  type RemarkFilter,
} from "./filters"
import { DeliveriesMobileCard } from "./DeliveriesMobileCard"
import type { DeliveriesPageSearch } from "./search"
import { useDeliveriesPageController } from "./useDeliveriesPageController"

const PAGE_SIZE = 20

interface DeliveriesMobileProps {
  /** 路由层传入的查询参数。 */
  search: DeliveriesPageSearch
}

/**
 * 移动端发货单列表。
 */
export function DeliveriesMobile({ search }: DeliveriesMobileProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const {
    page,
    filters,
    visibleDeliveries,
    totalCount,
    totalPages,
    statusTabs,
    isLoading,
    isFetching,
    hasActiveFilters,
    setPage,
    applyFilters,
    setStatusFilter,
    resetFilters,
    openDetail,
    openOrders,
  } = useDeliveriesPageController({
    search,
    pageSize: PAGE_SIZE,
  })
  const [draftFilters, setDraftFilters] = useState<DeliveryFilters>(filters)

  useEffect(() => {
    setDraftFilters(filters)
  }, [filters])

  return (
    <div className="flex flex-col h-full">
      <TopLevelPageHeaderWrapper
        inset="page"
        bodyClassName="items-end justify-between"
        padding="mobile"
      >
        <TopLevelPageTitle
          title="发货管理"
          subtitle={isFetching && !isLoading ? "加载中…" : `共 ${totalCount} 张发货单`}
          titleClassName="text-base"
        />
      </TopLevelPageHeaderWrapper>

      <div className="shrink-0 border-b border-border bg-background px-4 pb-3">
        <div className="mt-2 flex items-center gap-2 h-9 px-3 bg-muted border border-input">
          <i className="ri-search-line text-sm text-muted-foreground shrink-0" />
          <input
            value={draftFilters.keyword}
            onChange={event =>
              setDraftFilters(prev => ({ ...prev, keyword: event.target.value }))
            }
            placeholder="关键字（单号/订单号/客户/备注）"
            className="flex-1 bg-transparent text-sm outline-none border-none placeholder:text-muted-foreground"
          />
          {draftFilters.keyword && (
            <button
              onClick={() => setDraftFilters(prev => ({ ...prev, keyword: "" }))}
              className="text-muted-foreground bg-transparent border-none cursor-pointer p-0"
            >
              <i className="ri-close-line text-xs" />
            </button>
          )}
        </div>

        <StatusFilterBar
          className='mt-2 px-0 py-0'
          tabs={statusTabs}
          value={filters.status}
          onChange={value => {
            setDraftFilters(prev => ({ ...prev, status: value }))
            setStatusFilter(value)
          }}
        />

        <div className="mt-2 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setShowAdvanced(v => !v)}
          >
            <i className="ri-filter-3-line mr-1" />
            {showAdvanced ? "收起高级筛选" : "高级筛选"}
          </Button>
          <Button
            size="sm"
            className="h-8 flex-1"
            onClick={() => applyFilters(draftFilters)}
          >
            <i className="ri-search-line mr-1" />查询
          </Button>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => {
                resetFilters()
                setDraftFilters(DEFAULT_DELIVERY_FILTERS)
              }}
            >
              重置
            </Button>
          )}
        </div>

        {showAdvanced && (
          <div className="mt-2 border border-dashed border-border bg-card px-3 py-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              高级筛选：订单、客户、备注条件
            </p>
            <Input
              type="number"
              min={1}
              value={draftFilters.orderId}
              onChange={event =>
                setDraftFilters(prev => ({ ...prev, orderId: event.target.value }))
              }
              placeholder="订单 ID"
              className="h-10"
            />
            <Input
              value={draftFilters.customerName}
              onChange={event =>
                setDraftFilters(prev => ({ ...prev, customerName: event.target.value }))
              }
              placeholder="客户公司名称"
              className="h-10"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={draftFilters.deliveryDateStart}
                onChange={event =>
                  setDraftFilters(prev => ({
                    ...prev,
                    deliveryDateStart: event.target.value,
                  }))
                }
                className="h-10"
              />
              <Input
                type="date"
                value={draftFilters.deliveryDateEnd}
                onChange={event =>
                  setDraftFilters(prev => ({
                    ...prev,
                    deliveryDateEnd: event.target.value,
                  }))
                }
                className="h-10"
              />
            </div>
            <select
              value={draftFilters.hasRemark}
              onChange={event =>
                setDraftFilters(prev => ({
                  ...prev,
                  hasRemark: event.target.value as RemarkFilter,
                }))
              }
              className="h-10 w-full border border-input bg-background px-3 text-sm"
            >
              <option value="all">备注：全部</option>
              <option value="yes">备注：有</option>
              <option value="no">备注：无</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2.5 pb-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="border border-border px-3.5 py-3 flex flex-col gap-2"
            >
              <div className="h-3.5 bg-muted animate-pulse w-32" />
              <div className="h-3 bg-muted animate-pulse w-20" />
              <div className="h-3 bg-muted animate-pulse w-40" />
            </div>
          ))
        ) : visibleDeliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-border px-5 py-14 text-center">
            <i className="ri-truck-line mb-3 text-3xl text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">
              {hasActiveFilters ? "没有匹配的发货单" : "还没有发货单数据"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasActiveFilters
                ? "可以调整筛选条件后再试。"
                : "先去订单模块创建发货单，列表会自动出现。"}
            </p>
            <div className="mt-4 flex w-full gap-2">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  className="h-10 flex-1"
                  onClick={() => {
                    resetFilters()
                    setDraftFilters(DEFAULT_DELIVERY_FILTERS)
                  }}
                >
                  清空筛选
                </Button>
              )}
              <Button
                className="h-10 flex-1"
                onClick={openOrders}
              >
                前往订单发货
              </Button>
            </div>
          </div>
        ) : (
          visibleDeliveries.map(delivery => (
            <DeliveriesMobileCard
              key={delivery.id}
              delivery={delivery}
              onClick={() => openDetail(delivery.id)}
            />
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-border bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            <i className="ri-arrow-left-s-line" />
          </Button>
          <Button
            variant="outline"
            className="h-10"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
          >
            <i className="ri-arrow-right-s-line" />
          </Button>
          <Button
            className="flex-1 h-10"
            onClick={openOrders}
          >
            <i className="ri-external-link-line mr-1.5" />
            前往订单发货
          </Button>
        </div>
      </div>
    </div>
  )
}
