import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  ApiResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UserOptionItem,
  UserRoleType,
} from "@erp/shared-types"
import request from "@/lib/utils/request"
import { toast } from "@/lib/toast"

export interface UserListItem {
  id: number
  username: string
  realName: string
  role: UserRoleType
  isActive: boolean
}

const USER_KEYS = {
  list: () => ["users"] as const,
  options: () => ["users", "options"] as const,
}

export function useGetUsers() {
  return useQuery({
    queryKey: USER_KEYS.list(),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<UserListItem[]>>("/api/users")
        .then(res => res.data ?? []),
  })
}

export function useGetUserOptions() {
  return useQuery({
    queryKey: USER_KEYS.options(),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<UserOptionItem[]>>("/api/users/options")
        .then(res => res.data ?? []),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateUserRequest) =>
      request
        .post<unknown, ApiResponse<UserListItem>>("/api/users", payload)
        .then(res => res.data!),
    onSuccess: () => {
      toast.success("用户创建成功")
      qc.invalidateQueries({ queryKey: USER_KEYS.list() })
    },
    onError: (error: Error) => {
      toast.error(`创建失败：${error.message}`)
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & UpdateUserRequest) =>
      request
        .patch<unknown, ApiResponse<UserListItem>>(`/api/users/${id}`, payload)
        .then(res => res.data!),
    onSuccess: () => {
      toast.success("用户信息已更新")
      qc.invalidateQueries({ queryKey: USER_KEYS.list() })
    },
    onError: (error: Error) => {
      toast.error(`更新失败：${error.message}`)
    },
  })
}
