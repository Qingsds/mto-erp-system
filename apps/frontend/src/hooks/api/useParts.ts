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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  ApiResponse,
  CreatePartRequest,
  UpdatePartRequest,
} from "@erp/shared-types"
import request   from "@/lib/utils/request"
import { toast } from "@/lib/toast"

// ─── 本地定义（@erp/shared-types 的 FileType enum 与后端同值，
//     但 shared-types 无前端产物，enum 不可跨包导入）──────
export const FileType = {
  IMAGE: "IMAGE",
  PDF:   "PDF",
} as const
export type FileType = (typeof FileType)[keyof typeof FileType]

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

// ─── commonPrices 格式转换（UI 数组 ↔ API Record）────────
/** API Record → 表单数组 */
export function apiPricesToForm(
  commonPrices: Record<string, number> | null | undefined,
): { label: string; value: number }[] {
  if (!commonPrices || typeof commonPrices !== "object" || Array.isArray(commonPrices)) {
    return []
  }
  return Object.entries(commonPrices).map(([label, value]) => ({
    label,
    value: Number(value),
  }))
}

/** 表单数组 → API Record */
export function formPricesToApi(
  prices: { label: string; value: number }[],
): Record<string, number> {
  return Object.fromEntries(prices.map(p => [p.label, p.value]))
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
        .get<any, ApiResponse<PaginatedParts>>("/api/parts", { params })
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
        .get<any, ApiResponse<PartDetail>>(`/api/parts/${id}`)
        .then(res => res.data!),
    enabled: !!id,
  })
}

/** 新增零件（payload 结构对齐 CreatePartRequest） */
export function useCreatePart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePartRequest) =>
      request.post<any, ApiResponse<PartListItem>>("/api/parts", payload),
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
      request.patch<any, ApiResponse<PartListItem>>(`/api/parts/${id}`, payload),
    onSuccess: (_, vars) => {
      toast.success("零件信息已更新")
      qc.invalidateQueries({ queryKey: ["parts"] })
      qc.invalidateQueries({ queryKey: PARTS_KEYS.detail(vars.id) })
    },
    onError: (e: Error) => toast.error(`更新失败：${e.message}`),
  })
}

/** Excel 批量导入（逐行对齐 CreatePartRequest） */
export function useImportParts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (parts: CreatePartRequest[]) =>
      request.post<any, ApiResponse<{ count: number }>>("/api/parts/batch", parts),
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
      return request.post<any, ApiResponse<PartDrawing>>(
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