/**
 * 财务对账移动端列表。
 *
 * 重点压缩顶部信息，保留状态切换和卡片动作的单手可达性。
 */

import { Button } from "@/components/ui/button"
import { TopLevelPageHeaderWrapper } from "@/components/common/TopLevelPageHeaderWrapper"
import { TopLevelPageTitle } from "@/components/common/TopLevelPageTitle"
import { BillingCard } from "./BillingCard"
import type { useBillingPageController } from "./useBillingPageController"

type BillingPageController = ReturnType<typeof useBillingPageController>

interface BillingMobileProps {
  controller: BillingPageController
}

export function BillingMobile({ controller }: BillingMobileProps) {
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
    <div className="flex h-full flex-col">
      <TopLevelPageHeaderWrapper
        inset="page"
        bodyClassName="items-end justify-between"
        padding="mobile"
      >
        <TopLevelPageTitle
          title="财务对账"
          subtitle={subtitle}
          titleClassName="text-base"
        />
        <Button size="sm" className="h-8 shrink-0" onClick={openCreate}>
          <i className="ri-add-line mr-1" />
          新建
        </Button>
      </TopLevelPageHeaderWrapper>

      <div className="shrink-0 border-b border-border bg-background px-4 pb-3">
        <div className="mt-3 flex gap-1 overflow-x-auto">
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleStatusFilterChange(tab.value)}
              className={
                statusFilter === tab.value
                  ? "shrink-0 border border-primary bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                  : "shrink-0 border border-input bg-transparent px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
              }
            >
              {tab.label} {tab.count}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-3 pb-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-[148px] border border-border bg-card animate-pulse"
              />
            ))
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-border bg-card px-5 py-14 text-center">
              <i className="ri-bank-card-line mb-3 text-3xl text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">
                {total === 0 ? "还没有对账单" : "当前状态下暂无对账单"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {total === 0
                  ? "从新建对账单开始，后续可进入详情页盖章和结清。"
                  : "切换状态或新建对账单后再查看。"}
              </p>
              <Button className="mt-4 h-10 w-full" onClick={openCreate}>
                <i className="ri-add-line mr-1.5" />
                新建对账单
              </Button>
            </div>
          ) : (
            <>
              {bills.map(bill => (
                <BillingCard
                  key={bill.id}
                  bill={bill}
                  compact
                  isUpdating={isBillingUpdating(bill.id)}
                  onOpenDetail={openDetail}
                  onMarkPaid={markPaid}
                />
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-between border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  <span>
                    第 {page} / {totalPages} 页
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      disabled={page <= 1}
                      onClick={() => setPage(Math.max(1, page - 1))}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      disabled={page >= totalPages}
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
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
    </div>
  )
}
