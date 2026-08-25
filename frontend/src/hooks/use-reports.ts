import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  CategorySpending,
  IncomeVsExpense,
  MonthlyTrend,
  AccountSummary,
  ApiResponse,
} from '@/types';

export function useCategorySpending(familyId?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ['reports', 'category-spending', familyId, from, to],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CategorySpending[]>>(
        `/families/${familyId}/reports/spending-by-category?from=${from}&to=${to}`,
      );
      return res.data;
    },
    enabled: !!familyId && !!from && !!to,
  });
}

export function useIncomeVsExpense(familyId?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ['reports', 'income-vs-expense', familyId, from, to],
    queryFn: async () => {
      const res = await api.get<ApiResponse<IncomeVsExpense>>(
        `/families/${familyId}/reports/income-vs-expense?from=${from}&to=${to}`,
      );
      return res.data;
    },
    enabled: !!familyId && !!from && !!to,
  });
}

export function useMonthlyTrend(familyId?: string, months: number = 12) {
  return useQuery({
    queryKey: ['reports', 'monthly-trend', familyId, months],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MonthlyTrend[]>>(
        `/families/${familyId}/reports/monthly-trend?months=${months}`,
      );
      return res.data;
    },
    enabled: !!familyId,
  });
}

export function useAccountSummary(familyId?: string) {
  return useQuery({
    queryKey: ['reports', 'account-summary', familyId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AccountSummary>>(
        `/families/${familyId}/reports/account-summary`,
      );
      return res.data;
    },
    enabled: !!familyId,
  });
}
