// src/lib/utils/request.ts
import axios from "axios"
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios"
import type { ApiResponse } from "@erp/shared-types"
import { toast } from "@/lib/toast"

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export function resolveApiUrl(path: string): string {
  if (!apiBaseUrl) return path

  const normalizedBase = apiBaseUrl.endsWith("/")
    ? apiBaseUrl
    : `${apiBaseUrl}/`

  return new URL(path.replace(/^\//, ""), normalizedBase).toString()
}

const request: AxiosInstance = axios.create({
  // 默认走相对路径，开发环境由 Vite /api 代理转发；部署时可通过 VITE_API_BASE_URL 覆盖。
  baseURL: apiBaseUrl || undefined,
  timeout: 15000,
})

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  error => Promise.reject(error),
)

request.interceptors.response.use(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (response: AxiosResponse<ApiResponse>): any => {
    const res = response.data
    if (res.code && res.code !== 200) {
      toast.error(res.message || "业务处理失败")
      return Promise.reject(new Error(res.message || "Error"))
    }
    return res
  },
  error => {
    const { response } = error
    const errorMsg = response?.data?.message || error.message || "网络请求失败"
    toast.error(errorMsg)
    return Promise.reject(error)
  },
)

export default request
