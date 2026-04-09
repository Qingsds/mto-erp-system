/**
 * 通用零件选择弹窗。
 *
 * 当前提供：
 * - 名称 / 编号 / 材质搜索
 * - 零件列表选择
 * - 标准价预览
 *
 * 订单、发货等需要“从零件库选择零件”的场景都可以复用。
 */

import { useMemo, useRef, useState } from "react"
import { EmptyStateBlock } from "@/components/common/EmptyStateBlock"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  apiPricesToForm,
  type PartListItem,
} from "@/hooks/api/useParts"
import { useCanViewMoney } from "@/lib/permissions"
import { useUIStore } from "@/store/ui.store"

interface PartPickerDialogProps {
  open: boolean
  parts: PartListItem[]
  selectedPartId?: number
  onClose: () => void
  onSelect: (part: PartListItem) => void
}

function formatPrice(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function PartPickerDialog({
  open,
  parts,
  selectedPartId,
  onClose,
  onSelect,
}: PartPickerDialogProps) {
  const { isMobile } = useUIStore()
  const canViewMoney = useCanViewMoney()
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredParts = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return parts

    return parts.filter(part =>
      part.name.toLowerCase().includes(keyword) ||
      part.partNumber.toLowerCase().includes(keyword) ||
      part.material.toLowerCase().includes(keyword),
    )
  }, [parts, query])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery("")
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        className='max-w-[calc(100vw-16px)] gap-0 overflow-hidden p-0 sm:max-w-xl'
        showCloseButton={false}
        onOpenAutoFocus={event => {
          if (isMobile) {
            event.preventDefault()
          }
        }}
      >
        <DialogHeader className='px-4 pb-0 pt-4'>
          <DialogTitle className='text-sm font-medium text-foreground'>
            选择零件
          </DialogTitle>
          <DialogDescription className='text-xs'>
            先按名称、编号或材质搜索，再从结果中点按选中零件。
          </DialogDescription>
        </DialogHeader>

        <div className='border-b border-border px-4 py-3'>
          <div className='flex h-9 items-center gap-2 border border-input bg-background px-3'>
            <i className='ri-search-line shrink-0 text-sm text-muted-foreground' />
            <input
              ref={inputRef}
              autoFocus={!isMobile}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder='搜索名称、编号、材质…'
              className='flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground'
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("")
                  if (!isMobile) {
                    inputRef.current?.focus()
                  }
                }}
                className='cursor-pointer border-none bg-transparent p-0 text-muted-foreground hover:text-foreground'
              >
                <i className='ri-close-line text-xs' />
              </button>
            )}
          </div>
          <div className='mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground'>
            <span>
              {query
                ? `找到 ${filteredParts.length} 个零件`
                : `共 ${parts.length} 个零件`}
            </span>
            {selectedPartId ? (
              <span className='text-primary'>
                已高亮当前选择
              </span>
            ) : (
              <span>点按即可选中</span>
            )}
          </div>
        </div>

        <div
          className='overflow-y-auto'
          style={{ maxHeight: 420 }}
        >
          {filteredParts.length === 0 ? (
            <EmptyStateBlock
              icon='ri-search-line'
              title={`没有匹配「${query}」的零件`}
              description='请尝试缩短关键词，或改用零件编号、材质进行搜索。'
              className='border-0 shadow-none'
              contentClassName='py-12'
            />
          ) : (
            <div className='divide-y divide-border'>
              {filteredParts.map(part => {
                const prices = apiPricesToForm(part.commonPrices)
                const primaryPrice =
                  prices.find(price => price.label === "标准价") ??
                  prices[0]
                const isSelected = part.id === selectedPartId

                return (
                  <button
                    key={part.id}
                    type='button'
                    onClick={() => {
                      onSelect(part)
                      setQuery("")
                    }}
                    className={
                      isSelected
                        ? "flex w-full items-center gap-4 border-none bg-primary/5 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-primary/10"
                        : "flex w-full items-center gap-4 border-none bg-transparent px-4 py-3 text-left transition-colors cursor-pointer hover:bg-muted/50"
                    }
                  >
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center bg-primary/10'>
                      <i className='ri-settings-3-line text-sm text-primary' />
                    </div>

                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-medium text-foreground'>
                        {part.name}
                      </p>
                      <p className='mt-0.5 font-mono text-xs text-muted-foreground'>
                        {part.partNumber}
                        <span className='mx-1.5 opacity-40'>·</span>
                        {part.material}
                        {part.spec && (
                          <span className='ml-1.5 opacity-60'>
                            {part.spec}
                          </span>
                        )}
                      </p>
                    </div>

                    {canViewMoney && primaryPrice && (
                      <div className='shrink-0 text-right'>
                        <p className='font-mono text-sm font-medium text-foreground'>
                          ¥{formatPrice(primaryPrice.value)}
                        </p>
                        <p className='text-[11px] text-muted-foreground'>
                          {primaryPrice.label}
                        </p>
                      </div>
                    )}

                    {isSelected ? (
                      <span className='shrink-0 text-xs font-medium text-primary'>
                        已选
                      </span>
                    ) : (
                      <i className='ri-arrow-right-s-line shrink-0 text-muted-foreground/40' />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
