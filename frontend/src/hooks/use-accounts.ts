import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Account, ApiResponse } from '@/types';

export function useAccounts(familyId: string | undefined) {
  return useQuery({
    queryKey: ['families', familyId, 'accounts'],
    queryFn: () => api.get<ApiResponse<Account[]>>(`/families/${familyId}/accounts`),
    enabled: !!familyId,
  });
}

export function useCreateAccount(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      type: string;
      currency?: string;
      institution?: string;
      initialBalance?: number;
    }) => api.post<ApiResponse<Account>>(`/families/${familyId}/accounts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId, 'accounts'] });
    },
  });
}

export function useUpdateAccount(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; institution?: string; isActive?: boolean }) =>
      api.patch<ApiResponse<Account>>(`/families/${familyId}/accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId, 'accounts'] });
    },
  });
}
