import type { SOPIssue } from '../types/issues.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export const issuesService = createBaseService<SOPIssue, Partial<SOPIssue>>({
  client: dataClient,
  resource: RESOURCE_PATH.ISSUES,
});
