import { useMemo, useState }                from "react"
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, type SortingState } from "@tanstack/react-table"
import { Button }           from "@/components/ui/button"
import { useUIStore }       from "@/store/ui.store"
import { ErpSheet }         from "@/components/common/ErpSheet"
import { DataTable }        from "@/components/common/DataTable"
import { TableToolbar, StatusFilterBar } from "@/components/common/TableToolbar"
import { cn }               from "@/lib/utils"
import type { OrderStatusType } from "@erp/shared-types"
import { STATUS_LABEL, STATUS_NEXT } from "./orders.schema"
import { getOrdersColumns, StatusBadge } from "./orders.columns"
import { OrderForm, useOrderForm } from "./orders.form"
import {
  useGetOrders, useCreateOrder, useCloseShortOrder,
  formatOrderNo, decimalToNum,
  type OrderListItem, type OrderDetail,
} from "@/hooks/api/useOrders"
import { useGetParts } from "@/hooks/api/useParts"

const PAGE_SIZE = 20

// ─── Status tab config ────────────────────────────────────
type StatusFilter = OrderStatusType | "all"

function useStatusTabs(total: number, data: OrderListItem[]) {
  return ([
    { value: "all"           as StatusFilter, label: "全部",   count: total                                               },
    { value: "PENDING"       as StatusFilter, label: STATUS_LABEL.PENDING,        count: data.filter(o => o.status === "PENDING").length        },
    { value: "PARTIAL_SHIPPED" as StatusFilter, label: STATUS_LABEL.PARTIAL_SHIPPED, count: data.filter(o => o.status === "PARTIAL_SHIPPED").length },
    { value: "SHIPPED"       as StatusFilter, label: STATUS_LABEL.SHIPPED,        count: data.filter(o => o.status === "SHIPPED").length        },
    { value: "CLOSED_SHORT"  as StatusFilter, label: STATUS_LABEL.CLOSED_SHORT,   count: data.filter(o => o.status === "CLOSED_SHORT").length   },
  ])
}

// ─── Order Detail Panel ───────────────────────────────────
function OrderDetail({
  orderId,
  onCloseShort,
}: {
  orderId:      number
  onCloseShort: (id: number) => void
}) {
  const { data: order, isLoading } = useGetOrders({ page: 1, pageSize: 1 }) // placeholder
  // In real usage, call useGetOrder(orderId) — requires separate hook call per detail

  // For now stub until useGetOrder is wired:
  return (
    <div className="flex flex-col gap-4 text-sm text-muted-foreground">
      <p>订单 ID: {orderId}</p>
      <Button
        variant="destructive"
        size="sm"
        className="w-fit"
        onClick={() => onCloseShort(orderId)}
      >
        <i className="ri-close-circle-line mr-1.5" />短交结案
      </Button>
    </div>
  )
}

