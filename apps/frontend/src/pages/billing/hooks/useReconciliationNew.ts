import { useMemo, useState } from "react"
import { useQueries } from "@tanstack/react-query"
import type { CreateBillingRequest, ApiResponse } from "@erp/shared-types"
import {
  useGetDeliveries,
  DELIVERIES_KEYS,
  type DeliveryDetail,
} from "@/hooks/api/useDeliveries"
import { useCreateBilling } from "@/hooks/api/useBilling"
import request from "@/lib/utils/request"

import { calculateEstimatedTotal, validateCanSubmit } from "../new/logic"

export interface ExtraItem {
  desc: string
  amount: string
}

export function useReconciliationNew() {
  const [customerInput, setCustomerInput] = useState("")
  const [searchedCustomer, setSearchedCustomer] = useState("")
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<number>>(new Set())
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set())
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([])

  const createBilling = useCreateBilling()

  const { data: deliveriesData, isFetching: fetchingDeliveries } = useGetDeliveries(
    { customerName: searchedCustomer, pageSize: 50 },
  )
  const deliveries = searchedCustomer ? (deliveriesData?.data ?? []) : []

  const detailQueries = useQueries({
    queries: [...selectedDeliveryIds].map(id => ({
      queryKey: DELIVERIES_KEYS.detail(id),
      queryFn: () =>
        request
          .get<unknown, ApiResponse<DeliveryDetail>>(`/api/deliveries/${id}`)
          .then(res => res.data!),
    })),
  })

  const billedItemIds = useMemo(() => {
    const ids = new Set<number>()
    for (const q of detailQueries) {
      if (q.data) {
        for (const item of q.data.items) {
          if (item.billingItem != null) ids.add(item.id)
        }
      }
    }
    return ids
  }, [detailQueries])

  const allDetailItems = useMemo(
    () => detailQueries.flatMap(q => q.data?.items ?? []),
    [detailQueries],
  )

  const estimatedTotal = useMemo(
    () => calculateEstimatedTotal(allDetailItems, selectedItemIds, extraItems),
    [allDetailItems, selectedItemIds, extraItems]
  )

  const toggleDelivery = (id: number) => {
    setSelectedDeliveryIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        const detail = detailQueries.find(q => q.data?.id === id)
        if (detail?.data) {
          setSelectedItemIds(prevItems => {
            const nextItems = new Set(prevItems)
            for (const item of detail.data!.items) nextItems.delete(item.id)
            return nextItems
          })
        }
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleItem = (itemId: number) => {
    if (billedItemIds.has(itemId)) return
    setSelectedItemIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const addExtraItem = () => setExtraItems(prev => [...prev, { desc: "", amount: "" }])
  const removeExtraItem = (i: number) => setExtraItems(prev => prev.filter((_, idx) => idx !== i))
  const updateExtraItem = (i: number, field: keyof ExtraItem, value: string) => {
    setExtraItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const validExtraItems = extraItems.filter(e => e.desc.trim() && parseFloat(e.amount) > 0)
  const canSubmit = validateCanSubmit(selectedItemIds, searchedCustomer)

  const handleSubmit = async (onSuccess?: (billingId: number) => void) => {
    if (!canSubmit) return
    const payload: CreateBillingRequest = {
      customerName: searchedCustomer,
      deliveryItemIds: [...selectedItemIds],
      extraItems: validExtraItems.map(e => ({ desc: e.desc.trim(), amount: parseFloat(e.amount) })),
    }
    const billing = await createBilling.mutateAsync(payload)
    onSuccess?.(billing.id)
  }

  return {
    customerInput,
    setCustomerInput,
    searchedCustomer,
    setSearchedCustomer,
    selectedDeliveryIds,
    selectedItemIds,
    extraItems,
    deliveries,
    fetchingDeliveries,
    detailQueries,
    billedItemIds,
    allDetailItems,
    estimatedTotal,
    toggleDelivery,
    toggleItem,
    addExtraItem,
    removeExtraItem,
    updateExtraItem,
    canSubmit,
    isSubmitting: createBilling.isPending,
    handleSubmit,
  }
}
