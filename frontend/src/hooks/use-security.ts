import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SecuritySummary, Passkey, ApiResponse } from '@/types';

export function useSecuritySummary() {
  return useQuery({
    queryKey: ['security', 'summary'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SecuritySummary>>('/security/summary');
      return res.data;
    },
  });
}

export function useStartMfa() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<{
        secret: string;
        uri: string;
        recoveryCodes: string[];
        _hashedCodes: string[];
      }>>('/security/mfa/setup', {});
      return res.data;
    },
  });
}

export function useEnableMfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      secret: string;
      token: string;
      recoveryHashes?: string[];
    }) => {
      const res = await api.post<ApiResponse<{ success: boolean }>>('/security/mfa/enable', input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security', 'summary'] });
    },
  });
}

export function useDisableMfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      const res = await api.post<ApiResponse<{ success: boolean }>>('/security/mfa/disable', { password });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security', 'summary'] });
    },
  });
}

export function usePasskeys() {
  return useQuery({
    queryKey: ['security', 'passkeys'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Passkey[]>>('/security/passkeys');
      return res.data;
    },
  });
}

export function useDeletePasskey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/security/passkeys/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security', 'passkeys'] });
      qc.invalidateQueries({ queryKey: ['security', 'summary'] });
    },
  });
}
