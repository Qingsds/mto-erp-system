/**
 * parts.columns.tsx
 *
 * TanStack Table columns for PartListItem（API 类型，来自 useParts.ts）
 * commonPrices（Record）在单元格内用 apiPricesToForm 转为数组展示
 */

import { createColumnHelper } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExpandablePanelCell } from "@/components/common/ExpandablePanelCell"
import { apiPricesToForm } from "@/hooks/api/useParts"
import type { PartListItem } from "@/hooks/api/useParts"
import { Link } from "@tanstack/react-router"

const col = createColumnHelper<PartListItem>()

function formatPrice(value: number) {
  return value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getPartsColumns(
  onEdit: (p: PartListItem) => void,
  onDelete: (p: PartListItem) => void,
) {
  return [
    col.accessor("partNumber", {
      header: "零件编号",
      size: 120,
      cell: i => (
        <span className='font-mono text-xs text-muted-foreground whitespace-nowrap'>
          {i.getValue()}
        </span>
      ),
    }),

    col.accessor("name", {
      header: "零件名称",
      size: 200,
      cell: i => (
        <Link
          params={{ id: String(i.row.original.id) }}
          to='/parts/$id'
          className='font-medium text-foreground text-sm group-hover/row:text-primary transition-colors'
        >
          {i.getValue()}
        </Link>
      ),
    }),

    col.accessor("material", {
      header: "材质",
      size: 110,
      cell: i => (
        <Badge
          variant='secondary'
          className='font-normal'
        >
          {i.getValue()}
        </Badge>
      ),
    }),

    col.accessor("spec", {
      header: "规格",
      size: 130,
      cell: i => (
        <span className='text-xs text-muted-foreground'>
          {i.getValue() ?? "—"}
        </span>
      ),
    }),

    // commonPrices: Record<string, number> → 转为数组渲染
    col.accessor("commonPrices", {
      header: () => (
        <span className='inline-flex items-center gap-1.5'>
          价格字典
          <span className='text-[11px] font-normal text-muted-foreground'>
            点击单元格展开
          </span>
        </span>
      ),
      size: 260,
      enableSorting: false,
      cell: i => {
        const prices = apiPricesToForm(i.getValue()) ?? []
        if (prices.length === 0) {
          return <span className='text-xs text-muted-foreground'>—</span>
        }

        const preview = prices.slice(0, 2)
        const extraCount = Math.max(prices.length - preview.length, 0)

        return (
          <ExpandablePanelCell
            items={prices}
            summary={preview.map(p => `${p.label} ¥${formatPrice(p.value)}`).join(" / ")}
            extraCount={extraCount}
            panelTitle="价格字典明细"
            panelSubtitle={`共 ${prices.length} 条价格配置`}
            contentClassName="w-[360px]"
            getKey={p => p.label}
            renderItem={p => (
              <div className='flex items-center justify-between gap-3'>
                <span className='min-w-0 truncate text-sm text-foreground'>{p.label}</span>
                <span className='font-mono shrink-0 text-sm tabular-nums text-foreground'>
                  ¥{formatPrice(p.value)}
                </span>
              </div>
            )}
          />
        )
      },
    }),

    col.accessor("createdAt", {
      header: "创建日期",
      size: 100,
      cell: i => (
        <span className='font-mono text-xs text-muted-foreground whitespace-nowrap'>
          {i.getValue().slice(0, 10)}
        </span>
      ),
    }),

    col.display({
      id: "actions",
      size: 100,
      cell: i => (
        <div className='flex items-center gap-1 justify-end opacity-40 group-hover/row:opacity-100 transition-opacity'>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 px-2 text-xs'
            onClick={e => {
              e.stopPropagation()
              onEdit(i.row.original)
            }}
          >
            <i className='ri-edit-line mr-1' />
            编辑
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 px-2 text-xs text-destructive hover:text-destructive'
            onClick={e => {
              e.stopPropagation()
              onDelete(i.row.original)
            }}
          >
            <i className='ri-delete-bin-line' />
          </Button>
        </div>
      ),
    }),
  ]
}
