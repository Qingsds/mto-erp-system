/**
 * 单枚印章使用记录页。
 *
 * 负责：
 * - 拉取印章基础信息与使用日志
 * - 展示摘要与记录列表
 * - 跳转关联业务详情页
 */

import { useNavigate, useParams } from "@tanstack/react-router"
import { PageContentWrapper } from "@/components/common/PageContentWrapper"
import { Button } from "@/components/ui/button"
import {
  type SealUsageLogItem,
  useGetSealLogs,
} from "@/hooks/api/useSeals"
import { SealLogCard } from "./SealLogCard"
import { SealLogsSummary } from "./SealLogsSummary"
import { SealLogsToolbar } from "./SealLogsToolbar"

function resolveErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "使用记录加载失败"
}

export function SealLogsPage() {
  const params = useParams({ strict: false })
  const navigate = useNavigate()
  const sealId = Number(params.id)

  const { data, isLoading, error } = useGetSealLogs(
    Number.isFinite(sealId) ? sealId : undefined,
  )
  const latestUsedAt = data?.logs[0]?.actionTime ?? null

  const handleOpenTarget = (log: SealUsageLogItem) => {
    if (!log.targetType || !log.targetId) return

    if (log.targetType === "ORDER") {
      navigate({
        to: "/orders/$id",
        params: { id: String(log.targetId) },
      })
      return
    }

    if (log.targetType === "DELIVERY") {
      navigate({
        to: "/deliveries/$id",
        params: { id: String(log.targetId) },
      })
      return
    }

    navigate({
      to: "/billing/$id",
      params: { id: String(log.targetId) },
    })
  }

  if (isLoading) {
    return (
      <div className='flex flex-1 flex-col overflow-hidden'>
        <div className='h-12 border-b border-border bg-background' />
        <PageContentWrapper>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className='h-24 border border-border bg-card animate-pulse'
              />
            ))}
          </div>
          <div className='h-36 border border-border bg-card animate-pulse' />
          <div className='h-36 border border-border bg-card animate-pulse' />
        </PageContentWrapper>
      </div>
    )
  }

  if (!data) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground'>
        <i className='ri-error-warning-line text-4xl opacity-40' />
        <div className='space-y-1 text-center'>
          <p className='text-sm'>印章记录不存在或已删除</p>
          <p className='text-xs'>{resolveErrorMessage(error)}</p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => navigate({ to: "/seals" })}
        >
          返回印章管理
        </Button>
      </div>
    )
  }

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <SealLogsToolbar
        seal={data.seal}
        onBack={() => navigate({ to: "/seals" })}
      />

      <PageContentWrapper>
        <SealLogsSummary
          totalCount={data.logs.length}
          latestUsedAt={latestUsedAt}
        />

        {data.logs.length === 0 ? (
          <section className='border border-dashed border-border bg-card px-6 py-10 text-center text-muted-foreground'>
            <div className='mx-auto flex max-w-md flex-col items-center gap-3'>
              <i className='ri-time-line text-3xl opacity-40' />
              <div className='space-y-1'>
                <p className='text-sm font-medium text-foreground'>暂无使用记录</p>
                <p className='text-xs'>
                  当前印章还没有被用于订单、发货单或对账单归档。
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className='space-y-3'>
            {data.logs.map(log => (
              <SealLogCard
                key={log.id}
                log={log}
                onOpenTarget={handleOpenTarget}
              />
            ))}
          </section>
        )}
      </PageContentWrapper>
    </div>
  )
}
