import { useMemo, useState }          from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from "@tanstack/react-table"
import { Button }           from "@/components/ui/button"
import { useUIStore }       from "@/store/ui.store"
import { ErpSheet }         from "@/components/common/ErpSheet"
import { DataTable }        from "@/components/common/DataTable"
import { TableToolbar, StatusFilterBar } from "@/components/common/TableToolbar"
import { cn }               from "@/lib/utils"
import { getOrdersColumns, StatusBadge } from "./orders.columns"
import { OrderForm, useOrderForm, MOCK_PARTS_CATALOGUE } from "./orders.form"
import type { Order, OrderStatus, OrderFormValues } from "./orders.schema"
import { STATUS_LABEL, STATUS_NEXT } from "./orders.schema"

// ─── Mock data ────────────────────────────────────────────
const MOCK_ORDERS: Order[] = [
  {
    id: 1, orderNo: "ORD-2026-0024", customerName: "深圳捷威科技有限公司",
    status: "production",
    items: [
      { id: 1, partId: 1, partNumber: "P-0041", partName: "六角螺栓 M8×30",    material: "304不锈钢", orderedQty: 500, unitPrice: 0.85, totalPrice: 425  },
      { id: 2, partId: 2, partNumber: "P-0040", partName: "轴承座 UCF205",      material: "铸铁",      orderedQty: 10,  unitPrice: 68,  totalPrice: 680  },
      { id: 3, partId: 3, partNumber: "P-0039", partName: "密封圈 O-Ring 50×3", material: "丁腈橡胶",  orderedQty: 200, unitPrice: 2.4, totalPrice: 480  },
    ],
    totalAmount: 1585, remark: "优先排产，月底前交货",
    createdAt: "2026-03-10", confirmedAt: "2026-03-11",
  },
  {
    id: 2, orderNo: "ORD-2026-0023", customerName: "广州精工液压机械厂",
    status: "confirmed",
    items: [{ id: 4, partId: 4, partNumber: "P-0038", partName: "精密导轨 HGR15-500", material: "GCr15钢", orderedQty: 6, unitPrice: 320, totalPrice: 1920 }],
    totalAmount: 1920, createdAt: "2026-03-12", confirmedAt: "2026-03-12",
  },
  {
    id: 3, orderNo: "ORD-2026-0022", customerName: "东莞华恒自动化设备",
    status: "delivered",
    items: [
      { id: 5, partId: 5, partNumber: "P-0037", partName: "铝型材 4040-500mm", material: "6063铝合金", orderedQty: 20, unitPrice: 38,  totalPrice: 760 },
      { id: 6, partId: 6, partNumber: "P-0036", partName: "气缸 SC63×100",     material: "铝合金",     orderedQty: 4,  unitPrice: 188, totalPrice: 752 },
    ],
    totalAmount: 1512, createdAt: "2026-03-01", confirmedAt: "2026-03-02", deliveredAt: "2026-03-14",
  },
  {
    id: 4, orderNo: "ORD-2026-0021", customerName: "深圳捷威科技有限公司",
    status: "draft",
    items: [{ id: 7, partId: 1, partNumber: "P-0041", partName: "六角螺栓 M8×30", material: "304不锈钢", orderedQty: 1000, unitPrice: 0.72, totalPrice: 720 }],
    totalAmount: 720, remark: "待客户确认规格后正式下单", createdAt: "2026-03-18",
  },
  {
    id: 5, orderNo: "ORD-2026-0020", customerName: "苏州迈科精密零部件",
    status: "closed_short",
    items: [{ id: 8, partId: 4, partNumber: "P-0038", partName: "精密导轨 HGR15-500", material: "GCr15钢", orderedQty: 10, unitPrice: 320, totalPrice: 3200 }],
    totalAmount: 3200, remark: "报废 2 件不补，短交结案", createdAt: "2026-02-20", confirmedAt: "2026-02-21",
  },
]

