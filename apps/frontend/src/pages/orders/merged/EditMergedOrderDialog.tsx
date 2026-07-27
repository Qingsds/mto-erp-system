import { useEffect, useMemo, useState } from "react";
import type { MergedOrderDetail } from "@erp/shared-types";
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
  useGetOrders,
  useUpdateMergedOrder,
} from "@/hooks/api/useOrders";
import { OrderStatusBadge } from "../shared/OrderStatusBadge";

const PAGE_SIZE = 20;

interface EditMergedOrderDialogProps {
  open: boolean;
  mergedOrder: MergedOrderDetail;
  onOpenChange: (open: boolean) => void;
}

export function EditMergedOrderDialog({
  open,
  mergedOrder,
  onOpenChange,
}: EditMergedOrderDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [remark, setRemark] = useState("");
  const [page, setPage] = useState(1);
  const updateMergedOrder = useUpdateMergedOrder();
  const { data, isLoading } = useGetOrders(
    {
      page,
      pageSize: PAGE_SIZE,
      customerId: mergedOrder.customerId,
    },
    { enabled: open },
  );

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set(mergedOrder.orders.map((order) => order.id)));
    setRemark(mergedOrder.remark ?? "");
    setPage(1);
  }, [mergedOrder, open]);

  const currentMemberIds = useMemo(
    () => new Set(mergedOrder.orders.map((order) => order.id)),
    [mergedOrder.orders],
  );
  const candidateOrders = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const handleSave = async () => {
    if (selectedIds.size < 2) return;
    await updateMergedOrder.mutateAsync({
      id: mergedOrder.id,
      payload: {
        orderIds: Array.from(selectedIds),
        remark: remark.trim(),
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>调整合并订单</DialogTitle>
          <DialogDescription>
            仅显示当前客户的正式订单，保存后至少保留两张。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between border border-border bg-muted/20 px-3 py-2 text-xs">
            <span className="text-muted-foreground">已选择</span>
            <span className="font-mono font-semibold">
              {selectedIds.size} 张订单
            </span>
          </div>

          <div className="max-h-[min(46dvh,420px)] overflow-auto border border-border">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">
                加载订单中…
              </div>
            ) : candidateOrders.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                当前客户没有可显示的订单
              </div>
            ) : (
              candidateOrders.map((order) => {
                const occupiedByOther =
                  !!order.mergedOrder &&
                  order.mergedOrder.id !== mergedOrder.id;
                const checked = selectedIds.has(order.id);
                return (
                  <label
                    key={order.id}
                    title={
                      occupiedByOther
                        ? `已属于 ${order.mergedOrder?.mergedNo}`
                        : undefined
                    }
                    className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={
                        occupiedByOther && !currentMemberIds.has(order.id)
                      }
                      onChange={() =>
                        setSelectedIds((current) => {
                          const next = new Set(current);
                          if (next.has(order.id)) next.delete(order.id);
                          else next.add(order.id);
                          return next;
                        })
                      }
                      className="size-4 accent-primary disabled:opacity-30"
                    />
                    <span className="font-mono text-xs">
                      {formatOrderNo(order.id)}
                    </span>
                    <OrderStatusBadge status={order.status} />
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {order.createdAt.slice(0, 10)}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                上一页
              </Button>
              <span>
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                下一页
              </Button>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">
              备注（选填）
            </span>
            <textarea
              value={remark}
              maxLength={500}
              rows={3}
              onChange={(event) => setRemark(event.target.value)}
              className="w-full resize-none border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </label>
          {selectedIds.size < 2 && (
            <p className="text-sm text-destructive">至少选择两张订单</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={selectedIds.size < 2 || updateMergedOrder.isPending}
            onClick={() => {
              void handleSave();
            }}
          >
            {updateMergedOrder.isPending && (
              <i className="ri-loader-4-line mr-1.5 animate-spin" />
            )}
            保存调整
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
