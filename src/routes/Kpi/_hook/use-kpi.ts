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
    queryFn: async () => {
      console.time('⏱️ KPI ROLES QUERY');
      const res = await roleService.getAll();
      console.timeEnd('⏱️ KPI ROLES QUERY');
      return res;
    },
  });
}

export function useKpiStaffRanksQuery() {
  return useQuery({
    queryKey: kpiQueryKeys.staffRanks,
    queryFn: kpiStaffRankService.getAll,
    enabled: true,
  });
}

export function useKpiConfigsQuery(storeId?: string, monthYear?: string) {
  return useQuery({
    queryKey: storeId ? [...kpiQueryKeys.configs, storeId, monthYear] : kpiQueryKeys.configs,
    queryFn: async () => {
      console.time(`⏱️ KPI CONFIGS QUERY [${storeId} - ${monthYear}]`);
      const params: any = {};
      if (storeId) params.storeId = storeId;
      if (monthYear) params.month = monthYear;
      const res = await kpiConfigService.getAll(params);
      console.timeEnd(`⏱️ KPI CONFIGS QUERY [${storeId} - ${monthYear}]`);
      return res;
    },
    enabled: !!storeId,
  });
}

export function useKpiDailyValuesQuery(storeId?: string, monthYear?: string) {
  return useQuery({
    queryKey: storeId ? [...kpiQueryKeys.dailyValues, storeId, monthYear] : kpiQueryKeys.dailyValues,
    queryFn: async () => {
      console.time(`⏱️ KPI DAILY VALUES QUERY [${storeId} - ${monthYear}]`);
      const params: any = {};
      if (monthYear) {
        params.date_gte = `${monthYear}-01`;
        params.date_lte = `${monthYear}-31`;
      }
      const allValues = await kpiDailyValueService.getAll(params);
      let res = allValues;
      if (storeId) {
        res = allValues.filter(v => !v.storeId || v.storeId === storeId);
      }
      console.timeEnd(`⏱️ KPI DAILY VALUES QUERY [${storeId} - ${monthYear}]`);
      return res;
    },
    enabled: !!storeId,
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

export function useKpiGoalsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: kpiQueryKeys.goals,
    queryFn: kpiGoalService.getAll,
    enabled: options?.enabled ?? true,
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

export function useKpiStaffMonthlyConfigsQuery(storeId?: string, monthYear?: string) {
  return useQuery({
    queryKey: storeId ? [...kpiQueryKeys.staffMonthlyConfigs, storeId, monthYear] : kpiQueryKeys.staffMonthlyConfigs,
    queryFn: async () => {
      console.time(`⏱️ KPI STAFF MONTHLY CONFIGS QUERY [${storeId} - ${monthYear}]`);
      const params: any = {};
      if (storeId) params.storeId = storeId;
      if (monthYear) params.month = monthYear;
      const res = await kpiStaffMonthlyConfigService.getAll(params);
      console.timeEnd(`⏱️ KPI STAFF MONTHLY CONFIGS QUERY [${storeId} - ${monthYear}]`);
      return res;
    },
    enabled: !!storeId,
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

