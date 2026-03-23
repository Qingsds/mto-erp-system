/**
 * DeliveriesMobile.tsx
 *
 * 职责：
 * - 发货单列表移动端布局
 * - 提供高级筛选、状态筛选、卡片列表与分页操作
 */

import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  useGetDeliveries,
  type DeliveryListItem,
} from "@/hooks/api/useDeliveries"
import { formatDeliveryNo, formatOrderNo } from "@/hooks/api/useOrders"
import {
  DELIVERY_STATUS_ICON,
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_STYLE,
} from "../deliveries.schema"
import { formatDateTime, normalizeKeyword } from "../deliveries.utils"

type DeliveryStatusFilter = "all" | "SHIPPED"
type RemarkFilter = "all" | "yes" | "no"

const PAGE_SIZE = 20
// 固定空数组引用，避免无数据时列表过滤逻辑反复触发。
const EMPTY_DELIVERIES: DeliveryListItem[] = []

interface DeliveriesMobileProps {
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

interface MobileStatusBadgeProps {
  /** 发货状态。 */
  status: string
}

function MobileStatusBadge({ status }: MobileStatusBadgeProps) {
  const label = DELIVERY_STATUS_LABEL[status] ?? status
  const icon = DELIVERY_STATUS_ICON[status] ?? "ri-information-line"
  const style =
    DELIVERY_STATUS_STYLE[status] ??
    "text-muted-foreground bg-muted border-border"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border whitespace-nowrap",
        style,
      )}
    >
      <i className={cn(icon, "text-[11px]")} />
      {label}
    </span>
  )
}

/**
 * 移动端发货单列表。
 */
