import { useEffect } from 'react';
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
} from './_hook/use-kpi';
import { INITIAL_KPI_CONFIGS, INITIAL_KPI_DAILY_VALUES } from '../../data';

export default function KpiRoute() {
  const navigate = useNavigate();
  const { data: staffMembers = [], isLoading: isStaffLoading } = useStaffQuery();
  const { data: kpiConfigs = [], isLoading: isConfigsLoading } = useKpiConfigsQuery();
  const { data: kpiDailyValues = [], isLoading: isDailyValuesLoading } = useKpiDailyValuesQuery();

  const createConfigMutation = useCreateKpiConfigMutation();
  const updateConfigMutation = useUpdateKpiConfigMutation();
  const deleteConfigMutation = useDeleteKpiConfigMutation();
  const saveDailyValueMutation = useSaveKpiDailyValueMutation();

  // Auto-initialize base templates if Firestore is empty
  useEffect(() => {
    if (!isConfigsLoading && kpiConfigs.length === 0) {
      console.log('Khởi tạo cấu hình KPI mẫu lên Firestore...');
      INITIAL_KPI_CONFIGS.forEach((config) => {
        void createConfigMutation.mutate(config);
      });
    }
  }, [isConfigsLoading, kpiConfigs.length, createConfigMutation]);

  useEffect(() => {
    if (!isDailyValuesLoading && kpiDailyValues.length === 0 && kpiConfigs.length > 0) {
      console.log('Khởi tạo dữ liệu KPI thực tế hàng ngày mẫu lên Firestore...');
      INITIAL_KPI_DAILY_VALUES.forEach((val) => {
        void saveDailyValueMutation.mutate(val);
      });
    }
  }, [isDailyValuesLoading, kpiDailyValues.length, kpiConfigs.length, saveDailyValueMutation]);

  if (isStaffLoading || isConfigsLoading || isDailyValuesLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">
          Đang tải dữ liệu KPI từ Database...
        </div>
      </div>
    );
  }

  return (
    <KpiView
      staffMembers={staffMembers}
      kpiConfigs={kpiConfigs}
      kpiDailyValues={kpiDailyValues}
      onCreateConfig={(newConfig) => createConfigMutation.mutateAsync(newConfig)}
      onUpdateConfig={(config) => updateConfigMutation.mutateAsync(config)}
      onDeleteConfig={(configId) => deleteConfigMutation.mutateAsync(configId)}
      onSaveDailyValue={(val) => saveDailyValueMutation.mutateAsync(val)}
      onSetTab={(tab) => {
        void navigate({ to: TAB_ROUTE_MAP[tab] });
      }}
    />
  );
}

