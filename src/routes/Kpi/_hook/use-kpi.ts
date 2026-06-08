import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { kpiConfigService, kpiDailyValueService, kpiStaffRankService } from '../../../services/admin/kpi-service';
import type { KPIConfig, KPIDailyValue, StaffRank } from '../../../types/kpi.types';

export const kpiQueryKeys = {
  staffRanks: ['kpi', 'staff-ranks'] as const,
  configs: ['kpi', 'configs'] as const,
  dailyValues: ['kpi', 'daily-values'] as const,
};

export function useKpiStaffRanksQuery() {
  return useQuery({
    queryKey: kpiQueryKeys.staffRanks,
    queryFn: kpiStaffRankService.getAll,
    enabled: true,
  });
}

export function useKpiConfigsQuery() {
  return useQuery({
    queryKey: kpiQueryKeys.configs,
    queryFn: kpiConfigService.getAll,
  });
}

export function useKpiDailyValuesQuery() {
  return useQuery({
    queryKey: kpiQueryKeys.dailyValues,
    queryFn: kpiDailyValueService.getAll,
  });
}

export function useCreateKpiConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newConfig: KPIConfig) => kpiConfigService.post(newConfig.id, newConfig),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.configs });
    },
  });
}

export function useUpdateKpiConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: KPIConfig) => kpiConfigService.put(config.id, config),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.configs });
    },
  });
}

export function useDeleteKpiConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (configId: string) => kpiConfigService.delete(configId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.configs });
    },
  });
}

export function useSaveKpiDailyValueMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dailyValue: KPIDailyValue) => kpiDailyValueService.post(dailyValue.id, dailyValue),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.dailyValues });
    },
  });
}

