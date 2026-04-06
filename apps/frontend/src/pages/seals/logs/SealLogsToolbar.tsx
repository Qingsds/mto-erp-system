/**
 * 印章使用记录页顶栏。
 */

import type { SealListItem } from "@/hooks/api/useSeals"
import { DetailPageToolbar } from "@/components/common/DetailPageToolbar"
import { SealStatusBadge } from "../list/SealStatusBadge"

interface SealLogsToolbarProps {
  seal: SealListItem
  onBack: () => void
}

export function SealLogsToolbar({
  seal,
  onBack,
}: SealLogsToolbarProps) {
  return (
    <DetailPageToolbar
      title={`${seal.name} 使用记录`}
      subtitle={`印章 ID: ${seal.id}`}
      backLabel='返回'
      onBack={onBack}
      meta={<SealStatusBadge isActive={seal.isActive} />}
    />
  )
}
