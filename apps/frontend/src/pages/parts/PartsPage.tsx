import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from "@tanstack/react-table"
import { Button }        from "@/components/ui/button"
import { useUIStore }    from "@/store/ui.store"
import { ErpSheet }      from "@/components/common/ErpSheet"
import { DataTable }     from "@/components/common/DataTable"
import { TableToolbar }  from "@/components/common/TableToolbar"
import { getPartsColumns }       from "./parts.columns"
import { PartForm, usePartForm } from "./parts.form"
import { ImportPanel }           from "./parts.import"
import type { Part, PartFormValues, ImportRow } from "./parts.schema"

const MOCK: Part[] = [
  {
    id: 1, partNumber: "P-0041", name: "六角螺栓 M8×30",
    material: "304不锈钢", spec: "GB/T 5782", remark: "标准紧固件",
    prices: [{ label: "标准价", value: 0.85 }, { label: "批量价", value: 0.72 }],
    createdAt: "2026-03-01",
  },
  {
    id: 2, partNumber: "P-0040", name: "轴承座 UCF205",
    material: "铸铁", spec: "UCF205", remark: "",
    prices: [{ label: "标准价", value: 68 }],
    createdAt: "2026-02-28",
  },
  {
    id: 3, partNumber: "P-0039", name: "密封圈 O-Ring 50×3",
    material: "丁腈橡胶", spec: "Φ50×3mm", remark: "",
    prices: [{ label: "标准价", value: 2.4 }, { label: "批量价", value: 1.9 }],
    createdAt: "2026-02-20",
  },
  {
    id: 4, partNumber: "P-0038", name: "精密导轨 HGR15-500",
    material: "GCr15钢", spec: "L=500mm", remark: "精密级",
    prices: [{ label: "标准价", value: 320 }, { label: "批量价", value: 280 }],
    createdAt: "2026-02-15",
  },
  {
    id: 5, partNumber: "P-0037", name: "铝型材 4040-500mm",
    material: "6063铝合金", spec: "40×40mm", remark: "",
    prices: [{ label: "标准价", value: 38 }],
    createdAt: "2026-02-10",
  },
  {
    id: 6, partNumber: "P-0036", name: "气缸 SC63×100",
    material: "铝合金", spec: "Φ63,行程100", remark: "标准型",
    prices: [{ label: "标准价", value: 188 }],
    createdAt: "2026-02-05",
  },
]

type PanelMode = "add" | "import" | null

