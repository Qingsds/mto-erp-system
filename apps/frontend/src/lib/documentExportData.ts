/**
 * documentExportData.ts
 *
 * 职责：
 * - 将订单/发货原始数据转换为可导出的二维表（含表头、明细、汇总）
 * - 提供“完整导出数据”与“轻量预览数据”两种输出，避免预览触发重依赖
 * - 统一导出配置项（字段显隐、日期格式）与金额/日期/短交结算规则
 */

import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import type { OrderDetail } from "@/hooks/api/useOrders"
import {
  decimalToNum,
  formatDeliveryNo,
  formatOrderNo,
} from "@/hooks/api/useOrders"

type CellValue = string | number
export type RowData = CellValue[]

type OrderPriceDetailRow = [string, number, number, number, string]
type DeliveryDetailRow = [string, string, number, string]

export type ExportDateFormat =
  | "YYYY-MM-DD"
  | "YYYY/MM/DD"
  | "YYYY年MM月DD日"

export interface ExportSheetOptions {
  showStatus?: boolean
  showRemarks?: boolean
  showCustomer?: boolean
  showOrderNo?: boolean
  showPreparedAt?: boolean
  dateFormat?: ExportDateFormat
}

export interface ExportPreviewData {
  title: string
  filename: string
  meta: string[]
  headers: string[]
  rows: RowData[]
  totalRows: number
  summary: RowData
}

export interface SheetPayload {
  sheetName: string
  filename: string
  rows: RowData[]
  minColWidths: number[]
  contentStartRow: number
  preview: ExportPreviewData
}

export const DEFAULT_EXPORT_OPTIONS: Required<ExportSheetOptions> = {
  showStatus: true,
  showRemarks: true,
  showCustomer: true,
  showOrderNo: true,
  showPreparedAt: true,
  dateFormat: "YYYY-MM-DD",
}

const PREVIEW_ROW_LIMIT = 8

/** 合并用户配置与默认配置，避免下游判断 undefined。 */
function resolveExportOptions(
  options?: ExportSheetOptions,
): Required<ExportSheetOptions> {
  return {
    showStatus: options?.showStatus ?? DEFAULT_EXPORT_OPTIONS.showStatus,
    showRemarks: options?.showRemarks ?? DEFAULT_EXPORT_OPTIONS.showRemarks,
    showCustomer: options?.showCustomer ?? DEFAULT_EXPORT_OPTIONS.showCustomer,
    showOrderNo: options?.showOrderNo ?? DEFAULT_EXPORT_OPTIONS.showOrderNo,
    showPreparedAt:
      options?.showPreparedAt ?? DEFAULT_EXPORT_OPTIONS.showPreparedAt,
    dateFormat: options?.dateFormat ?? DEFAULT_EXPORT_OPTIONS.dateFormat,
  }
}

/** 从字符串中提取 YYYY/MM/DD 的稳定日期片段。 */
function normalizeDateParts(value: string): [string, string, string] {
  const sliced = value.slice(0, 10)
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sliced)
  if (matched) {
    return [matched[1], matched[2], matched[3]]
  }

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return [
      String(parsed.getFullYear()),
      String(parsed.getMonth() + 1).padStart(2, "0"),
      String(parsed.getDate()).padStart(2, "0"),
    ]
  }

  return ["0000", "00", "00"]
}

/** 以导出配置格式化日期，不引入时间，防止时区偏移。 */
function formatDateByPattern(
  year: string,
  month: string,
  day: string,
  pattern: ExportDateFormat,
): string {
  if (pattern === "YYYY/MM/DD") {
    return `${year}/${month}/${day}`
  }
  if (pattern === "YYYY年MM月DD日") {
    return `${year}年${month}月${day}日`
  }
  return `${year}-${month}-${day}`
}

function formatDateOnly(
  value: string,
  pattern: ExportDateFormat,
): string {
  const [year, month, day] = normalizeDateParts(value)
  return formatDateByPattern(year, month, day, pattern)
}

function formatToday(pattern: ExportDateFormat): string {
  const now = new Date()
  return formatDateByPattern(
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    pattern,
  )
}

function formatMoney(value: number): number {
  return Number(value.toFixed(2))
}

/**
 * 结算单价优先级：
 * 1) 订单快照单价（下单时锁定）
 * 2) 零件“标准价”
 * 3) 零件价格字典中的任意有效值
 */
