import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import type { BillingStatusType } from "@erp/shared-types"
import { Button } from "@/components/ui/button"
import {
  useGetBilling,
  useUpdateBillingStatus,
  decimalToNum,
} from "@/hooks/api/useBilling"
import { cn } from "@/lib/utils"
import { ExecuteSealDialog } from "@/components/billing/ExecuteSealDialog"

type BillingFilter = BillingStatusType | "all"

const STATUS_LABEL: Record<BillingFilter, string> = {
  all: "全部",
  DRAFT: "草稿",
  SEALED: "已盖章",
  PAID: "已结清",
}

const STATUS_STYLE: Record<BillingStatusType, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SEALED: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

function BillingStatusBadge({ status }: { status: BillingStatusType }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
      STATUS_STYLE[status],
    )}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function formatBillingNo(id: number): string {
  return `BIL-${String(id).padStart(6, "0")}`
}

const PAGE_SIZE = 12

export function BillingPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<BillingFilter>("all")
  const [page, setPage] = useState(1)
  const [sealTarget, setSealTarget] = useState<{ id: number; no: string } | null>(null)

  const updateStatus = useUpdateBillingStatus()

  const { data, isLoading, isFetching } = useGetBilling({
    page,
    pageSize: PAGE_SIZE,
    status: status === "all" ? undefined : status,
  })

  const bills = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const filterTabs: BillingFilter[] = ["all", "DRAFT", "SEALED", "PAID"]

  return (
    <div className='flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4'>
      <div className='flex items-end justify-between gap-4'>
        <div>
          <h1 className='text-lg md:text-xl font-semibold tracking-tight'>
            财务对账
          </h1>
          <p className='text-xs md:text-sm text-muted-foreground mt-1'>
            {isFetching && !isLoading ? "刷新中…" : `共 ${total} 张对账单`}
          </p>
        </div>
        <Button
          size='sm'
          onClick={() => navigate({ to: "/billing/new" })}
        >
          <i className='ri-add-line mr-1' />新建对账单
        </Button>
      </div>

      <div className='flex items-center gap-1 overflow-x-auto'>
        {filterTabs.map(tab => (
          <button
            key={tab}
            onClick={() => {
              setStatus(tab)
              setPage(1)
            }}
            className={cn(
              "h-8 px-3 rounded-full text-xs border transition-colors whitespace-nowrap bg-transparent cursor-pointer",
              status === tab
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input text-muted-foreground hover:bg-accent",
            )}
          >
            {STATUS_LABEL[tab]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className='h-[136px] rounded-xl border border-border bg-card animate-pulse'
            />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className='rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground'>
          <i className='ri-bank-card-line text-2xl opacity-40' />
          <p className='mt-2 text-sm'>暂无对账数据</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
          {bills.map(bill => (
            <div
              key={bill.id}
              className='rounded-xl border border-border bg-card p-4 md:p-5'
            >
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='font-mono text-xs text-muted-foreground'>
                    {formatBillingNo(bill.id)}
                  </p>
                  <p className='text-sm font-medium mt-1'>
                    {bill.customerName}
                  </p>
                </div>
                <BillingStatusBadge status={bill.status} />
              </div>

              <div className='mt-4 flex items-end justify-between gap-2'>
                <div>
                  <p className='text-xs text-muted-foreground'>
                    应收总额
                  </p>
                  <p className='font-mono text-lg font-semibold tracking-tight'>
                    ¥{decimalToNum(bill.totalAmount).toLocaleString("zh-CN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-xs text-muted-foreground'>
                    费用条目
                  </p>
                  <p className='text-sm font-medium'>
                    {bill.items?.length ?? 0} 项
                  </p>
                </div>
              </div>

              <div className='mt-3 text-xs text-muted-foreground'>
                创建时间：{bill.createdAt.slice(0, 10)}
              </div>

              {bill.status !== "PAID" && (
                <div className='mt-3 flex items-center gap-2 pt-3 border-t border-border'>
                  {bill.status === "DRAFT" && (
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-7 text-xs'
                      onClick={() => setSealTarget({ id: bill.id, no: formatBillingNo(bill.id) })}
                    >
                      <i className='ri-seal-line mr-1' />盖章
                    </Button>
                  )}
                  {bill.status === "SEALED" && (
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-7 text-xs'
                      onClick={() => updateStatus.mutate({ id: bill.id, status: "PAID" })}
                      disabled={updateStatus.isPending}
                    >
                      <i className='ri-check-double-line mr-1' />标记已结清
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className='flex items-center justify-end gap-2 pt-1'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            上一页
          </Button>
          <span className='text-xs text-muted-foreground min-w-[72px] text-center'>
            {page} / {totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      {sealTarget && (
        <ExecuteSealDialog
          open={!!sealTarget}
          onOpenChange={o => !o && setSealTarget(null)}
          billingId={sealTarget.id}
          billingNo={sealTarget.no}
        />
      )}
    </div>
  )
}
