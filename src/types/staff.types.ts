export interface StaffMember {
  id: string;
  storeId: string;
  fullName: string;
  role: string;
  roleId?: string;
  username: string;
  usernameNormalized?: string;
  authEmail?: string;
  firebaseUid?: string;
  phone: string;
  status: 'active' | 'inactive';
  joinedDate: string;
  email?: string;
  password?: string;
  pin?: string;
  department?: string;
  position?: string;
  employeeCode?: string;
  avatar?: string;
}

export interface RolePermissionRow {
  id: string;
  storeId: string;
  roleId?: string;
  roleCode: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export interface StaffRole {
  id: string;
  storeId: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
}
