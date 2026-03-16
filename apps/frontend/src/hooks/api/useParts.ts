import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { message } from "antd"
import request from "../../utils/request"
import type { ApiResponse } from "@erp/shared-types"

export interface Part {
  id: number
  name: string
  material: string
  spec?: string
  commonPrices: Record<string, number>
}

export interface PartsSearch {
  page?: number
  pageSize?: number
  name?: string
}

export interface PartDrawing {
  id: number
  partId: number
  fileName: string
  fileKey: string
  fileType: string
  isLatest: boolean
  uploadedAt: string
}

export interface PartDetail extends Part {
  partNumber: string
  createdAt: string
  drawings: PartDrawing[]
}

// 增加标准的分页返回接口
export interface PaginatedData<T> {
  total: number
  data: T[]
  page: number
  pageSize: number
}

export const useGetParts = (params: PartsSearch) => {
  return useQuery({
    queryKey: ["parts", params.page, params.pageSize, params.name],
    queryFn: () =>
      // 显式声明 axios 泛型，取出 res.data 即 PaginatedData<Part>
      request
        .get<
          any,
          ApiResponse<PaginatedData<Part>>
        >("/api/parts", { params })
        .then(res => res.data),
  })
}

export const useGetPart = (id?: number) => {
  return useQuery({
    queryKey: ["part", id],
    queryFn: () =>
      request
        .get<any, ApiResponse<PartDetail>>(`/api/parts/${id}`)
        .then(res => res.data),
    enabled: !!id,
  })
}

export const useCreatePart = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Part>) =>
      request.post("/api/parts", payload),
    onSuccess: () => {
      message.success("零件创建成功")
      queryClient.invalidateQueries({ queryKey: ["parts"] })
    },
  })
}

export const useImportParts = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (parts: Partial<Part>[]) =>
      request.post("/api/parts/batch", parts),
    onSuccess: () => {
      message.success("Excel 批量导入成功")
      queryClient.invalidateQueries({ queryKey: ["parts"] })
    },
    onError: error => message.error(`导入失败: ${error.message}`),
  })
}

export const useUploadDrawing = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      partId,
      file,
    }: {
      partId: number
      file: File
    }) => {
      const formData = new FormData()
      formData.append("file", file)
      return request.post(`/api/parts/${partId}/drawings`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    },
    onSuccess: (_, variables) => {
      message.success("图纸上传成功，版本已更新")
      queryClient.invalidateQueries({
        queryKey: ["part", variables.partId],
      })
    },
    onError: error => message.error(`图纸上传失败: ${error.message}`),
  })
}
