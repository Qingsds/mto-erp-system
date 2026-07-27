/**
 * documentExportData.ts
 *
 * 职责：
 * - 将订单/发货原始数据转换为可导出的二维表（含表头、明细、汇总）
 * - 提供“完整导出数据”与“轻量预览数据”两种输出，避免预览触发重依赖
 * - 统一导出配置项（字段显隐、日期格式）与金额/日期/短交结算规则
 */

import type { BillingDetail } from "@/hooks/api/useBilling"
import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import type { OrderDetail } from "@/hooks/api/useOrders"
import type { MergedOrderDetail, OrderDraftDetail } from "@erp/shared-types"
import { formatBillingNo } from "@/hooks/api/useBilling"
import {
  formatDeliveryNo,
  formatOrderNo,
} from "@/hooks/api/useOrders"
import { resolveSettlementQty, resolveUnitPrice } from "@/domain/orders/pricing"

type CellValue = string | number
export type RowData = CellValue[]

type BillingDetailRow = [string, string, string, number, string]
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
  printTargetWidthWch?: number
  printHorizontallyCentered?: boolean
  printOrientation?: "portrait" | "landscape"
  detailRowHeight?: number
  preview: ExportPreviewData
}

export interface WorkbookPayload {
  filename: string
  sheets: SheetPayload[]
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

function filterPreviewMeta(row: RowData): string[] {
  return row.map(cell => String(cell).trim()).filter(Boolean)
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

export function buildBillingDetailRows(
  billing: BillingDetail,
  dateFormat: ExportDateFormat = DEFAULT_EXPORT_OPTIONS.dateFormat,
): BillingDetailRow[] {
  return billing.items.map(item => {
    if (!item.deliveryItem) {
      return [
        item.description?.trim() || "附加费用",
        "手动附加",
        "—",
        formatMoney(decimalToNum(item.amount)),
        item.description?.trim() || "未填写说明",
      ]
    }

    const delivery = item.deliveryItem.deliveryNote
    const orderItem = item.deliveryItem.orderItem
    const part = orderItem.part
    const note = [
      `${part.partNumber}`,
      `${item.deliveryItem.shippedQty} 件`,
      item.deliveryItem.remark?.trim() || item.description?.trim() || "—",
    ].join(" / ")

    return [
      part.name,
      `DLV-${String(delivery.id).padStart(6, "0")}`,
      note,
      formatMoney(decimalToNum(item.amount)),
      formatDateOnly(delivery.deliveryDate, dateFormat),
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
    printTargetWidthWch: 88,
    printHorizontallyCentered: true,
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

function buildBillingMetaRow(
  billing: BillingDetail,
  options: Required<ExportSheetOptions>,
  billingDate: string,
  today: string,
): RowData {
  const fields: string[] = []

  fields.push(`对账单号：${formatBillingNo(billing.id)}`)
  if (options.showCustomer) {
    fields.push(`客户：${billing.customerName}`)
  }
  if (options.showStatus) {
    fields.push(`状态：${billing.status}`)
  }

  fields.push(`对账日期：${billingDate}`)

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
    // 这里是“列宽放大目标”而不是物理 A4 宽度；少列表会先放大，再由 fitToWidth=1 压回一页宽。
    printTargetWidthWch: 96,
    printHorizontallyCentered: true,
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

export function buildBillingSheetPayload(
  billing: BillingDetail,
  options?: ExportSheetOptions,
): WorkbookPayload {
  const resolved = resolveExportOptions(options)
  const today = formatToday(resolved.dateFormat)
  const billingDate = formatDateOnly(billing.createdAt, resolved.dateFormat)
  const filename = `${formatBillingNo(billing.id)}-对账单-${today}.xlsx`
  const metaRow = buildBillingMetaRow(billing, resolved, billingDate, today)
  const orderGroups = buildBillingOrderGroups(billing, resolved.dateFormat)
  const totalAmount = orderGroups.reduce((sum, group) => sum + group.amount, 0)
  const summaryHeaders = ["订单号", "日期", "应收金额（元）"]
  const summaryRows: RowData[] = orderGroups.map(group => [
    formatOrderNo(group.orderId),
    group.dateRange,
    formatMoney(group.amount),
  ])
  const summary: RowData = ["合计", "", formatMoney(totalAmount)]

  const summarySheet: SheetPayload = {
    sheetName: "对账单",
    filename,
    rows: [
      ["濮阳市瑞海隆鑫设备制造有限公司"],
      ["对账单"],
      metaRow,
      summaryHeaders,
      ...summaryRows,
      summary,
    ],
    minColWidths: [24, 24, 18],
    contentStartRow: 3,
    printTargetWidthWch: 74,
    printHorizontallyCentered: true,
    preview: {
      title: "对账单",
      filename,
      meta: filterPreviewMeta(metaRow),
      headers: summaryHeaders,
      rows: summaryRows,
      totalRows: summaryRows.length,
      summary,
    },
  }

  const detailSheets = orderGroups.map(group => {
    const headers = ["日期", "名称", "单位", "数量", "单价（元）", "总价（元）"]
    const detailRows: RowData[] = group.rows.map(row => [
      row.date,
      row.name,
      row.unit,
      row.quantity,
      formatMoney(row.unitPrice),
      formatMoney(row.amount),
    ])
    const totalQty = group.rows.reduce((sum, row) => sum + row.quantity, 0)
    const detailSummary: RowData = ["合计", "", "", totalQty, "", formatMoney(group.amount)]
    const orderNo = formatOrderNo(group.orderId)
    const safeSheetOrderNo = orderNo.replace(/[:\\/?*[\]]/g, "")
    const orderMetaRow = filterPreviewMeta([
      `订单号：${orderNo}`,
      resolved.showCustomer ? `客户：${billing.customerName}` : "",
      `日期：${group.dateRange}`,
    ])

    return {
      sheetName: `发货单-${safeSheetOrderNo}`.slice(0, 31),
      filename,
      rows: [
        ["濮阳市瑞海隆鑫设备制造有限公司"],
        ["发货单"],
        orderMetaRow,
        headers,
        ...detailRows,
        detailSummary,
      ],
      minColWidths: [14, 26, 8, 10, 12, 14],
      contentStartRow: 3,
      printTargetWidthWch: 96,
      printHorizontallyCentered: true,
      preview: {
        title: "发货单",
        filename,
        meta: orderMetaRow,
        headers,
        rows: detailRows,
        totalRows: detailRows.length,
        summary: detailSummary,
      },
    } satisfies SheetPayload
  })

  return {
    filename,
    sheets: [summarySheet, ...detailSheets],
    preview: summarySheet.preview,
  }
}

function buildHandwrittenDetailPreview(
  title: string,
  filename: string,
  meta: RowData,
  headers: string[],
  detailRows: RowData[],
  summary: RowData,
): ExportPreviewData {
  return {
    title,
    filename,
    meta: filterPreviewMeta(meta),
    headers,
    rows: detailRows.slice(0, PREVIEW_ROW_LIMIT),
    totalRows: detailRows.length,
    summary,
  }
}

export function buildOrderDetailSheetPayload(order: OrderDetail): SheetPayload {
  const today = formatToday(DEFAULT_EXPORT_OPTIONS.dateFormat)
  const orderDate = formatDateOnly(order.createdAt, DEFAULT_EXPORT_OPTIONS.dateFormat)
  const headers = ["零件名称", "材质", "数量", "实际数量", "原因"]
  const detailRows = order.items.map(item => [
    item.part.name,
    item.part.material,
    item.orderedQty,
    "",
    "",
  ])
  const totalQty = order.items.reduce((sum, item) => sum + item.orderedQty, 0)
  const summary: RowData = ["合计", "", totalQty, "", ""]
  const meta: RowData = [
    `订单号：${formatOrderNo(order.id)}`,
    `客户：${order.customerName}`,
    "",
    "",
    `订单日期：${orderDate}`,
  ]
  const filename = `${formatOrderNo(order.id)}-订单明细表-${today}.xlsx`
  return {
    sheetName: "订单明细表",
    filename,
    rows: [
      ["濮阳市瑞海隆鑫设备制造有限公司"],
      ["订单明细表"],
      meta,
      headers,
      ...detailRows,
      summary,
    ],
    minColWidths: [20, 14, 8, 14, 18],
    contentStartRow: 3,
    printTargetWidthWch: 74,
    printHorizontallyCentered: true,
    printOrientation: "portrait",
    detailRowHeight: 30,
    preview: buildHandwrittenDetailPreview(
      "订单明细表", filename, meta, headers, detailRows, summary,
    ),
  }
}

export function buildOrderDraftDetailSheetPayload(
  draft: OrderDraftDetail,
): SheetPayload {
  const today = formatToday(DEFAULT_EXPORT_OPTIONS.dateFormat)
  const draftDate = formatDateOnly(draft.createdAt, DEFAULT_EXPORT_OPTIONS.dateFormat)
  const headers = ["零件名称", "材质", "数量", "实际数量", "原因"]
  const exportableItems = draft.items.filter(item => item.part)
  const detailRows = exportableItems.map(item => [
    item.part?.name ?? "未选择零件",
    item.part?.material ?? "",
    item.orderedQty ?? "",
    "",
    "",
  ])
  const totalQty = exportableItems.reduce((sum, item) => sum + (item.orderedQty ?? 0), 0)
  const summary: RowData = ["合计", "", totalQty, "", ""]
  const draftNo = `DRAFT-${String(draft.id).padStart(6, "0")}`
  const meta: RowData = [
    `草稿号：${draftNo}`,
    `客户：${draft.customerName?.trim() || "未选择客户"}`,
    "",
    "",
    `创建日期：${draftDate}`,
  ]
  const filename = `${draftNo}-订单明细表-${today}.xlsx`
  return {
    sheetName: "订单明细表",
    filename,
    rows: [
      ["濮阳市瑞海隆鑫设备制造有限公司"],
      ["订单草稿明细表"],
      meta,
      headers,
      ...detailRows,
      summary,
    ],
    minColWidths: [20, 14, 8, 14, 18],
    contentStartRow: 3,
    printTargetWidthWch: 74,
    printHorizontallyCentered: true,
    printOrientation: "portrait",
    detailRowHeight: 30,
    preview: buildHandwrittenDetailPreview(
      "订单草稿明细表", filename, meta, headers, detailRows, summary,
    ),
  }
}

export function buildMergedOrderDetailSheetPayload(
  mergedOrder: MergedOrderDetail,
): SheetPayload {
  const today = formatToday(DEFAULT_EXPORT_OPTIONS.dateFormat)
  const headers = [
    "订单日期",
    "原订单号",
    "零件名称",
    "材质",
    "数量",
    "实际数量",
    "原因",
  ]
  const sortedOrders = mergedOrder.orders.slice().sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt) || left.id - right.id,
  )
  const detailRows = sortedOrders.flatMap(order =>
    order.items.map(item => [
      formatDateOnly(order.createdAt, DEFAULT_EXPORT_OPTIONS.dateFormat),
      formatOrderNo(order.id),
      item.part.name,
      item.part.material,
      item.orderedQty,
      "",
      "",
    ]),
  )
  const totalQty = sortedOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.orderedQty, 0),
    0,
  )
  const summary: RowData = ["合计", "", "", "", totalQty, "", ""]
  const meta: RowData = [
    `合并单号：${mergedOrder.mergedNo}`,
    `客户：${mergedOrder.customerName}`,
    `包含订单：${mergedOrder.orders.length} 张`,
  ]
  const safeCustomerName = mergedOrder.customerName.replace(/[\\/:*?"<>|]/g, "-")
  const filename = `${mergedOrder.mergedNo}-${safeCustomerName}-合并明细表-${today}.xlsx`
  return {
    sheetName: "合并订单明细表",
    filename,
    rows: [
      ["濮阳市瑞海隆鑫设备制造有限公司"],
      ["合并订单明细表"],
      meta,
      headers,
      ...detailRows,
      summary,
    ],
    minColWidths: [11, 13, 16, 10, 7, 9, 14],
    contentStartRow: 3,
    printTargetWidthWch: 86,
    printHorizontallyCentered: true,
    printOrientation: "portrait",
    detailRowHeight: 30,
    preview: buildHandwrittenDetailPreview(
      "合并订单明细表", filename, meta, headers, detailRows, summary,
    ),
  }
}

interface BillingOrderGroup {
  orderId: number
  rows: BillingOrderDetailRow[]
  amount: number
  dateRange: string
}

interface BillingOrderDetailRow {
  date: string
  name: string
  unit: string
  quantity: number
  unitPrice: number
  amount: number
}

function buildBillingOrderGroups(
  billing: BillingDetail,
  dateFormat: ExportDateFormat,
): BillingOrderGroup[] {
  const groups = new Map<
    number,
    {
      orderId: number
      rows: BillingOrderDetailRow[]
      amount: number
      dates: string[]
    }
  >()

  for (const item of billing.items) {
    const deliveryItem = item.deliveryItem
    if (!deliveryItem) continue

    const orderId = deliveryItem.orderItem.orderId
    const date = formatDateOnly(deliveryItem.deliveryNote.deliveryDate, dateFormat)
    const shortageQty = Math.max(
      deliveryItem.orderItem.orderedQty - deliveryItem.orderItem.shippedQty,
      0,
    )
    const baseName = deliveryItem.orderItem.part.name
    const name = shortageQty > 0 ? `${baseName}（缺件 ${shortageQty}）` : baseName
    const amount = formatMoney(decimalToNum(item.amount))
    const row: BillingOrderDetailRow = {
      date,
      name,
      unit: "件",
      quantity: deliveryItem.shippedQty,
      unitPrice: formatMoney(decimalToNum(deliveryItem.orderItem.unitPrice)),
      amount,
    }

    const group = groups.get(orderId)
    if (group) {
      group.rows.push(row)
      group.amount += amount
      group.dates.push(date)
    } else {
      groups.set(orderId, {
        orderId,
        rows: [row],
        amount,
        dates: [date],
      })
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => a.orderId - b.orderId)
    .map(group => {
      const sortedDates = group.dates.slice().sort()
      const startDate = sortedDates[0] ?? ""
      const endDate = sortedDates[sortedDates.length - 1] ?? ""
      return {
        orderId: group.orderId,
        rows: group.rows.sort((a, b) => a.date.localeCompare(b.date)),
        amount: formatMoney(group.amount),
        dateRange: startDate === endDate ? startDate : `${startDate}-${endDate}`,
      }
    })
}

function buildBillingPreviewPayload(
  billing: BillingDetail,
  options?: ExportSheetOptions,
): ExportPreviewData {
  const resolved = resolveExportOptions(options)
  const today = formatToday(resolved.dateFormat)
  const billingDate = formatDateOnly(billing.createdAt, resolved.dateFormat)
  const filename = `${formatBillingNo(billing.id)}-对账单-${today}.xlsx`
  const metaRow = buildBillingMetaRow(billing, resolved, billingDate, today)
  const groups = buildBillingOrderGroups(billing, resolved.dateFormat)
  const headers = ["订单号", "日期", "应收金额（元）"]
  const rows: RowData[] = groups.slice(0, PREVIEW_ROW_LIMIT).map(group => [
    formatOrderNo(group.orderId),
    group.dateRange,
    formatMoney(group.amount),
  ])
  const totalAmount = groups.reduce((sum, group) => sum + group.amount, 0)

  return {
    title: "对账单",
    filename,
    meta: filterPreviewMeta(metaRow),
    headers,
    rows,
    totalRows: groups.length,
    summary: ["合计", "", formatMoney(totalAmount)],
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

function decimalToNum(value: string | number): number {
  return typeof value === "string" ? parseFloat(value) : value
}

export function getBillingExportPreview(
  billing: BillingDetail,
  options?: ExportSheetOptions,
): ExportPreviewData {
  return buildBillingPreviewPayload(billing, options)
}
