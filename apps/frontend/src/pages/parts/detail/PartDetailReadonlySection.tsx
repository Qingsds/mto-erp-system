import type { PartDetail } from "@/hooks/api/useParts"

interface PartReadonlyInfoSectionProps {
  part: PartDetail
  primaryPrice: { label: string; value: number } | null
  prices: Array<{ label: string; value: number }>
  latestDrawingName?: string
  canViewMoney: boolean
}

function formatPartPrice(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function ViewField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col gap-1'>
      <span className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
        {label}
      </span>
      <div className='text-sm'>{children}</div>
    </div>
  )
}

/**
 * Read-only business summary for the part.
 * Keeps identification and pricing information compact and scan-friendly.
 */
export function PartReadonlyInfoSection({
  part,
  primaryPrice,
  prices,
  latestDrawingName,
  canViewMoney,
}: PartReadonlyInfoSectionProps) {
  return (
    <section className='border border-border bg-card'>
      <div className='border-b border-border px-3 py-2.5 sm:px-5 sm:py-3'>
        <h2 className='text-sm font-semibold'>零件信息</h2>
        <p className='mt-1 text-xs text-muted-foreground'>
          {canViewMoney ? "先看业务识别信息，再看价格字典。" : "只展示普通用户可见的零件识别信息。"}
        </p>
      </div>
      <div className='flex flex-col gap-4 px-3 py-3 sm:px-5 sm:py-4'>
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-4 ${canViewMoney ? "" : "xl:grid-cols-2"}`}>
          <ViewField label='零件编号'>
            <span className='font-mono'>{part.partNumber}</span>
          </ViewField>
          {canViewMoney && (
            <ViewField label='主价格'>
              {primaryPrice ? (
                <div className='flex items-baseline gap-2'>
                  <span className='font-mono text-lg font-semibold tabular-nums sm:text-xl'>
                    ¥{formatPartPrice(primaryPrice.value)}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {primaryPrice.label}
                  </span>
                </div>
              ) : (
                <span className='text-muted-foreground'>未设置</span>
              )}
            </ViewField>
          )}
          <ViewField label='材质'>
            <span className='inline-flex items-center bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground'>
              {part.material}
            </span>
          </ViewField>
          <ViewField label='规格型号'>
            {part.spec ? (
              <span className='font-mono'>{part.spec}</span>
            ) : (
              <span className='text-muted-foreground'>未填写</span>
            )}
          </ViewField>
          <ViewField label='图纸版本'>
            <span>{part.drawings.length} 个版本</span>
          </ViewField>
          <ViewField label='最新图纸'>
            {latestDrawingName ?? "未上传"}
          </ViewField>
          <ViewField label='关联客户'>
            {part.customers.length > 0 ? (
              <div className='flex flex-wrap gap-1.5'>
                {part.customers.map(customer => (
                  <span
                    key={customer.id}
                    className='inline-flex items-center border border-border bg-muted/30 px-2 py-0.5 text-xs text-foreground'
                  >
                    {customer.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className='text-muted-foreground'>未限制客户</span>
            )}
          </ViewField>
        </div>

        {canViewMoney && (
          <>
            <div className='h-px bg-border' />

            <div className='flex flex-col gap-3'>
              <div className='flex items-center justify-between gap-3'>
                <p className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                  价格字典
                </p>
                {prices.length > 0 && (
                  <span className='text-xs text-muted-foreground'>
                    共 {prices.length} 项
                  </span>
                )}
              </div>
              {prices.length === 0 ? (
                <div className='border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground sm:px-4 sm:py-6'>
                  暂无价格，点击右上角编辑补充“标准价”等业务价格。
                </div>
              ) : (
                <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3'>
                  {prices.map(price => (
                    <div
                      key={price.label}
                      className='border border-border bg-muted/20 px-3 py-2.5 sm:px-4 sm:py-3'
                    >
                      <span className='text-[11px] text-muted-foreground'>
                        {price.label}
                      </span>
                      <p className='mt-1.5 font-mono text-base font-semibold tabular-nums sm:mt-2 sm:text-lg'>
                        ¥{formatPartPrice(price.value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
