/**
 * OrderNewPage.tsx — 新建订单容器页 /orders/new
 *
 * 职责：
 * - 管理数据拉取与提交
 * - 挂载拆分后的表单展示组件
 */

import { useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolverCompat } from "@/lib/zodResolverCompat"
import { useGetParts } from "@/hooks/api/useParts"
import { useGetCustomer } from "@/hooks/api/useCustomers"
import { useCreateOrder, useCreateOrderDraft } from "@/hooks/api/useOrders"
import { useAuthStore } from "@/store/auth.store"
import { OrderFormSchema, type OrderFormInput } from "./orders.schema"
import { OrderNewForm } from "./new-order/OrderNewForm"

export function OrderNewPage() {
  const navigate = useNavigate()

  const { data: partsData } = useGetParts({ page: 1, pageSize: 500 })
  const parts = partsData?.data ?? []
  const currentUser = useAuthStore(state => state.user)
  const createOrder = useCreateOrder()
  const createDraft = useCreateOrderDraft()

  const form = useForm<OrderFormInput>({
    resolver: zodResolverCompat(OrderFormSchema),
    defaultValues: {
      customerId: 0,
      customerName: "",
      responsibleUserId: currentUser?.id,
      targetDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      remark: "",
      items: [{ partId: 0, orderedQty: 1, _displayPrice: 0 }],
    },
  })
  const selectedCustomerId = form.watch("customerId")
  const { data: selectedCustomer } = useGetCustomer(
    selectedCustomerId > 0 ? selectedCustomerId : undefined,
  )

  const handleSubmit = async (values: OrderFormInput) => {
    await createOrder.mutateAsync({
      customerId: values.customerId,
      responsibleUserId: values.responsibleUserId ?? currentUser?.id,
      targetDate: new Date(values.targetDate).toISOString(),
      items: values.items.map(({ partId, orderedQty }) => ({
        partId,
        orderedQty: Number(orderedQty),
      })),
    })
    navigate({ to: "/orders" })
  }

  const handleSaveDraft = async () => {
    const values = form.getValues()
    const targetDate = values.targetDate?.trim()
      ? new Date(values.targetDate).toISOString()
      : undefined

    const result = await createDraft.mutateAsync({
      customerId: values.customerId,
      responsibleUserId: values.responsibleUserId ?? currentUser?.id,
      targetDate,
      remark: values.remark?.trim() ? values.remark.trim() : undefined,
      items: values.items.map(item => ({
        partId: item.partId,
        orderedQty: Number(item.orderedQty) || undefined,
        unitPrice: item._displayPrice,
        priceLabel: item.priceLabel,
      })),
    })

    const draft = result.data
    if (draft) {
      navigate({
        to: "/orders/drafts/$id",
        params: { id: String(draft.id) },
      })
    }
  }

  return (
    <OrderNewForm
      form={form}
      parts={parts}
      selectedCustomer={selectedCustomer}
      onSubmit={handleSubmit}
      onSaveDraft={() => { void handleSaveDraft() }}
      onCancel={() => navigate({ to: "/orders" })}
    />
  )
}
