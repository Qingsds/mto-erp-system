import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useGetSeals } from "@/hooks/api/useSeals"
import { CreateSealSheet } from "./CreateSealSheet"

export function SealsPage() {
  const { data, isLoading, isFetching } = useGetSeals()
  const seals = data ?? []
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className='flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4'>
      <div className='flex items-end justify-between gap-4'>
        <div>
          <h1 className='text-lg md:text-xl font-semibold tracking-tight'>
            印章管理
          </h1>
          <p className='text-xs md:text-sm text-muted-foreground mt-1'>
            {isFetching && !isLoading
              ? "刷新中…"
              : `当前可用印章 ${seals.length} 枚`}
          </p>
        </div>
        <Button size='sm' onClick={() => setCreateOpen(true)}>
          <i className='ri-add-line mr-1' />注册印章
        </Button>
      </div>

      {isLoading ? (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className='h-[104px] rounded-xl border border-border bg-card animate-pulse'
            />
          ))}
        </div>
      ) : seals.length === 0 ? (
        <div className='rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground'>
          <i className='ri-seal-line text-2xl opacity-40' />
          <p className='mt-2 text-sm'>暂无可用印章</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          {seals.map(seal => (
            <div
              key={seal.id}
              className='rounded-xl border border-border bg-card p-4 md:p-5'
            >
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <p className='text-sm font-medium'>{seal.name}</p>
                  <p className='text-xs text-muted-foreground mt-1'>
                    ID: {seal.id}
                  </p>
                </div>
                <span className='inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'>
                  启用中
                </span>
              </div>

              <div className='mt-3 rounded-md bg-muted/60 px-2.5 py-2 font-mono text-[11px] text-muted-foreground break-all'>
                {seal.fileKey}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateSealSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
