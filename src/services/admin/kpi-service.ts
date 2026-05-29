import type { StaffRank } from '../../types/kpi.types';
import { createBaseService } from '../../shared/services/create-base-service';
import { RESOURCE_PATH } from '../../constants/resource-paths';
import { dataClient } from '../data-client';

export const kpiStaffRankService = createBaseService<StaffRank, Partial<StaffRank>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_STAFF_RANKS,
});
