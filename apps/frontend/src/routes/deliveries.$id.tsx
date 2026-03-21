/**
 * routes/deliveries.$id.tsx
 *
 * 职责：
 * - 注册发货单详情文件路由 /deliveries/$id
 */

import { createFileRoute } from "@tanstack/react-router"
import { DeliveryDetailPage } from "@/pages/deliveries/DeliveryDetailPage"

export const Route = createFileRoute("/deliveries/$id")({
  component: DeliveryDetailPage,
})

