import { DEFAULT_AVATAR, getDepartmentForRole, getPositionForRole } from '../../constants';
import type { UserSession } from '../../shared/auth';
import type { StaffMember } from '../../types/staff.types';
import {
  getFirebaseAuthErrorCode,
  signInWithFirebaseEmail,
  signOutFirebaseSession,
} from '../firebase-auth-service';
import { staffService } from './staff-service';

type InternalAuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_INACTIVE'
  | 'SYSTEM_ERROR'
  | 'DATA_ERROR';

export class InternalAuthError extends Error {
  readonly code: InternalAuthErrorCode;

  constructor(code: InternalAuthErrorCode, message: string) {
    super(message);
    this.name = 'InternalAuthError';
    this.code = code;
  }
}

interface InternalAuthInput {
  username: string;
  password: string;
}

const ROLE_LABEL_MAP: Record<string, string> = {
  CHU_CUA_HANG: 'Chủ cửa hàng',
  QUAN_LY: 'Quản lý showroom',
  SALES: 'Nhân viên bán lẻ',
  KHO: 'Kỹ thuật viên',
  CSKH: 'Chăm sóc khách hàng',
  QUAN_TRI_VIEN: 'Quản trị viên hệ thống',
};

const FALLBACK_AUTH_EMAIL_DOMAIN = 'mrtaocoop.com';

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function resolveRoleLabel(roleCode: string): string {
  return ROLE_LABEL_MAP[roleCode] ?? roleCode;
}

function resolveStaffAuthEmail(staff: StaffMember, normalizedUsername: string): string {
  if (staff.authEmail) {
    return staff.authEmail.trim().toLowerCase();
  }

  if (staff.email) {
    return staff.email.trim().toLowerCase();
  }

  return `${normalizedUsername}@${FALLBACK_AUTH_EMAIL_DOMAIN}`;
}

function toUserSession(staff: StaffMember): UserSession {
  const normalizedUsername = normalizeUsername(staff.username);
  const employeeCode = staff.employeeCode || staff.id.replace(/^NV-/, 'MNS-');

  return {
    username: normalizedUsername,
    fullName: staff.fullName,
    role: resolveRoleLabel(staff.role),
    roleCode: staff.role,
    avatar: staff.avatar || DEFAULT_AVATAR,
    id: staff.id,
    employeeCode,
    phone: staff.phone,
    email: staff.email || `${normalizedUsername}@mrtaocoop.com`,
    department: staff.department || getDepartmentForRole(staff.role),
    position: staff.position || getPositionForRole(staff.role),
    statusLabel: staff.status === 'active' ? 'Đang hoạt động' : 'Ngưng hoạt động',
  };
}

async function findStaffByUsernameOrThrow(username: string): Promise<StaffMember> {
  try {
    const matchedStaff = await staffService.findByUsername(username);
    if (!matchedStaff) {
      throw new InternalAuthError('INVALID_CREDENTIALS', 'Invalid username or password.');
    }
    return matchedStaff;
  } catch (error) {
    if (error instanceof InternalAuthError) {
      throw error;
    }

    throw new InternalAuthError(
      'SYSTEM_ERROR',
      `Cannot load staff account: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

function mapFirebaseLoginError(error: unknown): InternalAuthError {
  const errorCode = getFirebaseAuthErrorCode(error);
  if (
    errorCode === 'auth/invalid-credential' ||
    errorCode === 'auth/invalid-login-credentials' ||
    errorCode === 'auth/invalid-email' ||
    errorCode === 'auth/user-not-found' ||
    errorCode === 'auth/wrong-password'
  ) {
    return new InternalAuthError('INVALID_CREDENTIALS', 'Invalid username or password.');
  }

  if (errorCode === 'auth/user-disabled') {
    return new InternalAuthError('ACCOUNT_INACTIVE', 'Staff account is inactive.');
  }

  return new InternalAuthError(
    'SYSTEM_ERROR',
    `Authentication request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
  );
}

function canFallbackToInternalPassword(
  staff: StaffMember,
  password: string,
  authError: unknown,
): boolean {
  if (staff.firebaseUid) {
    return false;
  }

  if (!staff.password || staff.password !== password) {
    return false;
  }

  const errorCode = getFirebaseAuthErrorCode(authError);
  if (
    errorCode === 'auth/invalid-credential' ||
    errorCode === 'auth/invalid-login-credentials' ||
    errorCode === 'auth/user-not-found' ||
    errorCode === 'auth/wrong-password' ||
    errorCode === 'auth/configuration-not-found' ||
    errorCode === 'auth/operation-not-allowed' ||
    errorCode === 'auth/invalid-api-key' ||
    errorCode === 'auth/app-not-authorized'
  ) {
    return true;
  }

  if (authError instanceof Error && authError.message.includes('Firebase is not configured')) {
    return true;
  }

  return false;
}

export async function authenticateWithInternalStaff({
  username,
  password,
}: InternalAuthInput): Promise<UserSession> {
  const normalizedUsername = normalizeUsername(username);
  const matchedStaff = await findStaffByUsernameOrThrow(normalizedUsername);
  const authEmail = resolveStaffAuthEmail(matchedStaff, normalizedUsername);
  let usedInternalFallback = false;

  try {
    await signInWithFirebaseEmail(authEmail, password);
  } catch (error) {
    if (canFallbackToInternalPassword(matchedStaff, password, error)) {
      usedInternalFallback = true;
    } else {
      throw mapFirebaseLoginError(error);
    }
  }

  if (matchedStaff.status !== 'active') {
    if (!usedInternalFallback) {
      await signOutFirebaseSession();
    }
    throw new InternalAuthError('ACCOUNT_INACTIVE', 'Staff account is inactive.');
  }

  return toUserSession(matchedStaff);
}

export async function signOutInternalStaff(): Promise<void> {
  await signOutFirebaseSession();
}
