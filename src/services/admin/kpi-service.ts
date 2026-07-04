import type { StaffRank, KPIConfig, KPIDailyValue, KPIGoal, KPIStaffMonthlyConfig } from '../../types/kpi.types';
import { createBaseService } from '../../shared/services/create-base-service';
import { RESOURCE_PATH } from '../../constants/resource-paths';
import { dataClient } from '../data-client';

export const kpiStaffMonthlyConfigService = createBaseService<KPIStaffMonthlyConfig, Partial<KPIStaffMonthlyConfig>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_STAFF_MONTHLY_CONFIGS,
  autoLog: { target: 'Cấu hình KPI tháng nhân sự' },
});

export const kpiStaffRankService = createBaseService<StaffRank, Partial<StaffRank>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_STAFF_RANKS,
  autoLog: { target: 'Cấp bậc KPI' },
});

export const kpiConfigService = createBaseService<KPIConfig, Partial<KPIConfig>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_CONFIGS,
  autoLog: { target: 'Cấu hình KPI' },
});

export const kpiDailyValueService = createBaseService<KPIDailyValue, Partial<KPIDailyValue>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_DAILY_VALUES,
  autoLog: { target: 'Giá trị KPI hàng ngày' },
});

export const kpiGoalService = createBaseService<KPIGoal, Partial<KPIGoal>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_GOALS,
  cacheTtlMs: 5 * 60 * 1000,
  autoLog: { target: 'Nhóm mục tiêu KPI' },
});

