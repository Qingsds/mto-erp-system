/**
 * 财务对账桌面端列表。
 *
 * 重点提升卡片扫描效率和状态操作可达性。
 */

import { Button } from "@/components/ui/button"
import { TopLevelPageWrapper } from "@/components/common/TopLevelPageWrapper"
import { BillingCard } from "./BillingCard"
import type { useBillingPageController } from "./useBillingPageController"

type BillingPageController = ReturnType<typeof useBillingPageController>

interface BillingDesktopProps {
  controller: BillingPageController
}

export function BillingDesktop({ controller }: BillingDesktopProps) {
  const {
    page,
    totalPages,
    total,
    bills,
    subtitle,
    statusFilter,
    statusTabs,
    isLoading,
    handleStatusFilterChange,
    openCreate,
    openDetail,
    markPaid,
    setPage,
    isBillingUpdating,
  } = controller

  return (
    <TopLevelPageWrapper fillHeight>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              财务对账
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {subtitle}
            </p>
          </div>

          <Button size="sm" onClick={openCreate}>
            <i className="ri-add-line mr-1.5" />
            新建对账单
          </Button>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto border-b border-border py-3">
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleStatusFilterChange(tab.value)}
              className={
                statusFilter === tab.value
                  ? "border border-primary bg-primary px-3 py-1 text-xs text-primary-foreground"
                  : "border border-input bg-transparent px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
              }
            >
              {tab.label} {tab.count}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[152px] border border-border bg-card animate-pulse"
                />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-border bg-card px-6 py-16 text-center">
              <i className="ri-bank-card-line text-3xl text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-foreground">
                {total === 0 ? "还没有对账单" : "当前状态下暂无对账单"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {total === 0
                  ? "从发货记录生成第一张对账单，后续可进入详情页盖章和结清。"
                  : "可以切换状态筛选，或继续新建新的对账单。"}
              </p>
              <Button className="mt-4 h-9" onClick={openCreate}>
                <i className="ri-add-line mr-1.5" />
                新建对账单
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {bills.map(bill => (
                <BillingCard
                  key={bill.id}
                  bill={bill}
                  isUpdating={isBillingUpdating(bill.id)}
                  onOpenDetail={openDetail}
                  onMarkPaid={markPaid}
                />
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              上一页
            </Button>
            <span className="min-w-[88px] text-center text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              下一页
            </Button>
          </div>
        )}
      </div>
    </TopLevelPageWrapper>
  )
}
