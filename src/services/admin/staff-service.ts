import type { StaffMember } from '../../types/staff.types';
import { createBaseService } from '../../shared/services/create-base-service';
import { RESOURCE_PATH } from '../../constants/resource-paths';
import { dataClient } from '../data-client';

const baseStaffService = createBaseService<StaffMember, Partial<StaffMember>>({
  client: dataClient,
  resource: RESOURCE_PATH.STAFF,
  cacheTtlMs: 5 * 60 * 1000,
  autoLog: { target: 'Nhân sự' },
});

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export const staffService = {
  ...baseStaffService,
  async findByUsername(username: string): Promise<StaffMember | null> {
    const normalizedUsername = normalizeUsername(username);
    const staffList = await baseStaffService.getAll();

    return (
      staffList.find((staff) => normalizeUsername(staff.username) === normalizedUsername) ?? null
    );
  },
};
