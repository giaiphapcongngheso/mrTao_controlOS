import type { KPIStats, TimelineEvent } from '../types/today.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export const todayStatsService = createBaseService<KPIStats, Partial<KPIStats>>({
  client: dataClient,
  resource: RESOURCE_PATH.TODAY_STATS,
});

export const todayTimelineService = createBaseService<TimelineEvent, Partial<TimelineEvent>>({
  client: dataClient,
  resource: RESOURCE_PATH.TODAY_TIMELINE,
});
