/**
 * 移动端零件列表。
 *
 * 重点优化：
 * - 顶部标题与数量摘要
 * - 卡片信息层级
 * - 空状态给出新增与导入两个入口
 * - 底部保留一组可达的主操作按钮
 */

import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import type { PartsPageProps } from "./PartsPage"
import { PartManagementSheet } from "./PartManagementSheet"
import { usePartsPageController } from "./usePartsPageController"
import { useState } from "react"

export function PartsMobile({ quickAction }: PartsPageProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const {
    form,
    panel,
    page,
    parts,
    totalCount,
    totalPages,
    editingPart,
    isLoading,
    isFetching,
    closePanel,
    setPage,
    openAddPanel,
    openEditPanel,
    openImportPanel,
    handleImport,
    handleSubmit,
  } = usePartsPageController({
    keyword: debouncedSearch,
    quickAction,
  })

  const resetSearch = () => {
    setSearch("")
    setPage(1)
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='shrink-0 border-b border-border bg-background px-4 pb-3 pt-4'>
        <div className='flex items-end justify-between gap-3'>
          <div className='min-w-0'>
            <h1 className='text-base font-semibold leading-none text-foreground'>
              零件库
            </h1>
            <p className='mt-1 text-xs text-muted-foreground'>
              {isFetching && !isLoading ? "加载中…" : `共 ${totalCount} 个零件`}
            </p>
          </div>

          {search && (
            <Button
              variant='ghost'
              size='sm'
              className='h-8 px-2 text-xs'
              onClick={resetSearch}
            >
              重置
            </Button>
          )}
        </div>

        <div className='mt-3 flex h-10 items-center gap-2 border border-input bg-muted px-3'>
          <i className='ri-search-line shrink-0 text-sm text-muted-foreground' />
          <input
            value={search}
            onChange={event => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder='搜索零件名称、编号…'
            className='flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground'
          />
          {search && (
            <button
              onClick={resetSearch}
              className='cursor-pointer border-none bg-transparent p-0 text-muted-foreground'
            >
              <i className='ri-close-line text-xs' />
            </button>
          )}
        </div>
      </div>

      <div className='flex-1 overflow-y-auto px-4 py-3'>
        <div className='flex w-full flex-col gap-3 pb-4'>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className='flex items-center gap-3 border border-border p-3'
              >
                <div className='h-9 w-9 shrink-0 animate-pulse bg-muted' />
                <div className='min-w-0 flex-1 space-y-2'>
                  <div className='h-3.5 w-32 animate-pulse bg-muted' />
                  <div className='h-3 w-24 animate-pulse bg-muted' />
                </div>
              </div>
            ))
          ) : parts.length === 0 ? (
            <div className='flex flex-col items-center justify-center border border-dashed border-border px-5 py-14 text-center'>
              <i className='ri-settings-3-line mb-3 text-3xl text-muted-foreground/40' />
              <p className='text-sm font-medium text-foreground'>
                {search ? "没有找到匹配的零件" : "还没有零件数据"}
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                {search
                  ? "可以调整关键词后重试，或直接新增零件。"
                  : "可以先新增单个零件，或通过 Excel 批量导入。"}
              </p>
              <div className='mt-4 flex w-full gap-2'>
                <Button
                  variant='outline'
                  className='h-10 flex-1'
                  onClick={openImportPanel}
                >
                  <i className='ri-upload-2-line mr-1.5' />
                  批量导入
                </Button>
                <Button
                  className='h-10 flex-1'
                  onClick={openAddPanel}
                >
                  <i className='ri-add-line mr-1.5' />
                  新增零件
                </Button>
              </div>
            </div>
          ) : (
            <>
              {parts.map(part => {
                return (
                  <div
                    key={part.id}
                    className='flex w-full items-center gap-3 border border-border bg-card px-3 py-2.5 transition-colors active:bg-muted/50'
                    onClick={() =>
                      navigate({
                        to: "/parts/$id",
                        params: { id: String(part.id) },
                      })}
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-medium text-foreground'>
                        {part.name}
                      </p>
                      <div className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
                        <span className='font-mono'>{part.partNumber}</span>
                        <span>·</span>
                        <span className='truncate'>{part.material}</span>
                        {part.spec && (
                          <>
                            <span>·</span>
                            <span className='truncate'>{part.spec}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className='flex shrink-0 items-center gap-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-8 px-2 text-xs text-muted-foreground'
                        onClick={event => {
                          event.stopPropagation()
                          openEditPanel(part)
                        }}
                      >
                        编辑
                      </Button>
                      <i className='ri-arrow-right-s-line text-muted-foreground' />
                    </div>
                  </div>
                )
              })}

              {totalPages > 1 && (
                <div className='flex items-center justify-between border border-border bg-background px-3 py-2 text-xs text-muted-foreground'>
                  <span>
                    第 {page} / {totalPages} 页
                  </span>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 px-2 text-xs'
                      disabled={page <= 1}
                      onClick={() => setPage(current => Math.max(1, current - 1))}
                    >
                      上一页
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 px-2 text-xs'
                      disabled={page >= totalPages}
                      onClick={() => setPage(current => Math.min(totalPages, current + 1))}
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

      <div className='shrink-0 border-t border-border bg-background px-4 py-3'>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            className='h-11 flex-1'
            onClick={openImportPanel}
          >
            <i className='ri-upload-2-line mr-2' />
            批量导入
          </Button>
          <Button
            className='h-11 flex-[1.4]'
            onClick={openAddPanel}
          >
            <i className='ri-add-line mr-2' />
            新增零件
          </Button>
        </div>
      </div>

      <PartManagementSheet
        panel={panel}
        form={form}
        editingPart={editingPart}
        onClose={closePanel}
        onImport={handleImport}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
