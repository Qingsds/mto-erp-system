/**
 * 印章资产管理页。
 *
 * 负责：
 * - 展示全部印章
 * - 注册新印章
 * - 启用 / 停用
 * - 跳转到单枚印章的使用记录页
 */

import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { PageContentWrapper } from "@/components/common/PageContentWrapper"
import { Button } from "@/components/ui/button"
import {
  type SealListItem,
  useGetSeals,
  useUpdateSealStatus,
} from "@/hooks/api/useSeals"
import { CreateSealSheet } from "./CreateSealSheet"
import { SealCard } from "./SealCard"

function resolveErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "印章数据加载失败"
}

export function SealsPage() {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading, isFetching, error } = useGetSeals()
  const updateStatus = useUpdateSealStatus()
  const seals = data ?? []
  const activeCount = seals.filter(seal => seal.isActive).length
  const summary = {
    total: seals.length,
    active: activeCount,
    inactive: Math.max(0, seals.length - activeCount),
  }

  const handleToggleStatus = async (seal: SealListItem) => {
    try {
      setActionError(null)
      await updateStatus.mutateAsync({
        id: seal.id,
        isActive: !seal.isActive,
      })
    } catch (toggleError) {
      setActionError(
        toggleError instanceof Error ? toggleError.message : "状态更新失败",
      )
    }
  }

  const handleOpenLogs = (seal: SealListItem) => {
    navigate({
      to: "/seals/$id/logs",
      params: { id: String(seal.id) },
    })
  }

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <PageContentWrapper>
        <section className='flex flex-col gap-3 border border-border bg-card px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5'>
          <div>
            <h1 className='text-lg font-semibold tracking-tight sm:text-xl'>
              印章管理
            </h1>
            <p className='mt-1 text-xs text-muted-foreground sm:text-sm'>
              {isFetching && !isLoading
                ? "印章列表刷新中…"
                : `共 ${summary.total} 枚印章，启用 ${summary.active} 枚，停用 ${summary.inactive} 枚`}
            </p>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              size='sm'
              className='h-9 px-3 text-xs'
              onClick={() => setCreateOpen(true)}
            >
              <i className='ri-add-line mr-1.5' />
              注册印章
            </Button>
          </div>
        </section>

        {(actionError || error) && (
          <section className='border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='font-medium'>操作异常</p>
                <p className='mt-1 text-xs text-destructive/80'>
                  {actionError ?? resolveErrorMessage(error)}
                </p>
              </div>
              {actionError && (
                <button
                  type='button'
                  className='shrink-0 text-destructive/70 transition-colors hover:text-destructive'
                  onClick={() => setActionError(null)}
                >
                  <i className='ri-close-line text-base' />
                </button>
              )}
            </div>
          </section>
        )}

        {isLoading ? (
          <section className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className='h-[188px] border border-border bg-card animate-pulse'
              />
            ))}
          </section>
        ) : seals.length === 0 ? (
          <section className='border border-dashed border-border bg-card px-6 py-10 text-center'>
            <div className='mx-auto flex max-w-md flex-col items-center gap-3 text-muted-foreground'>
              <i className='ri-seal-line text-3xl opacity-40' />
              <div className='space-y-1'>
                <p className='text-sm font-medium text-foreground'>暂无印章资产</p>
                <p className='text-xs'>
                  先上传 PNG 透明底图并注册印章，后续才能用于订单、发货单和对账单盖章。
                </p>
              </div>
              <div className='flex flex-wrap justify-center gap-2 pt-1'>
                <Button
                  type='button'
                  size='sm'
                  className='h-9 px-3 text-xs'
                  onClick={() => setCreateOpen(true)}
                >
                  <i className='ri-upload-cloud-2-line mr-1.5' />
                  上传图章
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <section className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
            {seals.map(seal => (
              <SealCard
                key={seal.id}
                seal={seal}
                isPending={updateStatus.isPending && updateStatus.variables?.id === seal.id}
                onToggleStatus={handleToggleStatus}
                onOpenLogs={handleOpenLogs}
              />
            ))}
          </section>
        )}
      </PageContentWrapper>

      <CreateSealSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
