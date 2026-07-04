import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { kpiConfigService, kpiDailyValueService, kpiStaffRankService, kpiGoalService, kpiStaffMonthlyConfigService } from '../../../services/admin/kpi-service';
import { roleService } from '../../../services/admin/role-service';
import type { KPIConfig, KPIDailyValue, StaffRank, KPIGoal, KPIStaffMonthlyConfig } from '../../../types/kpi.types';
import type { StaffRole } from '../../../types/staff.types';

export const kpiQueryKeys = {
  staffRanks: ['kpi', 'staff-ranks'] as const,
  configs: ['kpi', 'configs'] as const,
  dailyValues: ['kpi', 'daily-values'] as const,
  roles: ['roles'] as const,
  goals: ['kpi', 'goals'] as const,
  staffMonthlyConfigs: ['kpi', 'staff-monthly-configs'] as const,
};

export function useKpiRolesQuery() {
  return useQuery({
    queryKey: kpiQueryKeys.roles,
    queryFn: roleService.getAll,
  });
}

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
    mutationFn: (newConfig: KPIConfig) => kpiConfigService.create(newConfig),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.configs });
    },
  });
}

export function useUpdateKpiConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: KPIConfig) => kpiConfigService.update(config.id, config),
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
    mutationFn: async (dailyValue: KPIDailyValue) => {
      const cachedDailyValues = queryClient.getQueryData<KPIDailyValue[]>(kpiQueryKeys.dailyValues) || [];
      const isExisting = cachedDailyValues.some(v => v.id === dailyValue.id);

      if (isExisting) {
        return await kpiDailyValueService.update(dailyValue.id, dailyValue);
      } else {
        return await kpiDailyValueService.create(dailyValue);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.dailyValues });
    },
  });
}

export function useKpiGoalsQuery() {
  return useQuery({
    queryKey: kpiQueryKeys.goals,
    queryFn: kpiGoalService.getAll,
  });
}

export function useCreateKpiGoalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newGoal: KPIGoal) => kpiGoalService.create(newGoal),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.goals });
    },
  });
}

export function useDeleteKpiGoalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => kpiGoalService.delete(goalId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.goals });
    },
  });
}

export function useKpiStaffMonthlyConfigsQuery() {
  return useQuery({
    queryKey: kpiQueryKeys.staffMonthlyConfigs,
    queryFn: kpiStaffMonthlyConfigService.getAll,
  });
}

export function useSaveKpiStaffMonthlyConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: KPIStaffMonthlyConfig) => {
      const cached = queryClient.getQueryData<KPIStaffMonthlyConfig[]>(kpiQueryKeys.staffMonthlyConfigs) || [];
      const isExisting = cached.some(v => v.id === config.id);

      if (isExisting) {
        return await kpiStaffMonthlyConfigService.update(config.id, config);
      } else {
        return await kpiStaffMonthlyConfigService.create(config);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.staffMonthlyConfigs });
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.staffRanks });
    },
  });
}

export function useUpdateKpiRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (role: StaffRole) => roleService.update(role.id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.roles });
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.staffRanks });
    },
  });
}

