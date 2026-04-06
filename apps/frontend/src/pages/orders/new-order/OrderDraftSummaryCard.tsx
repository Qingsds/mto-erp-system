/**
 * 新建订单草稿汇总卡。
 *
 * 在录入过程中持续反馈零件项数和预估金额，
 * 帮助用户随时确认当前草稿规模。
 */

interface OrderDraftSummaryCardProps {
  itemCount: number
  estimatedTotal: number
  canViewMoney: boolean
}

function formatCurrency(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function OrderDraftSummaryCard({
  itemCount,
  estimatedTotal,
  canViewMoney,
}: OrderDraftSummaryCardProps) {
  return (
    <section className='border border-border bg-muted/30 px-4 py-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='text-xs text-muted-foreground'>
            草稿概览
          </p>
          <p className='mt-1 text-sm font-semibold text-foreground'>
            共 {itemCount} 项零件
          </p>
        </div>
        {canViewMoney && (
          <div className='text-right'>
            <p className='text-xs text-muted-foreground'>
              预估总金额
            </p>
            <p className='mt-1 font-mono text-xl font-bold tabular-nums text-foreground sm:text-2xl'>
              ¥{formatCurrency(estimatedTotal)}
            </p>
          </div>
        )}
      </div>

      <p className='mt-2 text-[11px] text-muted-foreground/70'>
        {canViewMoney
          ? "仅供录入阶段参考，实际金额以提交时保存的价格快照为准。"
          : "普通用户不展示金额，提交后系统仍会按后台规则写入价格快照。"}
      </p>
    </section>
  )
}
