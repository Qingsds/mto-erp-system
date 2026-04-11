import { useCallback, useEffect, useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useGetCustomers } from "@/hooks/api/useCustomers"
import {
  buildCustomersPageSearch,
  getCustomersSearchState,
  type CustomerStatusFilter,
  type CustomersPageSearch,
} from "./search"

interface UseCustomersPageControllerOptions {
  search: CustomersPageSearch
  pageSize: number
}

export function useCustomersPageController({
  search,
  pageSize,
}: UseCustomersPageControllerOptions) {
  const navigate = useNavigate()
  const state = getCustomersSearchState(search)
  const debouncedKeyword = useDebouncedValue(state.keyword.trim(), 300)

  const { data, isLoading, isFetching } = useGetCustomers({
    page: state.page,
    pageSize,
    keyword: debouncedKeyword || undefined,
    isActive:
      state.status === "active"
        ? "true"
        : state.status === "inactive"
          ? "false"
          : undefined,
  })

  const customers = data?.data ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const hasActiveFilters = state.keyword.length > 0 || state.status !== "all"

  const commitSearch = useCallback((next: {
    keyword?: string
    status?: CustomerStatusFilter
    page?: number
  }) => {
    void navigate({
      to: "/customers",
      replace: true,
      search: buildCustomersPageSearch({
        keyword: next.keyword ?? state.keyword,
        status: next.status ?? state.status,
        page: next.page ?? state.page,
      }),
    })
  }, [navigate, state.keyword, state.page, state.status])

  useEffect(() => {
    if (data && state.page > totalPages) {
      commitSearch({ page: totalPages })
    }
  }, [commitSearch, data, state.page, totalPages])

  const statusTabs = useMemo(
    () => [
      { value: "all" as const, label: "全部" },
      { value: "active" as const, label: "启用" },
      { value: "inactive" as const, label: "停用" },
    ],
    [],
  )

  return {
    keyword: state.keyword,
    statusFilter: state.status,
    page: state.page,
    customers,
    totalCount,
    totalPages,
    statusTabs,
    hasActiveFilters,
    isLoading,
    isFetching,
    setKeyword: (keyword: string) =>
      commitSearch({ keyword, page: 1 }),
    setStatusFilter: (status: CustomerStatusFilter) =>
      commitSearch({ status, page: 1 }),
    setPage: (page: number) =>
      commitSearch({ page: Math.max(1, page) }),
    resetFilters: () =>
      commitSearch({ keyword: "", status: "all", page: 1 }),
    openDetail: (customerId: number) => {
      void navigate({
        to: "/customers/$id",
        params: { id: String(customerId) },
      })
    },
  }
}

