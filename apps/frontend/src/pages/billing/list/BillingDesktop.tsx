/**
 * 财务对账桌面端列表。
 *
 * 重点提升卡片扫描效率和状态操作可达性，
 * 并将顶部状态筛选收口到统一的 ToggleGroup 基座。
 */

import { EmptyStateBlock } from "@/components/common/EmptyStateBlock"
import { Button } from "@/components/ui/button"
import { TopLevelPageHeaderWrapper } from "@/components/common/TopLevelPageHeaderWrapper"
import { TopLevelPageWrapper } from "@/components/common/TopLevelPageWrapper"
import { TopLevelPageTitle } from "@/components/common/TopLevelPageTitle"
import { StatusFilterBar } from "@/components/common/TableToolbar"
import { BillingCard } from "./BillingCard"
import type { useBillingPageController } from "./useBillingPageController"

type BillingPageController = ReturnType<
  typeof useBillingPageController
>

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
      <div className='flex flex-1 flex-col overflow-hidden'>
        <TopLevelPageHeaderWrapper
          bodyClassName='items-end justify-between'
          padding='desktop'
        >
          <TopLevelPageTitle
            title='财务对账'
            subtitle={subtitle}
          />

          <Button
            size='sm'
            onClick={openCreate}
          >
            <i className='ri-add-line mr-1.5' />
            新建对账单
          </Button>
        </TopLevelPageHeaderWrapper>

        <StatusFilterBar
          className='border-b border-border py-3'
          tabs={statusTabs}
          value={statusFilter}
          onChange={handleStatusFilterChange}
        />

        <div className='flex-1 overflow-y-auto py-4'>
          {isLoading ? (
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3'>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className='h-[152px] border border-border bg-card animate-pulse'
                />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <EmptyStateBlock
              icon='ri-bank-card-line'
              title={total === 0 ? "还没有对账单" : "当前状态下暂无对账单"}
              description={
                total === 0
                  ? "从发货记录生成第一张对账单，后续可进入详情页盖章和结清。"
                  : "可以切换状态筛选，或继续新建新的对账单。"
              }
              action={(
                <Button
                  className='h-9'
                  onClick={openCreate}
                >
                  <i className='ri-add-line mr-1.5' />
                  新建对账单
                </Button>
              )}
              contentClassName='py-16'
            />
          ) : (
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3'>
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
          <div className='flex items-center justify-end gap-2 border-t border-border pt-3'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              上一页
            </Button>
            <span className='min-w-[88px] text-center text-xs text-muted-foreground'>
              {page} / {totalPages}
            </span>
            <Button
              variant='outline'
              size='sm'
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
