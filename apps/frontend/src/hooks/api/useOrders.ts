/**
 * hooks/api/useOrders.ts
 *
 * 职责：订单模块的 API 类型定义 + TanStack Query hooks
 *
 * API 响应类型：手动对齐后端 Prisma 查询结果
 *  - @erp/database 不在前端 deps 中，Prisma client 也未生成，无法直接引入
 *  - 类型形态来源：orders.service.ts 的 findAll / findOne include 配置
 *
 * 引入来源唯一性：
 *  - OrderStatusType  ← @erp/shared-types（与后端 Prisma enum 同值）
 *  - ApiResponse      ← @erp/shared-types
 *  - request          ← @/lib/utils/request
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  ApiResponse,
  CreateOrderDraftRequest,
  OrderStatusType,
  CreateQuickOrderRequest,
  OrderDraftDetail,
  PaginatedOrderDrafts,
  SubmitOrderDraftResponse,
  UpdateOrderDraftRequest,
} from "@erp/shared-types"
import request  from "@/lib/utils/request"
import { toast } from "@/lib/toast"

// ─── API 响应类型（对齐 Prisma output，非自创）────────────

export interface UserRef {
  id: number
  realName: string
  role: string
}

/** 对应 OrderItem + include: { part } 的形态 */
export interface OrderItemWithPart {
  id:          number
  orderId:     number
  partId:      number
  orderedQty:  number
  shippedQty:  number
  unitPrice:   string   // Prisma Decimal → JSON string
  part: {
    id:           number
    partNumber:   string
    name:         string
    material:     string
    spec?:        string
    commonPrices: Record<string, number>
  }
  productionTask?: {
    id: number
    status: string
    targetDate: string
    urgency?: string
    lastStatusUpdatedAt?: string | null
    lastStatusUpdatedBy?: UserRef | null
  }
}

/** 对应 Order + include: { items: true } 的形态（列表页） */
export interface OrderListItem {
  id:           number
  customerNo:   string  // 注：后端无 orderNo 字段，展示时用 id 生成
  customerName: string
  status:       OrderStatusType
  reason?:      string
  createdAt:    string
  responsibleUser?: UserRef | null
  createdBy?: UserRef | null
  /** 后端聚合总金额（兼容旧快照数据回退计算）。 */
  totalAmount?: number
  items: {
    id:         number
    orderId:    number
    partId:     number
    partName?:  string
    partNumber?: string
    orderedQty: number
    shippedQty: number
    unitPrice:  string
  }[]
}

/** 对应 Order + include: { items: { include: { part } }, deliveries } 的形态（详情页） */
export interface DeliveryNoteItem {
  /** 发货明细主键。 */
  id:             number
  /** 所属发货单 ID。 */
  deliveryNoteId: number
  /** 对应订单行 ID。 */
  orderItemId:    number
  /** 本次发货数量。 */
  shippedQty:     number
  /** 行备注。 */
  remark?:        string
}

export interface DeliveryNote {
  /** 发货单主键。 */
  id:           number
  /** 关联订单 ID。 */
  orderId:      number
  /** 发货时间。 */
  deliveryDate: string
  /** 发货单状态。 */
  status:       string
  /** 发货单备注。 */
  remark?:      string
  createdBy?:   UserRef | null
  /** 发货明细集合（列表接口可能不带）。 */
  items?:       DeliveryNoteItem[]
}

export interface OrderDetail {
  id:           number
  customerName: string
  status:       OrderStatusType
  reason?:      string
  createdAt:    string
  closedShortAt?: string | null
  responsibleUser?: UserRef | null
  createdBy?: UserRef | null
  closedShortBy?: UserRef | null
  items:        OrderItemWithPart[]
  deliveries:   DeliveryNote[]
}

export interface PaginatedOrders {
  total:    number
  data:     OrderListItem[]
  page:     number
  pageSize: number
}

// ─── Query keys ───────────────────────────────────────────
export const ORDERS_KEYS = {
  list:   (p: OrdersParams) => ["orders", p] as const,
  detail: (id: number)      => ["order",  id] as const,
}

export const ORDER_DRAFT_KEYS = {
  list:   (p: OrderDraftsParams) => ["order-drafts", p] as const,
  detail: (id: number)           => ["order-draft",  id] as const,
}

export interface OrdersParams {
  page?:         number
  pageSize?:     number
  status?:       OrderStatusType
  customerId?:   number
  customerName?: string
}

export interface OrderDraftsParams {
  page?: number
  pageSize?: number
  keyword?: string
}

export type OrderDraftItemInput = NonNullable<CreateOrderDraftRequest["items"]>[number]

export type OrderDraftUpsertPayload = Omit<CreateOrderDraftRequest, "items"> & {
  items?: OrderDraftItemInput[]
}

// ─── Hooks ────────────────────────────────────────────────

