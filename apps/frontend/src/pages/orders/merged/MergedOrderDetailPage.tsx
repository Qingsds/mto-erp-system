import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { DetailPageToolbar } from "@/components/common/DetailPageToolbar";
import { PageContentWrapper } from "@/components/common/PageContentWrapper";
import { FixedSheetExportAction } from "@/components/export/FixedSheetExportAction";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatOrderNo,
  useDissolveMergedOrder,
  useGetMergedOrder,
} from "@/hooks/api/useOrders";
import { buildMergedOrderDetailSheetPayload } from "@/lib/documentExportData";
import { useIsAdmin } from "@/lib/permissions";
import { EditMergedOrderDialog } from "./EditMergedOrderDialog";
import { OrderStatusBadge } from "../shared/OrderStatusBadge";

interface MergedOrderDetailPageProps {
  mergedOrderId: number;
}

export function MergedOrderDetailPage({
  mergedOrderId,
}: MergedOrderDetailPageProps) {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const {
    data: mergedOrder,
    isLoading,
    isError,
    refetch,
  } = useGetMergedOrder(mergedOrderId);
  const dissolveMergedOrder = useDissolveMergedOrder();
  const [editOpen, setEditOpen] = useState(false);

  const buildDetailPayload = useCallback(() => {
    if (!mergedOrder) throw new Error("合并订单尚未加载完成");
    return buildMergedOrderDetailSheetPayload(mergedOrder);
  }, [mergedOrder]);
  const exportDetail = useCallback(async () => {
    if (!mergedOrder) throw new Error("合并订单尚未加载完成");
    const { exportMergedOrderDetailSheet } =
      await import("@/lib/documentExport");
    return exportMergedOrderDetailSheet(mergedOrder);
  }, [mergedOrder]);

  const handleDissolve = async () => {
    if (!mergedOrder) return;
    const confirmed = window.confirm(
      "确定解散这个合并订单吗？此操作只解除合并关系，原订单和发货单不会受到影响。",
    );
    if (!confirmed) return;
    await dissolveMergedOrder.mutateAsync(mergedOrder.id);
    navigate({ to: "/orders", search: { tab: "merged" } });
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        加载合并订单…
      </div>
    );
  }

  if (isError || !mergedOrder) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-medium">合并订单不存在或已解散</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            重试
          </Button>
          <Button
            size="sm"
            onClick={() =>
              navigate({ to: "/orders", search: { tab: "merged" } })
            }
          >
            返回合并订单
          </Button>
        </div>
      </div>
    );
  }

  const totalLines = mergedOrder.orders.reduce(
    (sum, order) => sum + order.items.length,
    0,
  );
  const totalQty = mergedOrder.orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((itemSum, item) => itemSum + item.orderedQty, 0),
    0,
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DetailPageToolbar
        title={mergedOrder.mergedNo}
        subtitle={mergedOrder.customerName}
        backLabel="返回合并订单"
        onBack={() =>
          navigate({ to: "/orders", search: { tab: "merged" } })
        }
        actions={
          <div className="flex items-center gap-2">
            <FixedSheetExportAction
              label="导出明细表"
              buildPayload={buildDetailPayload}
              exportFile={exportDetail}
            />
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 px-0"
                    title="更多操作"
                  >
                    <i className="ri-more-2-fill" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-none bg-popover"
                >
                  <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                    <i className="ri-edit-line" />
                    调整成员与备注
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={dissolveMergedOrder.isPending}
                    onSelect={() => {
                      void handleDissolve();
                    }}
                  >
                    <i className="ri-link-unlink-m" />
                    解散合并订单
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      />

      <PageContentWrapper>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["原订单", `${mergedOrder.orders.length} 张`],
            ["零件明细", `${totalLines} 项`],
            ["合计数量", String(totalQty)],
            ["创建日期", mergedOrder.createdAt.slice(0, 10)],
          ].map(([label, value]) => (
            <div key={label} className="border border-border bg-card px-3 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <section className="border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">合并明细</h2>
          </div>
          <div className="overflow-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>零件名称</TableHead>
                  <TableHead>材质</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mergedOrder.orders.map((order) => [
                  <TableRow
                    key={`batch-${order.id}`}
                    className="bg-muted/30 hover:bg-muted/30"
                  >
                    <TableCell colSpan={3}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs">
                          {order.createdAt.slice(0, 10)}
                        </span>
                        <button
                          type="button"
                          className="font-mono text-xs font-medium hover:text-primary"
                          onClick={() =>
                            navigate({
                              to: "/orders/$id",
                              params: { id: String(order.id) },
                            })
                          }
                        >
                          {formatOrderNo(order.id)}
                        </button>
                        <OrderStatusBadge status={order.status} />
                        <span className="text-xs text-muted-foreground">
                          {order.items.length} 项零件
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>,
                  ...order.items.map((item) => (
                    <TableRow key={`${order.id}-${item.id}`}>
                      <TableCell>{item.part.name}</TableCell>
                      <TableCell>{item.part.material}</TableCell>
                      <TableCell className="text-right font-mono">
                        {item.orderedQty}
                      </TableCell>
                    </TableRow>
                  )),
                ])}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="border border-border bg-card px-4 py-3">
          <h2 className="text-sm font-semibold">备注</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {mergedOrder.remark || "暂无备注"}
          </p>
        </section>
      </PageContentWrapper>

      <EditMergedOrderDialog
        open={editOpen}
        mergedOrder={mergedOrder}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
