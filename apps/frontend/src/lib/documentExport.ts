/**
 * documentExport.ts
 *
 * 职责：
 * - 负责把二维表数据渲染为 xlsx-js-style 工作簿并触发下载
 * - 在导出阶段计算列宽/行高，保持表格在不同内容长度下可读
 * - 仅做“格式与文件写出”，业务数据由 documentExportData 提供
 */

import * as XLSX from "xlsx-js-style"
import type { BillingDetail } from "@/hooks/api/useBilling"
import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import type { OrderDetail } from "@/hooks/api/useOrders"
import {
  buildBillingSheetPayload,
  buildDeliverySheetPayload,
  buildOrderSheetPayload,
  type ExportSheetOptions,
  type RowData,
} from "./documentExportData"
export { resolveSettlementQty } from "@/domain/orders/pricing"

const CELL_FONT = "Microsoft YaHei"

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

/** 估算显示长度：中文按 2，英文/数字按 1。 */
function getDisplayLength(value: string | number): number {
  return Array.from(String(value)).reduce((sum, char) => {
    return sum + (char.charCodeAt(0) > 255 ? 2 : 1)
  }, 0)
}

/** 按列最大显示长度估算宽度，并限制在最小值与上限之间。 */
function resolveColumnWidths(
  rows: RowData[],
  minWidths: number[],
  contentStartRow: number,
): number[] {
  // 列宽仅由“表格内容区”驱动，避免公司名/元信息行把整表宽度异常拉大。
  const widthSourceRows = rows.slice(contentStartRow)
  const measuredRows = widthSourceRows.length > 0 ? widthSourceRows : rows
  const colCount = Math.max(minWidths.length, ...rows.map(row => row.length))
  const maxWidth = 48

  return Array.from({ length: colCount }, (_, colIndex) => {
    const maxLen = measuredRows.reduce((currentMax, row) => {
      const value = row[colIndex]
      if (value === undefined || value === null) return currentMax
      return Math.max(currentMax, getDisplayLength(value))
    }, 0)
    const estimated = Math.min(maxLen + 2, maxWidth)
    return Math.max(minWidths[colIndex] ?? 10, estimated)
  })
}

/** 按内容换行需求估算行高，防止单行截断或极端拉伸。 */
function resolveRowHeight(row: RowData, colWidths: number[]): number {
  const lineCount = row.reduce<number>((maxLines, value, colIndex) => {
    const width = Math.max(colWidths[colIndex] ?? 10, 1)
    const lines = String(value)
      .split("\n")
      .reduce((sum, line) => {
        const displayLength = Math.max(getDisplayLength(line), 1)
        return sum + Math.max(Math.ceil(displayLength / width), 1)
      }, 0)
    return Math.max(maxLines, lines)
  }, 1)

  return Math.max(22, Math.min(lineCount * 22, 88))
}

function buildWorkbook(
  sheetName: string,
  rows: RowData[],
  minColWidths: number[],
  contentStartRow: number,
) {
  const colWidths = resolveColumnWidths(rows, minColWidths, contentStartRow)
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const contentEndRow = rows.length - 1

  // 标题行/表头行使用固定高度，其余行按内容自适应高度。
  ws["!cols"] = colWidths.map(wch => ({ wch }))
  // 采用较窄页边距，降低打印时横向分页概率。
  ws["!margins"] = {
    left: 0.25,
    right: 0.25,
    top: 0.5,
    bottom: 0.5,
    header: 0.2,
    footer: 0.2,
  }
  ws["!rows"] = rows.map((row, index) => {
    if (index === 0) return { hpt: 30 }
    if (index === 1) return { hpt: 24 }
    if (index === contentStartRow) return { hpt: 24 }
    return { hpt: resolveRowHeight(row, colWidths) }
  })

  // 公司名与单据名横跨全列，视觉上形成两级标题。
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
      // 不同行区分字体层级：主标题 > 副标题 > 表头 > 内容。
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

export function exportOrderPriceSheet(
  order: OrderDetail,
  options?: ExportSheetOptions,
): string {
  const payload = buildOrderSheetPayload(order, options)
  const wb = buildWorkbook(
    payload.sheetName,
    payload.rows,
    payload.minColWidths,
    payload.contentStartRow,
  )
  XLSX.writeFile(wb, payload.filename)
  return payload.filename
}

export function exportDeliveryNote(
  delivery: DeliveryDetail,
  options?: ExportSheetOptions,
): string {
  const payload = buildDeliverySheetPayload(delivery, options)
  const wb = buildWorkbook(
    payload.sheetName,
    payload.rows,
    payload.minColWidths,
    payload.contentStartRow,
  )
  const ws = wb.Sheets[payload.sheetName]
  if (ws) {
    ws["!pageSetup"] = {
      scale: 100,
      fitToWidth: 0,
      fitToHeight: 0,
    }
  }
  XLSX.writeFile(wb, payload.filename)
  return payload.filename
}

export function exportBillingStatement(
  billing: BillingDetail,
  options?: ExportSheetOptions,
): string {
  const payload = buildBillingSheetPayload(billing, options)
  const wb = buildWorkbook(
    payload.sheetName,
    payload.rows,
    payload.minColWidths,
    payload.contentStartRow,
  )
  XLSX.writeFile(wb, payload.filename)
  return payload.filename
}

export * from "./documentExportData"