// ─── Desktop ──────────────────────────────────────────────
function DesktopParts() {
  const [panel,        setPanel]   = useState<PanelMode>(null)
  const [editingPart,  setEditing] = useState<Part | null>(null)
  const [sorting,      setSorting] = useState<SortingState>([])
  const [globalFilter, setFilter]  = useState("")
  const isLoading = false

  const form = usePartForm()

  const columns = useMemo(
    () => getPartsColumns(
      p => { setEditing(p); setPanel("add") },
      p => console.log("delete", p),
    ),
    [],
  )

  const table = useReactTable({
    data:                 MOCK,
    columns,
    state:                { sorting, globalFilter },
    onSortingChange:      setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel:      getCoreRowModel(),
    getSortedRowModel:    getSortedRowModel(),
    getFilteredRowModel:  getFilteredRowModel(),
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

  const closePanel = () => { setPanel(null); setEditing(null) }

  return (
    <>
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        emptyIcon="ri-settings-3-line"
        emptyText="暂无零件数据"
        globalFilter={globalFilter}
        toolbar={
          <TableToolbar
            title="零件库"
            count={`${table.getFilteredRowModel().rows.length} / ${MOCK.length} 个零件`}
            globalFilter={globalFilter}
            onFilterChange={setFilter}
            searchPlaceholder="搜索名称、材质、编号…"
            actions={
              <>
                <Button variant="outline" size="sm" onClick={() => setPanel("import")}>
                  <i className="ri-upload-2-line mr-1.5" />批量导入
                </Button>
                <Button size="sm" onClick={() => { setEditing(null); setPanel("add") }}>
                  <i className="ri-add-line mr-1.5" />新增零件
                </Button>
              </>
            }
          />
        }
      />

      <ErpSheet
        open={panel !== null}
        onOpenChange={o => { if (!o) closePanel() }}
        title={panel === "add" ? (editingPart ? "编辑零件" : "新增零件") : "批量导入零件"}
        description={panel === "add"
          ? "填写零件信息，系统自动生成零件编号"
          : "上传 Excel 文件，系统自动解析并校验数据"}
        width={580}
      >
        {/* ★ form 在 Sheet 外初始化，打开时零开销 */}
        <div className={panel === "add" ? "block" : "hidden"}>
          <PartForm form={form} editingPart={editingPart} onSubmit={handleAdd} onCancel={closePanel} />
        </div>
        {panel === "import" && (
          <ImportPanel onImport={handleImport} onClose={closePanel} />
        )}
      </ErpSheet>
    </>
  )
}

// ─── Mobile ───────────────────────────────────────────────
function MobileParts() {
  const [panel,  setPanel] = useState<PanelMode>(null)
  const [search, setSearch] = useState("")
  const isLoading = false

  const form = usePartForm()

  const filtered = useMemo(
    () => MOCK.filter(p =>
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
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 h-10 px-3 bg-muted border border-input rounded-lg">
          <i className="ri-search-line text-sm text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索零件名称、编号…"
            className="flex-1 bg-transparent text-sm outline-none border-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground bg-transparent border-none cursor-pointer p-0">
              <i className="ri-close-line text-xs" />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 pb-2 shrink-0">
        <span className="text-xs text-muted-foreground">共 {filtered.length} 个零件</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2.5 pb-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3.5 rounded-xl border border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-muted animate-pulse rounded w-32" />
                <div className="h-3 bg-muted animate-pulse rounded w-20" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <i className="ri-settings-3-line text-3xl mb-3 opacity-30" />
            <p className="text-sm">暂无匹配结果</p>
          </div>
        ) : (
          filtered.map(p => (
            <div key={p.id} className="p-3.5 rounded-xl border border-border bg-card flex items-center gap-3 active:bg-muted/50 cursor-pointer transition-colors">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <i className="ri-settings-3-line text-primary text-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.material} · <span className="font-mono">{p.partNumber}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs font-medium">¥{p.prices[0]?.value}</span>
                <i className="ri-arrow-right-s-line text-muted-foreground" />
              </div>
            </div>
          ))
        )}
      </div>

      <div
        className="px-4 py-3 border-t border-border bg-background shrink-0 flex gap-2"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <Button variant="outline" className="flex-1 h-11" onClick={() => setPanel("import")}>
          <i className="ri-upload-2-line mr-2" />导入
        </Button>
        <Button className="flex-[2] h-11" onClick={() => setPanel("add")}>
          <i className="ri-add-line mr-2" />新增零件
        </Button>
      </div>

      <ErpSheet
        open={panel !== null}
        onOpenChange={o => { if (!o) setPanel(null) }}
        title={panel === "add" ? "新增零件" : "批量导入零件"}
        description={panel === "add"
          ? "填写零件信息，系统自动生成零件编号"
          : "上传 Excel 文件，自动解析并校验"}
      >
        <div className={panel === "add" ? "block" : "hidden"}>
          <PartForm form={form} onSubmit={handleAdd} onCancel={() => setPanel(null)} />
        </div>
        {panel === "import" && (
          <ImportPanel onImport={handleImport} onClose={() => setPanel(null)} />
        )}
      </ErpSheet>
    </div>
  )
}

export function PartsPage() {
  const { isMobile } = useUIStore()
  return isMobile ? <MobileParts /> : <DesktopParts />
}