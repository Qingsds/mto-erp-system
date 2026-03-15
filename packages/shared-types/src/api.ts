// packages/shared-types/src/api.ts
import {
  IsString,
  IsInt,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsObject,
  IsIn,
} from "class-validator"
import { Type } from "class-transformer"

// ==========================================
// 0. 全局通用响应与基础类型
// ==========================================
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

export type OrderStatusType =
  | "PENDING"
  | "PARTIAL_SHIPPED"
  | "SHIPPED"
  | "CLOSED_SHORT"
export type DeliveryStatusType = "SHIPPED"
export type BillingStatusType = "DRAFT" | "SEALED" | "PAID"
export type DocumentStatusType = "DRAFT" | "SIGNED"
export type DocumentTargetType = "ORDER" | "DELIVERY" | "BILLING"

// ==========================================
// 1. 零件与字典模块 (Parts)
// ==========================================
export class CreatePartRequest {
  @IsString({ message: "零件名称必须是字符串" })
  @IsNotEmpty({ message: "零件名称不能为空" })
  name!: string

  @IsString({ message: "材质必须是字符串" })
  @IsNotEmpty({ message: "材质不能为空" })
  material!: string

  @IsString()
  @IsOptional()
  spec?: string

  @IsObject({ message: "常用价格必须是对象结构" })
  commonPrices!: Record<string, number>
}

export class UpdatePartRequest {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  material?: string

  @IsString()
  @IsOptional()
  spec?: string

  @IsObject()
  @IsOptional()
  commonPrices?: Record<string, number>
}

// ==========================================
// 2. 订单管理模块 (Orders)
// ==========================================
export class OrderItemRequest {
  @IsInt({ message: "零件ID必须是整数" })
  @Min(1, { message: "零件ID不能小于1" })
  partId!: number

  @IsInt({ message: "订购数量必须是整数" })
  @Min(1, { message: "订购数量必须大于0" })
  orderedQty!: number
}

export class CreateOrderRequest {
  @IsString({ message: "客户名称必须是字符串" })
  @IsNotEmpty({ message: "客户名称不能为空" })
  customerName!: string

  @IsArray({ message: "订单明细必须是数组" })
  @ValidateNested({ each: true })
  @Type(() => OrderItemRequest)
  items!: OrderItemRequest[]
}

export class CloseShortOrderRequest {
  @IsString()
  @IsOptional()
  reason?: string
}

// ==========================================
// 3. 发货管理模块 (Deliveries)
// ==========================================
export class DeliveryItemRequest {
  @IsInt()
  @Min(1)
  orderItemId!: number

  @IsInt({ message: "发货数量必须是整数" })
  @Min(1, { message: "发货数量必须大于0" })
  quantity!: number

  @IsString()
  @IsOptional()
  remark?: string
}

export class CreateDeliveryRequest {
  @IsInt()
  @Min(1)
  orderId!: number

  @IsString()
  @IsOptional()
  remark?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryItemRequest)
  items!: DeliveryItemRequest[]
}

// ==========================================
// 4. 财务对账模块 (Billing)
// ==========================================
export class ExtraBillingItemRequest {
  @IsString()
  @IsNotEmpty()
  desc!: string

  @IsNumber()
  amount!: number
}

export class CreateBillingRequest {
  @IsString()
  @IsNotEmpty()
  customerName!: string

  @IsArray()
  @IsInt({ each: true })
  deliveryItemIds!: number[]

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExtraBillingItemRequest)
  extraItems?: ExtraBillingItemRequest[]
}

export class UpdateBillingStatusRequest {
  @IsIn(["DRAFT", "SEALED", "PAID"], {
    message: "状态只能是 DRAFT, SEALED, PAID 之一",
  })
  status!: BillingStatusType
}

// ==========================================
// 5. 印章与归档模块 (Documents & Seals)
// ==========================================
export class CreateSealRequest {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  fileKey!: string
}

export class ExecuteSealRequest {
  @IsIn(["ORDER", "DELIVERY", "BILLING"])
  targetType!: DocumentTargetType

  @IsInt()
  @Min(1)
  targetId!: number

  @IsInt()
  @Min(1)
  sealId!: number

  @IsInt()
  @Min(1)
  userId!: number
}
