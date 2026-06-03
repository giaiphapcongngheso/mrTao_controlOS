import type { RolePermissionRow } from '../../types/staff.types';
import { createBaseService } from '../../shared/services/create-base-service';
import { RESOURCE_PATH } from '../../constants/resource-paths';
import { dataClient } from '../data-client';

export const staffPermissionService = createBaseService<RolePermissionRow, Partial<RolePermissionRow>>({
  client: dataClient,
  resource: RESOURCE_PATH.STAFF_PERMISSIONS,
  cacheTtlMs: 5 * 60 * 1000,
});
