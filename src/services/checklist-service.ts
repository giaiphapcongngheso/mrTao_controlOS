import type { ChecklistCategory, ChecklistItem } from '../types/checklist.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export const checklistCategoryService = createBaseService<ChecklistCategory, Partial<ChecklistCategory>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLIST_CATEGORIES,
});

export const checklistTodayCategoryService = createBaseService<ChecklistCategory, Partial<ChecklistCategory>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLIST_TODAY_CATEGORIES,
});

export const checklistProcessCategoryService = createBaseService<ChecklistCategory, Partial<ChecklistCategory>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLIST_PROCESS_CATEGORIES,
});

export const checklistItemService = createBaseService<ChecklistItem, Partial<ChecklistItem>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLIST_ITEMS,
});

export const checklistProcessItemService = createBaseService<ChecklistItem, Partial<ChecklistItem>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLIST_PROCESS_ITEMS,
});
