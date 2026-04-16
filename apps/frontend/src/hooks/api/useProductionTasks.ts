import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/lib/utils/request';
import { ApiResponse, CreateTaskMessageRequest, TaskStatusType, UpdateTaskStatusRequest } from '@erp/shared-types';
import type { UserRef } from './useOrders';

export interface ProductionTaskListItem {
  id: number
  targetDate: string
  status: TaskStatusType
  urgency: string
  orderItem: {
    id: number
    orderedQty: number
    part: {
      id: number
      name: string
      partNumber: string
    }
    order: {
      customerName: string
      responsibleUser?: UserRef | null
    }
  }
}

export interface ProductionTaskDetail extends ProductionTaskListItem {
  lastStatusUpdatedAt?: string | null
  lastStatusUpdatedBy?: UserRef | null
  orderItem: ProductionTaskListItem["orderItem"] & {
    order: {
      id: number
      customerName: string
      responsibleUser?: UserRef | null
    }
    part: ProductionTaskListItem["orderItem"]["part"] & {
      drawings: Array<{
        id: number
        fileName: string
        fileType: string
        uploadedAt: string
      }>
    }
  }
  messages: Array<{
    id: number
    content: string
    createdAt: string
    user: {
      id: number
      realName: string
    }
  }>
}

export function useAllProductionTasks(params: { page: number; pageSize: number; status?: string; keyword?: string }) {
  return useQuery({
    queryKey: ['production-tasks', 'list', params.page, params.pageSize, params.status ?? '', params.keyword ?? ''],
    queryFn: async () => {
      return request
        .get<unknown, ApiResponse<{ total: number; data: ProductionTaskListItem[]; page: number; pageSize: number }>>('/api/production-tasks', { params })
        .then(res => res.data!);
    },
    placeholderData: prev => prev,
  });
}

export function useProductionTasks(orderId: number) {
  return useQuery({
    queryKey: ['production-tasks', orderId],
    queryFn: async () => {
      return request
        .get<unknown, ApiResponse<ProductionTaskListItem[]>>(`/api/production-tasks/order/${orderId}`)
        .then(res => res.data ?? []);
    },
    enabled: !!orderId,
  });
}

export function useProductionTaskDetail(taskId: number) {
  return useQuery({
    queryKey: ['production-task', taskId],
    queryFn: async () => {
      return request
        .get<unknown, ApiResponse<ProductionTaskDetail>>(`/api/production-tasks/${taskId}`)
        .then(res => res.data!);
    },
    enabled: !!taskId,
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TaskStatusType }) => {
      const payload: UpdateTaskStatusRequest = { status };
      return request
        .patch<unknown, ApiResponse>(`/api/production-tasks/${id}/status`, payload)
        .then(res => res.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['production-task', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['production-tasks'] });
    },
  });
}

export function useCreateTaskMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: number; content: string }) => {
      const payload: CreateTaskMessageRequest = { content };
      return request
        .post<unknown, ApiResponse>(`/api/notifications/tasks/${taskId}/messages`, payload)
        .then(res => res.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['production-task', variables.taskId] });
    },
  });
}
