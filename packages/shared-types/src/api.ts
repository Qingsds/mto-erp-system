// packages/shared-types/src/api.ts

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// 创建订单时的请求体结构 (Data Transfer Object)
export interface CreateOrderRequest {
  customerName: string // 客户名称
  items: Array<{
    partId: number // 购买的零件 ID
    orderedQty: number // 下单数量
  }>
}

// 创建零件时的请求体结构
export interface CreatePartRequest {
  partNumber: string;
  name: string;
  material: string;
  commonPrices: Record<string, number>;
}