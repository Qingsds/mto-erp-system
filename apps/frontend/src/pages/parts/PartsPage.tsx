/**
 * PartsPage.tsx
 *
 * 零件库页面。表格直接使用 PartListItem（API 类型），
 * 无需 toUIPart 转换层（columns 内部用 apiPricesToForm 处理显示）。
 *
 * 提交时：
 *   prices 数组 → formPricesToApi → commonPrices Record
 *   对齐 CreatePartRequest / UpdatePartRequest
 */

import { useCallback, useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/ui.store"
import { ErpSheet } from "@/components/common/ErpSheet"
import { DataTable } from "@/components/common/DataTable"
import { TableToolbar } from "@/components/common/TableToolbar"
import {
  useGetParts,
  useCreatePart,
  useDeletePart,
  useUpdatePart,
  useImportParts,
  formPricesToApi,
  type PartListItem,
} from "@/hooks/api/useParts"
import { getPartsColumns } from "./parts.columns"
import { PartForm, usePartForm } from "./parts.form"
import { ImportPanel } from "./parts.import"
import type { PartFormValues, ImportRow } from "./parts.schema"

type PanelMode = "add" | "import" | null
export type PartsQuickAction = "new" | "import"

interface PartsPageProps {
  quickAction?: PartsQuickAction
}

const PAGE_SIZE = 20

// ─── Desktop ──────────────────────────────────────────────
function DesktopParts({ quickAction }: PartsPageProps) {
  const initialPanel: PanelMode =
    quickAction === "new"
      ? "add"
      : quickAction === "import"
        ? "import"
        : null

  const [panel, setPanel] = useState<PanelMode>(initialPanel)
  const [editingPart, setEditing] = useState<PartListItem | null>(
    null,
  )
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setFilter] = useState("")
  const [page, setPage] = useState(1)

  const form = usePartForm()

  const { data, isLoading, isFetching } = useGetParts({
    page,
    pageSize: PAGE_SIZE,
    keyword: globalFilter || undefined,
  })

  const createPart = useCreatePart()
  const deletePart = useDeletePart()
  const updatePart = useUpdatePart()
  const importParts = useImportParts()

  // 列表数据直连 API 类型，避免额外转换层导致字段语义漂移。
  const parts = data?.data ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // 统一抽屉收口：关闭面板同时清理编辑态，避免下次打开残留旧数据。
  const closePanel = useCallback(() => {
    setPanel(null)
    setEditing(null)
  }, [])

  // 删除后如果正在编辑同一条记录，需主动关闭编辑面板避免引用悬空。
  const handleDelete = useCallback(async (part: PartListItem) => {
    const confirmed = window.confirm(
      `确认删除零件「${part.name}」吗？删除后无法恢复。`,
    )
    if (!confirmed) return

    await deletePart.mutateAsync(part.id)
    if (editingPart?.id === part.id) {
      closePanel()
    }
  }, [closePanel, deletePart, editingPart?.id])

  const columns = useMemo(() => getPartsColumns(
    p => {
      setEditing(p)
      setPanel("add")
    },
    p => { void handleDelete(p) },
  ), [handleDelete])

  const table = useReactTable({
    data: parts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    rowCount: totalCount,
  })

  const handleSubmit = async (values: PartFormValues) => {
    const payload = {
      name: values.name,
      material: values.material,
      spec: values.spec,
      commonPrices: formPricesToApi(values.prices),
    }
    if (editingPart) {
      await updatePart.mutateAsync({ id: editingPart.id, ...payload })
    } else {
      await createPart.mutateAsync(payload)
    }
    closePanel()
  }

  const handleImport = async (rows: ImportRow[]) => {
    await importParts.mutateAsync(
      rows.map(r => ({
        name: r.零件名称,
        material: r.零件材质,
        spec: r.规格,
        commonPrices: { 标准价: r.零件价格 },
      })),
    )
    closePanel()
  }

  return (
    <>
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        emptyIcon='ri-settings-3-line'
        emptyText='暂无零件数据'
        globalFilter={globalFilter}
        toolbar={
          <TableToolbar
            title='零件库'
            count={
              isFetching && !isLoading
                ? "加载中…"
                : `共 ${totalCount} 个零件`
            }
            globalFilter={globalFilter}
            onFilterChange={v => {
              setFilter(v)
              setPage(1)
            }}
            searchPlaceholder='搜索名称、编号…'
            actions={
              <>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPanel("import")}
                >
                  <i className='ri-upload-2-line mr-1.5' />
                  批量导入
                </Button>
                <Button
                  size='sm'
                  onClick={() => {
                    setEditing(null)
                    setPanel("add")
                  }}
                >
                  <i className='ri-add-line mr-1.5' />
                  新增零件
                </Button>
              </>
            }
          />
        }
        filterBar={
          totalPages > 1 ? (
            <div className='flex items-center gap-2 px-5 py-2 text-xs text-muted-foreground'>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className='px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30 bg-transparent border-none cursor-pointer'
              >
                <i className='ri-arrow-left-s-line' />
              </button>
              <span>
                第 {page} / {totalPages} 页
              </span>
              <button
                onClick={() =>
                  setPage(p => Math.min(totalPages, p + 1))
                }
                disabled={page >= totalPages}
                className='px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30 bg-transparent border-none cursor-pointer'
              >
                <i className='ri-arrow-right-s-line' />
              </button>
            </div>
          ) : undefined
        }
      />

      <ErpSheet
        open={panel !== null}
        onOpenChange={o => {
          if (!o) closePanel()
        }}
        title={
          panel === "add"
            ? editingPart
              ? "编辑零件"
              : "新增零件"
            : "批量导入零件"
        }
        description={
          panel === "add"
            ? "填写零件信息，系统自动生成零件编号"
            : "上传 Excel 文件，系统自动解析并校验数据"
        }
        width={580}
      >
        {/* ★ form 在 Sheet 外初始化，切换 panel 时零重建开销 */}
        <div className={panel === "add" ? "block" : "hidden"}>
          <PartForm
            form={form}
            editingPart={editingPart}
            onSubmit={handleSubmit}
            onCancel={closePanel}
          />
        </div>
        {panel === "import" && (
          <ImportPanel
            onImport={handleImport}
            onClose={closePanel}
          />
        )}
      </ErpSheet>
    </>
  )
}

