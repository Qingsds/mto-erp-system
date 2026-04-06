/**
 * 零件列表列定义。
 *
 * 直接使用 API 返回的 `PartListItem`，
 * 价格列优先展示标准价，再按需展开其余价格。
 */

import { Link } from "@tanstack/react-router"
import { createColumnHelper } from "@tanstack/react-table"
import { ExpandablePanelCell } from "@/components/common/ExpandablePanelCell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  apiPricesToForm,
  getPrimaryPartPrice,
  type PartListItem,
} from "@/hooks/api/useParts"

const column = createColumnHelper<PartListItem>()

function formatPrice(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function getPartsColumns(
  onEdit: (part: PartListItem) => void,
  onDelete: (part: PartListItem) => void,
  options?: {
    canViewMoney?: boolean
    canManage?: boolean
  },
) {
  const columns = [
    column.accessor("partNumber", {
      header: "零件编号",
      size: 120,
      cell: info => (
        <span className='font-mono text-xs whitespace-nowrap text-muted-foreground'>
          {info.getValue()}
        </span>
      ),
    }),

    column.accessor("name", {
      header: "零件名称",
      size: 200,
      cell: info => (
        <Link
          to='/parts/$id'
          params={{ id: String(info.row.original.id) }}
          className='text-sm font-medium text-foreground transition-colors group-hover/row:text-primary'
        >
          {info.getValue()}
        </Link>
      ),
    }),

    column.accessor("material", {
      header: "材质",
      size: 110,
      cell: info => (
        <Badge
          variant='secondary'
          className='font-normal'
        >
          {info.getValue()}
        </Badge>
      ),
    }),

    column.accessor("spec", {
      header: "规格",
      size: 130,
      cell: info => (
        <span className='text-xs text-muted-foreground'>
          {info.getValue() ?? "—"}
        </span>
      ),
    }),

    column.accessor("createdAt", {
      header: "创建日期",
      size: 100,
      cell: info => (
        <span className='font-mono text-xs whitespace-nowrap text-muted-foreground'>
          {info.getValue().slice(0, 10)}
        </span>
      ),
    }),

  ]

  if (options?.canViewMoney ?? true) {
    columns.splice(4, 0, column.accessor("commonPrices", {
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
      cell: info => {
        const prices = apiPricesToForm(info.getValue()) ?? []
        if (prices.length === 0) {
          return <span className='text-xs text-muted-foreground'>—</span>
        }

        const primary = getPrimaryPartPrice(info.getValue())
        const preview = primary
          ? [primary, ...prices.filter(price => price.label !== primary.label)].slice(0, 2)
          : prices.slice(0, 2)
        const extraCount = Math.max(prices.length - preview.length, 0)

        return (
          <ExpandablePanelCell
            items={prices}
            summary={preview.map(price => `${price.label} ¥${formatPrice(price.value)}`).join(" / ")}
            extraCount={extraCount}
            panelTitle='价格字典明细'
            panelSubtitle={`共 ${prices.length} 条价格配置`}
            contentClassName='w-[360px]'
            getKey={price => price.label}
            renderItem={price => (
              <div className='flex items-center justify-between gap-3'>
                <span className='min-w-0 truncate text-sm text-foreground'>
                  {price.label}
                </span>
                <span className='shrink-0 font-mono text-sm tabular-nums text-foreground'>
                  ¥{formatPrice(price.value)}
                </span>
              </div>
            )}
          />
        )
      },
    }))
  }

  if (options?.canManage ?? true) {
    columns.push(column.display({
      id: "actions",
      size: 100,
      cell: info => (
        <div className='flex items-center justify-end gap-1 opacity-40 transition-opacity group-hover/row:opacity-100'>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 px-2 text-xs'
            onClick={event => {
              event.stopPropagation()
              onEdit(info.row.original)
            }}
          >
            <i className='ri-edit-line mr-1' />
            编辑
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 px-2 text-xs text-destructive hover:text-destructive'
            onClick={event => {
              event.stopPropagation()
              onDelete(info.row.original)
            }}
          >
            <i className='ri-delete-bin-line' />
          </Button>
        </div>
      ),
    }))
  }

  return columns
}
