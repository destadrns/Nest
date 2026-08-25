import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FinancialGoal, GoalStatus, ApiResponse } from '@/types';

export interface CreateGoalInput {
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
  icon?: string;
  color?: string;
}

export interface UpdateGoalInput {
  name?: string;
  description?: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  status?: GoalStatus;
  icon?: string;
  color?: string;
}

export function useGoals(familyId?: string, status?: GoalStatus) {
  return useQuery({
    queryKey: ['goals', familyId, status],
    queryFn: async () => {
      const qs = status ? `?status=${status}` : '';
      const res = await api.get<ApiResponse<FinancialGoal[]>>(`/families/${familyId}/goals${qs}`);
      return res.data;
    },
    enabled: !!familyId,
  });
}

export function useCreateGoal(familyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const res = await api.post<ApiResponse<FinancialGoal>>(`/families/${familyId}/goals`, input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', familyId] });
      qc.invalidateQueries({ queryKey: ['intelligence', familyId] });
    },
  });
}

export function useUpdateGoal(familyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateGoalInput & { id: string }) => {
      const res = await api.patch<ApiResponse<FinancialGoal>>(`/families/${familyId}/goals/${id}`, input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', familyId] });
      qc.invalidateQueries({ queryKey: ['intelligence', familyId] });
    },
  });
}

export function useDeleteGoal(familyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goalId: string) => {
      await api.delete(`/families/${familyId}/goals/${goalId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', familyId] });
      qc.invalidateQueries({ queryKey: ['intelligence', familyId] });
    },
  });
}
