/**
 * 零件批量导入面板。
 *
 * 流程固定为：
 * 1. 上传 Excel
 * 2. 本地解析与校验
 * 3. 预览可导入数据
 * 4. 确认导入
 */

import { useCallback, useRef, useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ImportRowSchema,
  normalizeImportRow,
  type ImportRow,
  type ImportResult,
} from "@/pages/parts/parts.schema"

function parseExcel(buffer: ArrayBuffer): ImportResult {
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  })

  const valid: ImportResult["valid"] = []
  const invalid: ImportResult["invalid"] = []

  rows.forEach((rawRow, index) => {
    const rowNumber = index + 2
    const parsed = ImportRowSchema.safeParse(normalizeImportRow(rawRow))

    if (parsed.success) {
      valid.push({ ...parsed.data, _row: rowNumber })
      return
    }

    invalid.push({
      _row: rowNumber,
      errors: parsed.error.issues.map(issue => issue.message),
    })
  })

  return { valid, invalid }
}

function downloadTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["零件名称", "零件材质", "零件价格", "备注"],
    ["六角螺栓 M8×30", "304不锈钢", 0.85, "标准件"],
    ["密封圈 O-Ring", "丁腈橡胶", 2.4, ""],
  ])
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, sheet, "零件导入模板")
  XLSX.writeFile(workbook, "零件导入模板.xlsx")
}

