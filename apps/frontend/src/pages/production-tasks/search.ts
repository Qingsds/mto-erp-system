import type { TaskStatusType } from "@erp/shared-types"

export type ProductionTaskStatusFilter = TaskStatusType | "all"
export const DEFAULT_PRODUCTION_TASKS_PAGE_SIZE = 20

export interface ProductionTasksPageSearch {
  keyword?: string
  status?: TaskStatusType
  page?: number
  pageSize?: number
  taskId?: number
}

const TASK_STATUS_SET = new Set<TaskStatusType>([
  "PENDING",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "COMPLETED",
])

function normalizeKeyword(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const keyword = value.trim()
  return keyword ? keyword : undefined
}

function normalizeStatus(value: unknown): TaskStatusType | undefined {
  return typeof value === "string" && TASK_STATUS_SET.has(value as TaskStatusType)
    ? (value as TaskStatusType)
    : undefined
}

function normalizePositiveInt(value: unknown): number | undefined {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined
  }
  return parsed
}

export function validateProductionTasksPageSearch(
  search: Record<string, unknown>,
): ProductionTasksPageSearch {
  const keyword = normalizeKeyword(search.keyword)
  const status = normalizeStatus(search.status)
  const page = normalizePositiveInt(search.page)
  const pageSize = normalizePositiveInt(search.pageSize)
  const taskId = normalizePositiveInt(search.taskId)

  return {
    ...(keyword ? { keyword } : {}),
    ...(status ? { status } : {}),
    ...(page && page > 1 ? { page } : {}),
    ...(pageSize && pageSize !== DEFAULT_PRODUCTION_TASKS_PAGE_SIZE ? { pageSize } : {}),
    ...(taskId ? { taskId } : {}),
  }
}

export function getProductionTasksSearchState(search: ProductionTasksPageSearch) {
  return {
    keyword: search.keyword ?? "",
    status: (search.status ?? "all") as ProductionTaskStatusFilter,
    page: search.page ?? 1,
    pageSize: search.pageSize ?? DEFAULT_PRODUCTION_TASKS_PAGE_SIZE,
    taskId: search.taskId ?? null,
  }
}

export function buildProductionTasksPageSearch(input: {
  keyword: string
  status: ProductionTaskStatusFilter
  page: number
  pageSize: number
  taskId?: number | null
}): ProductionTasksPageSearch {
  const keyword = input.keyword.trim()

  return {
    ...(keyword ? { keyword } : {}),
    ...(input.status !== "all" ? { status: input.status } : {}),
    ...(input.page > 1 ? { page: input.page } : {}),
    ...(input.pageSize !== DEFAULT_PRODUCTION_TASKS_PAGE_SIZE ? { pageSize: input.pageSize } : {}),
    ...(input.taskId ? { taskId: input.taskId } : {}),
  }
}