/** 分页列表（支持状态 + 客户名过滤） */
export function useGetOrders(params: OrdersParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ORDERS_KEYS.list(params),
    queryFn:  () =>
      request
        .get<unknown, ApiResponse<PaginatedOrders>>("/api/orders", { params })
        .then(res => res.data!),
    placeholderData: prev => prev,
    enabled: options?.enabled,
  })
}

/** 单条详情（含零件信息 + 发货记录） */
export function useGetOrder(id?: number) {
  return useQuery({
    queryKey: ORDERS_KEYS.detail(id!),
    queryFn:  () =>
      request
        .get<unknown, ApiResponse<OrderDetail>>(`/api/orders/${id}`)
        .then(res => res.data!),
    enabled: !!id,
  })
}

/** 创建订单（对齐 CreateOrderRequest：customerId + targetDate + items[{partId, orderedQty}]） */
export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      customerId: number
      responsibleUserId?: number
      targetDate: string
      items: { partId: number; orderedQty: number }[]
    }) =>
      request.post<unknown, ApiResponse<OrderListItem>>("/api/orders", payload),
    onSuccess: () => {
      toast.success("订单创建成功")
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ["production-tasks"] })
    },
    onError: (e: Error) => toast.error(`创建失败：${e.message}`),
  })
}

/** 创建快捷订单 */
export function useCreateQuickOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateQuickOrderRequest) =>
      request.post<unknown, ApiResponse<OrderListItem>>("/api/orders/quick", payload),
    onSuccess: () => {
      toast.success("快捷订单创建成功")
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ["parts"] })
      qc.invalidateQueries({ queryKey: ["production-tasks"] })
    },
    onError: (e: Error) => toast.error(`创建失败：${e.message}`),
  })
}

/** 短交结案（PATCH /api/orders/:id/close-short） */
export function useCloseShortOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      request.patch<unknown, ApiResponse<OrderListItem>>(
        `/api/orders/${id}/close-short`,
        { reason },
      ),
    onSuccess: (_, vars) => {
      toast.success("已短交结案")
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ORDERS_KEYS.detail(vars.id) })
    },
    onError: (e: Error) => toast.error(`操作失败：${e.message}`),
  })
}

export function useGetOrderDrafts(params: OrderDraftsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ORDER_DRAFT_KEYS.list(params),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<PaginatedOrderDrafts>>("/api/orders/drafts", { params })
        .then(res => res.data!),
    placeholderData: prev => prev,
    enabled: options?.enabled,
  })
}

export function useGetOrderDraft(id?: number) {
  return useQuery({
    queryKey: ORDER_DRAFT_KEYS.detail(id!),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<OrderDraftDetail>>(`/api/orders/drafts/${id}`)
        .then(res => res.data!),
    enabled: !!id,
  })
}

export function useCreateOrderDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: OrderDraftUpsertPayload) =>
      request.post<unknown, ApiResponse<OrderDraftDetail>>("/api/orders/drafts", payload),
    onSuccess: () => {
      toast.success("草稿已保存")
      qc.invalidateQueries({ queryKey: ["order-drafts"] })
    },
    onError: (e: Error) => toast.error(`保存失败：${e.message}`),
  })
}

export function useUpdateOrderDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateOrderDraftRequest }) =>
      request.patch<unknown, ApiResponse<OrderDraftDetail>>(`/api/orders/drafts/${id}`, payload),
    onSuccess: (_, vars) => {
      toast.success("草稿已保存")
      qc.invalidateQueries({ queryKey: ["order-drafts"] })
      qc.invalidateQueries({ queryKey: ORDER_DRAFT_KEYS.detail(vars.id) })
    },
    onError: (e: Error) => toast.error(`保存失败：${e.message}`),
  })
}

export function useDeleteOrderDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      request.delete<unknown, ApiResponse<{ ok: true }>>(`/api/orders/drafts/${id}`),
    onSuccess: () => {
      toast.success("草稿已删除")
      qc.invalidateQueries({ queryKey: ["order-drafts"] })
    },
    onError: (e: Error) => toast.error(`删除失败：${e.message}`),
  })
}

export function useSubmitOrderDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      request.post<unknown, ApiResponse<SubmitOrderDraftResponse>>(`/api/orders/drafts/${id}/submit`),
    onSuccess: (_, id) => {
      toast.success("已提交为订单")
      qc.invalidateQueries({ queryKey: ["order-drafts"] })
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ["production-tasks"] })
      qc.invalidateQueries({ queryKey: ORDER_DRAFT_KEYS.detail(id) })
    },
    onError: (e: Error) => toast.error(`提交失败：${e.message}`),
  })
}

// ─── 辅助：Prisma Decimal string → number ────────────────
export function decimalToNum(v: string | number): number {
  return typeof v === "string" ? parseFloat(v) : v
}

// ─── 辅助：用 id 生成显示用订单号（后端无 orderNo 字段）──
export function formatOrderNo(id: number): string {
  return `ORD-${String(id).padStart(6, "0")}`
}

// ─── 辅助：用 id 生成显示用发货单号 ───────────────────────
export function formatDeliveryNo(id: number): string {
  return `DLV-${String(id).padStart(6, "0")}`
}
