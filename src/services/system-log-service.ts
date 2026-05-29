import type { SystemLog } from '../types/system-log.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export const systemLogService = createBaseService<SystemLog, Partial<SystemLog>>({
  client: dataClient,
  resource: RESOURCE_PATH.SYSTEM_LOGS,
});
