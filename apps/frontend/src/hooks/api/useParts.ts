/**
 * hooks/api/useParts.ts
 *
 * 职责：Parts 模块 API 类型定义（唯一出处）+ TanStack Query hooks
 *
 * 引入来源：
 *  - ApiResponse            ← @erp/shared-types
 *  - FileType               ← @erp/shared-types（图纸文件类型 enum）
 *  - CreatePartRequest /
 *    UpdatePartRequest 结构  ← @erp/shared-types（用作 payload 类型参考）
 *  - request                ← @/lib/utils/request
 */

import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  ApiResponse,
  CreatePartRequest,
  UpdatePartRequest,
} from "@erp/shared-types"
import { downloadBlob } from "@/lib/files"
import request, { resolveApiUrl } from "@/lib/utils/request"
import { toast } from "@/lib/toast"

// ─── 本地定义（@erp/shared-types 的 FileType enum 与后端同值，
//     但 shared-types 无前端产物，enum 不可跨包导入）──────
export const FileType = {
  IMAGE: "IMAGE",
  PDF:   "PDF",
} as const
export type FileType = (typeof FileType)[keyof typeof FileType]

export interface PartCustomerItem {
  id: number
  name: string
  isActive: boolean
}

// ─── API 响应类型（对齐 Prisma 输出，唯一定义处）─────────

/** 对应 PartDrawing 表 */
export interface PartDrawing {
  id:         number
  partId:     number
  fileName:   string
  fileKey:    string       // MinIO object key，非直链
  fileType:   FileType     // 来自 @erp/shared-types FileType enum
  isLatest:   boolean
  uploadedAt: string
}

/** 对应 Part 列表项（findAll 返回，无 drawings 关联） */
export interface PartListItem {
  id:           number
  partNumber:   string
  name:         string
  material:     string
  spec?:        string
  commonPrices: Record<string, number>  // {"标准价": 0.85, "批量价": 0.72}
  customers:    PartCustomerItem[]
  drawings?:    Array<{ uploadedAt: string }>
  createdAt:    string
  updatedAt:    string
}

/** 对应 Part 详情（findOne 返回，include: { drawings: true }） */
export interface PartDetail extends PartListItem {
  drawings: PartDrawing[]
}

export interface PaginatedParts {
  total:    number
  data:     PartListItem[]
  page:     number
  pageSize: number
}

export const PART_DRAWING_ACCEPT = "image/*,.pdf"
export const PART_DRAWING_MAX_SIZE_BYTES = 10 * 1024 * 1024
export const PART_DRAWING_HELP_TEXT = "支持 PNG、JPG、PDF，最大 10MB"

function comparePriceEntries(
  a: { label: string; value: number },
  b: { label: string; value: number },
) {
  if (a.label === "标准价" && b.label !== "标准价") return -1
  if (a.label !== "标准价" && b.label === "标准价") return 1
  return a.label.localeCompare(b.label, "zh-CN")
}

// ─── commonPrices 格式转换（UI 数组 ↔ API Record）────────
/** API Record → 表单数组 */
export function apiPricesToForm(
  commonPrices: Record<string, number> | null | undefined,
): { label: string; value: number }[] {
  if (!commonPrices || typeof commonPrices !== "object" || Array.isArray(commonPrices)) {
    return []
  }
  return Object.entries(commonPrices)
    .map(([label, value]) => ({
      label,
      value: Number(value),
    }))
    .sort(comparePriceEntries)
}

/** 表单数组 → API Record */
export function formPricesToApi(
  prices: { label: string; value: number }[],
): Record<string, number> {
  return Object.fromEntries(prices.map(p => [p.label, p.value]))
}

export function getPrimaryPartPrice(
  commonPrices: Record<string, number> | null | undefined,
) {
  return apiPricesToForm(commonPrices)[0] ?? null
}

export function validatePartDrawingFile(file: File): string | null {
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
    return "仅支持上传图片或 PDF 图纸"
  }

  if (file.size > PART_DRAWING_MAX_SIZE_BYTES) {
    return "图纸文件不能超过 10MB"
  }

  return null
}

export function buildPartDrawingFileUrl(
  partId: number,
  drawingId: number,
  options?: { download?: boolean },
) {
  const search = new URLSearchParams()
  if (options?.download) {
    search.set("download", "1")
  }

  const path = `/api/parts/${partId}/drawings/${drawingId}/file${
    search.size > 0 ? `?${search.toString()}` : ""
  }`
  return resolveApiUrl(path)
}

export async function fetchPartDrawingFileBlob(drawing: PartDrawing) {
  return request.get<Blob, Blob>(
    buildPartDrawingFileUrl(drawing.partId, drawing.id),
    { responseType: "blob" },
  )
}

/**
 * 图纸预览地址。
 *
 * 通过带鉴权头的请求拉取 blob，再转成 object URL，
 * 避免浏览器直接访问受保护文件接口时丢失 Authorization。
 */
