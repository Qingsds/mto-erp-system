// packages/shared-types/src/api.ts
import {
  IsString,
  IsInt,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsObject,
  IsIn,
  MinLength,
  MaxLength,
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

export type UserRoleType = "ADMIN" | "USER"

export interface AuthUserInfo {
  id: number
  username: string
  realName: string
  role: UserRoleType
  isActive: boolean
}

export interface AuthLoginResponse {
  accessToken: string
  user: AuthUserInfo
}

export class CreateUserRequest {
  @IsString({ message: "用户名必须是字符串" })
  @IsNotEmpty({ message: "用户名不能为空" })
  username!: string

  @IsString({ message: "姓名必须是字符串" })
  @IsNotEmpty({ message: "姓名不能为空" })
  realName!: string

  @IsIn(["ADMIN", "USER"], { message: "角色只能是 ADMIN 或 USER" })
  role!: UserRoleType

  @IsString({ message: "密码必须是字符串" })
  @IsNotEmpty({ message: "密码不能为空" })
  @MinLength(8, { message: "密码长度不能少于 8 位" })
  password!: string
}

export class UpdateUserRequest {
  @IsString({ message: "姓名必须是字符串" })
  @IsOptional()
  realName?: string

  @IsIn(["ADMIN", "USER"], { message: "角色只能是 ADMIN 或 USER" })
  @IsOptional()
  role?: UserRoleType

  @IsBoolean({ message: "账号状态必须是布尔值" })
  @IsOptional()
  isActive?: boolean

  @IsString({ message: "重置密码必须是字符串" })
  @MinLength(8, { message: "重置密码长度不能少于 8 位" })
  @IsOptional()
  password?: string
}

export type OrderStatusType =
  | "PENDING"
  | "PARTIAL_SHIPPED"
  | "SHIPPED"
  | "CLOSED_SHORT"
export type DeliveryStatusType = "SHIPPED"
export type BillingStatusType = "DRAFT" | "SEALED" | "PAID"
export type DocumentStatusType = "DRAFT" | "SIGNED"
export type DocumentSourceType = "BILLING" | "GENERIC_UPLOAD" | "LEGACY"
export type DocumentTargetType = "ORDER" | "DELIVERY" | "BILLING" | "DOCUMENT"

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
// 1.5 客户管理模块 (Customers)
// ==========================================
export class CreateCustomerRequest {
  @IsString({ message: "客户名称必须是字符串" })
  @IsNotEmpty({ message: "客户名称不能为空" })
  @MaxLength(100, { message: "客户名称长度不能超过 100 个字符" })
  name!: string

  @IsString({ message: "地址必须是字符串" })
  @IsOptional()
  @MaxLength(255, { message: "地址长度不能超过 255 个字符" })
  address?: string | null

  @IsString({ message: "联系人必须是字符串" })
  @IsOptional()
  @MaxLength(50, { message: "联系人长度不能超过 50 个字符" })
  contactName?: string | null

  @IsString({ message: "联系电话必须是字符串" })
  @IsOptional()
  @MaxLength(50, { message: "联系电话长度不能超过 50 个字符" })
  contactPhone?: string | null

  @IsString({ message: "开票信息必须是字符串" })
  @IsOptional()
  @MaxLength(500, { message: "开票信息长度不能超过 500 个字符" })
  invoiceInfo?: string | null
}

export class UpdateCustomerRequest {
  @IsString({ message: "客户名称必须是字符串" })
  @IsOptional()
  @MaxLength(100, { message: "客户名称长度不能超过 100 个字符" })
  name?: string

  @IsString({ message: "地址必须是字符串" })
  @IsOptional()
  @MaxLength(255, { message: "地址长度不能超过 255 个字符" })
  address?: string | null

  @IsString({ message: "联系人必须是字符串" })
  @IsOptional()
  @MaxLength(50, { message: "联系人长度不能超过 50 个字符" })
  contactName?: string | null

  @IsString({ message: "联系电话必须是字符串" })
  @IsOptional()
  @MaxLength(50, { message: "联系电话长度不能超过 50 个字符" })
  contactPhone?: string | null

  @IsString({ message: "开票信息必须是字符串" })
  @IsOptional()
  @MaxLength(500, { message: "开票信息长度不能超过 500 个字符" })
  invoiceInfo?: string | null
}

export class UpdateCustomerStatusRequest {
  @IsBoolean({ message: "启用状态必须是布尔值" })
  isActive!: boolean
}

export interface CustomerListItem {
  id: number
  name: string
  address?: string | null
  contactName?: string | null
  contactPhone?: string | null
  invoiceInfo?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PaginatedCustomers {
  total: number
  data: CustomerListItem[]
  page: number
  pageSize: number
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
  @IsInt({ message: "客户ID必须是整数" })
  @Min(1, { message: "客户ID不能小于1" })
  customerId!: number

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
  @IsInt({ message: "客户ID必须是整数" })
  @Min(1, { message: "客户ID不能小于1" })
  customerId!: number

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

  @IsString()
  @IsNotEmpty()
  originalFileKey!: string
}

export class DiscardSealUploadRequest {
  @IsString()
  @IsNotEmpty()
  fileKey!: string

  @IsString()
  @IsNotEmpty()
  originalFileKey!: string
}

export class UpdateSealStatusRequest {
  @IsBoolean({ message: "印章状态必须是布尔值" })
  isActive!: boolean
}

export class LoginRequest {
  @IsString({ message: "用户名必须是字符串" })
  @IsNotEmpty({ message: "用户名不能为空" })
  username!: string

  @IsString({ message: "密码必须是字符串" })
  @IsNotEmpty({ message: "密码不能为空" })
  password!: string
}

export class ChangePasswordRequest {
  @IsString({ message: "当前密码必须是字符串" })
  @IsNotEmpty({ message: "当前密码不能为空" })
  currentPassword!: string

  @IsString({ message: "新密码必须是字符串" })
  @IsNotEmpty({ message: "新密码不能为空" })
  @MinLength(8, { message: "新密码长度不能少于 8 位" })
  newPassword!: string
}

export class ExecuteSealRequest {
  @IsIn(["ORDER", "DELIVERY", "BILLING", "DOCUMENT"])
  targetType!: DocumentTargetType

  @IsInt()
  @Min(1)
  targetId!: number

  @IsInt()
  @Min(1)
  sealId!: number

  @IsInt()
  @Min(1)
  pageIndex!: number

  @IsNumber()
  @Min(0)
  @Max(1)
  xRatio!: number

  @IsNumber()
  @Min(0)
  @Max(1)
  yRatio!: number

  @IsNumber()
  @Min(0.01)
  @Max(1)
  widthRatio!: number
}
