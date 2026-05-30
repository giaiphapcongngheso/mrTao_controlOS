import type { ChecklistCategory, ChecklistDocument } from '../types/checklist.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

/**
 * Single unified service for the "checklists" collection.
 * Each document contains a category with embedded tasks array.
 */
export const checklistService = createBaseService<ChecklistDocument, Partial<ChecklistDocument>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLISTS,
});

/**
 * Legacy category service — kept for potential admin use.
 */
export const checklistCategoryService = createBaseService<ChecklistCategory, Partial<ChecklistCategory>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLIST_CATEGORIES,
});
