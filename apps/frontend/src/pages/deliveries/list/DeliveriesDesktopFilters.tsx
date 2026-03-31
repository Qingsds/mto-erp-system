/**
 * 桌面端发货列表筛选面板。
 *
 * 目标是做减法：
 * - 首屏只保留一行快速筛选
 * - 高级筛选默认折叠
 * - 有高级条件时自动展开
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  DeliveryFilters,
  RemarkFilter,
} from "./filters"

interface DeliveriesDesktopFiltersProps {
  filters: DeliveryFilters
  hasActiveFilters: boolean
  onChange: (updater: (prev: DeliveryFilters) => DeliveryFilters) => void
  onApply: () => void
  onReset: () => void
}

export function DeliveriesDesktopFilters({
  filters,
  hasActiveFilters,
  onChange,
  onApply,
  onReset,
}: DeliveriesDesktopFiltersProps) {
  const hasAdvancedFilters =
    filters.orderId.trim().length > 0 ||
    filters.customerName.trim().length > 0 ||
    filters.hasRemark !== "all"
  const [manualAdvancedOpen, setManualAdvancedOpen] = useState(false)
  const showAdvanced = manualAdvancedOpen || hasAdvancedFilters

  return (
    <div className="border-b border-border bg-background/70 px-5 py-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.6fr)_168px_168px_auto_auto_auto]">
        <Input
          value={filters.keyword}
          onChange={event =>
            onChange(prev => ({ ...prev, keyword: event.target.value }))
          }
          placeholder="关键字（发货单号/订单号/客户/备注）"
          className="h-9"
        />

        <Input
          type="date"
          value={filters.deliveryDateStart}
          onChange={event =>
            onChange(prev => ({
              ...prev,
              deliveryDateStart: event.target.value,
            }))
          }
          className="h-9"
        />

        <Input
          type="date"
          value={filters.deliveryDateEnd}
          onChange={event =>
            onChange(prev => ({
              ...prev,
              deliveryDateEnd: event.target.value,
            }))
          }
          className="h-9"
        />

        <Button size="sm" className="h-9" onClick={onApply}>
          <i className="ri-search-line mr-1.5" />
          查询
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() => setManualAdvancedOpen(prev => !prev)}
        >
          <i className="ri-filter-3-line mr-1.5" />
          {showAdvanced ? "收起高级筛选" : "高级筛选"}
        </Button>

        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9"
            onClick={onReset}
          >
            重置
          </Button>
        )}
      </div>

      {showAdvanced && (
        <div className="mt-2 grid gap-2 border-t border-dashed border-border pt-2 lg:grid-cols-3">
          <Input
            type="number"
            min={1}
            value={filters.orderId}
            onChange={event =>
              onChange(prev => ({ ...prev, orderId: event.target.value }))
            }
            placeholder="订单 ID"
            className="h-9"
          />

          <Input
            value={filters.customerName}
            onChange={event =>
              onChange(prev => ({ ...prev, customerName: event.target.value }))
            }
            placeholder="客户公司名称"
            className="h-9"
          />

          <select
            value={filters.hasRemark}
            onChange={event =>
              onChange(prev => ({
                ...prev,
                hasRemark: event.target.value as RemarkFilter,
              }))
            }
            className="h-9 border border-input bg-background px-3 text-sm"
          >
            <option value="all">备注：全部</option>
            <option value="yes">备注：有</option>
            <option value="no">备注：无</option>
          </select>
        </div>
      )}
    </div>
  )
}
