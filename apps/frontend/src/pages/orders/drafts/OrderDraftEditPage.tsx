import { useCallback, useEffect, useMemo } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { useGetParts } from "@/hooks/api/useParts"
import { useGetCustomer } from "@/hooks/api/useCustomers"
import {
  useDeleteOrderDraft,
  useGetOrderDraft,
  useSubmitOrderDraft,
  useUpdateOrderDraft,
} from "@/hooks/api/useOrders"
import { useAuthStore } from "@/store/auth.store"
import type { OrderFormInput } from "../orders.schema"
import { OrderNewForm } from "../new-order/OrderNewForm"
import { FixedSheetExportAction } from "@/components/export/FixedSheetExportAction"
import { buildOrderDraftDetailSheetPayload } from "@/lib/documentExportData"
import type { OrderDraftDetail } from "@erp/shared-types"

function toDateInput(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}

export function OrderDraftEditPage() {
  const { id } = useParams({ from: "/orders/drafts/$id" })
  const navigate = useNavigate()
  const draftId = Number(id)
  const currentUser = useAuthStore(state => state.user)

  const { data: partsData } = useGetParts({ page: 1, pageSize: 500 })
  const parts = partsData?.data ?? []

  const { data: draft, isLoading } = useGetOrderDraft(draftId)
  const updateDraft = useUpdateOrderDraft()
  const submitDraft = useSubmitOrderDraft()
  const deleteDraft = useDeleteOrderDraft()

  const form = useForm<OrderFormInput>({
    defaultValues: {
      customerId: 0,
      customerName: "",
      responsibleUserId: currentUser?.id,
      targetDate: "",
      remark: "",
      items: [{ partId: 0, orderedQty: 1, _displayPrice: 0 }],
    },
  })

  useEffect(() => {
    if (!draft) return

    form.reset({
      customerId: draft.customerId ?? 0,
      customerName: draft.customerName ?? "",
      responsibleUserId: draft.responsibleUserId ?? currentUser?.id,
      targetDate: toDateInput(draft.targetDate),
      remark: draft.remark ?? "",
      items: draft.items.length > 0
        ? draft.items.map(item => ({
            id: item.id,
            partId: item.partId ?? 0,
            orderedQty: item.orderedQty ?? "",
            _displayPrice: item.unitPrice ? Number(item.unitPrice) : 0,
            priceLabel: item.priceLabel ?? undefined,
          }))
        : [{ partId: 0, orderedQty: 1, _displayPrice: 0 }],
    })
  }, [currentUser?.id, draft, form])

  const selectedCustomerId = form.watch("customerId")
  const { data: selectedCustomer } = useGetCustomer(
    selectedCustomerId > 0 ? selectedCustomerId : undefined,
  )
  const watchedItems = form.watch("items")

  const buildDraftPayload = useMemo(
    () => (values: OrderFormInput) => ({
      customerId: values.customerId,
      responsibleUserId:
        values.responsibleUserId && values.responsibleUserId > 0
          ? values.responsibleUserId
          : undefined,
      targetDate: values.targetDate?.trim()
        ? new Date(values.targetDate).toISOString()
        : "",
      remark: values.remark?.trim() ? values.remark.trim() : "",
      items: values.items.map(item => ({
        id: item.id,
        partId: item.partId,
        orderedQty: Number(item.orderedQty) || undefined,
        unitPrice: item._displayPrice,
        priceLabel: item.priceLabel,
      })),
    }),
    [],
  )

  const handleSaveDraft = async () => {
    const values = form.getValues()
    await updateDraft.mutateAsync({
      id: draftId,
      payload: buildDraftPayload(values),
    })
  }

  const handleSubmitOrder = async (values: OrderFormInput) => {
    await updateDraft.mutateAsync({
      id: draftId,
      payload: buildDraftPayload(values),
    })
    const result = await submitDraft.mutateAsync(draftId)
    const orderId = result.data?.orderId
    if (orderId) {
      navigate({
        to: "/orders/$id",
        params: { id: String(orderId) },
      })
    } else {
      navigate({ to: "/orders" })
    }
  }

  const handleDelete = async () => {
    const ok = window.confirm("确定要删除这份草稿吗？")
    if (!ok) return
    await deleteDraft.mutateAsync(draftId)
    navigate({ to: "/orders" })
  }

  const buildCurrentDraft = useCallback((): OrderDraftDetail => {
    if (!draft) {
      throw new Error("草稿尚未加载完成")
    }

    const values = form.getValues()
    return {
      ...draft,
      customerId: Number(values.customerId) || null,
      customerName:
        selectedCustomer?.name
        ?? values.customerName?.trim()
        ?? draft.customerName,
      items: values.items.map((item, index) => {
        const part = parts.find(candidate => candidate.id === Number(item.partId))
        const rawQty = item.orderedQty
        const parsedQty = rawQty === "" || rawQty === null || rawQty === undefined
          ? null
          : Number(rawQty)

        return {
          id: item.id ?? -(index + 1),
          partId: part?.id ?? null,
          orderedQty: parsedQty !== null && Number.isInteger(parsedQty) && parsedQty > 0
            ? parsedQty
            : null,
          unitPrice: item._displayPrice === undefined
            ? null
            : String(item._displayPrice),
          priceLabel: item.priceLabel ?? null,
          part: part
            ? {
                id: part.id,
                partNumber: part.partNumber,
                name: part.name,
                material: part.material,
              }
            : null,
        }
      }),
    }
  }, [draft, form, parts, selectedCustomer?.name])

  const canExportDetail = watchedItems.some(item =>
    parts.some(part => part.id === Number(item.partId)),
  )
  const buildDetailPayload = useCallback(
    () => buildOrderDraftDetailSheetPayload(buildCurrentDraft()),
    [buildCurrentDraft],
  )
  const exportDetail = useCallback(async () => {
    const { exportOrderDraftDetailSheet } = await import("@/lib/documentExport")
    return exportOrderDraftDetailSheet(buildCurrentDraft())
  }, [buildCurrentDraft])

  return (
    <OrderNewForm
      form={form}
      parts={parts}
      selectedCustomer={selectedCustomer}
      onSubmit={handleSubmitOrder}
      onSaveDraft={() => { void handleSaveDraft() }}
      onDeleteDraft={() => { void handleDelete() }}
      exportAction={
        <FixedSheetExportAction
          label='导出明细表'
          buildPayload={buildDetailPayload}
          exportFile={exportDetail}
          disabled={!canExportDetail || !draft}
          disabledReason='至少选择一个零件后才能导出'
        />
      }
      onCancel={() => navigate({ to: "/orders", search: { tab: "drafts" } })}
      toolbarTitle={isLoading ? "加载草稿…" : "编辑草稿"}
      submitLabel="提交为订单"
    />
  )
}
