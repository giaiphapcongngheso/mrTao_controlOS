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
} from './_hook/use-kpi';

export default function KpiRoute() {
  const navigate = useNavigate();
  const { data: staffMembers = [], isLoading: isStaffLoading } = useStaffQuery();
  const { data: kpiConfigs = [], isLoading: isConfigsLoading } = useKpiConfigsQuery();
  const { data: kpiDailyValues = [], isLoading: isDailyValuesLoading } = useKpiDailyValuesQuery();
  const { data: roles = [], isLoading: isRolesLoading } = useKpiRolesQuery();

  const createConfigMutation = useCreateKpiConfigMutation();
  const updateConfigMutation = useUpdateKpiConfigMutation();
  const deleteConfigMutation = useDeleteKpiConfigMutation();
  const saveDailyValueMutation = useSaveKpiDailyValueMutation();

  if (isStaffLoading || isConfigsLoading || isDailyValuesLoading || isRolesLoading) {
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
      roles={roles}
      staffMembers={staffMembers}
      kpiConfigs={kpiConfigs}
      kpiDailyValues={kpiDailyValues}
      onCreateConfig={(newConfig) => createConfigMutation.mutateAsync(newConfig)}
      onUpdateConfig={(config) => updateConfigMutation.mutateAsync(config)}
      onDeleteConfig={(configId) => deleteConfigMutation.mutateAsync(configId)}
      onSaveDailyValue={(val) => saveDailyValueMutation.mutateAsync(val)}
      onSetTab={handleSetTab}
    />
  );
}

