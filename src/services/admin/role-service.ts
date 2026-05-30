import type { StaffRole } from '../../types/staff.types';
import { createBaseService } from '../../shared/services/create-base-service';
import { RESOURCE_PATH } from '../../constants/resource-paths';
import { dataClient } from '../data-client';

export const roleService = createBaseService<StaffRole, Partial<StaffRole>>({
  client: dataClient,
  resource: RESOURCE_PATH.ROLES,
  cacheTtlMs: 5 * 60 * 1000, // 5 min - roles are admin-managed, rarely change
});
