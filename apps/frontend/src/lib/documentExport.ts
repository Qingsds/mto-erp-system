import * as XLSX from "xlsx-js-style"
import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import type { OrderDetail } from "@/hooks/api/useOrders"
import {
  buildDeliverySheetPayload,
  buildOrderSheetPayload,
  type ExportSheetOptions,
  type RowData,
} from "./documentExportData"

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

function getDisplayLength(value: string | number): number {
  return Array.from(String(value)).reduce((sum, char) => {
    return sum + (char.charCodeAt(0) > 255 ? 2 : 1)
  }, 0)
}

function resolveColumnWidths(rows: RowData[], minWidths: number[]): number[] {
  const colCount = Math.max(minWidths.length, ...rows.map(row => row.length))
  const maxWidth = 48

  return Array.from({ length: colCount }, (_, colIndex) => {
    const maxLen = rows.reduce((currentMax, row) => {
      const value = row[colIndex]
      if (value === undefined || value === null) return currentMax
      return Math.max(currentMax, getDisplayLength(value))
    }, 0)
    const estimated = Math.min(maxLen + 2, maxWidth)
    return Math.max(minWidths[colIndex] ?? 10, estimated)
  })
}

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
  const colWidths = resolveColumnWidths(rows, minColWidths)
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const contentEndRow = rows.length - 1

  ws["!cols"] = colWidths.map(wch => ({ wch }))
  ws["!rows"] = rows.map((row, index) => {
    if (index === 0) return { hpt: 30 }
    if (index === 1) return { hpt: 24 }
    if (index === contentStartRow) return { hpt: 24 }
    return { hpt: resolveRowHeight(row, colWidths) }
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
  XLSX.writeFile(wb, payload.filename)
  return payload.filename
}

export * from "./documentExportData"
