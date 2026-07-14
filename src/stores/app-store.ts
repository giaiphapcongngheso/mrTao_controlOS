import { create } from 'zustand';
export interface UserSession {
  username: string;
  fullName: string;
  role: string;
  roleCode?: string;
  avatar?: string;
  id?: string;
  employeeCode?: string;
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
  statusLabel?: string;
  sessionExpiresAt?: number;
}

export const SESSION_STORAGE_KEY = 'mrt_user_session';

function resolveRoleCode(user: Partial<UserSession>, legacyUser: Record<string, unknown>): string {
  const explicitRoleCode =
    (typeof user.roleCode === 'string' ? user.roleCode : undefined) ||
    (typeof legacyUser.roleCode === 'string' ? legacyUser.roleCode : undefined);
  const normalizedExplicit = explicitRoleCode?.trim().toUpperCase();
  if (normalizedExplicit) {
    return normalizedExplicit;
  }

  const normalizedRole = user.role?.trim().toUpperCase();
  if (normalizedRole) {
    return normalizedRole;
  }

  throw new Error('Không thể xác định mã vai trò của tài khoản (Role Code).');
}

export function enrichSessionWithDefaultFields(user: Partial<UserSession> | null): UserSession {
  const legacyUser = (user ?? {}) as Record<string, unknown>;

  const username = user?.username || '';
  const fullName = user?.fullName || '';
  const roleCode = resolveRoleCode(user ?? {}, legacyUser);

  const roleMap: Record<string, string> = {
    CHU_CUA_HANG: 'Giám đốc điều hành',
    QUAN_LY_CUA_HANG: 'Quản lý cửa hàng',
    NHAN_VIEN_BAN_HANG: 'Nhân viên bán hàng',
    KY_THUAT_SUA_CHUA: 'Kỹ thuật sửa chữa',
    QUAN_TRI_VIEN: 'Quản trị viên',
    QUAN_LY: 'Quản lý showroom',
    SALES: 'Nhân viên bán lẻ',
    KHO: 'Kỹ thuật viên',
    CSKH: 'Chăm sóc khách hàng',
  };
  const legacyLabels = ['Chủ cửa hàng', 'Quản trị viên hệ thống', 'Nhân viên bán lẻ', 'Kỹ thuật viên', 'Quản lý showroom'];
  const role = (user?.role && !legacyLabels.includes(user.role))
    ? user.role
    : (roleMap[roleCode] || roleCode);

  let statusLabel = user?.statusLabel || (legacyUser.trangThai as string | undefined) || '';
  if (statusLabel === 'Đang hoạt động') {
    statusLabel = 'Đang hoạt động';
  } else if (statusLabel === 'Ngưng hoạt động') {
    statusLabel = 'Ngưng hoạt động';
  }

  return {
    ...user,
    username,
    fullName,
    role,
    roleCode,
    avatar: user?.avatar ?? '',
    id: user?.id ?? '',
    employeeCode: user?.employeeCode || (legacyUser.maNhanSu as string | undefined) || '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    department: user?.department || (legacyUser.boPhan as string | undefined) || '',
    position: user?.position || (legacyUser.viTri as string | undefined) || '',
    statusLabel,
    sessionExpiresAt: user?.sessionExpiresAt, // Keep original if exists, but do not set default value based on TTL since session is now infinite
  } as UserSession;
}

function readPersistedSession(): UserSession | null {
  try {
    const persistedUser = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!persistedUser) {
      return null;
    }

    const parsed = JSON.parse(persistedUser) as Partial<UserSession>;
    // Infinite session: no expiration check is performed
    return enrichSessionWithDefaultFields(parsed);
  } catch {
    return null;
  }
}

interface AppStoreState {
  currentUser: UserSession | null;
  notificationFocus: {
    notificationId: string;
    sourceModule?: 'SOP' | 'REPORTS' | 'CHECKLIST' | 'TASKS';
    sourceId?: string;
  } | null;
  setNotificationFocus: (focus: {
    notificationId: string;
    sourceModule?: 'SOP' | 'REPORTS' | 'CHECKLIST' | 'TASKS';
    sourceId?: string;
  } | null) => void;
  login: (sessionData: Partial<UserSession>) => void;
  logout: () => void;
  extendSession: () => void;
  syncSessionFromStorage: () => void;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  currentUser: readPersistedSession(),
  notificationFocus: null,
  setNotificationFocus: (focus) => set({ notificationFocus: focus }),
  login: (sessionData) => {
    const enriched = enrichSessionWithDefaultFields(sessionData);
    set({ currentUser: enriched });
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(enriched));
  },
  logout: () => {
    set({ currentUser: null, notificationFocus: null });
    localStorage.removeItem(SESSION_STORAGE_KEY);
  },
  extendSession: () => {
    // No-op: Session is now infinite and does not require expiration extension.
  },
  syncSessionFromStorage: () => {
    const restored = readPersistedSession();
    if (!restored) {
      set({ currentUser: null, notificationFocus: null });
      return;
    }

    set({ currentUser: restored });
  },
}));
