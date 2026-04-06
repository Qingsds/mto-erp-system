/**
 * 印章使用记录摘要。
 */

interface SealLogsSummaryProps {
  totalCount: number
  latestUsedAt?: string | null
}

function formatDateTime(value?: string | null) {
  if (!value) return "暂无记录"
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  })
}

export function SealLogsSummary({
  totalCount,
  latestUsedAt,
}: SealLogsSummaryProps) {
  return (
    <section className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
      <article className='border border-border bg-card px-4 py-4'>
        <p className='text-xs text-muted-foreground'>总使用次数</p>
        <p className='mt-2 text-2xl font-semibold tracking-tight'>{totalCount}</p>
      </article>
      <article className='border border-border bg-card px-4 py-4'>
        <p className='text-xs text-muted-foreground'>最近使用时间</p>
        <p className='mt-2 text-sm font-medium text-foreground'>
          {formatDateTime(latestUsedAt)}
        </p>
      </article>
    </section>
  )
}
