import type { Store } from '../../types/store.types';
import { createBaseService } from '../../shared/services/create-base-service';
import { RESOURCE_PATH } from '../../constants/resource-paths';
import { dataClient } from '../data-client';

export const storeService = createBaseService<Store, Partial<Store>>({
  client: dataClient,
  resource: RESOURCE_PATH.STORES,
});