function ImportDropZone({
  onFile,
}: {
  onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const acceptFile = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      onFile(file)
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={event => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={event => {
        event.preventDefault()
        setIsDragging(false)
        acceptFile(event.dataTransfer.files)
      }}
      className={cn(
        "flex cursor-pointer select-none flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-12 transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50",
      )}
    >
      <input
        ref={inputRef}
        type='file'
        accept='.xlsx,.xls'
        className='hidden'
        onChange={event => acceptFile(event.target.files)}
      />

      <div className='flex h-12 w-12 items-center justify-center bg-muted'>
        <i className='ri-file-excel-2-line text-2xl text-muted-foreground' />
      </div>

      <div className='text-center'>
        <p className='text-sm font-medium text-foreground'>
          点击或拖拽上传 Excel 文件
        </p>
        <p className='mt-1 text-xs text-muted-foreground'>
          支持 .xlsx / .xls，最大 5MB
        </p>
      </div>

      <Button
        type='button'
        variant='link'
        size='sm'
        className='h-auto p-0 text-xs text-muted-foreground'
        onClick={event => {
          event.stopPropagation()
          downloadTemplate()
        }}
      >
        <i className='ri-download-line mr-1' />
        下载导入模板
      </Button>
    </div>
  )
}

interface PartImportPanelProps {
  onImport: (rows: ImportRow[]) => Promise<void>
  onClose: () => void
}

export function PartImportPanel({
  onImport,
  onClose,
}: PartImportPanelProps) {
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fileName, setFileName] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setResult(parseExcel(await file.arrayBuffer()))
    setIsDone(false)
    setShowErrors(false)
  }, [])

  const handleImport = async () => {
    if (!result?.valid.length) return

    setIsImporting(true)
    try {
      await onImport(result.valid)
      setIsDone(true)
    } finally {
      setIsImporting(false)
    }
  }

  const reset = () => {
    setResult(null)
    setFileName("")
    setIsDone(false)
    setShowErrors(false)
  }

  if (isDone) {
    return (
      <div className='flex flex-col items-center justify-center gap-4 py-16'>
        <div className='flex h-14 w-14 items-center justify-center bg-primary/10'>
          <i className='ri-checkbox-circle-line text-3xl text-primary' />
        </div>
        <div className='text-center'>
          <p className='text-base font-semibold text-foreground'>
            导入成功
          </p>
          <p className='mt-1 text-sm text-muted-foreground'>
            已成功导入 {result?.valid.length} 个零件
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={reset}
          >
            继续导入
          </Button>
          <Button
            size='sm'
            onClick={onClose}
          >
            完成
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      {fileName && (
        <div className='flex items-center gap-2 bg-muted px-3 py-2'>
          <i className='ri-file-excel-2-line text-sm text-primary' />
          <span className='flex-1 truncate text-xs text-foreground'>
            {fileName}
          </span>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={reset}
          >
            <i className='ri-close-line text-xs' />
          </Button>
        </div>
      )}

      {!result ? (
        <ImportDropZone onFile={handleFile} />
      ) : (
        <div className='flex flex-col gap-3'>
          <div className='grid grid-cols-2 gap-3'>
            <div className='flex items-center gap-2.5 bg-muted p-3'>
              <i className='ri-checkbox-circle-line text-lg text-primary' />
              <div>
                <p className='text-sm font-semibold text-foreground'>
                  {result.valid.length} 行
                </p>
                <p className='text-xs text-muted-foreground'>
                  可导入
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2.5 bg-muted p-3'>
              <i className='ri-error-warning-line text-lg text-destructive' />
              <div>
                <p className='text-sm font-semibold text-foreground'>
                  {result.invalid.length} 行
                </p>
                <p className='text-xs text-muted-foreground'>
                  校验失败
                </p>
              </div>
            </div>
          </div>

          {result.valid.length > 0 && (
            <div>
              <p className='mb-1.5 text-xs text-muted-foreground'>
                预览（前 5 行）
              </p>
              <div className='overflow-x-auto border border-border'>
                <table
                  className='w-full border-collapse text-xs'
                  style={{ minWidth: 400 }}
                >
                  <thead>
                    <tr className='bg-muted'>
                      {["行", "零件名称", "材质", "价格", "规格"].map(header => (
                        <th
                          key={header}
                          className='whitespace-nowrap border-b border-border px-3 py-2 text-left font-medium text-muted-foreground'
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.valid.slice(0, 5).map(row => (
                      <tr
                        key={row._row}
                        className='border-b border-border last:border-0'
                      >
                        <td className='px-3 py-2 font-mono text-muted-foreground'>
                          {row._row}
                        </td>
                        <td className='px-3 py-2 text-foreground'>
                          {row.零件名称}
                        </td>
                        <td className='px-3 py-2 text-muted-foreground'>
                          {row.零件材质}
                        </td>
                        <td className='px-3 py-2 font-mono text-foreground'>
                          ¥{row.零件价格}
                        </td>
                        <td className='px-3 py-2 text-muted-foreground'>
                          {row.规格 || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.valid.length > 5 && (
                <p className='mt-1 text-right text-xs text-muted-foreground'>
                  还有 {result.valid.length - 5} 行…
                </p>
              )}
            </div>
          )}

          {result.invalid.length > 0 && (
            <div className='overflow-hidden border border-destructive/30'>
              <button
                onClick={() => setShowErrors(value => !value)}
                className='flex w-full cursor-pointer items-center justify-between border-none bg-destructive/5 px-4 py-2.5 text-left text-xs font-medium text-destructive'
              >
                <span className='flex items-center gap-1.5'>
                  <i className='ri-error-warning-line' />
                  {result.invalid.length} 行校验失败，点击查看
                </span>
                <i className={showErrors ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} />
              </button>

              {showErrors && (
                <div className='divide-y divide-border'>
                  {result.invalid.map(row => (
                    <div
                      key={row._row}
                      className='px-4 py-2.5'
                    >
                      <p className='mb-1 font-mono text-xs text-muted-foreground'>
                        第 {row._row} 行
                      </p>
                      {row.errors.map((error, index) => (
                        <p
                          key={index}
                          className='flex items-start gap-1.5 text-xs text-destructive'
                        >
                          <span className='mt-0.5'>•</span>
                          {error}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className='flex items-center justify-between pt-1'>
          <Button
            variant='outline'
            size='sm'
            onClick={reset}
          >
            重新上传
          </Button>
          <Button
            size='sm'
            disabled={!result.valid.length || isImporting}
            onClick={handleImport}
          >
            {isImporting ? (
              <>
                <i className='ri-loader-4-line mr-1.5 animate-spin' />
                导入中…
              </>
            ) : `导入 ${result.valid.length} 个零件`}
          </Button>
        </div>
      )}
    </div>
  )
}
