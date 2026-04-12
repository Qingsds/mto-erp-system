/**
 * 新建订单页的零件选择弹窗兼容入口。
 *
 * 实际实现已经上收为通用组件 `PartPickerDialog`，
 * 这里保留同名导出，避免页面层导入路径频繁变动。
 */

import { PartPickerDialog } from "@/components/parts/PartPickerDialog"
import type { PartListItem } from "@/hooks/api/useParts"

interface PartPickerProps {
  open: boolean
  parts: PartListItem[]
  customerName?: string
  selectedPartId?: number
  onSelect: (part: PartListItem) => void
  onClose: () => void
}

export function PartPicker({
  open,
  parts,
  customerName,
  selectedPartId,
  onSelect,
  onClose,
}: PartPickerProps) {
  return (
    <PartPickerDialog
      open={open}
      parts={parts}
      customerName={customerName}
      selectedPartId={selectedPartId}
      onSelect={onSelect}
      onClose={onClose}
    />
  )
}
