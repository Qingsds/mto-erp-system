/**
 * DeliveriesDesktop.tsx
 *
 * 职责：
 * - 发货单列表桌面端布局
 * - 提供高级筛选、统计卡片、状态筛选与分页
 */

import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from "@tanstack/react-table"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/common/DataTable"
import { StatusFilterBar } from "@/components/common/TableToolbar"
import type { DeliveryListItem } from "@/hooks/api/useDeliveries"
import { useGetDeliveries } from "@/hooks/api/useDeliveries"
import { formatDeliveryNo, formatOrderNo } from "@/hooks/api/useOrders"
import { getDeliveriesColumns } from "../deliveries.columns"
import { normalizeKeyword } from "../deliveries.utils"

type DeliveryStatusFilter = "all" | "SHIPPED"
type RemarkFilter = "all" | "yes" | "no"

const PAGE_SIZE = 20
// 固定空数组引用，避免 data 未返回时每次渲染生成新引用触发表格重复计算。
const EMPTY_DELIVERIES: DeliveryListItem[] = []

interface DeliveriesDesktopProps {
  /** 当前是否处于激活态。 */
  isActive?: boolean
}

interface DeliveryFilters {
  /** 关键字（本页前端过滤）。 */
  keyword: string
  /** 订单 ID（后端过滤）。 */
  orderId: string
  /** 客户名称（后端过滤）。 */
  customerName: string
  /** 发货日期起始（后端过滤）。 */
  deliveryDateStart: string
  /** 发货日期结束（后端过滤）。 */
  deliveryDateEnd: string
  /** 是否有备注（后端过滤）。 */
  hasRemark: RemarkFilter
  /** 状态（前端过滤）。 */
  status: DeliveryStatusFilter
}

const DEFAULT_FILTERS: DeliveryFilters = {
  keyword: "",
  orderId: "",
  customerName: "",
  deliveryDateStart: "",
  deliveryDateEnd: "",
  hasRemark: "all",
  status: "all",
}

interface StatCardProps {
  /** 卡片标题。 */
  label: string
  /** 卡片主值。 */
  value: string
  /** 卡片辅助说明。 */
  hint?: string
  /** 主值颜色类。 */
  valueClassName?: string
}

