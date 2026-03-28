/**
 * hooks/api/useDeliveries.ts
 *
 * 职责：
 * - 发货单模块 API 类型定义 + TanStack Query hooks
 * - 对齐后端 deliveries.controller/service 的返回结构
 */

import { useQuery } from "@tanstack/react-query"
import type { ApiResponse } from "@erp/shared-types"
import request from "@/lib/utils/request"

/**
 * 发货单列表行（对应 DeliveryNote）。
 */
export interface DeliveryListItem {
  /** 发货单主键。 */
  id: number
  /** 关联订单主键。 */
  orderId: number
  /** 发货时间。 */
  deliveryDate: string
  /** 发货状态。 */
  status: string
  /** 发货单备注。 */
  remark?: string | null
  /** 后端聚合总金额。 */
  totalAmount?: number
  /** 关联订单信息（用于列表展示公司与订单创建时间）。 */
  order?: {
    /** 订单主键。 */
    id: number
    /** 客户公司名称。 */
    customerName: string
    /** 订单创建时间。 */
    createdAt: string
  }
}

/**
 * 发货单分页响应。
 */
export interface PaginatedDeliveries {
  /** 总记录数。 */
  total: number
  /** 当前页数据。 */
  data: DeliveryListItem[]
  /** 当前页码。 */
  page: number
  /** 每页大小。 */
  pageSize: number
}

/**
 * 发货单详情中的明细行（对应 DeliveryItem + include orderItem.part）。
 */
export interface DeliveryDetailItem {
  /** 发货明细主键。 */
  id: number
  /** 所属发货单 ID。 */
  deliveryNoteId: number
  /** 对应订单行 ID。 */
  orderItemId: number
  /** 本次发货数量。 */
  shippedQty: number
  /** 明细备注。 */
  remark?: string | null
  /** 关联计费条目（存在则表示已被计入对账单）。 */
  billingItem?: { id: number; billingId: number } | null
  /** 关联订单行（含零件信息）。 */
  orderItem: {
    /** 订单行主键。 */
    id: number
    /** 所属订单 ID。 */
    orderId: number
    /** 零件 ID。 */
    partId: number
    /** 订单锁定单价（Decimal 字符串）。 */
    unitPrice: string
    /** 订单需求数量。 */
    orderedQty: number
    /** 当前累计已发数量。 */
    shippedQty: number
    /** 关联零件实体。 */
    part: {
      /** 零件主键。 */
      id: number
      /** 零件编码。 */
      partNumber: string
      /** 零件名称。 */
      name: string
      /** 材质。 */
      material: string
      /** 规格。 */
      spec?: string | null
      /** 常用价格字典。 */
      commonPrices: Record<string, number>
    }
  }
}

/**
 * 发货单详情（对应 DeliveryNote + include items.orderItem.part）。
 */
export interface DeliveryDetail {
  /** 发货单主键。 */
  id: number
  /** 关联订单主键。 */
  orderId: number
  /** 发货时间。 */
  deliveryDate: string
  /** 发货状态。 */
  status: string
  /** 发货单备注。 */
  remark?: string | null
  /** 关联订单基础信息。 */
  order?: {
    /** 订单主键。 */
    id: number
    /** 客户公司名称。 */
    customerName: string
    /** 订单创建时间。 */
    createdAt: string
  }
  /** 发货明细。 */
  items: DeliveryDetailItem[]
}

/**
 * 发货单列表查询参数。
 */
export interface DeliveriesParams {
  /** 页码。 */
  page?: number
  /** 每页大小。 */
  pageSize?: number
  /** 订单 ID 过滤。 */
  orderId?: number
  /** 客户公司名称过滤。 */
  customerName?: string
  /** 发货日期起始（YYYY-MM-DD）。 */
  deliveryDateStart?: string
  /** 发货日期结束（YYYY-MM-DD）。 */
  deliveryDateEnd?: string
  /** 是否仅包含备注。 */
  hasRemark?: boolean
}

/** Query key 定义。 */
export const DELIVERIES_KEYS = {
  list: (p: DeliveriesParams) => ["deliveries", p] as const,
  detail: (id: number) => ["delivery", id] as const,
}

/**
 * 查询发货单分页列表。
 */
export function useGetDeliveries(params: DeliveriesParams) {
  return useQuery({
    queryKey: DELIVERIES_KEYS.list(params),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<PaginatedDeliveries>>("/api/deliveries", {
          params,
        })
        .then(res => res.data!),
    placeholderData: prev => prev,
  })
}

/**
 * 查询单张发货单详情。
 */
export function useGetDelivery(id?: number) {
  return useQuery({
    queryKey: DELIVERIES_KEYS.detail(id!),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<DeliveryDetail>>(`/api/deliveries/${id}`)
        .then(res => res.data!),
    enabled: !!id,
  })
}

/**
 * Decimal string 转 number。
 */
export function decimalToNum(value: string | number): number {
  return typeof value === "string" ? parseFloat(value) : value
}