export function DeliveriesMobile({ isActive }: DeliveriesMobileProps) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [showAdvanced, setShowAdvanced] = useState(false)
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

  // data 缺失时复用 EMPTY_DELIVERIES，保证筛选 useMemo 依赖稳定。
  const deliveries = data?.data ?? EMPTY_DELIVERIES
  const totalCount = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const keyword = normalizeKeyword(appliedFilters.keyword)

  const visibleDeliveries = useMemo(() => {
    // 先做关键字过滤，再做状态过滤，保证筛选顺序清晰且可维护。
    const byKeyword = keyword
      ? deliveries.filter(delivery => {
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
      : deliveries

    if (appliedFilters.status === "all") return byKeyword
    return byKeyword.filter(item => item.status === appliedFilters.status)
  }, [deliveries, keyword, appliedFilters.status])

  const remarkCount = useMemo(
    () => visibleDeliveries.filter(item => (item.remark ?? "").trim().length > 0).length,
    [visibleDeliveries],
  )

  const mobileTabs: { value: DeliveryStatusFilter; label: string }[] = [
    { value: "all", label: "全部" },
    { value: "SHIPPED", label: "已发货" },
  ]

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
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 h-10 px-3 bg-muted border border-input rounded-lg">
          <i className="ri-search-line text-sm text-muted-foreground shrink-0" />
          <input
            value={draftFilters.keyword}
            onChange={event =>
              setDraftFilters(prev => ({ ...prev, keyword: event.target.value }))
            }
            placeholder="关键字（单号/订单号/客户/备注）"
            className="flex-1 bg-transparent text-sm outline-none border-none placeholder:text-muted-foreground"
          />
          {draftFilters.keyword && (
            <button
              onClick={() => setDraftFilters(prev => ({ ...prev, keyword: "" }))}
              className="text-muted-foreground bg-transparent border-none cursor-pointer p-0"
            >
              <i className="ri-close-line text-xs" />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setShowAdvanced(v => !v)}
          >
            <i className="ri-filter-3-line mr-1" />
            {showAdvanced ? "收起高级筛选" : "高级筛选"}
          </Button>
          <Button size="sm" className="h-8" onClick={applyFilters}>
            <i className="ri-search-line mr-1" />查询
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={resetFilters}>
            重置
          </Button>
        </div>
      </div>

      {showAdvanced && (
        <div className="px-4 pb-2 shrink-0">
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <Input
              type="number"
              min={1}
              value={draftFilters.orderId}
              onChange={event =>
                setDraftFilters(prev => ({ ...prev, orderId: event.target.value }))
              }
              placeholder="订单ID"
              className="h-8"
            />
            <Input
              value={draftFilters.customerName}
              onChange={event =>
                setDraftFilters(prev => ({ ...prev, customerName: event.target.value }))
              }
              placeholder="客户公司名称"
              className="h-8"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={draftFilters.deliveryDateStart}
                onChange={event =>
                  setDraftFilters(prev => ({
                    ...prev,
                    deliveryDateStart: event.target.value,
                  }))
                }
                className="h-8"
              />
              <Input
                type="date"
                value={draftFilters.deliveryDateEnd}
                onChange={event =>
                  setDraftFilters(prev => ({
                    ...prev,
                    deliveryDateEnd: event.target.value,
                  }))
                }
                className="h-8"
              />
            </div>
            <select
              value={draftFilters.hasRemark}
              onChange={event =>
                setDraftFilters(prev => ({
                  ...prev,
                  hasRemark: event.target.value as RemarkFilter,
                }))
              }
              className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">备注：全部</option>
              <option value="yes">备注：有</option>
              <option value="no">备注：无</option>
            </select>
          </div>
        </div>
      )}

      <div className="px-4 pb-2 shrink-0">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md border border-border bg-card px-2 py-2">
            <p className="text-muted-foreground">总数</p>
            <p className="font-semibold text-sky-600">{totalCount}</p>
          </div>
          <div className="rounded-md border border-border bg-card px-2 py-2">
            <p className="text-muted-foreground">当前页</p>
            <p className="font-semibold text-emerald-600">{visibleDeliveries.length}</p>
          </div>
          <div className="rounded-md border border-border bg-card px-2 py-2">
            <p className="text-muted-foreground">含备注</p>
            <p className="font-semibold text-rose-600">{remarkCount}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 px-4 pb-2 overflow-x-auto shrink-0">
        {mobileTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => {
              setAppliedFilters(prev => ({ ...prev, status: tab.value }))
              setDraftFilters(prev => ({ ...prev, status: tab.value }))
            }}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full whitespace-nowrap bg-transparent border-none cursor-pointer transition-colors shrink-0",
              appliedFilters.status === tab.value
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground bg-muted",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-2 shrink-0 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          系统总 {totalCount} 张 {isFetching && !isLoading ? "· 刷新中" : ""}
        </span>
        <span>
          第 {page} / {totalPages} 页
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2.5 pb-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="p-3.5 rounded-xl border border-border flex flex-col gap-2"
            >
              <div className="h-3.5 bg-muted animate-pulse rounded w-32" />
              <div className="h-3 bg-muted animate-pulse rounded w-20" />
              <div className="h-3 bg-muted animate-pulse rounded w-40" />
            </div>
          ))
        ) : visibleDeliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <i className="ri-truck-line text-3xl mb-3 opacity-30" />
            <p className="text-sm">暂无匹配结果</p>
          </div>
        ) : (
          visibleDeliveries.map(delivery => (
            <div
              key={delivery.id}
              className="p-3.5 rounded-xl border border-border bg-card active:bg-muted/50 cursor-pointer transition-colors"
              onClick={() =>
                navigate({
                  to: "/deliveries/$id",
                  params: { id: String(delivery.id) },
                })
              }
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatDeliveryNo(delivery.id)} · {formatOrderNo(delivery.orderId)}
                  </p>
                  <p className="mt-0.5 text-sm font-medium truncate">
                    {delivery.order?.customerName || "-"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    下单时间：{delivery.order?.createdAt ? formatDateTime(delivery.order.createdAt) : "-"}
                  </p>
                </div>
                <MobileStatusBadge status={delivery.status} />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>发货时间：{formatDateTime(delivery.deliveryDate)}</span>
                <span className="font-mono text-foreground">
                  ¥
                  {(delivery.totalAmount ?? 0).toLocaleString("zh-CN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {delivery.remark && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  备注：{delivery.remark}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <div
        className="px-4 py-3 border-t border-border bg-background shrink-0"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <i className="ri-arrow-left-s-line" />
          </Button>
          <Button
            variant="outline"
            className="h-10"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <i className="ri-arrow-right-s-line" />
          </Button>
          <Button
            className="flex-1 h-10"
            onClick={() => navigate({ to: "/orders" })}
          >
            <i className="ri-external-link-line mr-1.5" />
            前往订单发货
          </Button>
        </div>
        {isActive && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">发货模块已激活</p>
        )}
      </div>
    </div>
  )
}
