import type { CustomerSyncLog } from '../types/customer.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export const customerSyncLogsService = createBaseService<CustomerSyncLog, Partial<CustomerSyncLog>>({
  client: dataClient,
  resource: RESOURCE_PATH.CUSTOMER_SYNC_LOGS,
  cacheTtlMs: 2 * 60 * 1000, // 2 minutes local cache
});