// ─── Desktop ──────────────────────────────────────────────
function DesktopOrders() {
  type PanelMode = "new" | "detail" | null

  const [panel,        setPanel]    = useState<PanelMode>(null)
  const [activeId,     setActiveId] = useState<number | null>(null)
  const [sorting,      setSorting]  = useState<SortingState>([])
  const [globalFilter, setFilter]   = useState("")
  const [statusFilter, setStatus]   = useState<StatusFilter>("all")
  const [page,         setPage]     = useState(1)

  const form = useOrderForm()

  // ── API hooks ──
  const { data, isLoading, isFetching } = useGetOrders({
    page,
    pageSize:     PAGE_SIZE,
    status:       statusFilter === "all" ? undefined : statusFilter,
    customerName: globalFilter || undefined,
  })

  // 零件列表供表单使用
  const { data: partsData } = useGetParts({ page: 1, pageSize: 200 })
  const parts = partsData?.data ?? []

  const createOrder   = useCreateOrder()
  const closeShort    = useCloseShortOrder()

  const orders     = data?.data  ?? []
  const totalCount = data?.total ?? 0

  const columns = useMemo(
    () => getOrdersColumns(
      o => { setActiveId(o.id); setPanel("detail") },
      () => {},
    ),
    [],
  )

  const table = useReactTable({
    data:                orders,
    columns,
    state:               { sorting },
    onSortingChange:     setSorting,
    getCoreRowModel:     getCoreRowModel(),
    getSortedRowModel:   getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination:    true,
    rowCount:            totalCount,
  })

  const statusTabs  = useStatusTabs(totalCount, orders)
  const totalPages  = Math.ceil(totalCount / PAGE_SIZE)

  const handleCreate = async (values: typeof form.getValues extends () => infer R ? R : never) => {
    // 只提交后端需要的字段（移除 _displayPrice）
    await createOrder.mutateAsync({
      customerName: values.customerName,
      items: values.items.map(({ partId, orderedQty }) => ({ partId, orderedQty })),
    })
    form.reset()
    setPanel(null)
  }

  const handleCloseShort = (id: number) => {
    closeShort.mutate({ id, reason: "前端发起短交结案" })
    setPanel(null)
  }

  const closePanel = () => { setPanel(null); setActiveId(null) }

  // Stats chips
  const stats = useMemo(() => ({
    pending:        orders.filter(o => o.status === "PENDING").length,
    partialShipped: orders.filter(o => o.status === "PARTIAL_SHIPPED").length,
  }), [orders])

  return (
    <>
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        emptyIcon="ri-file-list-3-line"
        emptyText="暂无订单数据"
        globalFilter={globalFilter}
        onRowClick={o => { setActiveId(o.id); setPanel("detail") }}
        toolbar={
          <TableToolbar
            title="订单管理"
            count={isFetching && !isLoading ? "加载中…" : `共 ${totalCount} 条订单`}
            globalFilter={globalFilter}
            onFilterChange={v => { setFilter(v); setPage(1) }}
            searchPlaceholder="搜索客户名称…"
            extra={
              <>
                {stats.pending > 0 && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap text-muted-foreground bg-muted">
                    待履约 {stats.pending}
                  </span>
                )}
                {stats.partialShipped > 0 && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap text-amber-600 bg-amber-50 dark:bg-amber-950/40">
                    部分发货 {stats.partialShipped}
                  </span>
                )}
              </>
            }
            actions={
              <Button size="sm" onClick={() => { form.reset(); setPanel("new") }}>
                <i className="ri-add-line mr-1.5" />新建订单
              </Button>
            }
          />
        }
        filterBar={
          <StatusFilterBar
            tabs={statusTabs}
            value={statusFilter}
            onChange={v => { setStatus(v); setPage(1) }}
            footer={totalPages > 1 ? (
              <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground border-l border-border ml-auto">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30 bg-transparent border-none cursor-pointer">
                  <i className="ri-arrow-left-s-line" />
                </button>
                <span>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30 bg-transparent border-none cursor-pointer">
                  <i className="ri-arrow-right-s-line" />
                </button>
              </div>
            ) : undefined}
          />
        }
      />

      <ErpSheet
        open={panel !== null}
        onOpenChange={o => { if (!o) closePanel() }}
        title={panel === "new" ? "新建订单" : `订单详情 · ${activeId ? formatOrderNo(activeId) : ""}`}
        description={panel === "new" ? "填写客户信息，系统从零件字典自动锁定价格快照" : undefined}
        width={540}
      >
        {panel === "new" && (
          <OrderForm
            form={form}
            parts={parts}
            onSubmit={handleCreate}
            onCancel={closePanel}
          />
        )}
        {panel === "detail" && activeId && (
          <OrderDetail orderId={activeId} onCloseShort={handleCloseShort} />
        )}
      </ErpSheet>
    </>
  )
}

