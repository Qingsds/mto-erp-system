import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useUIStore } from "@/store/ui.store"
import { getPartsColumns } from "./parts.columns"
import { PartForm, usePartForm } from "./parts.form"
import { ImportPanel } from "./parts.import"
import type { Part, PartFormValues, ImportRow } from "./parts.schema"

const MOCK: Part[] = [
  {
    id: 1,
    partNumber: "P-0041",
    name: "六角螺栓 M8×30",
    material: "304不锈钢",
    spec: "GB/T 5782",
    remark: "标准紧固件",
    prices: [
      { label: "标准价", value: 0.85 },
      { label: "批量价", value: 0.72 },
    ],
    createdAt: "2026-03-01",
  },
  {
    id: 2,
    partNumber: "P-0040",
    name: "轴承座 UCF205",
    material: "铸铁",
    spec: "UCF205",
    remark: "",
    prices: [{ label: "标准价", value: 68 }],
    createdAt: "2026-02-28",
  },
  {
    id: 3,
    partNumber: "P-0039",
    name: "密封圈 O-Ring 50×3",
    material: "丁腈橡胶",
    spec: "Φ50×3mm",
    remark: "",
    prices: [
      { label: "标准价", value: 2.4 },
      { label: "批量价", value: 1.9 },
    ],
    createdAt: "2026-02-20",
  },
  {
    id: 4,
    partNumber: "P-0038",
    name: "精密导轨 HGR15-500",
    material: "GCr15钢",
    spec: "L=500mm",
    remark: "精密级",
    prices: [
      { label: "标准价", value: 320 },
      { label: "批量价", value: 280 },
    ],
    createdAt: "2026-02-15",
  },
  {
    id: 5,
    partNumber: "P-0037",
    name: "铝型材 4040-500mm",
    material: "6063铝合金",
    spec: "40×40mm",
    remark: "",
    prices: [{ label: "标准价", value: 38 }],
    createdAt: "2026-02-10",
  },
  {
    id: 6,
    partNumber: "P-0036",
    name: "气缸 SC63×100",
    material: "铝合金",
    spec: "Φ63,行程100",
    remark: "标准型",
    prices: [{ label: "标准价", value: 188 }],
    createdAt: "2026-02-05",
  },
]

type PanelMode = "add" | "import" | null

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc")
    return <i className='ri-sort-asc text-xs text-foreground ml-1' />
  if (sorted === "desc")
    return <i className='ri-sort-desc text-xs text-foreground ml-1' />
  return (
    <i className='ri-expand-up-down-line text-xs text-muted-foreground/40 ml-1' />
  )
}

function TableSkeleton() {
  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex items-center gap-3 px-5 py-3.5 border-b border-border bg-background'>
        <Skeleton className='h-5 w-28' />
        <Skeleton className='h-8 w-56 ml-4' />
        <Skeleton className='h-8 w-24 ml-auto' />
        <Skeleton className='h-8 w-24' />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className='flex items-center gap-6 px-5 py-3.5 border-b border-border'
        >
          <Skeleton className='h-3 w-20' />
          <Skeleton className='h-3 w-36' />
          <Skeleton className='h-5 w-20 rounded-full' />
          <Skeleton className='h-3 w-24 ml-auto' />
        </div>
      ))}
    </div>
  )
}

