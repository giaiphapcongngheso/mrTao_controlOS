import type { HandbookDoc } from '../types/handbook.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export const handbookService = createBaseService<HandbookDoc, Partial<HandbookDoc>>({
  client: dataClient,
  resource: RESOURCE_PATH.HANDBOOK_DOCUMENTS,
  autoLog: { target: 'Bài viết Sổ tay' },
});
