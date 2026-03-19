/**
 * ErpSheet
 *
 * 统一的抽屉容器，自动处理：
 *  - Desktop → 右侧抽屉，可配置宽度
 *  - Mobile  → 底部半屏，圆角顶部
 *
 * 用法：
 *   <ErpSheet open={panel !== null} onOpenChange={o => !o && setPanel(null)}
 *             title="新建订单" description="填写零件明细">
 *     <OrderForm ... />
 *   </ErpSheet>
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { useUIStore } from "@/store/ui.store"
import type { ReactNode } from "react"

interface ErpSheetProps {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  title:         ReactNode
  description?:  ReactNode
  /** Desktop 抽屉宽度，单位 px，默认 540 */
  width?:        number
  children:      ReactNode
}

export function ErpSheet({
  open,
  onOpenChange,
  title,
  description,
  width = 540,
  children,
}: ErpSheetProps) {
  const { isMobile } = useUIStore()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[92vh] flex flex-col rounded-t-2xl"
        >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-6 pb-4">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="overflow-y-auto sm:max-w-none"
        style={{ width }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="mt-8">{children}</div>
      </SheetContent>
    </Sheet>
  )
}