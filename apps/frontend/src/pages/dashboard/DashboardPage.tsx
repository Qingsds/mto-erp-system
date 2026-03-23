import { useMemo } from "react"
import type { OrderStatusType } from "@erp/shared-types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  decimalToNum as billingDecimalToNum,
  useGetBilling,
} from "@/hooks/api/useBilling"
import { useGetDeliveries } from "@/hooks/api/useDeliveries"
import {
  decimalToNum as orderDecimalToNum,
  formatOrderNo,
  useGetOrders,
} from "@/hooks/api/useOrders"
import { useGetParts } from "@/hooks/api/useParts"
import { useUIStore } from "@/store/ui.store"

// ─── Types ────────────────────────────────────────────────
type DashboardOrderStatus = "active" | "shipping" | "closed" | "done"

interface StatItem {
  label: string
  value: string
  delta: string
  trend: "up" | "warn" | "neutral"
  icon: string
}

interface DashboardOrderItem {
  id: string
  no: string
  customer: string
  count: number
  amount: string
  status: DashboardOrderStatus
  date: string
  progress: number
}

interface TodoItem {
  text: string
  type: "warn" | "success" | "danger"
}

// ─── Status config ────────────────────────────────────────
const STATUS: Record<
  DashboardOrderStatus,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
  }
> = {
  active: { label: "进行中", variant: "default" },
  shipping: { label: "发货中", variant: "secondary" },
  closed: { label: "短交结案", variant: "destructive" },
  done: { label: "已完成", variant: "outline" },
}

function OrderBadge({ status }: { status: DashboardOrderStatus }) {
  const { label, variant } = STATUS[status]
  return <Badge variant={variant}>{label}</Badge>
}

function mapOrderStatus(status: OrderStatusType): DashboardOrderStatus {
  if (status === "PENDING") return "active"
  if (status === "PARTIAL_SHIPPED") return "shipping"
  if (status === "CLOSED_SHORT") return "closed"
  return "done"
}

function formatShortDate(value: string): string {
  return value.slice(5, 10)
}

