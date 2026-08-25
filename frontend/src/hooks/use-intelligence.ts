import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Anomaly, SpendingForecast, ApiResponse } from '@/types';

export function useAnomalies(familyId?: string) {
  return useQuery({
    queryKey: ['intelligence', 'anomalies', familyId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Anomaly[]>>(
        `/families/${familyId}/intelligence/anomalies`,
      );
      return res.data;
    },
    enabled: !!familyId,
  });
}

export function useForecast(familyId?: string) {
  return useQuery({
    queryKey: ['intelligence', 'forecast', familyId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SpendingForecast>>(
        `/families/${familyId}/intelligence/forecast`,
      );
      return res.data;
    },
    enabled: !!familyId,
  });
}

export function useSuggestCategory(familyId?: string) {
  return useMutation({
    mutationFn: async (description: string) => {
      const res = await api.get<
        ApiResponse<{
          categoryId: string;
          categoryName: string;
          confidence: number;
          source: string;
        }>
      >(
        `/families/${familyId}/intelligence/suggest-category?description=${encodeURIComponent(description)}`,
      );
      return res.data;
    },
  });
}
