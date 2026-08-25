import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import type { User, ApiResponse } from '@/types';

export function useSession() {
  const setUser = useAppStore((s) => s.setUser);

  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        const res = await api.get<ApiResponse<{ user: User }>>('/auth/session');
        setUser(res.data.user);
        return res.data;
      } catch {
        setUser(null);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const setUser = useAppStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<ApiResponse<{ user: User }>>('/auth/login', data),
    onSuccess: (res) => {
      setUser(res.data.user);
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });
}

export function useRegister() {
  const setUser = useAppStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; password: string; firstName: string; lastName: string }) =>
      api.post<ApiResponse<{ user: User }>>('/auth/register', data),
    onSuccess: (res) => {
      setUser(res.data.user);
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });
}

export function useLogout() {
  const logout = useAppStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/password/change', data),
  });
}
