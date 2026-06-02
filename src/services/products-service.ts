import type { KiotProduct } from '../types/kiotviet.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export const productsService = createBaseService<KiotProduct, Partial<KiotProduct>>({
  client: dataClient,
  resource: RESOURCE_PATH.PRODUCTS,
});
