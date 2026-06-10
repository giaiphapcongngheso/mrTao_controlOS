import type { HandbookCategory, HandbookCategoryRequestType } from '../types/handbook.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export const handbookCategoryService = createBaseService<HandbookCategory, HandbookCategoryRequestType>({
  client: dataClient,
  resource: RESOURCE_PATH.HANDBOOK_CATEGORIES,
  cacheTtlMs: 5 * 60 * 1000, // 5 min - categories are structural, rarely change
  autoLog: { target: 'Danh mục Sổ tay' },
});
