import type { RolePermissionRow, StaffMember, StaffRole } from '../../types/staff.types';

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function toSortedStaff(items: StaffMember[]): StaffMember[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id, 'vi'));
}

export function toSortedPermissions(items: RolePermissionRow[]): RolePermissionRow[] {
  return [...items].sort((a, b) => {
    const roleCmp = a.roleCode.localeCompare(b.roleCode, 'vi');
    if (roleCmp !== 0) {
      return roleCmp;
    }

    return a.module.localeCompare(b.module, 'vi');
  });
}

export function toSortedRoles(items: StaffRole[]): StaffRole[] {
  return [...items].sort((a, b) => a.code.localeCompare(b.code, 'vi'));
}

export function toRoleCode(nameOrCode: string): string {
  return nameOrCode
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

export function toRoleId(roleCode: string): string {
  return `ROLE-${toRoleCode(roleCode)}`;
}

export function nextStaffId(staffList: StaffMember[]): string {
  const max = staffList.reduce((value, staff) => {
    const match = staff.id.match(/^NV-(\d+)$/);
    if (!match) {
      return value;
    }

    return Math.max(value, Number.parseInt(match[1], 10));
  }, 0);

  return `NV-${String(max + 1).padStart(3, '0')}`;
}