export function usePartDrawingPreviewUrl(drawing?: PartDrawing) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!drawing) {
      setPreviewUrl(null)
      setPreviewError(null)
      setIsLoading(false)
      return
    }

    let currentUrl: string | null = null
    let cancelled = false

    const loadPreview = async () => {
      try {
        setIsLoading(true)
        setPreviewError(null)
        const blob = await fetchPartDrawingFileBlob(drawing)
        if (cancelled) return
        currentUrl = window.URL.createObjectURL(blob)
        setPreviewUrl(currentUrl)
      } catch (error) {
        if (cancelled) return
        setPreviewUrl(null)
        setPreviewError(
          error instanceof Error ? error.message : "图纸加载失败",
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
      if (currentUrl) {
        window.URL.revokeObjectURL(currentUrl)
      }
    }
  }, [drawing])

  return {
    previewUrl,
    previewError,
    isLoading,
  }
}

export async function downloadPartDrawingFile(drawing: PartDrawing) {
  const blob = await fetchPartDrawingFileBlob(drawing)
  downloadBlob(drawing.fileName, blob)
}

// ─── Query keys ───────────────────────────────────────────
export interface PartsParams {
  page?:     number
  pageSize?: number
  keyword?:  string
}

export const PARTS_KEYS = {
  list:   (p: PartsParams) => ["parts", p] as const,
  detail: (id: number)     => ["part",  id] as const,
}

// ─── Hooks ────────────────────────────────────────────────

/** 分页列表（支持关键字搜索） */
export function useGetParts(params: PartsParams) {
  return useQuery({
    queryKey:        PARTS_KEYS.list(params),
    queryFn:         () =>
      request
        .get<unknown, ApiResponse<PaginatedParts>>("/api/parts", { params })
        .then(res => res.data!),
    placeholderData: prev => prev,
  })
}

/** 单条详情 + 图纸列表 */
export function useGetPart(id?: number) {
  return useQuery({
    queryKey: PARTS_KEYS.detail(id!),
    queryFn:  () =>
      request
        .get<unknown, ApiResponse<PartDetail>>(`/api/parts/${id}`)
        .then(res => res.data!),
    enabled: !!id,
  })
}

/** 新增零件（payload 结构对齐 CreatePartRequest） */
export function useCreatePart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePartRequest) =>
      request.post<unknown, ApiResponse<PartListItem>>("/api/parts", payload),
    onSuccess: () => {
      toast.success("零件创建成功")
      qc.invalidateQueries({ queryKey: ["parts"] })
    },
    onError: (e: Error) => toast.error(`创建失败：${e.message}`),
  })
}

/** 编辑零件（payload 结构对齐 UpdatePartRequest） */
export function useUpdatePart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & UpdatePartRequest) =>
      request.patch<unknown, ApiResponse<PartListItem>>(`/api/parts/${id}`, payload),
    onSuccess: (_, vars) => {
      toast.success("零件信息已更新")
      qc.invalidateQueries({ queryKey: ["parts"] })
      qc.invalidateQueries({ queryKey: PARTS_KEYS.detail(vars.id) })
    },
    onError: (e: Error) => toast.error(`更新失败：${e.message}`),
  })
}

/** 删除零件（若已被订单引用则后端会拒绝） */
export function useDeletePart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      request.delete<unknown, ApiResponse<{ id: number }>>(`/api/parts/${id}`),
    onSuccess: (_, id) => {
      toast.success("零件已删除")
      qc.invalidateQueries({ queryKey: ["parts"] })
      qc.invalidateQueries({ queryKey: PARTS_KEYS.detail(id) })
    },
    onError: (e: Error) => toast.error(`删除失败：${e.message}`),
  })
}

/** Excel 批量导入（逐行对齐 CreatePartRequest） */
export function useImportParts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (parts: CreatePartRequest[]) =>
      request.post<unknown, ApiResponse<{ count: number }>>("/api/parts/batch", parts),
    onSuccess: res => {
      toast.success(`批量导入成功，共新增 ${res.data?.count ?? 0} 条`)
      qc.invalidateQueries({ queryKey: ["parts"] })
    },
    onError: (e: Error) => toast.error(`导入失败：${e.message}`),
  })
}

/** 上传工程图纸（multipart/form-data，字段名 file，支持 image/* 和 .pdf） */
export function useUploadDrawing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ partId, file }: { partId: number; file: File }) => {
      const form = new FormData()
      form.append("file", file)
      return request.post<unknown, ApiResponse<PartDrawing>>(
        `/api/parts/${partId}/drawings`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
    },
    onSuccess: (_, vars) => {
      toast.success("图纸上传成功，旧版本已自动归档")
      qc.invalidateQueries({ queryKey: PARTS_KEYS.detail(vars.partId) })
    },
    onError: (e: Error) => toast.error(`图纸上传失败：${e.message}`),
  })
}
