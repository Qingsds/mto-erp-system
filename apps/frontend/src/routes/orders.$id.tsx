/**
 * routes/orders.$id.tsx
 *
 * 职责：
 * - 注册订单详情文件路由 /orders/$id
 */

import { createFileRoute } from "@tanstack/react-router"
import { OrderDetailPage } from "@/pages/orders/OrderDetailPage"

export const Route = createFileRoute("/orders/$id")({
  component: OrderDetailPage,
})