// ─── Desktop ──────────────────────────────────────────────
function DesktopParts() {
  const [panel, setPanel] = useState<PanelMode>(null)
  const [editingPart, setEditing] = useState<Part | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setFilter] = useState("")
  const isLoading = false

  // ★ form 在这里初始化，不在 Sheet 内部 — 只初始化一次
  const form = usePartForm()

  const columns = useMemo(
    () =>
      getPartsColumns(
        p => {
          setEditing(p)
          setPanel("add")
        },
        p => console.log("delete", p),
      ),
    [],
  )

  const table = useReactTable({
    data: MOCK,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const handleAdd = async (values: PartFormValues) => {
    console.log("add/edit:", values)
    await new Promise(r => setTimeout(r, 600))
    setPanel(null)
    setEditing(null)
  }
  const handleImport = async (rows: ImportRow[]) => {
    console.log("import:", rows)
    await new Promise(r => setTimeout(r, 800))
  }

  if (isLoading) return <TableSkeleton />

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      {/* Toolbar */}
      <div className='flex items-center gap-3 px-5 py-3.5 border-b border-border bg-background shrink-0 flex-wrap gap-y-2'>
        <div>
          <h1 className='text-lg font-semibold tracking-tight leading-none'>
            零件库
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {table.getFilteredRowModel().rows.length} / {MOCK.length}{" "}
            个零件
          </p>
        </div>
        <div className='flex items-center gap-2 h-8 px-2.5 border border-input rounded-md bg-background ml-4 flex-1 max-w-72'>
          <i className='ri-search-line text-sm text-muted-foreground shrink-0' />
          <input
            value={globalFilter}
            onChange={e => setFilter(e.target.value)}
            placeholder='搜索名称、材质、编号…'
            className='flex-1 bg-transparent text-sm text-foreground outline-none border-none placeholder:text-muted-foreground'
          />
          {globalFilter && (
            <button
              onClick={() => setFilter("")}
              className='text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer p-0'
            >
              <i className='ri-close-line text-xs' />
            </button>
          )}
        </div>
        <div className='flex gap-2 ml-auto'>
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
        </div>
      </div>

      {/* Table */}
      <div className='flex-1 overflow-auto'>
        <Table
          style={{ minWidth: table.getTotalSize(), width: "100%" }}
        >
          <TableHeader className='sticky top-0 z-10'>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => (
                  <TableHead
                    key={h.id}
                    style={{ width: h.getSize() }}
                    onClick={
                      h.column.getCanSort()
                        ? h.column.getToggleSortingHandler()
                        : undefined
                    }
                    className={
                      h.column.getCanSort()
                        ? "cursor-pointer select-none hover:bg-muted/80 whitespace-nowrap"
                        : "whitespace-nowrap"
                    }
                  >
                    <span className='inline-flex items-center'>
                      {flexRender(
                        h.column.columnDef.header,
                        h.getContext(),
                      )}
                      {h.column.getCanSort() && (
                        <SortIcon sorted={h.column.getIsSorted()} />
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='text-center py-16 text-muted-foreground'
                >
                  <i className='ri-settings-3-line text-3xl block mb-3 opacity-30' />
                  {globalFilter
                    ? `没有匹配 "${globalFilter}" 的结果`
                    : "暂无零件数据"}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className='group/row'
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sheet — form 在外面已初始化，打开时零开销 */}
      <Sheet
        open={panel !== null}
        onOpenChange={o => {
          if (!o) {
            setPanel(null)
            setEditing(null)
          }
        }}
      >
        <SheetContent className='sm:max-w-none sm:w-[580px] overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>
              {panel === "add"
                ? editingPart
                  ? "编辑零件"
                  : "新增零件"
                : "批量导入零件"}
            </SheetTitle>
            <SheetDescription>
              {panel === "add"
                ? "填写零件信息，系统自动生成零件编号"
                : "上传 Excel 文件，系统自动解析并校验数据"}
            </SheetDescription>
          </SheetHeader>
          <div className='mt-8'>
            {/* ★ PartForm 始终渲染（form 已初始化），import panel 按需渲染 */}
            <div className={panel === "add" ? "block" : "hidden"}>
              <PartForm
                form={form}
                editingPart={editingPart}
                onSubmit={handleAdd}
                onCancel={() => {
                  setPanel(null)
                  setEditing(null)
                }}
              />
            </div>
            {panel === "import" && (
              <ImportPanel
                onImport={handleImport}
                onClose={() => setPanel(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Mobile ───────────────────────────────────────────────
function MobileParts() {
  const [panel, setPanel] = useState<PanelMode>(null)
  const [search, setSearch] = useState("")
  const isLoading = false

  // ★ 同样提升到外部
  const form = usePartForm()

  const filtered = useMemo(
    () =>
      MOCK.filter(
        p =>
          !search ||
          p.name.includes(search) ||
          p.material.includes(search) ||
          p.partNumber.includes(search),
      ),
    [search],
  )

  const handleAdd = async (values: PartFormValues) => {
    console.log("add:", values)
    await new Promise(r => setTimeout(r, 600))
    setPanel(null)
  }
  const handleImport = async (rows: ImportRow[]) => {
    console.log("import:", rows)
    await new Promise(r => setTimeout(r, 800))
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='px-4 pt-4 pb-2 shrink-0'>
        <div className='flex items-center gap-2 h-10 px-3 bg-muted border border-input rounded-lg'>
          <i className='ri-search-line text-sm text-muted-foreground shrink-0' />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='搜索零件名称、编号…'
            className='flex-1 bg-transparent text-sm outline-none border-none placeholder:text-muted-foreground'
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className='text-muted-foreground bg-transparent border-none cursor-pointer p-0'
            >
              <i className='ri-close-line text-xs' />
            </button>
          )}
        </div>
      </div>
      <div className='px-4 pb-2 shrink-0'>
        <span className='text-xs text-muted-foreground'>
          共 {filtered.length} 个零件
        </span>
      </div>
      <div className='flex-1 overflow-y-auto px-4 flex flex-col gap-2.5 pb-4'>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='p-3.5 rounded-xl border border-border flex items-center gap-3'
            >
              <Skeleton className='w-9 h-9 rounded-lg shrink-0' />
              <div className='flex-1'>
                <Skeleton className='h-3.5 w-32 mb-2' />
                <Skeleton className='h-3 w-20' />
              </div>
              <Skeleton className='h-3 w-12' />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
            <i className='ri-settings-3-line text-3xl mb-3 opacity-30' />
            <p className='text-sm'>暂无匹配结果</p>
          </div>
        ) : (
          filtered.map(p => (
            <div
              key={p.id}
              className='p-3.5 rounded-xl border border-border bg-card flex items-center gap-3 active:bg-muted/50 cursor-pointer transition-colors'
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
                <span className='font-mono text-xs font-medium'>
                  ¥{p.prices[0]?.value}
                </span>
                <i className='ri-arrow-right-s-line text-muted-foreground' />
              </div>
            </div>
          ))
        )}
      </div>
      <div
        className='px-4 py-3 border-t border-border bg-background shrink-0 flex gap-2'
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
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
          onClick={() => setPanel("add")}
        >
          <i className='ri-add-line mr-2' />
          新增零件
        </Button>
      </div>

      <Sheet
        open={panel !== null}
        onOpenChange={o => {
          if (!o) setPanel(null)
        }}
      >
        <SheetContent
          side='bottom'
          className='h-[92vh] flex flex-col rounded-t-2xl'
        >
          <SheetHeader>
            <SheetTitle>
              {panel === "add" ? "新增零件" : "批量导入零件"}
            </SheetTitle>
            <SheetDescription>
              {panel === "add"
                ? "填写零件信息，系统自动生成零件编号"
                : "上传 Excel 文件，自动解析并校验"}
            </SheetDescription>
          </SheetHeader>
          <div className='flex-1 overflow-y-auto mt-6'>
            <div className={panel === "add" ? "block" : "hidden"}>
              <PartForm
                form={form}
                onSubmit={handleAdd}
                onCancel={() => setPanel(null)}
              />
            </div>
            {panel === "import" && (
              <ImportPanel
                onImport={handleImport}
                onClose={() => setPanel(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function PartsPage() {
  const { isMobile } = useUIStore()
  return isMobile ? <MobileParts /> : <DesktopParts />
}