function resolveUnitPrice(
  unitPrice: string,
  commonPrices: Record<string, number>,
): number {
  const snapshotPrice = decimalToNum(unitPrice)
  if (snapshotPrice > 0) {
    return snapshotPrice
  }

  const standardPrice = commonPrices["标准价"]
  if (typeof standardPrice === "number" && Number.isFinite(standardPrice)) {
    return standardPrice
  }

  for (const value of Object.values(commonPrices)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
  }

  return snapshotPrice
}

function filterPreviewMeta(row: RowData): string[] {
  return row.map(cell => String(cell).trim()).filter(Boolean)
}

/**
 * 结算数量规则：
 * - 正常订单：按下单数量结算
 * - 短交结案：按已发数量结算，但限制在 [0, orderedQty] 区间
 */
export function resolveSettlementQty(
  orderedQty: number,
  shippedQty: number,
  isClosedShort: boolean,
): number {
  if (!isClosedShort) return orderedQty
  return Math.max(Math.min(shippedQty, orderedQty), 0)
}

export function buildOrderPriceDetailRows(
  order: OrderDetail,
): OrderPriceDetailRow[] {
  const isClosedShort = order.status === "CLOSED_SHORT"

  return order.items.map(item => {
    const unitPrice = resolveUnitPrice(item.unitPrice, item.part.commonPrices)
    // shortQty 表示“下单但未发出的缺口数量”，用于短交废件提示。
    const shortQty = Math.max(item.orderedQty - item.shippedQty, 0)
    const settlementQty = resolveSettlementQty(
      item.orderedQty,
      item.shippedQty,
      isClosedShort,
    )

    const remarks: string[] = []
    if (isClosedShort && shortQty > 0) {
      remarks.push(`短交废件 ${shortQty} 件（原下单 ${item.orderedQty} 件）`)
    }

    return [
      item.part.name,
      settlementQty,
      formatMoney(unitPrice),
      formatMoney(settlementQty * unitPrice),
      remarks.join("；") || "—",
    ]
  })
}

export function buildDeliveryDetailRows(
  delivery: DeliveryDetail,
): DeliveryDetailRow[] {
  const hasScrapInNote = /废件|短交|报废/.test(delivery.remark ?? "")

  return delivery.items.map(item => {
    const lineRemark = item.remark?.trim() ?? ""
    const remark = lineRemark || (hasScrapInNote ? "含废件（见整单备注）" : "—")
    return [
      item.orderItem.part.name,
      item.orderItem.part.material,
      item.shippedQty,
      remark,
    ]
  })
}

function buildOrderMetaRow(
  order: OrderDetail,
  options: Required<ExportSheetOptions>,
  orderDate: string,
  today: string,
): RowData {
  const fields: string[] = []

  if (options.showOrderNo) {
    fields.push(`订单号：${formatOrderNo(order.id)}`)
  }
  if (options.showCustomer) {
    fields.push(`客户：${order.customerName}`)
  }
  if (options.showStatus) {
    fields.push(`状态：${order.status}`)
  }

  fields.push(`日期：${orderDate}`)

  if (options.showPreparedAt) {
    fields.push(`制表日期：${today}`)
  }

  return fields
}

