import type { StaffRank, KPIConfig, KPIDailyValue } from '../../types/kpi.types';
import { createBaseService } from '../../shared/services/create-base-service';
import { RESOURCE_PATH } from '../../constants/resource-paths';
import { dataClient } from '../data-client';

export const kpiStaffRankService = createBaseService<StaffRank, Partial<StaffRank>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_STAFF_RANKS,
});

export const kpiConfigService = createBaseService<KPIConfig, Partial<KPIConfig>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_CONFIGS,
});

export const kpiDailyValueService = createBaseService<KPIDailyValue, Partial<KPIDailyValue>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_DAILY_VALUES,
});

