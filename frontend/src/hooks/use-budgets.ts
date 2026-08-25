import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Budget, ApiResponse } from '@/types';

export interface CreateBudgetInput {
  name: string;
  period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  amount: number;
  startDate: string;
  endDate?: string;
  categoryId?: string;
  items?: { categoryId: string; amount: number }[];
}

export function useBudgets(familyId?: string) {
  return useQuery({
    queryKey: ['budgets', familyId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Budget[]>>(`/families/${familyId}/budgets`);
      return res.data;
    },
    enabled: !!familyId,
  });
}

export function useCreateBudget(familyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const res = await api.post<ApiResponse<Budget>>(`/families/${familyId}/budgets`, input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets', familyId] });
    },
  });
}

export function useDeleteBudget(familyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (budgetId: string) => {
      await api.delete(`/families/${familyId}/budgets/${budgetId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets', familyId] });
    },
  });
}