export function buildOrderSheetPayload(
  order: OrderDetail,
  options?: ExportSheetOptions,
): SheetPayload {
  const resolved = resolveExportOptions(options)
  const today = formatToday(resolved.dateFormat)
  const orderDate = formatDateOnly(order.createdAt, resolved.dateFormat)
  const isClosedShort = order.status === "CLOSED_SHORT"

  const rowsWithRemarks = buildOrderPriceDetailRows(order)
  const detailRows: RowData[] = resolved.showRemarks
    ? rowsWithRemarks.map(row => [...row])
    : rowsWithRemarks.map(([partName, qty, unitPrice, total]) => [
        partName,
        qty,
        unitPrice,
        total,
      ])

  const headers = resolved.showRemarks
    ? ["零件", "数量", "价格", "合计", "备注"]
    : ["零件", "数量", "价格", "合计"]

  const totalQty = rowsWithRemarks.reduce((sum, row) => sum + Number(row[1]), 0)
  const totalAmount = rowsWithRemarks.reduce((sum, row) => sum + Number(row[3]), 0)
  const totalShortQty = isClosedShort
    ? order.items.reduce(
        (sum, item) => sum + Math.max(item.orderedQty - item.shippedQty, 0),
        0,
      )
    : 0

  // 汇总备注仅承载“短交业务语义”，避免把日期等元信息塞入表尾。
  const footerRemark = [
    isClosedShort && totalShortQty > 0
      ? `废件合计：${totalShortQty} 件（已扣款）`
      : "",
    isClosedShort && order.reason ? `短交原因：${order.reason}` : "",
  ]
    .filter(Boolean)
    .join("；")

  const summary: RowData = resolved.showRemarks
    ? ["汇总", totalQty, "", formatMoney(totalAmount), footerRemark || "—"]
    : ["汇总", totalQty, "", formatMoney(totalAmount)]

  const metaRow = buildOrderMetaRow(order, resolved, orderDate, today)

  const rows: RowData[] = [
    ["濮阳市瑞海隆鑫设备制造有限公司"],
    ["价格清单"],
    metaRow,
    headers,
    ...detailRows,
    summary,
  ]

  const filename = `${formatOrderNo(order.id)}-价格清单-${today}.xlsx`

  return {
    sheetName: "价格清单",
    filename,
    rows,
    minColWidths: resolved.showRemarks
      ? [20, 12, 12, 14, 24]
      : [20, 12, 12, 16],
    contentStartRow: 3,
    preview: {
      title: "价格清单",
      filename,
      meta: filterPreviewMeta(metaRow),
      headers,
      rows: detailRows,
      totalRows: detailRows.length,
      summary,
    },
  }
}

function buildDeliveryMetaRow(
  delivery: DeliveryDetail,
  options: Required<ExportSheetOptions>,
  deliveryDate: string,
  today: string,
): RowData {
  const customerName = delivery.order?.customerName || "-"
  const fields: string[] = []

  fields.push(`发货单号：${formatDeliveryNo(delivery.id)}`)

  if (options.showOrderNo) {
    fields.push(`关联订单：${formatOrderNo(delivery.orderId)}`)
  }
  if (options.showCustomer) {
    fields.push(`客户：${customerName}`)
  }
  if (options.showStatus) {
    fields.push(`状态：${delivery.status}`)
  }

  fields.push(`发货日期：${deliveryDate}`)

  if (options.showPreparedAt) {
    fields.push(`制表日期：${today}`)
  }

  return fields
}

export function buildDeliverySheetPayload(
  delivery: DeliveryDetail,
  options?: ExportSheetOptions,
): SheetPayload {
  const resolved = resolveExportOptions(options)
  const today = formatToday(resolved.dateFormat)
  const deliveryDate = formatDateOnly(delivery.deliveryDate, resolved.dateFormat)

  const rowsWithRemarks = buildDeliveryDetailRows(delivery)
  const detailRows: RowData[] = resolved.showRemarks
    ? rowsWithRemarks.map(row => [...row])
    : rowsWithRemarks.map(([partName, material, shippedQty]) => [
        partName,
        material,
        shippedQty,
      ])

  const headers = resolved.showRemarks
    ? ["零件", "材质", "数量", "备注"]
    : ["零件", "材质", "数量"]

  const totalQty = delivery.items.reduce((sum, item) => sum + item.shippedQty, 0)
  // 发货单汇总行只保留数量汇总，不附加日期等元字段。
  const summary: RowData = resolved.showRemarks
    ? ["汇总", "", totalQty, ""]
    : ["汇总", "", totalQty]

  const metaRow = buildDeliveryMetaRow(delivery, resolved, deliveryDate, today)

  const rows: RowData[] = [
    ["濮阳市瑞海隆鑫设备制造有限公司"],
    ["发货单"],
    metaRow,
    headers,
    ...detailRows,
    summary,
  ]

  const filename = `${formatDeliveryNo(delivery.id)}-发货单-${today}.xlsx`

  return {
    sheetName: "发货单",
    filename,
    rows,
    minColWidths: resolved.showRemarks
      ? [18, 12, 10, 20]
      : [20, 14, 16],
    contentStartRow: 3,
    preview: {
      title: "发货单",
      filename,
      meta: filterPreviewMeta(metaRow),
      headers,
      rows: detailRows,
      totalRows: detailRows.length,
      summary,
    },
  }
}

