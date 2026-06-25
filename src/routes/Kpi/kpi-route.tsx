import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import KpiView from './KpiView';
import { TAB_ROUTE_MAP } from '../app-shell-state';
import { useStaffQuery } from '../StaffPermissions/_hook/use-staff';
import {
  useKpiConfigsQuery,
  useKpiDailyValuesQuery,
  useCreateKpiConfigMutation,
  useUpdateKpiConfigMutation,
  useDeleteKpiConfigMutation,
  useSaveKpiDailyValueMutation,
  useKpiRolesQuery,
  useKpiGoalsQuery,
  useCreateKpiGoalMutation,
  useDeleteKpiGoalMutation,
} from './_hook/use-kpi';

export default function KpiRoute() {
  const navigate = useNavigate();
  const { data: staffMembers = [], isLoading: isStaffLoading } = useStaffQuery();
  const { data: kpiConfigs = [], isLoading: isConfigsLoading } = useKpiConfigsQuery();
  const { data: kpiDailyValues = [], isLoading: isDailyValuesLoading } = useKpiDailyValuesQuery();
  const { data: roles = [], isLoading: isRolesLoading } = useKpiRolesQuery();
  const { data: goals = [], isLoading: isGoalsLoading } = useKpiGoalsQuery();

  const createConfigMutation = useCreateKpiConfigMutation();
  const updateConfigMutation = useUpdateKpiConfigMutation();
  const deleteConfigMutation = useDeleteKpiConfigMutation();
  const saveDailyValueMutation = useSaveKpiDailyValueMutation();
  const createGoalMutation = useCreateKpiGoalMutation();
  const deleteGoalMutation = useDeleteKpiGoalMutation();

  // Filter out staff members with role 'CHU_CUA_HANG' (Chủ cửa hàng)
  const filteredStaffMembers = useMemo(() => {
    return staffMembers.filter((staff) => {
      const roleCode = (staff.role || '').toUpperCase().replace(/_/g, '').trim();
      return roleCode !== 'CHU_CUA_HANG' && roleCode !== 'CHUCUAHANG';
    });
  }, [staffMembers]);

  // Filter out 'CHU_CUA_HANG' from available KPI roles
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const roleCode = (role.code || '').toUpperCase().replace(/_/g, '').trim();
      return roleCode !== 'CHU_CUA_HANG' && roleCode !== 'CHUCUAHANG';
    });
  }, [roles]);

  if (isStaffLoading || isConfigsLoading || isDailyValuesLoading || isRolesLoading || isGoalsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">
          Đang tải dữ liệu KPI từ Database...
        </div>
      </div>
    );
  }

  const handleSetTab = (tab: any) => {
    void navigate({ to: TAB_ROUTE_MAP[tab] });
  };

  return (
    <KpiView
      roles={filteredRoles}
      staffMembers={filteredStaffMembers}
      kpiConfigs={kpiConfigs}
      kpiDailyValues={kpiDailyValues}
      onCreateConfig={(newConfig) => createConfigMutation.mutateAsync(newConfig)}
      onUpdateConfig={(config) => updateConfigMutation.mutateAsync(config)}
      onDeleteConfig={(configId) => deleteConfigMutation.mutateAsync(configId)}
      onSaveDailyValue={(val) => saveDailyValueMutation.mutateAsync(val)}
      onSetTab={handleSetTab}
      goals={goals}
      onCreateGoal={(name) => createGoalMutation.mutateAsync({ id: `goal_${Date.now()}`, name })}
      onDeleteGoal={(id) => deleteGoalMutation.mutateAsync(id)}
    />
  );
}

