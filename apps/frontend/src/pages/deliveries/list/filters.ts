/**
 * 发货列表筛选模型。
 *
 * 统一抽出桌面端和移动端共用的筛选类型与默认值，
 * 避免两套列表实现各维护一份。
 */

export type DeliveryStatusFilter = "all" | "SHIPPED"
export type RemarkFilter = "all" | "yes" | "no"

export interface DeliveryFilters {
  /** 关键字（本页前端过滤）。 */
  keyword: string
  /** 订单 ID（后端过滤）。 */
  orderId: string
  /** 客户名称（后端过滤）。 */
  customerName: string
  /** 发货日期起始（后端过滤）。 */
  deliveryDateStart: string
  /** 发货日期结束（后端过滤）。 */
  deliveryDateEnd: string
  /** 是否有备注（后端过滤）。 */
  hasRemark: RemarkFilter
  /** 状态（前端过滤）。 */
  status: DeliveryStatusFilter
}

export const DEFAULT_DELIVERY_FILTERS: DeliveryFilters = {
  keyword: "",
  orderId: "",
  customerName: "",
  deliveryDateStart: "",
  deliveryDateEnd: "",
  hasRemark: "all",
  status: "all",
}