export function getOrderExportPreview(
  order: OrderDetail,
  options?: ExportSheetOptions,
): ExportPreviewData {
  const resolved = resolveExportOptions(options)
  const today = formatToday(resolved.dateFormat)
  const orderDate = formatDateOnly(order.createdAt, resolved.dateFormat)
  const isClosedShort = order.status === "CLOSED_SHORT"
  const headers = resolved.showRemarks
    ? ["零件", "数量", "价格", "合计", "备注"]
    : ["零件", "数量", "价格", "合计"]

  const previewRows: RowData[] = []
  let totalQty = 0
  let totalAmount = 0
  let totalShortQty = 0

  // 单次遍历同时完成“前 PREVIEW_ROW_LIMIT 条预览 + 全量汇总”。
  for (let index = 0; index < order.items.length; index += 1) {
    const item = order.items[index]
    const unitPrice = resolveUnitPrice(item.unitPrice, item.part.commonPrices)
    const shortQty = Math.max(item.orderedQty - item.shippedQty, 0)
    const settlementQty = resolveSettlementQty(
      item.orderedQty,
      item.shippedQty,
      isClosedShort,
    )
    const lineAmount = formatMoney(settlementQty * unitPrice)
    const lineRemark =
      isClosedShort && shortQty > 0
        ? `短交废件 ${shortQty} 件（原下单 ${item.orderedQty} 件）`
        : "—"

    totalQty += settlementQty
    totalAmount += lineAmount
    totalShortQty += shortQty

    if (index < PREVIEW_ROW_LIMIT) {
      previewRows.push(
        resolved.showRemarks
          ? [item.part.name, settlementQty, formatMoney(unitPrice), lineAmount, lineRemark]
          : [item.part.name, settlementQty, formatMoney(unitPrice), lineAmount],
      )
    }
  }

  const footerRemark = [
    isClosedShort && totalShortQty > 0
      ? `废件合计：${totalShortQty} 件（已扣款）`
      : "",
    isClosedShort && order.reason ? `短交原因：${order.reason}` : "",
  ]
    .filter(Boolean)
    .join("；")

  const summary: RowData = resolved.showRemarks
    ? ["汇总", totalQty, "", formatMoney(totalAmount), footerRemark || "—"]
    : ["汇总", totalQty, "", formatMoney(totalAmount)]

  const metaRow = buildOrderMetaRow(order, resolved, orderDate, today)
  const filename = `${formatOrderNo(order.id)}-价格清单-${today}.xlsx`

  return {
    title: "价格清单",
    filename,
    meta: filterPreviewMeta(metaRow),
    headers,
    rows: previewRows,
    totalRows: order.items.length,
    summary,
  }
}

export function getDeliveryExportPreview(
  delivery: DeliveryDetail,
  options?: ExportSheetOptions,
): ExportPreviewData {
  const resolved = resolveExportOptions(options)
  const today = formatToday(resolved.dateFormat)
  const deliveryDate = formatDateOnly(delivery.deliveryDate, resolved.dateFormat)
  const headers = resolved.showRemarks
    ? ["零件", "材质", "数量", "备注"]
    : ["零件", "材质", "数量"]
  const hasScrapInNote = /废件|短交|报废/.test(delivery.remark ?? "")
  const previewRows: RowData[] = []
  let totalQty = 0

  // 预览只截前 PREVIEW_ROW_LIMIT 行，汇总仍按全量明细计算。
  for (let index = 0; index < delivery.items.length; index += 1) {
    const item = delivery.items[index]
    totalQty += item.shippedQty

    if (index < PREVIEW_ROW_LIMIT) {
      const lineRemark = item.remark?.trim() ?? ""
      const remark = lineRemark || (hasScrapInNote ? "含废件（见整单备注）" : "—")
      previewRows.push(
        resolved.showRemarks
          ? [
              item.orderItem.part.name,
              item.orderItem.part.material,
              item.shippedQty,
              remark,
            ]
          : [item.orderItem.part.name, item.orderItem.part.material, item.shippedQty],
      )
    }
  }

  const summary: RowData = resolved.showRemarks
    ? ["汇总", "", totalQty, ""]
    : ["汇总", "", totalQty]
  const metaRow = buildDeliveryMetaRow(delivery, resolved, deliveryDate, today)
  const filename = `${formatDeliveryNo(delivery.id)}-发货单-${today}.xlsx`

  return {
    title: "发货单",
    filename,
    meta: filterPreviewMeta(metaRow),
    headers,
    rows: previewRows,
    totalRows: delivery.items.length,
    summary,
  }
}
