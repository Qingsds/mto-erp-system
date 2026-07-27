import { useCallback, useMemo, useState } from "react";
import type { OrderListItem } from "@/hooks/api/useOrders";

export function useOrderMergeSelection() {
  const [selectedById, setSelectedById] = useState<Map<number, OrderListItem>>(
    () => new Map(),
  );

  const selectedOrders = useMemo(
    () => Array.from(selectedById.values()),
    [selectedById],
  );
  const selectedCustomerId = selectedOrders[0]?.customerId ?? null;

  const getDisabledReason = useCallback(
    (order: OrderListItem) => {
      if (!order.customerId) {
        return "该订单缺少客户主数据，不能合并";
      }
      if (order.mergedOrder && !selectedById.has(order.id)) {
        return `该订单已属于 ${order.mergedOrder.mergedNo}`;
      }
      if (
        selectedCustomerId &&
        order.customerId !== selectedCustomerId &&
        !selectedById.has(order.id)
      ) {
        return "只能选择同一客户的订单";
      }
      return null;
    },
    [selectedById, selectedCustomerId],
  );

  const toggleOrder = useCallback((order: OrderListItem) => {
    setSelectedById((current) => {
      const next = new Map(current);
      if (next.has(order.id)) {
        next.delete(order.id);
        return next;
      }

      const firstCustomerId = next.values().next().value?.customerId ?? null;
      if (
        !order.customerId ||
        order.mergedOrder ||
        (firstCustomerId && firstCustomerId !== order.customerId)
      ) {
        return current;
      }

      next.set(order.id, order);
      return next;
    });
  }, []);

  const toggleVisibleOrders = useCallback((orders: OrderListItem[]) => {
    setSelectedById((current) => {
      const next = new Map(current);
      const firstCustomerId = next.values().next().value?.customerId ?? null;
      const targetCustomerId =
        firstCustomerId ??
        orders.find(
          (order) => !!order.customerId && !order.mergedOrder,
        )?.customerId ??
        null;
      const selectable = orders.filter(
        (order) =>
          !!order.customerId &&
          !order.mergedOrder &&
          order.customerId === targetCustomerId,
      );
      const shouldClear =
        selectable.length > 0 &&
        selectable.every((order) => next.has(order.id));

      selectable.forEach((order) => {
        if (shouldClear) next.delete(order.id);
        else next.set(order.id, order);
      });
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedById(new Map()), []);

  return {
    selectedOrders,
    selectedIds: new Set(selectedById.keys()),
    selectedCustomerId,
    getDisabledReason,
    toggleOrder,
    toggleVisibleOrders,
    clearSelection,
  };
}