function formatYuan(value: number): string {
  return `¥${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function calcOrderProgress(ordered: number, shipped: number, status: OrderStatusType): number {
  if (status === "SHIPPED" || status === "CLOSED_SHORT") return 100
  if (ordered <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((shipped / ordered) * 100)))
}

// ─── Skeleton ─────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <Skeleton className='h-3.5 w-24' />
      </CardHeader>
      <CardContent>
        <Skeleton className='h-8 w-20 mb-2' />
        <Skeleton className='h-3 w-16' />
      </CardContent>
    </Card>
  )
}

function TableRowSkeleton() {
  return (
    <TableRow>
      {[120, 150, 60, 80, 72, 60].map((w, i) => (
        <TableCell key={i}>
          <Skeleton
            className='h-3.5'
            style={{ width: w }}
          />
        </TableCell>
      ))}
    </TableRow>
  )
}

function MobileCardSkeleton() {
  return (
    <Card>
      <CardContent className='p-4'>
        <div className='flex items-start justify-between mb-2'>
          <Skeleton className='h-3 w-32' />
          <Skeleton className='h-5 w-14 rounded-full' />
        </div>
        <Skeleton className='h-4 w-40 mb-3' />
        <div className='flex justify-between'>
          <Skeleton className='h-3 w-24' />
          <Skeleton className='h-3 w-16' />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Mobile: order card ───────────────────────────────────
function MobileOrderCard({ order }: { order: DashboardOrderItem }) {
  return (
    <Card className='cursor-pointer active:bg-muted/50 transition-colors'>
      <CardContent className='p-4'>
        <div className='flex items-start justify-between mb-1.5'>
          <span className='font-mono text-xs text-muted-foreground'>
            {order.no}
          </span>
          <OrderBadge status={order.status} />
        </div>
        <p className='text-sm font-medium mb-2.5'>{order.customer}</p>

        <div className='flex items-center gap-2 mb-2'>
          <div className='flex-1 h-1.5 rounded-full bg-muted overflow-hidden'>
            <div
              className='h-full rounded-full bg-primary transition-all'
              style={{ width: `${order.progress}%` }}
            />
          </div>
          <span className='text-[10px] font-mono text-muted-foreground shrink-0'>
            {order.progress}%
          </span>
        </div>

        <div className='flex items-center justify-between'>
          <span className='text-xs text-muted-foreground'>
            {order.count} 件 · {order.date}
          </span>
          <span className='font-mono text-sm font-semibold'>
            {order.amount}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Mobile dashboard ─────────────────────────────────────
function MobileDashboard({
  isLoading,
  stats,
  orders,
}: {
  isLoading: boolean
  stats: StatItem[]
  orders: DashboardOrderItem[]
}) {
  return (
    <div className='flex-1 overflow-y-auto p-4 flex flex-col gap-4'>
      <div>
        <h1 className='text-xl font-semibold tracking-tight'>
          你好，张三 👋
        </h1>
        <p className='text-sm text-muted-foreground mt-0.5'>
          今日 · 数据实时更新
        </p>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))
          : stats.map(s => (
              <Card key={s.label}>
                <CardContent className='p-3.5'>
                  <div className='flex items-center gap-1.5 mb-2'>
                    <i
                      className={`${s.icon} text-muted-foreground text-sm`}
                    />
                    <span className='text-xs text-muted-foreground'>
                      {s.label}
                    </span>
                  </div>
                  <p className='text-xl font-semibold font-mono tracking-tight leading-none'>
                    {s.value}
                  </p>
                  <p
                    className={`text-xs mt-1.5 flex items-center gap-1 ${
                      s.trend === "up"
                        ? "text-primary"
                        : s.trend === "warn"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    <i
                      className={
                        s.trend === "up"
                          ? "ri-arrow-up-line"
                          : s.trend === "warn"
                            ? "ri-time-line"
                            : "ri-add-line"
                      }
                    />
                    {s.delta}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div>
        <div className='flex items-center justify-between mb-2.5'>
          <h2 className='text-sm font-semibold'>最近订单</h2>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 text-xs px-2 text-muted-foreground'
          >
            查看全部 <i className='ri-arrow-right-s-line ml-0.5' />
          </Button>
        </div>
        <div className='flex flex-col gap-2.5'>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <MobileCardSkeleton key={i} />
              ))
            : orders.map(o => (
                <MobileOrderCard
                  key={o.id}
                  order={o}
                />
              ))}
        </div>
      </div>
    </div>
  )
}

