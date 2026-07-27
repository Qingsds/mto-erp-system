import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatOrderNo,
  type OrderListItem,
  useCreateMergedOrder,
} from "@/hooks/api/useOrders";
import type { MergedOrderDetail } from "@erp/shared-types";

interface CreateMergedOrderDialogProps {
  open: boolean;
  orders: OrderListItem[];
  onOpenChange: (open: boolean) => void;
  onCreated: (mergedOrder: MergedOrderDetail) => void;
}

export function CreateMergedOrderDialog({
  open,
  orders,
  onOpenChange,
  onCreated,
}: CreateMergedOrderDialogProps) {
  const [remark, setRemark] = useState("");
  const createMergedOrder = useCreateMergedOrder();

  const validationMessage = useMemo(() => {
    if (orders.length < 2) return "至少选择两张订单";
    if (orders.some((order) => !order.customerId))
      return "所选订单中存在未关联客户主数据的订单";
    if (orders.some((order) => order.mergedOrder))
      return "所选订单中存在已合并订单";
    if (orders.some((order) => order.customerId !== orders[0].customerId))
      return "只能合并同一客户的订单";
    return "";
  }, [orders]);
  const orderDateRange = useMemo(() => {
    const dates = orders.map((order) => order.createdAt.slice(0, 10)).sort();
    if (dates.length === 0) return "—";
    return dates[0] === dates[dates.length - 1]
      ? dates[0]
      : `${dates[0]} 至 ${dates[dates.length - 1]}`;
  }, [orders]);

  useEffect(() => {
    if (!open) setRemark("");
  }, [open]);

  const handleSubmit = async () => {
    if (validationMessage) return;
    const result = await createMergedOrder.mutateAsync({
      orderIds: orders.map((order) => order.id),
      remark: remark.trim() || undefined,
    });
    setRemark("");
    onOpenChange(false);
    onCreated(result);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>创建合并订单</DialogTitle>
          <DialogDescription>
            合并单仅用于汇总查看和导出，不会改变原订单及发货单。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border border-border bg-muted/30 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">客户</span>
              <span className="truncate text-sm font-medium">
                {orders[0]?.customerName ?? "—"}
              </span>
            </div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <span className="shrink-0 text-xs text-muted-foreground">
                订单
              </span>
              <div className="flex flex-wrap justify-end gap-1.5">
                {orders.map((order) => (
                  <span
                    key={order.id}
                    className="border border-border bg-background px-2 py-1 font-mono text-xs"
                  >
                    {formatOrderNo(order.id)}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">订单日期</span>
              <span className="font-mono text-xs">{orderDateRange}</span>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">
              备注（选填）
            </span>
            <textarea
              value={remark}
              maxLength={500}
              rows={3}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="填写本次合并用途或说明"
              className="w-full resize-none border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </label>

          {validationMessage && (
            <p className="text-sm text-destructive">{validationMessage}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={!!validationMessage || createMergedOrder.isPending}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {createMergedOrder.isPending && (
              <i className="ri-loader-4-line mr-1.5 animate-spin" />
            )}
            创建合并单
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
