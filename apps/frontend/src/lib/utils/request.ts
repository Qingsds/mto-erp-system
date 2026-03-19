// src/lib/utils/request.ts
import axios from "axios"
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios"
import type { ApiResponse } from "@erp/shared-types"
import { toast } from "@/lib/toast"

const request: AxiosInstance = axios.create({
  baseURL: "http://localhost:3000",
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