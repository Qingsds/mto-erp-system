/**
 * 印章列表页入口。
 *
 * 只负责根据终端类型切换桌面版和移动版实现，
 * 避免把列表壳、状态编排和卡片渲染重新揉回一个文件。
 */

import { useUIStore } from "@/store/ui.store"
import { CreateSealSheet } from "./CreateSealSheet"
import { SealsDesktop } from "./SealsDesktop"
import { SealsMobile } from "./SealsMobile"
import { useSealsPageController } from "./useSealsPageController"

export function SealsPage() {
  const { isMobile } = useUIStore()
  const controller = useSealsPageController()

  return (
    <>
      {isMobile
        ? <SealsMobile controller={controller} />
        : <SealsDesktop controller={controller} />}

      <CreateSealSheet
        open={controller.createOpen}
        onOpenChange={open => {
          if (!open) {
            controller.closeCreate()
          }
        }}
      />
    </>
  )
}
