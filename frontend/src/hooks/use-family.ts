import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import type { Family, FamilyMember, ApiResponse } from '@/types';

export function useFamilies() {
  const setFamilies = useAppStore((s) => s.setFamilies);
  const setCurrentFamily = useAppStore((s) => s.setCurrentFamily);
  const currentFamily = useAppStore((s) => s.currentFamily);

  return useQuery({
    queryKey: ['families'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Family[]>>('/families');
      setFamilies(res.data);
      // Auto-select first family if none selected
      if (!currentFamily && res.data.length > 0) {
        setCurrentFamily(res.data[0]!);
      }
      return res.data;
    },
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; currency?: string; timezone?: string }) =>
      api.post<ApiResponse<Family>>('/families', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useFamilyMembers(familyId: string | undefined) {
  return useQuery({
    queryKey: ['families', familyId, 'members'],
    queryFn: () => api.get<ApiResponse<FamilyMember[]>>(`/families/${familyId}/members`),
    enabled: !!familyId,
  });
}

export function useInviteMember(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; role?: string }) =>
      api.post(`/families/${familyId}/members/invite`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId, 'members'] });
    },
  });
}
