import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/lib/utils/request';
import { ApiResponse } from '@erp/shared-types';

export interface SystemNotificationItem {
  id: number
  title: string
  content: string
  isRead: boolean
  relatedType?: string | null
  relatedId?: number | null
  createdAt: string
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      return request
        .get<unknown, ApiResponse<SystemNotificationItem[]>>('/api/notifications')
        .then(res => res.data ?? []);
    },
    refetchInterval: 60000, // Poll every minute
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return request
        .patch<unknown, ApiResponse>(`/api/notifications/${id}/read`)
        .then(res => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return request
        .patch<unknown, ApiResponse>('/api/notifications/read-all')
        .then(res => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
