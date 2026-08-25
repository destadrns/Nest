import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Transaction, PaginatedResponse, ApiResponse } from '@/types';

interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: string;
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function useTransactions(familyId: string | undefined, filters: TransactionFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();

  return useQuery({
    queryKey: ['families', familyId, 'transactions', filters],
    queryFn: () =>
      api.get<PaginatedResponse<Transaction>>(
        `/families/${familyId}/transactions${qs ? `?${qs}` : ''}`,
      ),
    enabled: !!familyId,
  });
}

export function useCreateTransaction(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      type: string;
      amount: number;
      description: string;
      date: string;
      accountId: string;
      categoryId?: string;
      notes?: string;
      toAccountId?: string;
    }) => api.post<ApiResponse<Transaction>>(`/families/${familyId}/transactions`, data),
    onSuccess: () => {
      // Cross-page reactive invalidation
      queryClient.invalidateQueries({ queryKey: ['families', familyId, 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['families', familyId, 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', familyId] });
      queryClient.invalidateQueries({ queryKey: ['intelligence', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}

export function useUpdateTransaction(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      amount?: number;
      description?: string;
      date?: string;
      categoryId?: string;
      notes?: string;
    }) => api.patch<ApiResponse<Transaction>>(`/families/${familyId}/transactions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId, 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['families', familyId, 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', familyId] });
      queryClient.invalidateQueries({ queryKey: ['intelligence', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}

export function useDeleteTransaction(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/families/${familyId}/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId, 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['families', familyId, 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', familyId] });
      queryClient.invalidateQueries({ queryKey: ['intelligence', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}

export function useCategories(familyId: string | undefined) {
  return useQuery({
    queryKey: ['families', familyId, 'categories'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<any[]>>(`/families/${familyId}/categories`);
      return res.data;
    },
    enabled: !!familyId,
  });
}
