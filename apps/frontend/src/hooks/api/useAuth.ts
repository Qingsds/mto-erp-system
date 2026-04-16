import { useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  ApiResponse,
  AuthLoginResponse,
  AuthUserInfo,
  ChangePasswordRequest,
  LoginRequest,
} from "@erp/shared-types"
import request from "@/lib/utils/request"
import { toast } from "@/lib/toast"
import { useAuthStore } from "@/store/auth.store"

const AUTH_KEYS = {
  currentUser: () => ["auth", "me"] as const,
}

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

export function useAuthMe(enabled: boolean) {
  const setSession = useAuthStore(state => state.setSession)
  const resetSession = useAuthStore(state => state.resetSession)
  const token = useAuthStore(state => state.token)
  const setBootstrapping = useAuthStore(state => state.setBootstrapping)

  const query = useQuery({
    queryKey: AUTH_KEYS.currentUser(),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<AuthUserInfo>>("/api/auth/me")
        .then(res => res.data!),
    enabled,
    retry: false,
    staleTime: 0,
  })

  useEffect(() => {
    if (!enabled) {
      setBootstrapping(false)
      return
    }

    setBootstrapping(query.isPending)

    if (query.isSuccess && token) {
      setSession({ token, user: query.data })
    }

    if (query.isError) {
      resetSession()
    }
  }, [
    enabled,
    query.data,
    query.isError,
    query.isPending,
    query.isSuccess,
    resetSession,
    setBootstrapping,
    setSession,
    token,
  ])

  return query
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordRequest) =>
      request
        .patch<unknown, ApiResponse<null>>("/api/auth/change-password", payload)
        .then(res => res.data),
    onSuccess: () => {
      toast.success("密码已更新，请重新登录")
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const resetSession = useAuthStore(state => state.resetSession)

  return (options?: { silent?: boolean }) => {
    resetSession()
    queryClient.clear()
    if (!options?.silent) {
      toast.success("已退出登录")
    }
    navigate({ to: "/login", replace: true })
  }
}
