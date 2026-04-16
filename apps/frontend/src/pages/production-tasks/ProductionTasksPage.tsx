import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAllProductionTasks } from '@/hooks/api/useProductionTasks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { TopLevelPageWrapper } from '@/components/common/TopLevelPageWrapper';
import { DataTable } from '@/components/common/DataTable';
import { TableToolbar, StatusFilterBar } from '@/components/common/TableToolbar';
import { TaskStatusBadge, TaskUrgencyBadge } from '../orders/shared/TaskBadge';
import { Button } from '@/components/ui/button';
import { ErpSheet } from '@/components/common/ErpSheet';
import { TaskDetailPanel } from '../orders/detail/TaskDetailPanel';
import { getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import {
  buildProductionTasksPageSearch,
  getProductionTasksSearchState,
  type ProductionTaskStatusFilter,
  type ProductionTasksPageSearch,
} from './search';

export default function ProductionTasksPage({
  search,
}: {
  search: ProductionTasksPageSearch
}) {
  const navigate = useNavigate({ from: '/production-tasks' });
  const state = getProductionTasksSearchState(search);
  const debouncedKeyword = useDebouncedValue(state.keyword, 500);

  const { data, isLoading } = useAllProductionTasks({
    page: state.page,
    pageSize: state.pageSize,
    keyword: debouncedKeyword,
    status: state.status === 'all' ? undefined : state.status
  });

  const tasks = data?.data ?? [];

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'partName',
      header: '零件信息',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.orderItem.part.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.orderItem.part.partNumber}</span>
        </div>
      )
    },
    {
      accessorKey: 'customer',
      header: '客户',
      cell: ({ row }) => row.original.orderItem.order.customerName
    },
    {
      accessorKey: 'qty',
      header: '排产数量',
      cell: ({ row }) => <span className="font-mono">{row.original.orderItem.orderedQty}</span>
    },
    {
      accessorKey: 'targetDate',
      header: '交期',
      cell: ({ row }) => <span className="text-sm">{dayjs(row.original.targetDate).format('YYYY-MM-DD')}</span>
    },
    {
      accessorKey: 'urgency',
      header: '紧急度',
      cell: ({ row }) => <TaskUrgencyBadge urgency={row.original.urgency} />
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <TaskStatusBadge status={row.original.status} />
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void navigate({
              search: prev =>
                buildProductionTasksPageSearch({
                  ...getProductionTasksSearchState(prev as ProductionTasksPageSearch),
                  taskId: row.original.id,
                }),
            })
          }}
        >
          详情/反馈
        </Button>
      )
    }
  ], [navigate]);

  const table = useReactTable({
    data: tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const statuses = [
    { value: 'all', label: '全部' },
    { value: 'PENDING', label: '待排产' },
    { value: 'IN_PRODUCTION', label: '生产中' },
    { value: 'QUALITY_CHECK', label: '质检中' },
    { value: 'COMPLETED', label: '已入库' }
  ];

  const totalPages = Math.max(1, data ? Math.ceil(data.total / state.pageSize) : 1);

  const updateSearch = (patch: Partial<ReturnType<typeof getProductionTasksSearchState>>) => {
    void navigate({
      search: prev => {
        const current = getProductionTasksSearchState(prev as ProductionTasksPageSearch)
        return buildProductionTasksPageSearch({
          ...current,
          ...patch,
        })
      },
      replace: true,
    })
  }

  return (
    <TopLevelPageWrapper fillHeight inset='flush'>
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        emptyText="暂无生产任务"
        globalFilter={debouncedKeyword}
        toolbar={
          <TableToolbar
            title='生产任务'
            count={isLoading ? "加载中…" : `共 ${data?.total ?? 0} 项任务`}
            globalFilter={state.keyword}
            onFilterChange={v => { updateSearch({ keyword: v, page: 1 }); }}
            searchPlaceholder='搜索零件名称…'
          />
        }
        filterBar={
          <StatusFilterBar
            tabs={statuses}
            value={state.status}
            onChange={v => {
              updateSearch({
                status: v as ProductionTaskStatusFilter,
                page: 1,
              })
            }}
            footer={
              totalPages > 1
                ? (
                    <div className='ml-auto flex items-center gap-2 border-l border-border px-2 text-xs text-muted-foreground'>
                      <button
                        type='button'
                        onClick={() => updateSearch({ page: Math.max(1, state.page - 1) })}
                        disabled={state.page <= 1}
                        className='cursor-pointer border-none bg-transparent px-1.5 py-0.5 hover:bg-muted disabled:opacity-30'
                      >
                        <i className='ri-arrow-left-s-line' />
                      </button>
                      <span>
                        {state.page} / {totalPages}
                      </span>
                      <button
                        type='button'
                        onClick={() => updateSearch({ page: Math.min(totalPages, state.page + 1) })}
                        disabled={state.page >= totalPages}
                        className='cursor-pointer border-none bg-transparent px-1.5 py-0.5 hover:bg-muted disabled:opacity-30'
                      >
                        <i className='ri-arrow-right-s-line' />
                      </button>
                    </div>
                  )
                : undefined
            }
          />
        }
      />

      <ErpSheet
        open={!!state.taskId}
        onOpenChange={(o) => !o && updateSearch({ taskId: null })}
        title="生产任务详情"
        description="查看状态与业务沟通留言"
      >
        {state.taskId && <TaskDetailPanel taskId={state.taskId} />}
      </ErpSheet>
    </TopLevelPageWrapper>
  );
}
