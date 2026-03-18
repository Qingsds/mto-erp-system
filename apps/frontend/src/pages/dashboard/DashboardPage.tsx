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
import { useUIStore } from "@/store/ui.store"

// ─── Types ────────────────────────────────────────────────
type OrderStatus = "active" | "shipping" | "closed" | "done"

interface StatItem {
  label: string
  value: string
  delta: string
  trend: "up" | "warn" | "neutral"
  icon: string
}

interface OrderItem {
  id: string
  no: string
  customer: string
  count: number
  amount: string
  status: OrderStatus
  date: string
  progress: number
}

// ─── Status config ────────────────────────────────────────
const STATUS: Record<
  OrderStatus,
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

function OrderBadge({ status }: { status: OrderStatus }) {
  const { label, variant } = STATUS[status]
  return <Badge variant={variant}>{label}</Badge>
}

// ─── Mock data ────────────────────────────────────────────
const STATS: StatItem[] = [
  {
    label: "进行中订单",
    value: "24",
    delta: "+3 较昨日",
    trend: "up",
    icon: "ri-file-list-3-line",
  },
  {
    label: "本月发货量",
    value: "1,840",
    delta: "+12% 较上月",
    trend: "up",
    icon: "ri-truck-line",
  },
  {
    label: "待结算金额",
    value: "¥38.6K",
    delta: "4 张待确认",
    trend: "warn",
    icon: "ri-bank-card-line",
  },
  {
    label: "零件总数",
    value: "312",
    delta: "+5 本月新增",
    trend: "neutral",
    icon: "ri-settings-3-line",
  },
]

const ORDERS: OrderItem[] = [
  {
    id: "1",
    no: "ORD-2026-0089",
    customer: "华夏精密机械",
    count: 3,
    amount: "¥4,280",
    status: "active",
    date: "03-14",
    progress: 40,
  },
  {
    id: "2",
    no: "ORD-2026-0088",
    customer: "长城重工集团",
    count: 7,
    amount: "¥12,640",
    status: "shipping",
    date: "03-13",
    progress: 70,
  },
  {
    id: "3",
    no: "ORD-2026-0087",
    customer: "东方航空配件",
    count: 2,
    amount: "¥2,100",
    status: "closed",
    date: "03-11",
    progress: 100,
  },
  {
    id: "4",
    no: "ORD-2026-0086",
    customer: "南洋制造有限公司",
    count: 5,
    amount: "¥8,900",
    status: "active",
    date: "03-10",
    progress: 20,
  },
  {
    id: "5",
    no: "ORD-2026-0085",
    customer: "北方精工股份",
    count: 1,
    amount: "¥680",
    status: "done",
    date: "03-08",
    progress: 100,
  },
]

const TODOS = [
  { text: "ORD-0088 等待发货确认", type: "warn" },
  { text: "4 张对账单待客户签署", type: "warn" },
  { text: "公司合同章已上传完成", type: "success" },
  { text: "零件 P-0041 价格未配置", type: "danger" },
]

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
function MobileOrderCard({ order }: { order: OrderItem }) {
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

        {/* Progress bar */}
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
function MobileDashboard({ isLoading }: { isLoading: boolean }) {
  return (
    <div className='flex-1 overflow-y-auto p-4 flex flex-col gap-4'>
      {/* Greeting */}
      <div>
        <h1 className='text-xl font-semibold tracking-tight'>
          你好，张三 👋
        </h1>
        <p className='text-sm text-muted-foreground mt-0.5'>
          今日 · 数据实时更新
        </p>
      </div>

      {/* 2-col stat cards */}
      <div className='grid grid-cols-2 gap-3'>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))
          : STATS.map(s => (
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

      {/* Recent orders */}
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
            : ORDERS.map(o => (
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
function DesktopDashboard({ isLoading }: { isLoading: boolean }) {
  return (
    <div className='flex-1 overflow-y-auto p-6 flex flex-col gap-6'>
      {/* Page header */}
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

      {/* Stat cards — 4 col */}
      <div className='grid grid-cols-4 gap-4'>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))
          : STATS.map(s => (
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

      {/* Bottom section: table + sidebar */}
      <div className='grid grid-cols-[1fr_280px] gap-4'>
        {/* Orders table */}
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
                  : ORDERS.map(row => (
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

        {/* Right column */}
        <div className='flex flex-col gap-4'>
          {/* Todo list */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>待办事项</CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {TODOS.map((item, i) => (
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

          {/* Mini trend bars */}
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
  const isLoading = false // TODO: replace with React Query

  return isMobile ? (
    <MobileDashboard isLoading={isLoading} />
  ) : (
    <DesktopDashboard isLoading={isLoading} />
  )
}
