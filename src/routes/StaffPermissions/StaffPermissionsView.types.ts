export interface StaffPermissionsViewProps {
  currentUser: {
    fullName: string;
    role: string;
    user: string;
  } | null;
}

export type PermissionField = 'canView' | 'canCreate' | 'canUpdate' | 'canDelete' | 'canApprove';

export type ActiveTab = 'staff' | 'permissions' | 'logs';

export type { SystemLog, SystemLogActionType } from '../../types/system-log.types';

export interface StaffFormState {
  fullName: string;
  username: string;
  role: string;
  phone: string;
  status: 'active' | 'inactive';
  email: string;
  password: string;
}

export interface PermissionFormState {
  roleId: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export interface RoleFormState {
  name: string;
  code: string;
  status: 'active' | 'inactive';
}
