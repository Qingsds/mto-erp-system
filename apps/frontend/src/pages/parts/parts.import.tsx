import { useCallback, useRef, useState } from "react"
import * as XLSX                          from "xlsx"
import { Button }                         from "@/components/ui/button"
import { cn }                             from "@/lib/utils"
import {
  ImportRowSchema,
  normalizeImportRow,
  type ImportRow,
  type ImportResult,
} from "./parts.schema"

// ─── Parse Excel → ImportResult ───────────────────────────
function parseExcel(buf: ArrayBuffer): ImportResult {
  const wb   = XLSX.read(buf, { type: "array" })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })

  const valid:   ImportResult["valid"]   = []
  const invalid: ImportResult["invalid"] = []

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2
    const parsed = ImportRowSchema.safeParse(normalizeImportRow(raw))
    if (parsed.success) {
      valid.push({ ...parsed.data, _row: rowNum })
    } else {
      invalid.push({
        _row:   rowNum,
        errors: parsed.error.issues.map((e) => e.message),
      })
    }
  })

  return { valid, invalid }
}

// ─── Download template ────────────────────────────────────
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["零件名称",        "零件材质",   "零件价格", "备注"    ],
    ["六角螺栓 M8×30", "304不锈钢",  0.85,       "标准件"  ],
    ["密封圈 O-Ring",  "丁腈橡胶",   2.40,       ""        ],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "零件导入模板")
  XLSX.writeFile(wb, "零件导入模板.xlsx")
}

// ─── Drop zone ────────────────────────────────────────────
function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const accept = (files: FileList | null) => {
    const f = files?.[0]
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) onFile(f)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files) }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 px-6",
        "border-2 border-dashed rounded-lg cursor-pointer select-none transition-colors",
        drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => accept(e.target.files)}
      />
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
        <i className="ri-file-excel-2-line text-2xl text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">点击或拖拽上传 Excel 文件</p>
        <p className="text-xs text-muted-foreground mt-1">支持 .xlsx / .xls，最大 5MB</p>
      </div>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="text-xs h-auto p-0 text-muted-foreground"
        onClick={(e) => { e.stopPropagation(); downloadTemplate() }}
      >
        <i className="ri-download-line mr-1" />
        下载导入模板
      </Button>
    </div>
  )
}

// ─── Import panel ─────────────────────────────────────────
interface ImportPanelProps {
  onImport: (rows: ImportRow[]) => Promise<void>
  onClose:  () => void
}

export function ImportPanel({ onImport, onClose }: ImportPanelProps) {
  const [result,    setResult]    = useState<ImportResult | null>(null)
  const [fileName,  setFileName]  = useState("")
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [showErrors,setShowErrors]= useState(false)

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setResult(parseExcel(await file.arrayBuffer()))
    setDone(false)
  }, [])

  const handleImport = async () => {
    if (!result?.valid.length) return
    setLoading(true)
    try {
      await onImport(result.valid)
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setResult(null); setFileName(""); setDone(false) }

  // ── Success ──────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <i className="ri-checkbox-circle-line text-3xl text-primary" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold">导入成功</p>
          <p className="text-sm text-muted-foreground mt-1">
            已成功导入 {result?.valid.length} 个零件
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset}>继续导入</Button>
          <Button size="sm" onClick={onClose}>完成</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* File name bar */}
      {fileName && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
          <i className="ri-file-excel-2-line text-sm text-primary" />
          <span className="flex-1 text-xs truncate">{fileName}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={reset}>
            <i className="ri-close-line text-xs" />
          </Button>
        </div>
      )}

      {/* Drop zone or result */}
      {!result ? (
        <DropZone onFile={handleFile} />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 p-3 bg-muted rounded-lg">
              <i className="ri-checkbox-circle-line text-primary text-lg" />
              <div>
                <p className="text-sm font-semibold">{result.valid.length} 行</p>
                <p className="text-xs text-muted-foreground">可导入</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-muted rounded-lg">
              <i className="ri-error-warning-line text-destructive text-lg" />
              <div>
                <p className="text-sm font-semibold">{result.invalid.length} 行</p>
                <p className="text-xs text-muted-foreground">校验失败</p>
              </div>
            </div>
          </div>

          {/* Preview table */}
          {result.valid.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">预览（前 5 行）</p>
              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full border-collapse text-xs" style={{ minWidth: 400 }}>
                  <thead>
                    <tr className="bg-muted">
                      {["行", "零件名称", "材质", "价格", "备注"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground border-b border-border whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.valid.slice(0, 5).map((row) => (
                      <tr key={row._row} className="border-b last:border-0 border-border">
                        <td className="px-3 py-2 font-mono text-muted-foreground">{row._row}</td>
                        <td className="px-3 py-2">{row.零件名称}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.零件材质}</td>
                        <td className="px-3 py-2 font-mono">¥{row.零件价格}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.备注 || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.valid.length > 5 && (
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  还有 {result.valid.length - 5} 行…
                </p>
              )}
            </div>
          )}

          {/* Error rows */}
          {result.invalid.length > 0 && (
            <div className="border border-destructive/30 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowErrors((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-destructive/5 text-xs font-medium text-destructive border-none cursor-pointer text-left"
              >
                <span className="flex items-center gap-1.5">
                  <i className="ri-error-warning-line" />
                  {result.invalid.length} 行校验失败，点击查看
                </span>
                <i className={showErrors ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} />
              </button>
              {showErrors && (
                <div className="divide-y divide-border">
                  {result.invalid.map((row) => (
                    <div key={row._row} className="px-4 py-2.5">
                      <p className="text-xs font-mono text-muted-foreground mb-1">第 {row._row} 行</p>
                      {row.errors.map((e, i) => (
                        <p key={i} className="text-xs text-destructive flex items-start gap-1.5">
                          <span className="mt-0.5">•</span>{e}
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

      {/* Footer */}
      {result && (
        <div className="flex items-center justify-between pt-1">
          <Button variant="outline" size="sm" onClick={reset}>重新上传</Button>
          <Button
            size="sm"
            disabled={!result.valid.length || loading}
            onClick={handleImport}
          >
            {loading ? (
              <><i className="ri-loader-4-line animate-spin mr-1.5" />导入中…</>
            ) : `导入 ${result.valid.length} 个零件`}
          </Button>
        </div>
      )}
    </div>
  )
}
