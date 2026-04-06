import { useMutation } from "@tanstack/react-query"
import type {
  ApiResponse,
  AuthLoginResponse,
  AuthUserInfo,
  LoginRequest,
} from "@erp/shared-types"
import request from "@/lib/utils/request"
import { toast } from "@/lib/toast"
import { useAuthStore } from "@/store/auth.store"

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginRequest) =>
      request
        .post<unknown, ApiResponse<AuthLoginResponse>>("/api/auth/login", payload)
        .then(res => res.data!),
    onSuccess: result => {
      useAuthStore.getState().setSession({
        token: result.accessToken,
        user: result.user,
      })
      toast.success("登录成功")
    },
    onError: (error: Error) => {
      toast.error(`登录失败：${error.message}`)
    },
  })
}

export function useGetCurrentUser() {
  return useMutation({
    mutationFn: () =>
      request
        .get<unknown, ApiResponse<AuthUserInfo>>("/api/auth/me")
        .then(res => res.data!),
    onSuccess: user => {
      const token = useAuthStore.getState().token
      if (token) {
        useAuthStore.getState().setSession({ token, user })
      }
    },
  })
}
