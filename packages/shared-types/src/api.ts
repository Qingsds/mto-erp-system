// packages/shared-types/src/api.ts

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// packages/shared-types/src/api.ts

// ==========================================
// 0. 全局通用响应与基础类型
// ==========================================

/** * 全局标准 API 响应结构
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

/** * 为了避免前后端 Enum 编译引发的 Prisma Nominal Typing 冲突，
 * 所有的状态枚举在共享层一律降级为字符串字面量联合类型 (String Literal Union)。
 */
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

export interface CreatePartRequest {
  /** 零件业务名称 */
  name: string
  /** 生产所需的物理材质 (如: 304不锈钢) */
  material: string
  /** 详细规格或型号说明 (可选) */
  spec?: string
  /** 常用价格配置字典 (如: {"标准价": 450.00, "大客户价": 420.00}) */
  commonPrices: Record<string, number>
}

// packages/shared-types/src/api.ts
// ... 在 CreatePartRequest 下方新增：

export interface UpdatePartRequest {
  name?: string
  material?: string
  spec?: string
  commonPrices?: Record<string, number>
}

// ==========================================
// 2. 订单管理模块 (Orders)
// ==========================================

export interface OrderItemRequest {
  /** 关联的底层零件 ID */
  partId: number
  /** 客户合同上要求的初始采购总数量 */
  orderedQty: number
}

export interface CreateOrderRequest {
  /** 交易客户或采购方公司名称 */
  customerName: string
  /** 订单包含的零件明细列表 */
  items: OrderItemRequest[]
}

export interface CloseShortOrderRequest {
  /** 短交结案的具体原因备注 (如: "生产报废不再补发") */
  reason?: string
}

// ==========================================
// 3. 发货管理模块 (Deliveries)
// ==========================================

export interface DeliveryItemRequest {
  /** 精确对应到订单中的具体明细行 (OrderItem ID) */
  orderItemId: number
  /** 本次针对该行明细实际打包发货的数量 */
  quantity: number
  /** 行异常备注 (如: "划痕报废1件，少发") */
  remark?: string
}

export interface CreateDeliveryRequest {
  /** 本次发货所关联的原始订单 ID */
  orderId: number
  /** 针对整个发货批次的物流信息或异常备注 */
  remark?: string
  /** 本次实际出库的发货明细列表 */
  items: DeliveryItemRequest[]
}

// ==========================================
// 4. 财务对账模块 (Billing)
// ==========================================

export interface ExtraBillingItemRequest {
  /** 额外费用的文字描述 (如: "加急专车费") */
  desc: string
  /** 额外费用的具体金额 */
  amount: number
}

export interface CreateBillingRequest {
  /** 结算方客户名称 */
  customerName: string
  /** 传入需要合并结算的实际发货明细 ID 数组 */
  deliveryItemIds: number[]
  /** 额外的手动计费项（可选） */
  extraItems?: ExtraBillingItemRequest[]
}

export interface UpdateBillingStatusRequest {
  /** 目标更新状态 */
  status: BillingStatusType
}

// ==========================================
// 5. 印章与归档模块 (Documents & Seals)
// ==========================================

export interface CreateSealRequest {
  /** 公司印章名称 (如: 财务专用章) */
  name: string
  /** 印章透明底图文件在存储系统中的路径键值 */
  fileKey: string
}

export interface ExecuteSealRequest {
  /** 目标单据类型 */
  targetType: DocumentTargetType
  /** 目标单据的主键 ID */
  targetId: number
  /** 所调用的印章 ID */
  sealId: number
  /** 当前执行盖章操作的用户 ID (用于审计日志) */
  userId: number
}