// ─── Mobile ───────────────────────────────────────────────
function MobileOrders() {
  type PanelMode = "new" | "detail" | null

  const [panel,     setPanel]   = useState<PanelMode>(null)
  const [activeId,  setActiveId] = useState<number | null>(null)
  const [search,    setSearch]  = useState("")
  const [statusTab, setTab]     = useState<StatusFilter>("all")

  const form = useOrderForm()

  const { data, isLoading } = useGetOrders({
    page: 1, pageSize: 50,
    status:       statusTab === "all" ? undefined : statusTab,
    customerName: search || undefined,
  })
  const { data: partsData } = useGetParts({ page: 1, pageSize: 200 })
  const parts  = partsData?.data ?? []
  const orders = data?.data ?? []

  const createOrder = useCreateOrder()
  const closeShort  = useCloseShortOrder()

  const mobileStatusTabs: { value: StatusFilter; label: string }[] = [
    { value: "all",            label: "全部"   },
    { value: "PENDING",        label: "待履约" },
    { value: "PARTIAL_SHIPPED",label: "部分发货" },
    { value: "SHIPPED",        label: "已发货" },
    { value: "CLOSED_SHORT",   label: "结案" },
  ]

  const handleCreate = async (values: ReturnType<typeof form.getValues>) => {
    await createOrder.mutateAsync({
      customerName: values.customerName,
      items: values.items.map(({ partId, orderedQty }) => ({ partId, orderedQty })),
    })
    form.reset()
    setPanel(null)
  }

  const closePanel = () => { setPanel(null); setActiveId(null) }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 h-10 px-3 bg-muted border border-input rounded-lg">
          <i className="ri-search-line text-sm text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索客户名称…"
            className="flex-1 bg-transparent text-sm outline-none border-none placeholder:text-muted-foreground" />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground bg-transparent border-none cursor-pointer p-0">
              <i className="ri-close-line text-xs" />
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-1 px-4 pb-2 overflow-x-auto shrink-0">
        {mobileStatusTabs.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full whitespace-nowrap bg-transparent border-none cursor-pointer transition-colors shrink-0",
              statusTab === t.value ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground bg-muted",
            )}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="px-4 pb-2 shrink-0">
        <span className="text-xs text-muted-foreground">共 {data?.total ?? 0} 条订单</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2.5 pb-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3.5 rounded-xl border border-border flex flex-col gap-2">
              <div className="h-3.5 bg-muted animate-pulse rounded w-32" />
              <div className="h-3 bg-muted animate-pulse rounded w-20" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <i className="ri-file-list-3-line text-3xl mb-3 opacity-30" />
            <p className="text-sm">暂无匹配结果</p>
          </div>
        ) : (
          orders.map(o => {
            const total = o.items.reduce((s, it) => s + it.orderedQty * decimalToNum(it.unitPrice), 0)
            return (
              <div key={o.id}
                className="p-3.5 rounded-xl border border-border bg-card active:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => { setActiveId(o.id); setPanel("detail") }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium">{o.customerName}</p>
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{formatOrderNo(o.id)}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{o.items.length} 项 · {o.createdAt.slice(0,10)}</span>
                  <span className="font-mono text-sm font-semibold">¥{total.toLocaleString("zh-CN")}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
      <div className="px-4 py-3 border-t border-border bg-background shrink-0" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <Button className="w-full h-11" onClick={() => { form.reset(); setPanel("new") }}>
          <i className="ri-add-line mr-2" />新建订单
        </Button>
      </div>

      <ErpSheet
        open={panel !== null}
        onOpenChange={o => { if (!o) closePanel() }}
        title={panel === "new" ? "新建订单" : `订单详情 · ${activeId ? formatOrderNo(activeId) : ""}`}
        description={panel === "new" ? "填写客户信息" : undefined}
      >
        {panel === "new" && (
          <OrderForm form={form} parts={parts} onSubmit={handleCreate} onCancel={closePanel} />
        )}
        {panel === "detail" && activeId && (
          <OrderDetail orderId={activeId} onCloseShort={id => { closeShort.mutate({ id }); closePanel() }} />
        )}
      </ErpSheet>
    </div>
  )
}

export function OrdersPage() {
  const { isMobile } = useUIStore()
  return isMobile ? <MobileOrders /> : <DesktopOrders />
}