// ─── Desktop dashboard ────────────────────────────────────
function DesktopDashboard({
  isLoading,
  stats,
  orders,
  todos,
}: {
  isLoading: boolean
  stats: StatItem[]
  orders: DashboardOrderItem[]
  todos: TodoItem[]
}) {
  return (
    <div className='flex-1 overflow-y-auto p-6 flex flex-col gap-6'>
      <div className='flex items-start justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            仪表盘
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            欢迎回来，张三。这是今日的业务概览。
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
          >
            <i className='ri-download-line mr-1.5' />
            导出报告
          </Button>
          <Button size='sm'>
            <i className='ri-add-line mr-1.5' />
            新建订单
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-4 gap-4'>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))
          : stats.map(s => (
              <Card key={s.label}>
                <CardHeader className='pb-2 flex flex-row items-center justify-between space-y-0'>
                  <CardDescription>{s.label}</CardDescription>
                  <div className='w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center'>
                    <i className={`${s.icon} text-primary text-sm`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className='text-2xl font-semibold font-mono tracking-tight'>
                    {s.value}
                  </p>
                  <p
                    className={`text-xs mt-1 flex items-center gap-1 ${
                      s.trend === "up"
                        ? "text-primary"
                        : s.trend === "warn"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    <i
                      className={
                        s.trend === "up"
                          ? "ri-trending-up-line"
                          : s.trend === "warn"
                            ? "ri-alert-line"
                            : "ri-add-line"
                      }
                    />
                    {s.delta}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className='grid grid-cols-[1fr_280px] gap-4'>
        <Card>
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div>
                <CardTitle>最近订单</CardTitle>
                <CardDescription className='mt-1'>
                  最近 10 条订单记录
                </CardDescription>
              </div>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                >
                  <i className='ri-filter-3-line mr-1' />
                  筛选
                </Button>
                <Button size='sm'>
                  <i className='ri-add-line mr-1' />
                  新建
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead>零件数</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>日期</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRowSkeleton key={i} />
                    ))
                  : orders.map(row => (
                      <TableRow
                        key={row.id}
                        className='cursor-pointer'
                      >
                        <TableCell className='font-mono text-xs text-muted-foreground'>
                          {row.no}
                        </TableCell>
                        <TableCell className='font-medium'>
                          {row.customer}
                        </TableCell>
                        <TableCell className='text-muted-foreground'>
                          {row.count} 件
                        </TableCell>
                        <TableCell className='font-mono font-medium'>
                          {row.amount}
                        </TableCell>
                        <TableCell>
                          <OrderBadge status={row.status} />
                        </TableCell>
                        <TableCell className='font-mono text-xs text-muted-foreground'>
                          {row.date}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className='flex flex-col gap-4'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>待办事项</CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {todos.map((item, i) => (
                <div
                  key={i}
                  className='flex items-start gap-2.5 px-6 py-2.5 border-b last:border-0 border-border'
                >
                  <div
                    className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                      item.type === "warn"
                        ? "bg-amber-500"
                        : item.type === "success"
                          ? "bg-primary"
                          : "bg-destructive"
                    }`}
                  />
                  <span className='text-xs text-foreground leading-relaxed'>
                    {item.text}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>
                本月发货趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-2'>
                {[
                  ["03-10", 48],
                  ["03-11", 62],
                  ["03-12", 35],
                  ["03-13", 78],
                  ["03-14", 91],
                  ["03-15", 54],
                ].map(([d, v]) => (
                  <div
                    key={d}
                    className='flex items-center gap-2'
                  >
                    <span className='text-[10px] font-mono text-muted-foreground w-10 shrink-0'>
                      {d}
                    </span>
                    <div className='flex-1 h-1.5 rounded-full bg-muted overflow-hidden'>
                      <div
                        className='h-full rounded-full bg-primary transition-all'
                        style={{ width: `${+v}%` }}
                      />
                    </div>
                    <span className='text-[10px] font-mono text-muted-foreground w-6 text-right shrink-0'>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────
export function DashboardPage() {
  const { isMobile } = useUIStore()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
  ).padStart(2, "0")}`

  const latestOrdersQuery = useGetOrders({ page: 1, pageSize: 10 })
  const pendingOrdersQuery = useGetOrders({
    page: 1,
    pageSize: 1,
    status: "PENDING",
  })
  const partialOrdersQuery = useGetOrders({
    page: 1,
    pageSize: 1,
    status: "PARTIAL_SHIPPED",
  })
  const closedOrdersQuery = useGetOrders({
    page: 1,
    pageSize: 1,
    status: "CLOSED_SHORT",
  })
  const monthlyDeliveriesQuery = useGetDeliveries({
    page: 1,
    pageSize: 1,
    deliveryDateStart: monthStart,
    deliveryDateEnd: monthEnd,
  })
  const billingDraftQuery = useGetBilling({ page: 1, pageSize: 1, status: "DRAFT" })
  const billingSealedQuery = useGetBilling({ page: 1, pageSize: 1, status: "SEALED" })
  const partsTotalQuery = useGetParts({ page: 1, pageSize: 1 })
  const partsSnapshotQuery = useGetParts({ page: 1, pageSize: 50 })

  const isLoading = [
    latestOrdersQuery,
    pendingOrdersQuery,
    partialOrdersQuery,
    closedOrdersQuery,
    monthlyDeliveriesQuery,
    billingDraftQuery,
    billingSealedQuery,
    partsTotalQuery,
    partsSnapshotQuery,
  ].some(query => query.isLoading)

  const stats = useMemo<StatItem[]>(() => {
    const ongoingCount =
      (pendingOrdersQuery.data?.total ?? 0) +
      (partialOrdersQuery.data?.total ?? 0)
    const monthlyDeliveryCount = monthlyDeliveriesQuery.data?.total ?? 0
    const draftCount = billingDraftQuery.data?.total ?? 0
    const sealedCount = billingSealedQuery.data?.total ?? 0
    const receivableCount = draftCount + sealedCount
    const partsTotal = partsTotalQuery.data?.total ?? 0

    return [
      {
        label: "进行中订单",
        value: String(ongoingCount),
        delta: `待履约 ${pendingOrdersQuery.data?.total ?? 0} · 发货中 ${partialOrdersQuery.data?.total ?? 0}`,
        trend: ongoingCount > 0 ? "up" : "neutral",
        icon: "ri-file-list-3-line",
      },
      {
        label: "本月发货单",
        value: String(monthlyDeliveryCount),
        delta: `${monthStart.slice(5)} 至 ${monthEnd.slice(5)}`,
        trend: monthlyDeliveryCount > 0 ? "up" : "neutral",
        icon: "ri-truck-line",
      },
      {
        label: "待结算单",
        value: String(receivableCount),
        delta: `草稿 ${draftCount} · 已盖章 ${sealedCount}`,
        trend: receivableCount > 0 ? "warn" : "neutral",
        icon: "ri-bank-card-line",
      },
      {
        label: "零件总数",
        value: String(partsTotal),
        delta: "已录入零件总量",
        trend: "neutral",
        icon: "ri-settings-3-line",
      },
    ]
  }, [
    billingDraftQuery.data?.total,
    billingSealedQuery.data?.total,
    monthEnd,
    monthStart,
    monthlyDeliveriesQuery.data?.total,
    partialOrdersQuery.data?.total,
    partsTotalQuery.data?.total,
    pendingOrdersQuery.data?.total,
  ])

  const orders = useMemo<DashboardOrderItem[]>(() => {
    const rows = latestOrdersQuery.data?.data ?? []
    return rows.map(order => {
      const orderedQty = order.items.reduce((sum, item) => sum + item.orderedQty, 0)
      const shippedQty = order.items.reduce((sum, item) => sum + item.shippedQty, 0)
      const progress = calcOrderProgress(orderedQty, shippedQty, order.status)

      const fallbackAmount = order.items.reduce(
        (sum, item) => sum + item.orderedQty * orderDecimalToNum(item.unitPrice),
        0,
      )
      const amount = formatYuan(order.totalAmount ?? fallbackAmount)

      return {
        id: String(order.id),
        no: formatOrderNo(order.id),
        customer: order.customerName,
        count: order.items.length,
        amount,
        status: mapOrderStatus(order.status),
        date: formatShortDate(order.createdAt),
        progress,
      }
    })
  }, [latestOrdersQuery.data?.data])

  const todos = useMemo<TodoItem[]>(() => {
    const list: TodoItem[] = []
    const ongoingCount =
      (pendingOrdersQuery.data?.total ?? 0) +
      (partialOrdersQuery.data?.total ?? 0)
    const draftCount = billingDraftQuery.data?.total ?? 0
    const sealedCount = billingSealedQuery.data?.total ?? 0
    const pendingBills = draftCount + sealedCount
    const shortClosedCount = closedOrdersQuery.data?.total ?? 0
    const missingPriceCount = (partsSnapshotQuery.data?.data ?? []).filter(part => {
      const entries = Object.values(part.commonPrices ?? {})
      if (entries.length === 0) return true
      return entries.every(value => billingDecimalToNum(value) <= 0)
    }).length

    if (ongoingCount > 0) {
      list.push({ text: `${ongoingCount} 张订单待履约/发货推进`, type: "warn" })
    }
    if (pendingBills > 0) {
      list.push({ text: `${pendingBills} 张对账单待确认或结清`, type: "warn" })
    }
    if (missingPriceCount > 0) {
      list.push({ text: `${missingPriceCount} 个零件价格未配置或为 0（近 50 条）`, type: "danger" })
    }
    list.push({ text: `短交结案订单累计 ${shortClosedCount} 张`, type: "success" })

    if (list.length === 0) {
      list.push({ text: "当前暂无待办事项", type: "success" })
    }

    return list
  }, [
    billingDraftQuery.data?.total,
    billingSealedQuery.data?.total,
    closedOrdersQuery.data?.total,
    partialOrdersQuery.data?.total,
    partsSnapshotQuery.data?.data,
    pendingOrdersQuery.data?.total,
  ])

  return isMobile ? (
    <MobileDashboard
      isLoading={isLoading}
      stats={stats}
      orders={orders}
    />
  ) : (
    <DesktopDashboard
      isLoading={isLoading}
      stats={stats}
      orders={orders}
      todos={todos}
    />
  )
}
