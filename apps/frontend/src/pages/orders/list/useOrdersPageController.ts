/**
 * 订单列表页共享状态编排。
 *
 * 统一处理：
 * - URL query 与页面筛选状态同步
 * - 列表查询
 * - 分页、状态筛选、搜索、详情跳转
 */

import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useGetMergedOrders,
  useGetOrderDrafts,
  useGetOrders,
} from "@/hooks/api/useOrders";
import { STATUS_LABEL } from "../orders.schema";
import {
  buildOrdersPageSearch,
  getOrdersSearchState,
  type OrdersPageSearch,
  type OrderStatusFilter,
  type OrdersTab,
  type OrdersViewFilter,
} from "./search";

interface UseOrdersPageControllerOptions {
  search: OrdersPageSearch;
  pageSize: number;
}

export function useOrdersPageController({
  search,
  pageSize,
}: UseOrdersPageControllerOptions) {
  const navigate = useNavigate();
  const state = getOrdersSearchState(search);
  const debouncedKeyword = useDebouncedValue(state.keyword.trim(), 300);

  const ordersQuery = useGetOrders(
    {
      page: state.page,
      pageSize,
      status: state.status === "all" ? undefined : state.status,
      customerName: debouncedKeyword || undefined,
    },
    { enabled: state.tab === "orders" },
  );

  const draftsQuery = useGetOrderDrafts(
    {
      page: state.page,
      pageSize,
      keyword: debouncedKeyword || undefined,
    },
    { enabled: state.tab === "drafts" },
  );

  const mergedOrdersQuery = useGetMergedOrders(
    {
      page: state.page,
      pageSize,
      keyword: debouncedKeyword || undefined,
    },
    { enabled: state.tab === "merged" },
  );

  const orders = state.tab === "orders" ? (ordersQuery.data?.data ?? []) : [];
  const totalCount =
    state.tab === "orders"
      ? (ordersQuery.data?.total ?? 0)
      : state.tab === "drafts"
        ? (draftsQuery.data?.total ?? 0)
        : (mergedOrdersQuery.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasActiveFilters =
    state.keyword.length > 0 ||
    (state.tab === "orders" && state.status !== "all");

  const commitSearch = useCallback(
    (next: {
      keyword?: string;
      tab?: OrdersTab;
      status?: OrderStatusFilter;
      page?: number;
    }) => {
      void navigate({
        to: "/orders",
        replace: true,
        search: buildOrdersPageSearch({
          keyword: next.keyword ?? state.keyword,
          tab: next.tab ?? state.tab,
          status: next.status ?? state.status,
          page: next.page ?? state.page,
        }),
      });
    },
    [navigate, state.keyword, state.page, state.status, state.tab],
  );

  useEffect(() => {
    if (
      (ordersQuery.data || draftsQuery.data || mergedOrdersQuery.data) &&
      state.page > totalPages
    ) {
      commitSearch({ page: totalPages });
    }
  }, [
    commitSearch,
    draftsQuery.data,
    mergedOrdersQuery.data,
    ordersQuery.data,
    state.page,
    totalPages,
  ]);

  const viewFilter: OrdersViewFilter =
    state.tab === "orders" ? state.status : state.tab;

  const statusTabs = useMemo(
    () => [
      { value: "drafts" as const, label: "草稿" },
      { value: "merged" as const, label: "合并订单" },
      { value: "all" as const, label: "全部" },
      { value: "PENDING" as const, label: STATUS_LABEL.PENDING },
      {
        value: "PARTIAL_SHIPPED" as const,
        label: STATUS_LABEL.PARTIAL_SHIPPED,
      },
      { value: "SHIPPED" as const, label: STATUS_LABEL.SHIPPED },
      {
        value: "CLOSED_SHORT" as const,
        label: STATUS_LABEL.CLOSED_SHORT,
      },
    ],
    [],
  );

  return {
    keyword: state.keyword,
    tab: state.tab,
    statusFilter: viewFilter,
    page: state.page,
    orders,
    drafts: state.tab === "drafts" ? (draftsQuery.data?.data ?? []) : [],
    mergedOrders:
      state.tab === "merged" ? (mergedOrdersQuery.data?.data ?? []) : [],
    totalCount,
    totalPages,
    statusTabs,
    hasActiveFilters,
    isLoading:
      state.tab === "orders"
        ? ordersQuery.isLoading
        : state.tab === "drafts"
          ? draftsQuery.isLoading
          : mergedOrdersQuery.isLoading,
    isFetching:
      state.tab === "orders"
        ? ordersQuery.isFetching
        : state.tab === "drafts"
          ? draftsQuery.isFetching
          : mergedOrdersQuery.isFetching,
    setKeyword: (keyword: string) => commitSearch({ keyword, page: 1 }),
    setStatusFilter: (filter: OrdersViewFilter) => {
      if (filter === "drafts") {
        commitSearch({ tab: "drafts", page: 1, status: "all" });
        return;
      }
      if (filter === "merged") {
        commitSearch({ tab: "merged", page: 1, status: "all" });
        return;
      }
      commitSearch({ tab: "orders", status: filter, page: 1 });
    },
    setPage: (page: number) => commitSearch({ page: Math.max(1, page) }),
    resetFilters: () => commitSearch({ keyword: "", status: "all", page: 1 }),
    openDetail: (orderId: number) => {
      void navigate({
        to: "/orders/$id",
        params: { id: String(orderId) },
      });
    },
    openDraft: (draftId: number) => {
      void navigate({
        to: "/orders/drafts/$id",
        params: { id: String(draftId) },
      });
    },
    openMergedOrder: (mergedOrderId: number) => {
      void navigate({
        to: "/orders/merged/$id",
        params: { id: String(mergedOrderId) },
      });
    },
    openCreate: () => {
      void navigate({ to: "/orders/new" });
    },
  };
}
