import type { StaffRank, KPIConfig, KPIDailyValue, KPIGoal, KPIStaffMonthlyConfig } from '../../types/kpi.types';
import { createBaseService } from '../../shared/services/create-base-service';
import { RESOURCE_PATH } from '../../constants/resource-paths';
import { dataClient } from '../data-client';

export const kpiStaffMonthlyConfigService = createBaseService<KPIStaffMonthlyConfig, Partial<KPIStaffMonthlyConfig>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_STAFF_MONTHLY_CONFIGS,
  cacheTtlMs: 5 * 60 * 1000,
  autoLog: {
    target: 'Cấu hình KPI tháng nhân sự',
    resolveDetails: (action, id, payload) => {
      if (action === 'UPDATE' && payload) {
        return `Đã cập nhật cấu hình KPI tháng ${payload.month || ''} (Ngày công công: ${payload.actualWorkdays || 0}, Hệ số kỷ luật: ${payload.disciplineCoefficient || 1.0}).`;
      }
      if (action === 'CREATE' && payload) {
        return `Đã tạo cấu hình KPI tháng ${payload.month || ''} (Ngày công công: ${payload.actualWorkdays || 0}, Hệ số kỷ luật: ${payload.disciplineCoefficient || 1.0}).`;
      }
      return null;
    }
  },
});

export const kpiStaffRankService = createBaseService<StaffRank, Partial<StaffRank>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_STAFF_RANKS,
  cacheTtlMs: 5 * 60 * 1000,
  autoLog: { target: 'Cấp bậc KPI' },
});

export const kpiConfigService = createBaseService<KPIConfig, Partial<KPIConfig>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_CONFIGS,
  cacheTtlMs: 5 * 60 * 1000,
  autoLog: { target: 'Cấu hình KPI' },
});

export const kpiDailyValueService = createBaseService<KPIDailyValue, Partial<KPIDailyValue>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_DAILY_VALUES,
  autoLog: {
    target: 'Giá trị KPI hàng ngày',
    resolveDetails: (action, id, payload) => {
      if (action === 'UPDATE' && payload) {
        return `Đã cập nhật giá trị KPI ngày ${payload.date || ''} thành ${payload.value?.toLocaleString() || payload.value || 0}.`;
      }
      if (action === 'CREATE' && payload) {
        return `Đã khai báo giá trị KPI ngày ${payload.date || ''} là ${payload.value?.toLocaleString() || payload.value || 0}.`;
      }
      return null;
    }
  },
});

export const kpiGoalService = createBaseService<KPIGoal, Partial<KPIGoal>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_GOALS,
  cacheTtlMs: 5 * 60 * 1000,
  autoLog: { target: 'Nhóm mục tiêu KPI' },
});

