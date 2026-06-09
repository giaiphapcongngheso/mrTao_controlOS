import type { Customer } from '../types/customer.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export const customersService = createBaseService<Customer, Partial<Customer>>({
  client: dataClient,
  resource: RESOURCE_PATH.CUSTOMERS,
  cacheTtlMs: 2 * 60 * 1000, // 2 minutes local cache
});
