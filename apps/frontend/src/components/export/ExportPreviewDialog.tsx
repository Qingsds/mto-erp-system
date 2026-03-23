import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  ExportDateFormat,
  ExportPreviewData,
  ExportSheetOptions,
} from "@/lib/documentExportData"

const DATE_FORMAT_OPTIONS: ExportDateFormat[] = [
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "YYYY年MM月DD日",
]

type ExportConfig = Required<ExportSheetOptions>

interface ExportPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ExportConfig
  onChangeConfig: (next: ExportConfig) => void
  preview: ExportPreviewData | null
  isPreparing?: boolean
  isExporting?: boolean
  onConfirm: () => Promise<void> | void
}

export function ExportPreviewDialog({
  open,
  onOpenChange,
  config,
  onChangeConfig,
  preview,
  isPreparing = false,
  isExporting = false,
  onConfirm,
}: ExportPreviewDialogProps) {
  const previewRows = preview?.rows ?? []
  const hasMoreRows = (preview?.totalRows ?? 0) > previewRows.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='max-w-[960px] gap-4 p-5 sm:p-6'
        overlayClassName='bg-black/45 supports-backdrop-filter:backdrop-blur-none'
        disableAnimation
      >
        <DialogHeader>
          <DialogTitle>导出前预览</DialogTitle>
          <DialogDescription>
            导出前可调整字段显示与日期格式，确认后再生成 Excel 文件。
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-xl border border-border bg-muted/20 p-3'>
          <label className='inline-flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={config.showOrderNo}
              onChange={event =>
                onChangeConfig({
                  ...config,
                  showOrderNo: event.target.checked,
                })
              }
              className='size-4 rounded border border-input accent-primary'
            />
            显示订单号
          </label>

          <label className='inline-flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={config.showCustomer}
              onChange={event =>
                onChangeConfig({
                  ...config,
                  showCustomer: event.target.checked,
                })
              }
              className='size-4 rounded border border-input accent-primary'
            />
            显示客户
          </label>

          <label className='inline-flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={config.showPreparedAt}
              onChange={event =>
                onChangeConfig({
                  ...config,
                  showPreparedAt: event.target.checked,
                })
              }
              className='size-4 rounded border border-input accent-primary'
            />
            显示制表时间
          </label>

          <label className='inline-flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={config.showStatus}
              onChange={event =>
                onChangeConfig({
                  ...config,
                  showStatus: event.target.checked,
                })
              }
              className='size-4 rounded border border-input accent-primary'
            />
            显示状态字段
          </label>

          <label className='inline-flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={config.showRemarks}
              onChange={event =>
                onChangeConfig({
                  ...config,
                  showRemarks: event.target.checked,
                })
              }
              className='size-4 rounded border border-input accent-primary'
            />
            显示备注字段
          </label>

          <label className='inline-flex items-center gap-2 text-sm'>
            日期格式
            <select
              value={config.dateFormat}
              onChange={event =>
                onChangeConfig({
                  ...config,
                  dateFormat: event.target.value as ExportDateFormat,
                })
              }
              className='h-8 min-w-0 rounded-md border border-input bg-background px-2 text-xs'
            >
              {DATE_FORMAT_OPTIONS.map(format => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className='rounded-xl border border-border overflow-hidden'>
          <div className='px-4 py-3 border-b border-border bg-muted/20'>
            <p className='text-sm font-medium'>
              {preview?.title ?? "导出内容"}
            </p>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {preview?.filename ?? "正在准备预览..."}
            </p>
          </div>

          <div className='px-4 py-3 space-y-1 border-b border-border bg-background'>
            {isPreparing && (
              <p className='text-xs text-muted-foreground'>
                正在生成预览内容...
              </p>
            )}
            {!isPreparing &&
              (preview?.meta ?? []).map((line, index) => (
                <p key={`${line}-${index}`} className='text-xs text-muted-foreground'>
                  {line}
                </p>
              ))}
          </div>

          <div className='max-h-72 overflow-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  {(preview?.headers ?? []).map(header => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {(preview?.headers ?? []).map((_, colIndex) => (
                      <TableCell key={`${rowIndex}-${colIndex}`}>
                        {row[colIndex] ?? ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {!!preview && (
                  <TableRow className='bg-muted/20 font-medium'>
                    {(preview.headers ?? []).map((_, colIndex) => (
                      <TableCell key={`summary-${colIndex}`}>
                        {preview.summary[colIndex] ?? ""}
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {!!preview && hasMoreRows && (
            <div className='px-4 py-2 border-t border-border text-xs text-muted-foreground bg-muted/20'>
              仅预览前 {previewRows.length} 行，导出将包含全部 {preview.totalRows} 行数据。
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            取消
          </Button>
          <Button
            type='button'
            onClick={() => void onConfirm()}
            disabled={isPreparing || isExporting || !preview}
          >
            {isExporting ? "导出中..." : "确认导出"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
