// apps/frontend/src/hooks/api/useParts.ts
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { message } from "antd"
import request from "../../utils/request"
import type { ApiResponse } from "@erp/shared-types"

// 导出实体与查询类型，供 UI 组件复用
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

// 1. 获取零件列表 Hook
export const useGetParts = (params: PartsSearch) => {
  return useQuery({
    queryKey: ["parts", params.page, params.pageSize, params.name],
    queryFn: () =>
      request.get<ApiResponse<{ total: number; data: Part[] }>>(
        "/api/parts",
        { params },
      ),
  })
}

// 2. 创建零件 Hook
export const useCreatePart = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<Part>) =>
      request.post("/api/parts", payload),
    onSuccess: () => {
      message.success("零件创建成功")
      // 提交成功后，使得列表查询缓存失效，触发自动刷新
      queryClient.invalidateQueries({ queryKey: ["parts"] })
    },
  })
}

// 新增：批量导入 Hook
export const useImportParts = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (parts: Partial<Part>[]) => {
      // 临时方案：前端并发请求。后续若后端提供了 /api/parts/batch，可直接替换此处
      const promises = parts.map(part =>
        request.post("/api/parts", part),
      )
      await Promise.all(promises)
    },
    onSuccess: () => {
      message.success("Excel 批量导入成功")
      queryClient.invalidateQueries({ queryKey: ["parts"] })
    },
    onError: error => {
      message.error(`导入失败: ${error.message}`)
    },
  })
}
