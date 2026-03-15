// apps/frontend/src/utils/request.ts
import axios from "axios"
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios"
import type { ApiResponse } from "@erp/shared-types"
import { message } from "antd"

const request: AxiosInstance = axios.create({
  baseURL: "",
  timeout: 10000,
})

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  error => Promise.reject(error),
)

// 核心修复：强制指定拦截器的返回类型
request.interceptors.response.use(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (response: AxiosResponse<ApiResponse>): any => {
    const res = response.data
    if (res.code && res.code !== 200) {
      message.error(res.message || "业务处理失败")
      return Promise.reject(new Error(res.message || "Error"))
    }
    // 注意：这里返回的是 ApiResponse，而不是 AxiosResponse
    return res
  },
  error => {
    const { response } = error
    const errorMsg =
      response?.data?.message || error.message || "网络请求失败"
    message.error(errorMsg)
    return Promise.reject(error)
  },
)

export default request