// ─── Mobile ───────────────────────────────────────────────
function MobileParts({ quickAction }: PartsPageProps) {
  const initialPanel: PanelMode =
    quickAction === "new"
      ? "add"
      : quickAction === "import"
        ? "import"
        : null

  const [panel, setPanel] = useState<PanelMode>(initialPanel)
  const [editingPart, setEditing] = useState<PartListItem | null>(
    null,
  )
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const form = usePartForm()

  const { data, isLoading, isFetching } = useGetParts({
    page,
    pageSize: 20,
    keyword: search || undefined,
  })

  const createPart = useCreatePart()
  const updatePart = useUpdatePart()
  const importParts = useImportParts()

  const parts = data?.data ?? []

  const handleSubmit = async (values: PartFormValues) => {
    const payload = {
      name: values.name,
      material: values.material,
      spec: values.spec,
      commonPrices: formPricesToApi(values.prices),
    }
    if (editingPart) {
      await updatePart.mutateAsync({ id: editingPart.id, ...payload })
    } else {
      await createPart.mutateAsync(payload)
    }
    closePanel()
  }

  const handleImport = async (rows: ImportRow[]) => {
    await importParts.mutateAsync(
      rows.map(r => ({
        name: r.零件名称,
        material: r.零件材质,
        spec: r.规格,
        commonPrices: { 标准价: r.零件价格 },
      })),
    )
    closePanel()
  }

  const closePanel = () => {
    setPanel(null)
    setEditing(null)
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='px-4 pt-4 pb-2 shrink-0'>
        <div className='flex items-center gap-2 h-10 px-3 bg-muted border border-input rounded-lg'>
          <i className='ri-search-line text-sm text-muted-foreground shrink-0' />
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder='搜索零件名称、编号…'
            className='flex-1 bg-transparent text-sm outline-none border-none placeholder:text-muted-foreground'
          />
          {search && (
            <button
              onClick={() => {
                setSearch("")
                setPage(1)
              }}
              className='text-muted-foreground bg-transparent border-none cursor-pointer p-0'
            >
              <i className='ri-close-line text-xs' />
            </button>
          )}
        </div>
      </div>

      <div className='px-4 pb-2 shrink-0'>
        <span className='text-xs text-muted-foreground'>
          {isFetching ? "加载中…" : `共 ${data?.total ?? 0} 个零件`}
        </span>
      </div>

      <div className='flex-1 overflow-y-auto px-4 flex flex-col gap-2.5 pb-4'>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='p-3.5 rounded-xl border border-border flex items-center gap-3'
            >
              <div className='w-9 h-9 rounded-lg bg-muted animate-pulse shrink-0' />
              <div className='flex-1 space-y-2'>
                <div className='h-3.5 bg-muted animate-pulse rounded w-32' />
                <div className='h-3 bg-muted animate-pulse rounded w-20' />
              </div>
            </div>
          ))
        ) : parts.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
            <i className='ri-settings-3-line text-3xl mb-3 opacity-30' />
            <p className='text-sm'>暂无匹配结果</p>
          </div>
        ) : (
          parts.map(p => {
            // 取第一个价格展示
            const firstPrice = Object.values(p.commonPrices ?? {})[0]
            return (
              <div
                key={p.id}
                className='p-3.5 rounded-xl border border-border bg-card flex items-center gap-3 active:bg-muted/50 cursor-pointer transition-colors'
                onClick={() => {
                  setEditing(p)
                  setPanel("add")
                }}
              >
                <div className='w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0'>
                  <i className='ri-settings-3-line text-primary text-sm' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium truncate'>
                    {p.name}
                  </p>
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    {p.material} ·{" "}
                    <span className='font-mono'>{p.partNumber}</span>
                  </p>
                </div>
                <div className='flex items-center gap-2 shrink-0'>
                  {firstPrice !== undefined && (
                    <span className='font-mono text-xs font-medium'>
                      ¥{firstPrice}
                    </span>
                  )}
                  <i className='ri-arrow-right-s-line text-muted-foreground' />
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className='px-4 py-3 border-t border-border bg-background shrink-0 flex gap-2'>
        <Button
          variant='outline'
          className='flex-1 h-11'
          onClick={() => setPanel("import")}
        >
          <i className='ri-upload-2-line mr-2' />
          导入
        </Button>
        <Button
          className='flex-[2] h-11'
          onClick={() => {
            setEditing(null)
            setPanel("add")
          }}
        >
          <i className='ri-add-line mr-2' />
          新增零件
        </Button>
      </div>

      <ErpSheet
        open={panel !== null}
        onOpenChange={o => {
          if (!o) closePanel()
        }}
        title={
          panel === "add"
            ? editingPart
              ? "编辑零件"
              : "新增零件"
            : "批量导入零件"
        }
        description={
          panel === "add" ? "填写零件信息" : "上传 Excel 文件"
        }
      >
        <div className={panel === "add" ? "block" : "hidden"}>
          <PartForm
            form={form}
            editingPart={editingPart}
            onSubmit={handleSubmit}
            onCancel={closePanel}
          />
        </div>
        {panel === "import" && (
          <ImportPanel
            onImport={handleImport}
            onClose={closePanel}
          />
        )}
      </ErpSheet>
    </div>
  )
}

export function PartsPage({ quickAction }: PartsPageProps) {
  const { isMobile } = useUIStore()
  return isMobile
    ? <MobileParts quickAction={quickAction} />
    : <DesktopParts quickAction={quickAction} />
}