function StatCard({
  label,
  value,
  hint,
  valueClassName,
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold ${valueClassName ?? ""}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/**
 * 桌面端发货单列表。
 */
export function DeliveriesDesktop({ isActive }: DeliveriesDesktopProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(1)
  const [draftFilters, setDraftFilters] = useState<DeliveryFilters>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<DeliveryFilters>(DEFAULT_FILTERS)

  const { data, isLoading, isFetching } = useGetDeliveries({
    page,
    pageSize: PAGE_SIZE,
    orderId: appliedFilters.orderId ? Number(appliedFilters.orderId) : undefined,
    customerName: appliedFilters.customerName.trim() || undefined,
    deliveryDateStart: appliedFilters.deliveryDateStart || undefined,
    deliveryDateEnd: appliedFilters.deliveryDateEnd || undefined,
    hasRemark:
      appliedFilters.hasRemark === "all"
        ? undefined
        : appliedFilters.hasRemark === "yes",
  })

  // 保持 data 引用稳定，减少 useMemo/useReactTable 的无效重算。
  const deliveries = data?.data ?? EMPTY_DELIVERIES
  const totalCount = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const keyword = normalizeKeyword(appliedFilters.keyword)

  const keywordFiltered = useMemo(() => {
    if (!keyword) return deliveries
    return deliveries.filter(delivery => {
      const deliveryNo = formatDeliveryNo(delivery.id).toLowerCase()
      const orderNo = formatOrderNo(delivery.orderId).toLowerCase()
      const customerName = (delivery.order?.customerName ?? "").toLowerCase()
      const remark = (delivery.remark ?? "").toLowerCase()

      return (
        deliveryNo.includes(keyword) ||
        orderNo.includes(keyword) ||
        customerName.includes(keyword) ||
        remark.includes(keyword)
      )
    })
  }, [deliveries, keyword])

  const visibleDeliveries = useMemo(() => {
    if (appliedFilters.status === "all") return keywordFiltered
    return keywordFiltered.filter(item => item.status === appliedFilters.status)
  }, [keywordFiltered, appliedFilters.status])

  const columns = useMemo(
    () =>
      getDeliveriesColumns(delivery => {
        navigate({
          to: "/deliveries/$id",
          params: { id: String(delivery.id) },
        })
      }),
    [navigate],
  )

  const table = useReactTable<DeliveryListItem>({
    data: visibleDeliveries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    rowCount: totalCount,
  })

  const uniqueOrdersCount = useMemo(
    () => new Set(visibleDeliveries.map(item => item.orderId)).size,
    [visibleDeliveries],
  )

  const remarkCount = useMemo(
    () => visibleDeliveries.filter(item => (item.remark ?? "").trim().length > 0).length,
    [visibleDeliveries],
  )

  const statusTabs = useMemo(
    () => [
      {
        value: "all" as DeliveryStatusFilter,
        label: "全部",
        count: keywordFiltered.length,
      },
      {
        value: "SHIPPED" as DeliveryStatusFilter,
        label: "已发货",
        count: keywordFiltered.filter(item => item.status === "SHIPPED").length,
      },
    ],
    [keywordFiltered],
  )

  const applyFilters = () => {
    setPage(1)
    setAppliedFilters(draftFilters)
  }

  const resetFilters = () => {
    setPage(1)
    setDraftFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-background shrink-0 flex items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight leading-none">发货管理</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isFetching && !isLoading
              ? "加载中…"
              : `系统总 ${totalCount} 张 · 当前页 ${deliveries.length} 张${keyword ? ` · 匹配 ${visibleDeliveries.length} 张` : ""}`}
          </p>
        </div>

        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/orders" })}>
            <i className="ri-external-link-line mr-1.5" />前往订单发货
          </Button>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-border bg-background/70 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <Input
            value={draftFilters.keyword}
            onChange={event =>
              setDraftFilters(prev => ({ ...prev, keyword: event.target.value }))
            }
            placeholder="关键字（单号/订单号/客户/备注）"
            className="h-9"
          />

          <Input
            type="number"
            min={1}
            value={draftFilters.orderId}
            onChange={event =>
              setDraftFilters(prev => ({ ...prev, orderId: event.target.value }))
            }
            placeholder="订单ID"
            className="h-9"
          />

          <Input
            value={draftFilters.customerName}
            onChange={event =>
              setDraftFilters(prev => ({ ...prev, customerName: event.target.value }))
            }
            placeholder="客户公司名称"
            className="h-9"
          />

          <Input
            type="date"
            value={draftFilters.deliveryDateStart}
            onChange={event =>
              setDraftFilters(prev => ({ ...prev, deliveryDateStart: event.target.value }))
            }
            className="h-9"
          />

          <Input
            type="date"
            value={draftFilters.deliveryDateEnd}
            onChange={event =>
              setDraftFilters(prev => ({ ...prev, deliveryDateEnd: event.target.value }))
            }
            className="h-9"
          />

          <select
            value={draftFilters.hasRemark}
            onChange={event =>
              setDraftFilters(prev => ({
                ...prev,
                hasRemark: event.target.value as RemarkFilter,
              }))
            }
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">备注：全部</option>
            <option value="yes">备注：有</option>
            <option value="no">备注：无</option>
          </select>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={applyFilters}>
            <i className="ri-search-line mr-1.5" />查询
          </Button>
          <Button size="sm" variant="outline" onClick={resetFilters}>
            <i className="ri-refresh-line mr-1.5" />重置
          </Button>
          <span className="text-[11px] text-muted-foreground ml-auto">
            高级筛选会联动下方统计卡片
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-5 py-4 shrink-0 border-b border-border bg-background">
        <StatCard
          label="发货单总数"
          value={`${totalCount} 张`}
          hint="后端筛选后总数"
          valueClassName="text-sky-600"
        />
        <StatCard
          label="当前页记录"
          value={`${visibleDeliveries.length} 张`}
          hint={`第 ${page} 页`}
          valueClassName="text-emerald-600"
        />
        <StatCard
          label="关联订单数"
          value={`${uniqueOrdersCount} 个`}
          hint="当前筛选结果"
          valueClassName="text-amber-600"
        />
        <StatCard
          label="含备注发货单"
          value={`${remarkCount} 张`}
          hint={isActive ? "模块已激活" : "用于异常追踪"}
          valueClassName="text-rose-600"
        />
      </div>

      <DataTable<DeliveryListItem>
        table={table}
        columns={columns}
        isLoading={isLoading}
        emptyIcon="ri-truck-line"
        emptyText="暂无发货单数据"
        globalFilter={appliedFilters.keyword}
        onRowClick={delivery => {
          navigate({
            to: "/deliveries/$id",
            params: { id: String(delivery.id) },
          })
        }}
        filterBar={
          <StatusFilterBar
            tabs={statusTabs}
            value={appliedFilters.status}
            onChange={value => {
              setAppliedFilters(prev => ({ ...prev, status: value }))
              setDraftFilters(prev => ({ ...prev, status: value }))
            }}
            footer={
              totalPages > 1 ? (
                <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground border-l border-border ml-auto">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30 bg-transparent border-none cursor-pointer"
                  >
                    <i className="ri-arrow-left-s-line" />
                  </button>
                  <span>
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30 bg-transparent border-none cursor-pointer"
                  >
                    <i className="ri-arrow-right-s-line" />
                  </button>
                </div>
              ) : undefined
            }
          />
        }
      />
    </div>
  )
}
