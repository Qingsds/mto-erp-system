/**
 * deliveries.columns.tsx
 *
 * 职责：
 * - 定义发货单列表表格列（TanStack Table）
 */

import { createColumnHelper } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import type { DeliveryListItem } from "@/hooks/api/useDeliveries"
import { formatDeliveryNo, formatOrderNo } from "@/hooks/api/useOrders"
import { formatDateTime } from "./deliveries.utils"
import { DeliveryStatusBadge } from "./shared/DeliveryStatusBadge"

const col = createColumnHelper<DeliveryListItem>()

/**
 * 生成发货单列表列配置。
 */
export function getDeliveriesColumns(
  /** 查看详情回调。 */
  onView: (delivery: DeliveryListItem) => void,
) {
  return [
    col.display({
      id: "deliveryNo",
      header: "发货单号",
      size: 120,
      cell: info => (
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {formatDeliveryNo(info.row.original.id)}
        </span>
      ),
    }),

    col.accessor("orderId", {
      header: "关联订单",
      size: 220,
      cell: info => (
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground whitespace-nowrap">
            {formatOrderNo(info.getValue())}
          </p>
          <p className="text-sm font-medium truncate">
            {info.row.original.order?.customerName || "-"}
          </p>
          <p className="text-[11px] text-muted-foreground whitespace-nowrap">
            下单时间：{info.row.original.order?.createdAt ? formatDateTime(info.row.original.order.createdAt) : "-"}
          </p>
        </div>
      ),
    }),

    col.accessor("deliveryDate", {
      header: "发货时间",
      size: 160,
      cell: info => (
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(info.getValue())}
        </span>
      ),
    }),

    col.accessor("status", {
      header: "状态",
      size: 96,
      cell: info => <DeliveryStatusBadge status={info.getValue()} />,
    }),

    col.accessor("remark", {
      header: "备注",
      size: 280,
      enableSorting: false,
      cell: info => {
        const remark = info.getValue()
        return (
          <span className="text-sm text-muted-foreground line-clamp-1">
            {remark || "-"}
          </span>
        )
      },
    }),

    col.display({
      id: "actions",
      size: 86,
      cell: info => (
        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={event => {
              event.stopPropagation()
              onView(info.row.original)
            }}
          >
            <i className="ri-eye-line mr-1" />详情
          </Button>
        </div>
      ),
    }),
  ]
}
