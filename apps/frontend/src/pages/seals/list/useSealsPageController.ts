/**
 * 印章列表页状态编排。
 *
 * 只负责：
 * - 列表数据拉取
 * - 摘要统计
 * - 注册抽屉开关
 * - 启停操作与错误承载
 * - 跳转使用记录页
 */

import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  type SealListItem,
  useGetSeals,
  useReprocessExistingSeals,
  useUpdateSealStatus,
} from "@/hooks/api/useSeals"

function resolveErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "印章数据加载失败"
}

export function useSealsPageController() {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading, isFetching, error } = useGetSeals()
  const updateStatus = useUpdateSealStatus()
  const reprocessExisting = useReprocessExistingSeals()
  const seals = data ?? []
  const activeCount = seals.filter(seal => seal.isActive).length

  const summary = {
    total: seals.length,
    active: activeCount,
    inactive: Math.max(0, seals.length - activeCount),
  }

  const subtitle = isFetching && !isLoading
    ? "印章列表刷新中…"
    : `共 ${summary.total} 枚印章，启用 ${summary.active} 枚，停用 ${summary.inactive} 枚`

  const handleToggleStatus = async (seal: SealListItem) => {
    try {
      setActionError(null)
      await updateStatus.mutateAsync({
        id: seal.id,
        isActive: !seal.isActive,
      })
    } catch (toggleError) {
      setActionError(
        toggleError instanceof Error ? toggleError.message : "状态更新失败",
      )
    }
  }

  const handleOpenLogs = (seal: SealListItem) => {
    navigate({
      to: "/seals/$id/logs",
      params: { id: String(seal.id) },
    })
  }

  const handleReprocessExisting = async () => {
    try {
      setActionError(null)
      await reprocessExisting.mutateAsync()
    } catch (reprocessError) {
      setActionError(
        reprocessError instanceof Error ? reprocessError.message : "历史印章补处理失败",
      )
    }
  }

  return {
    seals,
    isLoading,
    createOpen,
    actionError,
    queryError: error,
    subtitle,
    openCreate: () => setCreateOpen(true),
    closeCreate: () => setCreateOpen(false),
    clearActionError: () => setActionError(null),
    handleToggleStatus,
    handleOpenLogs,
    handleReprocessExisting,
    isUpdatingSeal: (sealId: number) =>
      updateStatus.isPending && updateStatus.variables?.id === sealId,
    isReprocessingExisting: reprocessExisting.isPending,
    resolveQueryError: () => resolveErrorMessage(error),
  }
}
