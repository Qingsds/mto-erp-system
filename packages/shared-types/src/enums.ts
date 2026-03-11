// packages/shared-types/src/enums.ts

// 订单状态
export enum OrderStatus {
  PENDING = 'PENDING',                     // 待履约
  PARTIAL_DELIVERED = 'PARTIAL_DELIVERED', // 部分发货
  DELIVERED = 'DELIVERED',                 // 全部发货
  CLOSED_SHORT = 'CLOSED_SHORT',           // 短交结案 (报废不补)
}

// 发货单状态
export enum DeliveryStatus {
  SHIPPED = 'SHIPPED', // 已发货
  BILLED = 'BILLED',   // 已核算对账
}

// 费用清单/对账单状态
export enum BillingStatus {
  DRAFT = 'DRAFT',   // 草稿
  SEALED = 'SEALED', // 已盖章防篡改
  PAID = 'PAID',     // 已付款
}

// 归档文档目标类型
export enum DocumentTargetType {
  ORDER = 'ORDER',
  DELIVERY = 'DELIVERY',
  BILLING = 'BILLING',
}

// 图纸文件类型
export enum FileType {
  IMAGE = 'IMAGE',
  PDF = 'PDF',
}