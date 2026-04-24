/**
 * orders.schema.ts
 *
 * 职责：UI 专属内容
 *  - 从 @erp/shared-types 引入 OrderStatusType（唯一出处，与后端 Prisma enum 对齐）
 *  - Zod 表单校验 schema（客户端验证，shared-types 的 class-validator 不可用于前端）
 *  - STATUS_LABEL / STATUS_NEXT（纯 UI 常量）
 *
 * 不在这里定义：
 *  - Order / OrderItem 接口（API 响应形态，见 hooks/api/useOrders.ts）
 *  - @erp/database Prisma 类型（database 包不在前端 deps 中）
 */

import { z } from "zod"
import type { OrderStatusType } from "@erp/shared-types"

// ─── Re-export，让页面只需要从 schema 引入 ────────────────
export type { OrderStatusType }

// ─── 后端 enum 值 → 中文标签（与 Prisma enum 1:1 对应）──
export const STATUS_LABEL: Record<OrderStatusType, string> = {
  PENDING:          "待履约",
  PARTIAL_SHIPPED:  "部分发货",
  SHIPPED:          "已发货",
  CLOSED_SHORT:     "短交结案",
}

// ─── 前端可触发的状态流转（只有 close-short 由前端发起）──
// PENDING / PARTIAL_SHIPPED 可手动短交结案
// SHIPPED / CLOSED_SHORT 为终态，无后续流转
export const STATUS_NEXT: Partial<Record<
  OrderStatusType,
  { label: string; action: "close-short"; icon: string }[]
>> = {
  PENDING: [
    { label: "短交结案", action: "close-short", icon: "ri-close-circle-line" },
  ],
  PARTIAL_SHIPPED: [
    { label: "短交结案", action: "close-short", icon: "ri-close-circle-line" },
  ],
}

// ─── 状态徽章样式 ─────────────────────────────────────────
export const STATUS_STYLE: Record<OrderStatusType, string> = {
  PENDING:
    "bg-muted text-muted-foreground border-transparent",
  PARTIAL_SHIPPED:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  SHIPPED:
    "bg-primary/10 text-primary border-primary/20",
  CLOSED_SHORT:
    "bg-destructive/10 text-destructive border-destructive/20",
}

export const STATUS_ICON: Record<OrderStatusType, string> = {
  PENDING:         "ri-time-line",
  PARTIAL_SHIPPED: "ri-truck-line",
  SHIPPED:         "ri-checkbox-circle-line",
  CLOSED_SHORT:    "ri-close-circle-line",
}

// ─── Zod 表单 schema ──────────────────────────────────────
// 对齐 @erp/shared-types 的 CreateOrderRequest / OrderItemRequest
// 注意：unitPrice 仅用于前端显示预估金额，不提交后端
// 后端自动从 part.commonPrices['标准价'] 取价格快照

export const OrderItemFormSchema = z.object({
  partId:     z.number({ error: "请选择零件" }).min(1, "请选择零件"),
  orderedQty: z.coerce.number().int("数量必须为整数").positive("数量必须大于 0"),
  // 仅 UI 侧显示用，不提交后端
  _displayPrice: z.number().optional(),
  priceLabel: z.string().max(50).optional(),
})

export const OrderFormSchema = z.object({
  customerId:   z.number({ error: "请选择客户" }).min(1, "请选择客户"),
  customerName: z.string().max(100).optional(),
  responsibleUserId: z.number().int().optional(),
  targetDate:   z.string().min(1, "请选择交货日期"),
  remark:       z.string().max(500).optional(),
  items:        z.array(OrderItemFormSchema).min(1, "至少添加一个零件"),
})

export type OrderFormInput = z.input<typeof OrderFormSchema>
export type OrderFormValues = z.output<typeof OrderFormSchema>
export type OrderItemFormInput = z.input<typeof OrderItemFormSchema>
export type OrderItemFormValues = z.output<typeof OrderItemFormSchema>