// ─── Order Detail Panel ───────────────────────────────────
function OrderDetail({
  order,
  onStatusChange,
}: {
  order:          Order
  onStatusChange: (id: number, next: OrderStatus) => void
}) {
  const transitions = STATUS_NEXT[order.status] ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/40 border border-border">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground font-mono">{order.orderNo}</p>
            <p className="text-base font-semibold mt-0.5">{order.customerName}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">创建</span>
            <p className="font-mono text-xs mt-0.5">{order.createdAt}</p>
          </div>
          {order.confirmedAt && (
            <div>
              <span className="text-muted-foreground text-xs">确认</span>
              <p className="font-mono text-xs mt-0.5">{order.confirmedAt}</p>
            </div>
          )}
          {order.deliveredAt && (
            <div>
              <span className="text-muted-foreground text-xs">交付</span>
              <p className="font-mono text-xs mt-0.5">{order.deliveredAt}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground text-xs">订单金额</span>
            <p className="font-mono font-semibold mt-0.5">
              ¥{order.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        {order.remark && (
          <p className="text-xs text-muted-foreground border-t border-border pt-2.5 leading-relaxed">
            <i className="ri-chat-1-line mr-1" />{order.remark}
          </p>
        )}
      </div>

      {transitions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">流转操作</p>
          <div className="flex flex-wrap gap-2">
            {transitions.map(t => (
              <Button
                key={t.next}
                size="sm"
                variant={t.next === "closed_short" ? "destructive" : "default"}
                className="h-8"
                onClick={() => onStatusChange(order.id, t.next)}
              >
                <i className={cn(t.icon, "mr-1.5")} />{t.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          零件明细 ({order.items.length} 项)
        </p>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">零件</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">数量</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">单价</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">小计</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={item.id} className={cn("border-b border-border last:border-0", idx % 2 === 1 && "bg-muted/20")}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-xs leading-none">{item.partName}</p>
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      {item.partNumber} · {item.material}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{item.orderedQty}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">¥{item.unitPrice}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums font-medium">¥{item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 border-t border-border">
                <td colSpan={3} className="px-3 py-2 text-xs text-muted-foreground text-right font-medium">合计</td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-sm tabular-nums">
                  ¥{order.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Status filter tabs config ────────────────────────────
function useStatusTabs(orders: Order[]) {
  return ([
    { value: "all",          label: "全部" },
    { value: "draft",        label: STATUS_LABEL.draft },
    { value: "confirmed",    label: STATUS_LABEL.confirmed },
    { value: "production",   label: STATUS_LABEL.production },
    { value: "delivered",    label: STATUS_LABEL.delivered },
    { value: "closed_short", label: STATUS_LABEL.closed_short },
  ] as const).map(tab => ({
    ...tab,
    count: tab.value === "all"
      ? orders.length
      : orders.filter(o => o.status === tab.value).length,
  }))
}

// ─── Shared status change logic ───────────────────────────
function applyStatusChange(orders: Order[], id: number, next: OrderStatus): Order[] {
  const now = new Date().toISOString().slice(0, 10)
  return orders.map(o => o.id !== id ? o : {
    ...o,
    status:      next,
    confirmedAt: next === "confirmed" ? now : o.confirmedAt,
    deliveredAt: next === "delivered" ? now : o.deliveredAt,
  })
}

// ─── Desktop ──────────────────────────────────────────────
function DesktopOrders() {
  type PanelMode = "new" | "detail" | null

  const [panel,        setPanel]   = useState<PanelMode>(null)
  const [activeOrder,  setActive]  = useState<Order | null>(null)
  const [orders,       setOrders]  = useState<Order[]>(MOCK_ORDERS)
  const [sorting,      setSorting] = useState<SortingState>([])
  const [globalFilter, setFilter]  = useState("")
  const [statusFilter, setStatus]  = useState<OrderStatus | "all">("all")
  const isLoading = false

  const form = useOrderForm()

  const columns = useMemo(
    () => getOrdersColumns(
      o => { setActive(o); setPanel("detail") },
      o => setOrders(prev => prev.filter(x => x.id !== o.id)),
    ),
    [],
  )

  const filteredData = useMemo(
    () => statusFilter === "all" ? orders : orders.filter(o => o.status === statusFilter),
    [orders, statusFilter],
  )

  const table = useReactTable({
    data:                 filteredData,
    columns,
    state:                { sorting, globalFilter },
    onSortingChange:      setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel:      getCoreRowModel(),
    getSortedRowModel:    getSortedRowModel(),
    getFilteredRowModel:  getFilteredRowModel(),
  })

  const statusTabs = useStatusTabs(orders)

  const stats = useMemo(() => ({
    production: orders.filter(o => o.status === "production").length,
    delivered:  orders.filter(o => o.status === "delivered").length,
  }), [orders])

  const handleCreate = async (values: OrderFormValues) => {
    await new Promise(r => setTimeout(r, 600))
    const newOrder: Order = {
      id:           orders.length + 1,
      orderNo:      `ORD-2026-${String(orders.length + 25).padStart(4, "0")}`,
      customerName: values.customerName,
      status:       "draft",
      items:        values.items.map((item, idx) => {
        const part = MOCK_PARTS_CATALOGUE.find(p => p.id === item.partId)!
        return { id: idx + 100, partId: item.partId, partNumber: part.partNumber, partName: part.name, material: part.material, orderedQty: item.orderedQty, unitPrice: item.unitPrice, totalPrice: item.orderedQty * item.unitPrice }
      }),
      totalAmount: values.items.reduce((s, i) => s + i.orderedQty * i.unitPrice, 0),
      remark:      values.remark,
      createdAt:   new Date().toISOString().slice(0, 10),
    }
    setOrders(prev => [newOrder, ...prev])
    form.reset()
    setPanel(null)
  }

  const handleStatusChange = (id: number, next: OrderStatus) => {
    setOrders(prev => applyStatusChange(prev, id, next))
    if (activeOrder?.id === id) {
      setActive(prev => prev ? applyStatusChange([prev], id, next)[0] : prev)
    }
  }

  const closePanel = () => { setPanel(null); setActive(null) }

  return (
    <>
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        emptyIcon="ri-file-list-3-line"
        emptyText="暂无订单数据"
        globalFilter={globalFilter}
        onRowClick={o => { setActive(o); setPanel("detail") }}
        toolbar={
          <TableToolbar
            title="订单管理"
            count={`${table.getFilteredRowModel().rows.length} / ${orders.length} 条订单`}
            globalFilter={globalFilter}
            onFilterChange={setFilter}
            searchPlaceholder="搜索订单号、客户名称…"
            extra={
              <>
                {[
                  { label: "生产中", count: stats.production, cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
                  { label: "已交付", count: stats.delivered,  cls: "text-primary bg-primary/10" },
                ].map(s => (
                  <span key={s.label} className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", s.cls)}>
                    {s.label} {s.count}
                  </span>
                ))}
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
            onChange={setStatus}
          />
        }
      />

      <ErpSheet
        open={panel !== null}
        onOpenChange={o => { if (!o) closePanel() }}
        title={panel === "new" ? "新建订单" : `订单详情 · ${activeOrder?.orderNo ?? ""}`}
        description={panel === "new"
          ? "填写客户信息并添加零件明细，系统将自动锁定价格快照"
          : activeOrder?.customerName}
        width={540}
      >
        {panel === "new" && (
          <OrderForm form={form} onSubmit={handleCreate} onCancel={closePanel} />
        )}
        {panel === "detail" && activeOrder && (
          <OrderDetail order={activeOrder} onStatusChange={handleStatusChange} />
        )}
      </ErpSheet>
    </>
  )
}

// ─── Mobile ───────────────────────────────────────────────
function MobileOrders() {
  type PanelMode = "new" | "detail" | null

  const [panel,       setPanel]  = useState<PanelMode>(null)
  const [activeOrder, setActive] = useState<Order | null>(null)
  const [orders,      setOrders] = useState<Order[]>(MOCK_ORDERS)
  const [search,      setSearch] = useState("")
  const [statusTab,   setTab]    = useState<OrderStatus | "all">("all")

  const form = useOrderForm()

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = statusTab === "all" || o.status === statusTab
      const matchSearch = !search || o.customerName.includes(search) || o.orderNo.includes(search)
      return matchStatus && matchSearch
    })
  }, [orders, search, statusTab])

  const mobileStatusTabs = useStatusTabs(orders).slice(0, 5) // 移动端精简

  const handleCreate = async (values: OrderFormValues) => {
    await new Promise(r => setTimeout(r, 600))
    const newOrder: Order = {
      id:           orders.length + 1,
      orderNo:      `ORD-2026-${String(orders.length + 25).padStart(4, "0")}`,
      customerName: values.customerName,
      status:       "draft",
      items:        values.items.map((item, idx) => {
        const part = MOCK_PARTS_CATALOGUE.find(p => p.id === item.partId)!
        return { id: idx + 100, partId: item.partId, partNumber: part.partNumber, partName: part.name, material: part.material, orderedQty: item.orderedQty, unitPrice: item.unitPrice, totalPrice: item.orderedQty * item.unitPrice }
      }),
      totalAmount: values.items.reduce((s, i) => s + i.orderedQty * i.unitPrice, 0),
      remark:      values.remark,
      createdAt:   new Date().toISOString().slice(0, 10),
    }
    setOrders(prev => [newOrder, ...prev])
    form.reset()
    setPanel(null)
  }

  const handleStatusChange = (id: number, next: OrderStatus) => {
    setOrders(prev => applyStatusChange(prev, id, next))
    setActive(prev => prev?.id === id ? applyStatusChange([prev], id, next)[0] : prev)
  }

  const closePanel = () => { setPanel(null); setActive(null) }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 h-10 px-3 bg-muted border border-input rounded-lg">
          <i className="ri-search-line text-sm text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索订单号、客户名称…"
            className="flex-1 bg-transparent text-sm outline-none border-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground bg-transparent border-none cursor-pointer p-0">
              <i className="ri-close-line text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Tab filter */}
      <div className="flex gap-1 px-4 pb-2 overflow-x-auto shrink-0">
        {mobileStatusTabs.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full whitespace-nowrap bg-transparent border-none cursor-pointer transition-colors shrink-0",
              statusTab === t.value
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-2 shrink-0">
        <span className="text-xs text-muted-foreground">共 {filtered.length} 条订单</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2.5 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <i className="ri-file-list-3-line text-3xl mb-3 opacity-30" />
            <p className="text-sm">暂无匹配结果</p>
          </div>
        ) : (
          filtered.map(o => (
            <div
              key={o.id}
              className="p-3.5 rounded-xl border border-border bg-card active:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => { setActive(o); setPanel("detail") }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-medium">{o.customerName}</p>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{o.orderNo}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{o.items.length} 项零件 · {o.createdAt}</span>
                <span className="font-mono text-sm font-semibold">¥{o.totalAmount.toLocaleString("zh-CN")}</span>
              </div>
            </div>
          ))
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
        title={panel === "new" ? "新建订单" : "订单详情"}
        description={panel === "new" ? "填写客户信息并添加零件明细" : `${activeOrder?.orderNo} · ${activeOrder?.customerName}`}
      >
        {panel === "new" && (
          <OrderForm form={form} onSubmit={handleCreate} onCancel={closePanel} />
        )}
        {panel === "detail" && activeOrder && (
          <OrderDetail order={activeOrder} onStatusChange={handleStatusChange} />
        )}
      </ErpSheet>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────
export function OrdersPage() {
  const { isMobile } = useUIStore()
  return isMobile ? <MobileOrders /> : <DesktopOrders />
}