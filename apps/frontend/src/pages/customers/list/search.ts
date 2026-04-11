export type CustomerStatusFilter = "all" | "active" | "inactive"

export interface CustomersPageSearch {
  keyword?: string
  status?: "active" | "inactive"
  page?: number
}

function normalizeKeyword(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const keyword = value.trim()
  return keyword ? keyword : undefined
}

function normalizeStatus(value: unknown): CustomersPageSearch["status"] {
  return value === "active" || value === "inactive" ? value : undefined
}

function normalizePage(value: unknown): number | undefined {
  const page = Number(value)
  if (!Number.isInteger(page) || page <= 1) {
    return undefined
  }
  return page
}

export function validateCustomersPageSearch(
  search: Record<string, unknown>,
): CustomersPageSearch {
  const keyword = normalizeKeyword(search.keyword)
  const status = normalizeStatus(search.status)
  const page = normalizePage(search.page)

  return {
    ...(keyword ? { keyword } : {}),
    ...(status ? { status } : {}),
    ...(page ? { page } : {}),
  }
}

export function getCustomersSearchState(search: CustomersPageSearch) {
  return {
    keyword: search.keyword ?? "",
    status: (search.status ?? "all") as CustomerStatusFilter,
    page: search.page ?? 1,
  }
}

export function buildCustomersPageSearch(input: {
  keyword: string
  status: CustomerStatusFilter
  page: number
}): CustomersPageSearch {
  const keyword = input.keyword.trim()

  return {
    ...(keyword ? { keyword } : {}),
    ...(input.status !== "all" ? { status: input.status } : {}),
    ...(input.page > 1 ? { page: input.page } : {}),
  }
}

