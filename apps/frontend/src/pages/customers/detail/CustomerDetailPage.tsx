import { useMemo, useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { PageContentWrapper } from "@/components/common/PageContentWrapper"
import { DetailPageToolbar } from "@/components/common/DetailPageToolbar"
import { useGetParts } from "@/hooks/api/useParts"
import {
  useAddCustomerPart,
  useGetCustomer,
  useRemoveCustomerPart,
  useUpdateCustomerStatus,
} from "@/hooks/api/useCustomers"
import { PartPickerDialog } from "@/components/parts/PartPickerDialog"
import { CustomerFormSheet } from "../CustomerFormSheet"
import { formatOrderNo, useGetOrders } from "@/hooks/api/useOrders"
import { formatDateTime } from "@/pages/orders/detail/utils"

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={
        isActive
          ? "inline-flex border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700"
          : "inline-flex border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
      }
    >
      {isActive ? "启用" : "停用"}
    </span>
  )
}

export function CustomerDetailPage() {
  const { id } = useParams({ from: "/customers/$id" })
  const navigate = useNavigate()
  const customerId = Number(id)

  const { data: customer, isLoading } = useGetCustomer(customerId)
  const updateStatus = useUpdateCustomerStatus()
  const addPart = useAddCustomerPart()
  const removePart = useRemoveCustomerPart()

  const [editOpen, setEditOpen] = useState(false)
  const [pickPartOpen, setPickPartOpen] = useState(false)

  const { data: partsPage } = useGetParts({ page: 1, pageSize: 800 })
  const parts = partsPage?.data ?? []

  const { data: ordersPage } = useGetOrders({
    page: 1,
    pageSize: 10,
    customerId,
  })
  const orders = ordersPage?.data ?? []

  const associatedPartIds = useMemo(() => {
    const set = new Set<number>()
    customer?.parts?.forEach(p => set.add(p.partId))
    return set
  }, [customer?.parts])

  const handleToggleStatus = async () => {
    if (!customer) return
    await updateStatus.mutateAsync({ id: customer.id, isActive: !customer.isActive })
  }

  return (
    <>
      <DetailPageToolbar
        title={customer?.name ?? "客户详情"}
        subtitle={
          isLoading
            ? "加载中…"
            : customer?.address?.trim()
              ? customer.address
              : "—"
        }
        backLabel="返回客户列表"
        onBack={() => void navigate({ to: "/customers" })}
        meta={customer ? <StatusBadge isActive={customer.isActive} /> : null}
        actions={
          customer ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setEditOpen(true)}
              >
                <i className="ri-edit-line mr-1.5" />
                编辑
              </Button>
              <Button
                variant={customer.isActive ? "destructive" : "default"}
                size="sm"
                className="h-9"
                disabled={updateStatus.isPending}
                onClick={() => void handleToggleStatus()}
              >
                {updateStatus.isPending ? (
                  <>
                    <i className="ri-loader-4-line mr-1.5 animate-spin" />
                    提交中…
                  </>
                ) : customer.isActive ? (
                  <>
                    <i className="ri-forbid-2-line mr-1.5" />
                    停用
                  </>
                ) : (
                  <>
                    <i className="ri-check-line mr-1.5" />
                    启用
                  </>
                )}
              </Button>
            </>
          ) : null
        }
      />

      <PageContentWrapper className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">基本信息</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">联系人</span>
                <span className="text-right text-foreground">
                  {customer?.contactName ?? "—"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">联系电话</span>
                <span className="text-right text-foreground">
                  {customer?.contactPhone ?? "—"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">地址</span>
                <span className="text-right text-foreground">
                  {customer?.address ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">开票信息</p>
            <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {customer?.invoiceInfo?.trim() ? customer.invoiceInfo : "—"}
            </div>
          </div>
        </div>

        <div className="border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">关联订单</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {customer ? `已关联 ${customer._count.orders} 个订单（展示最近 10 个）` : "—"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => void navigate({ to: "/orders", search: {} })}
            >
              查看订单列表
            </Button>
          </div>

          <div className="mt-3 divide-y divide-border border border-border">
            {orders.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                暂无订单
              </div>
            ) : (
              orders.map(order => (
                <button
                  key={order.id}
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between gap-3 bg-background px-3 py-2 text-left hover:bg-muted/40"
                  onClick={() =>
                    void navigate({
                      to: "/orders/$id",
                      params: { id: String(order.id) },
                    })
                  }
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      订单 {formatOrderNo(order.id)}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {order.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">关联零件</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {customer ? `已关联 ${customer.parts.length} 个零件` : "—"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setPickPartOpen(true)}
              disabled={!customer}
            >
              <i className="ri-link-m mr-1.5" />
              关联零件
            </Button>
          </div>

          <div className="mt-3 divide-y divide-border border border-border">
            {customer?.parts?.length ? (
              customer.parts.map(item => (
                <div
                  key={`${item.customerId}-${item.partId}`}
                  className="flex items-center justify-between gap-3 bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.part.partNumber} · {item.part.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {item.part.material}
                      {item.part.spec ? ` · ${item.part.spec}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={removePart.isPending}
                    onClick={() =>
                      void removePart.mutateAsync({
                        customerId: item.customerId,
                        partId: item.partId,
                      })
                    }
                  >
                    解除
                  </Button>
                </div>
              ))
            ) : (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                暂无关联零件
              </div>
            )}
          </div>
        </div>
      </PageContentWrapper>

      <PartPickerDialog
        open={pickPartOpen}
        onClose={() => setPickPartOpen(false)}
        parts={parts}
        onSelect={part => {
          if (!customer) return
          if (associatedPartIds.has(part.id)) return
          void addPart.mutateAsync({ customerId: customer.id, partId: part.id })
        }}
      />

      <CustomerFormSheet
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer ?? null}
        onSubmitted={() => setEditOpen(false)}
      />
    </>
  )
}
