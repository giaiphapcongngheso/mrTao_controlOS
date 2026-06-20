import { MODULE_CODE } from '../../constants';
import type { PermissionField, PermissionFormState, RoleFormState, StaffFormState } from './StaffPermissionsView.types';

export const DEFAULT_STAFF_FORM: StaffFormState = {
  fullName: '',
  username: '',
  role: '',
  phone: '',
  status: 'active',
  email: '',
  password: '',
  internalNotes: '',
};

export const PERMISSION_FIELDS: Array<{ key: PermissionField; label: string }> = [
  { key: 'canView', label: 'Xem' },
  { key: 'canCreate', label: 'Tạo' },
  { key: 'canUpdate', label: 'Sửa' },
  { key: 'canDelete', label: 'Xóa' },
  { key: 'canApprove', label: 'Duyệt' },
  { key: 'canExport', label: 'Xuất file' },
];

export const DEFAULT_PERMISSION_FORM: PermissionFormState = {
  roleId: '',
  module: MODULE_CODE.CHECKLIST,
  canView: true,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canApprove: false,
  canExport: false,
};

export const DEFAULT_ROLE_FORM: RoleFormState = {
  name: '',
  code: '',
  status: 'active',
};
