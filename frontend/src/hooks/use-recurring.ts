import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RecurringTransaction, Frequency, TransactionType, ApiResponse } from '@/types';

export interface CreateRecurringInput {
  description: string;
  amount: number;
  type: TransactionType;
  frequency: Frequency;
  accountId: string;
  categoryId?: string;
  startDate: string;
  endDate?: string;
}

export function useRecurringTransactions(familyId?: string) {
  return useQuery({
    queryKey: ['recurring', familyId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<RecurringTransaction[]>>(
        `/families/${familyId}/recurring`,
      );
      return res.data;
    },
    enabled: !!familyId,
  });
}

export function useCreateRecurring(familyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRecurringInput) => {
      const res = await api.post<ApiResponse<RecurringTransaction>>(
        `/families/${familyId}/recurring`,
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring', familyId] });
    },
  });
}

export function useDeleteRecurring(familyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/families/${familyId}/recurring/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring', familyId] });
    },
  });
}
