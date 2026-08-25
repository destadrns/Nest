import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AppNotification } from '@/types';

export function useNotifications(familyId?: string) {
  return useQuery({
    queryKey: ['notifications', familyId],
    queryFn: async () => {
      const res = await api.get<{ data: AppNotification[]; meta?: { unreadCount: number } }>(
        `/families/${familyId}/notifications`,
      );
      return res;
    },
    enabled: !!familyId,
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useMarkNotificationRead(familyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/families/${familyId}/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', familyId] });
    },
  });
}

export function useMarkAllNotificationsRead(familyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch(`/families/${familyId}/notifications/read-all`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', familyId] });
    },
  });
}
