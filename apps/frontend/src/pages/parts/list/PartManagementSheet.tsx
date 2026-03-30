/**
 * 零件管理抽屉。
 *
 * 把新增 / 编辑 / 批量导入的抽屉收口到同一个组件里，
 * 桌面端和移动端共用同一套表单与导入面板。
 */

import { ErpSheet } from "@/components/common/ErpSheet"
import {
  PartForm,
  usePartForm,
} from "@/pages/parts/manage/PartForm"
import { PartImportPanel } from "@/pages/parts/manage/PartImportPanel"
import type { PartListItem } from "@/hooks/api/useParts"
import type { ImportRow, PartFormValues } from "@/pages/parts/parts.schema"
import type { PartPanelMode } from "./usePartsPageController"

interface PartManagementSheetProps {
  panel: PartPanelMode
  form: ReturnType<typeof usePartForm>
  editingPart: PartListItem | null
  onClose: () => void
  onImport: (rows: ImportRow[]) => Promise<void>
  onSubmit: (values: PartFormValues) => Promise<void>
  width?: number
}

export function PartManagementSheet({
  panel,
  form,
  editingPart,
  onClose,
  onImport,
  onSubmit,
  width,
}: PartManagementSheetProps) {
  return (
    <ErpSheet
      open={panel !== null}
      onOpenChange={open => {
        if (!open) onClose()
      }}
      title={
        panel === "add"
          ? editingPart
            ? "编辑零件"
            : "新增零件"
          : "批量导入零件"
      }
      description={
        panel === "add"
          ? editingPart
            ? "修改零件基础信息与价格配置"
            : "填写零件信息，系统会自动生成零件编号"
          : "上传 Excel 文件后，系统会先解析并校验数据"
      }
      width={width}
    >
      <div className={panel === "add" ? "block" : "hidden"}>
        <PartForm
          form={form}
          editingPart={editingPart}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </div>

      {panel === "import" && (
        <PartImportPanel
          onImport={onImport}
          onClose={onClose}
        />
      )}
    </ErpSheet>
  )
}
