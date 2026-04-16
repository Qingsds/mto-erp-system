import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ApiResponse, CreateDeliveryRequest, FileType } from "@erp/shared-types"
import request, { resolveApiUrl } from "@/lib/utils/request"
import { toast } from "@/lib/toast"
import { downloadBlob } from "@/lib/files"

export interface DeliveryListItem {
  id: number
  orderId: number
  deliveryDate: string
  status: string
  remark?: string | null
  totalAmount?: number
  createdBy?: {
    id: number
    realName: string
    role: string
  } | null
  order?: {
    id: number
    customerName: string
    createdAt: string
  }
}

export interface PaginatedDeliveries {
  total: number
  data: DeliveryListItem[]
  page: number
  pageSize: number
}

export interface DeliveryDetailItem {
  id: number
  deliveryNoteId: number
  orderItemId: number
  shippedQty: number
  remark?: string | null
  billingItem?: { id: number; billingId: number } | null
  orderItem: {
    id: number
    orderId: number
    partId: number
    unitPrice: string
    orderedQty: number
    shippedQty: number
    part: {
      id: number
      partNumber: string
      name: string
      material: string
      spec?: string | null
      commonPrices: Record<string, number>
    }
  }
}

export interface DeliveryDetail {
  id: number
  orderId: number
  deliveryDate: string
  status: string
  remark?: string | null
  createdBy?: {
    id: number
    realName: string
    role: string
  } | null
  order?: {
    id: number
    customerName: string
    createdAt: string
  }
  items: DeliveryDetailItem[]
  photos: DeliveryPhoto[]
}

export interface DeliveryPhoto {
  id: number
  fileName: string
  fileKey: string
  fileType: FileType
  sortOrder: number
  uploadedAt: string
}

export interface StashedDeliveryPhoto {
  fileKey: string
  fileName: string
  fileType: FileType
}

export interface DeliveriesParams {
  page?: number
  pageSize?: number
  orderId?: number
  customerId?: number
  customerName?: string
  deliveryDateStart?: string
  deliveryDateEnd?: string
  hasRemark?: boolean
}

export const DELIVERIES_KEYS = {
  list: (p: DeliveriesParams) => ["deliveries", p] as const,
  detail: (id: number) => ["delivery", id] as const,
}

export const DELIVERY_PHOTO_ACCEPT = "image/*"
export const DELIVERY_PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024
export const DELIVERY_PHOTO_MAX_COUNT = 9
export const DELIVERY_PHOTO_HELP_TEXT = "支持 JPG、PNG、WEBP 等图片，单张最大 10MB，最多 9 张"

export function validateDeliveryPhotoFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "仅支持上传图片格式的发货照片"
  }

  if (file.size > DELIVERY_PHOTO_MAX_SIZE_BYTES) {
    return "发货照片不能超过 10MB"
  }

  return null
}

export function buildDeliveryPhotoFileUrl(
  deliveryId: number,
  photoId: number,
  options?: { download?: boolean },
) {
  const search = new URLSearchParams()
  if (options?.download) {
    search.set("download", "1")
  }

  const path = `/api/deliveries/${deliveryId}/photos/${photoId}/file${
    search.size > 0 ? `?${search.toString()}` : ""
  }`
  return resolveApiUrl(path)
}

export async function fetchDeliveryPhotoBlob(
  deliveryId: number,
  photoId: number,
) {
  return request.get<Blob, Blob>(buildDeliveryPhotoFileUrl(deliveryId, photoId), {
    responseType: "blob",
  })
}

export async function downloadDeliveryPhoto(
  deliveryId: number,
  photo: DeliveryPhoto,
) {
  const blob = await fetchDeliveryPhotoBlob(deliveryId, photo.id)
  downloadBlob(photo.fileName, blob)
}

export function useGetDeliveries(params: DeliveriesParams) {
  return useQuery({
    queryKey: DELIVERIES_KEYS.list(params),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<PaginatedDeliveries>>("/api/deliveries", {
          params,
        })
        .then(res => res.data!),
    placeholderData: prev => prev,
  })
}

export function useGetDelivery(id?: number) {
  return useQuery({
    queryKey: DELIVERIES_KEYS.detail(id!),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<DeliveryDetail>>(`/api/deliveries/${id}`)
        .then(res => res.data!),
    enabled: !!id,
  })
}

export function useCreateDelivery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateDeliveryRequest) =>
      request.post<unknown, ApiResponse<DeliveryDetail>>("/api/deliveries", payload),
    onSuccess: (_, vars) => {
      toast.success("发货单创建成功")
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["deliveries"] })
      queryClient.invalidateQueries({ queryKey: ["order", vars.orderId] })
    },
    onError: (error: Error) => {
      toast.error(`创建发货单失败：${error.message}`)
    },
  })
}

export function useStashDeliveryPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)

      return request
        .post<FormData, ApiResponse<StashedDeliveryPhoto>>(
          "/api/deliveries/photos/stash",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        )
        .then(res => res.data!)
    },
  })
}

export async function cleanupStashedDeliveryPhoto(fileKey?: string) {
  if (!fileKey) {
    return
  }

  await request.delete("/api/deliveries/photos/stash", {
    params: { fileKey },
  })
}

export function decimalToNum(value: string | number): number {
  return typeof value === "string" ? parseFloat(value) : value
}
