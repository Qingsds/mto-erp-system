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
import { useCreateOrder } from "@/hooks/api/useOrders"
import { OrderFormSchema, type OrderFormInput, type OrderFormValues } from "./orders.schema"
import { OrderNewForm } from "./new-order/OrderNewForm"

export function OrderNewPage() {
  const navigate = useNavigate()

  const { data: partsData } = useGetParts({ page: 1, pageSize: 500 })
  const parts = partsData?.data ?? []
  const createOrder = useCreateOrder()

  const form = useForm<OrderFormInput, unknown, OrderFormValues>({
    resolver: zodResolverCompat<OrderFormInput, OrderFormValues>(OrderFormSchema),
    defaultValues: {
      customerId: 0,
      customerName: "",
      remark: "",
      items: [{ partId: 0, orderedQty: 1, _displayPrice: 0 }],
    },
  })

  const handleSubmit = async (values: OrderFormValues) => {
    await createOrder.mutateAsync({
      customerId: values.customerId,
      items: values.items.map(({ partId, orderedQty }) => ({ partId, orderedQty })),
    })
    navigate({ to: "/orders" })
  }

  return (
    <OrderNewForm
      form={form}
      parts={parts}
      onSubmit={handleSubmit}
      onCancel={() => navigate({ to: "/orders" })}
    />
  )
}
