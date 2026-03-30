/**
 * 零件列表页的共享状态编排。
 *
 * 统一处理：
 * - 列表查询
 * - 新增 / 编辑 / 导入抽屉状态
 * - 提交与删除动作
 *
 * 这样桌面端和移动端只保留各自的展示逻辑。
 */

import { useCallback, useState } from "react"
import {
  useCreatePart,
  useDeletePart,
  useGetParts,
  useImportParts,
  useUpdatePart,
  formPricesToApi,
  type PartListItem,
} from "@/hooks/api/useParts"
import { usePartForm } from "@/pages/parts/manage/PartForm"
import type { ImportRow, PartFormValues } from "@/pages/parts/parts.schema"
import type { PartsQuickAction } from "./PartsPage"

export type PartPanelMode = "add" | "import" | null

interface UsePartsPageControllerOptions {
  keyword: string
  quickAction?: PartsQuickAction
  pageSize?: number
}

function resolveInitialPanel(
  quickAction?: PartsQuickAction,
): PartPanelMode {
  if (quickAction === "new") return "add"
  if (quickAction === "import") return "import"
  return null
}

export function usePartsPageController({
  keyword,
  quickAction,
  pageSize = 20,
}: UsePartsPageControllerOptions) {
  const [panel, setPanel] = useState<PartPanelMode>(
    resolveInitialPanel(quickAction),
  )
  const [editingPart, setEditingPart] = useState<PartListItem | null>(
    null,
  )
  const [page, setPage] = useState(1)

  const form = usePartForm()

  const { data, isLoading, isFetching } = useGetParts({
    page,
    pageSize,
    keyword: keyword || undefined,
  })

  const createPart = useCreatePart()
  const updatePart = useUpdatePart()
  const deletePart = useDeletePart()
  const importParts = useImportParts()

  const parts = data?.data ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const closePanel = useCallback(() => {
    setPanel(null)
    setEditingPart(null)
  }, [])

  const openAddPanel = useCallback(() => {
    setEditingPart(null)
    setPanel("add")
  }, [])

  const openImportPanel = useCallback(() => {
    setPanel("import")
  }, [])

  const openEditPanel = useCallback((part: PartListItem) => {
    setEditingPart(part)
    setPanel("add")
  }, [])

  const handleDelete = useCallback(async (part: PartListItem) => {
    const confirmed = window.confirm(
      `确认删除零件「${part.name}」吗？删除后无法恢复。`,
    )
    if (!confirmed) return

    await deletePart.mutateAsync(part.id)

    if (editingPart?.id === part.id) {
      closePanel()
    }
  }, [closePanel, deletePart, editingPart?.id])

  const handleSubmit = useCallback(async (values: PartFormValues) => {
    const payload = {
      name: values.name,
      material: values.material,
      spec: values.spec,
      commonPrices: formPricesToApi(values.prices),
    }

    if (editingPart) {
      await updatePart.mutateAsync({ id: editingPart.id, ...payload })
    } else {
      await createPart.mutateAsync(payload)
    }

    closePanel()
  }, [closePanel, createPart, editingPart, updatePart])

  const handleImport = useCallback(async (rows: ImportRow[]) => {
    await importParts.mutateAsync(
      rows.map(row => ({
        name: row.零件名称,
        material: row.零件材质,
        spec: row.规格,
        commonPrices: { 标准价: row.零件价格 },
      })),
    )

    closePanel()
  }, [closePanel, importParts])

  return {
    form,
    panel,
    page,
    parts,
    totalCount,
    totalPages,
    editingPart,
    isLoading,
    isFetching,
    closePanel,
    setPage,
    openAddPanel,
    openEditPanel,
    openImportPanel,
    handleDelete,
    handleImport,
    handleSubmit,
  }
}
