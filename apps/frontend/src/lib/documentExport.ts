import * as XLSX from "xlsx-js-style"
import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import type { OrderDetail } from "@/hooks/api/useOrders"
import { decimalToNum, formatDeliveryNo, formatOrderNo } from "@/hooks/api/useOrders"

const COMPANY_NAME = "濮阳市瑞海隆鑫设备制造有限公司"
const CELL_FONT = "Microsoft YaHei"

type CellValue = string | number
type RowData = CellValue[]

const THIN_BORDER = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } },
} as const

const BASE_STYLE = {
  font: { name: CELL_FONT, sz: 12 },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
} as const

function formatDateOnly(value: string): string {
  return value.slice(0, 10)
}

function formatToday(): string {
  return new Date().toLocaleDateString("sv-SE")
}

function formatMoney(value: number): number {
  return Number(value.toFixed(2))
}

function resolveUnitPrice(unitPrice: string, commonPrices: Record<string, number>): number {
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

function buildWorkbook(
  sheetName: string,
  rows: RowData[],
  colWidths: number[],
  contentStartRow: number,
) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const contentEndRow = rows.length - 1

  ws["!cols"] = colWidths.map(wch => ({ wch }))
  ws["!rows"] = rows.map((_, index) => {
    if (index === 0) return { hpt: 30 }
    if (index === 1) return { hpt: 24 }
    if (index === 3) return { hpt: 8 }
    return { hpt: 22 }
  })
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colWidths.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colWidths.length - 1 } },
  ]
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length - 1, c: colWidths.length - 1 },
  })

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    for (let colIndex = 0; colIndex < colWidths.length; colIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
      const existing = ws[address]
      if (!existing) {
        ws[address] = { t: "s", v: "" }
      }

      const cell = ws[address]
      if (!cell) continue

      const style: Record<string, unknown> = { ...BASE_STYLE }
      if (rowIndex === 0) {
        style.font = { name: CELL_FONT, sz: 16, bold: true }
      } else if (rowIndex === 1) {
        style.font = { name: CELL_FONT, sz: 14, bold: true }
      } else if (rowIndex === contentStartRow) {
        style.font = { name: CELL_FONT, sz: 12, bold: true }
      }

      if (rowIndex >= contentStartRow && rowIndex <= contentEndRow) {
        style.border = THIN_BORDER
      }

      cell.s = style
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

export function exportOrderPriceSheet(order: OrderDetail): string {
  const today = formatToday()
  const isClosedShort = order.status === "CLOSED_SHORT"

  const detailRows = order.items.map(item => {
    const unitPrice = resolveUnitPrice(item.unitPrice, item.part.commonPrices)
    const shortQty = Math.max(item.orderedQty - item.shippedQty, 0)
    const settlementQty = isClosedShort ? Math.max(item.orderedQty - shortQty, 0) : item.orderedQty

    const remarks: string[] = []
    if (isClosedShort && shortQty > 0) {
      remarks.push(`短交废件 ${shortQty} 件（原下单 ${item.orderedQty} 件）`)
    }

    return [
      `${item.part.name} (${item.part.partNumber})`,
      settlementQty,
      formatMoney(unitPrice),
      formatMoney(settlementQty * unitPrice),
      remarks.join("；") || "—",
    ]
  })

  const totalQty = detailRows.reduce((sum, row) => sum + Number(row[1]), 0)
  const totalAmount = detailRows.reduce((sum, row) => sum + Number(row[3]), 0)
  const totalShortQty = isClosedShort
    ? order.items.reduce((sum, item) => sum + Math.max(item.orderedQty - item.shippedQty, 0), 0)
    : 0
  const footerRemark = [
    `日期：${formatDateOnly(order.createdAt)}`,
    isClosedShort && totalShortQty > 0 ? `废件合计：${totalShortQty} 件（已扣款）` : "",
    isClosedShort && order.reason ? `短交原因：${order.reason}` : "",
  ]
    .filter(Boolean)
    .join("；")

  const rows: Array<Array<string | number>> = [
    [COMPANY_NAME],
    ["价格清单"],
    [
      `订单号：${formatOrderNo(order.id)}`,
      `客户：${order.customerName}`,
      `状态：${order.status}`,
      "",
      `制表日期：${today}`,
    ],
    [],
    ["零件", "数量", "价格", "合计", "备注"],
    ...detailRows,
    ["汇总", totalQty, "", formatMoney(totalAmount), footerRemark],
  ]

  const wb = buildWorkbook("价格清单", rows, [30, 12, 12, 14, 30], 4)
  const filename = `${formatOrderNo(order.id)}-价格清单-${today}.xlsx`
  XLSX.writeFile(wb, filename)
  return filename
}

export function exportDeliveryNote(delivery: DeliveryDetail): string {
  const today = formatToday()
  const hasScrapInNote = /废件|短交|报废/.test(delivery.remark ?? "")

  const detailRows = delivery.items.map(item => {
    const lineRemark = item.remark?.trim() ?? ""
    const remark = lineRemark || (hasScrapInNote ? "含废件（见整单备注）" : "—")
    return [
      `${item.orderItem.part.name} (${item.orderItem.part.partNumber})`,
      item.orderItem.part.material,
      item.shippedQty,
      remark,
    ]
  })

  const totalQty = delivery.items.reduce((sum, item) => sum + item.shippedQty, 0)

  const rows: Array<Array<string | number>> = [
    [COMPANY_NAME],
    ["发货单"],
    [
      `发货单号：${formatDeliveryNo(delivery.id)}`,
      `关联订单：${formatOrderNo(delivery.orderId)}`,
      `客户：${delivery.order?.customerName || "-"}`,
      `制表日期：${today}`,
    ],
    [],
    ["零件", "材质", "数量", "备注"],
    ...detailRows,
    ["汇总", "", totalQty, `发货日期：${formatDateOnly(delivery.deliveryDate)}`],
  ]

  const wb = buildWorkbook("发货单", rows, [30, 14, 12, 30], 4)
  const filename = `${formatDeliveryNo(delivery.id)}-发货单-${today}.xlsx`
  XLSX.writeFile(wb, filename)
  return filename
}
