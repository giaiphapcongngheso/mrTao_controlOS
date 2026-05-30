import type { HandbookCategory } from '../types/handbook.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export const handbookCategoryService = createBaseService<HandbookCategory, Partial<HandbookCategory>>({
  client: dataClient,
  resource: RESOURCE_PATH.HANDBOOK_CATEGORIES,
});
