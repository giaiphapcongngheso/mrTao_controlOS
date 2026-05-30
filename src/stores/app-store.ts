import { create } from 'zustand';
import type { TabType } from '../types/app.types';

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

const SESSION_STORAGE_KEY = 'mrt_user_session';
const SESSION_TTL_MS = 30 * 60 * 1000;
const KNOWN_ROLE_CODES = new Set([
  'CHU_CUA_HANG',
  'QUAN_LY',
  'SALES',
  'KHO',
  'CSKH',
  'QUAN_TRI_VIEN',
]);
const DEFAULT_ROLE_CODE_BY_USERNAME: Record<string, string> = {
  admin: 'CHU_CUA_HANG',
  manager: 'QUAN_LY',
  sales: 'SALES',
  tech: 'KHO',
  cskh: 'CSKH',
};

function resolveRoleCode(user: Partial<UserSession>, legacyUser: Record<string, unknown>, username: string): string {
  const explicitRoleCode =
    (typeof user.roleCode === 'string' ? user.roleCode : undefined) ||
    (typeof legacyUser.roleCode === 'string' ? legacyUser.roleCode : undefined);
  const normalizedExplicit = explicitRoleCode?.trim().toUpperCase();
  if (normalizedExplicit) {
    return normalizedExplicit;
  }

  const normalizedRole = user.role?.trim().toUpperCase();
  if (normalizedRole && KNOWN_ROLE_CODES.has(normalizedRole)) {
    return normalizedRole;
  }

  return DEFAULT_ROLE_CODE_BY_USERNAME[username] ?? 'SALES';
}

export function enrichSessionWithDefaultFields(user: Partial<UserSession> | null): UserSession {
  const legacyUser = (user ?? {}) as Record<string, unknown>;

  if (!user) {
    return {
      username: 'sales',
      fullName: 'Nguyen Van A',
      role: 'Nhan vien ban le',
      roleCode: 'SALES',
      id: 'NV-002',
      employeeCode: 'MNS-002',
      phone: '0987654321',
      email: 'sales@mrtaocoop.com',
      department: 'Phong Kinh Doanh',
      position: 'Quay Ban Le Hang Hoa',
      statusLabel: 'Dang hoat dong',
      sessionExpiresAt: Date.now() + SESSION_TTL_MS,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    };
  }

  const username = user.username || 'admin';
  const fullName =
    user.fullName ||
    (username === 'admin'
      ? 'Nguyen Minh Duc'
      : username === 'sales'
        ? 'Nguyen Van A'
        : username === 'tech'
          ? 'Tran Thi B'
          : 'Le Hoang C');
  const role =
    user.role ||
    (username === 'admin'
      ? 'Chu cua hang'
      : username === 'sales'
        ? 'Nhan vien ban le'
        : username === 'tech'
          ? 'Ky thuat vien'
          : 'Quan ly cua hang');
  const roleCode = resolveRoleCode(user, legacyUser, username);

  return {
    username,
    fullName,
    role,
    roleCode,
    avatar:
      user.avatar ||
      (username === 'admin'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
        : username === 'sales'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'),
    id: user.id || (username === 'admin' ? 'NV-001' : username === 'sales' ? 'NV-002' : username === 'tech' ? 'NV-003' : 'NV-005'),
    employeeCode: (user.employeeCode as string | undefined) || (legacyUser.maNhanSu as string | undefined) || (username === 'admin' ? 'MNS-001' : username === 'sales' ? 'MNS-002' : username === 'tech' ? 'MNS-003' : 'MNS-005'),
    phone: user.phone || (username === 'admin' ? '0912345678' : username === 'sales' ? '0987654321' : username === 'tech' ? '0901238899' : '0944556677'),
    email: user.email || (username === 'admin' ? 'duc.nm@mrtaocoop.com' : username === 'sales' ? 'sales@mrtaocoop.com' : username === 'tech' ? 'tech@mrtaocoop.com' : 'manager@mrtaocoop.com'),
    department: (user.department as string | undefined) || (legacyUser.boPhan as string | undefined) || (username === 'admin' ? 'Ban Dieu Hanh' : username === 'sales' ? 'Phong Kinh Doanh' : username === 'tech' ? 'Ban Ky Thuat' : 'Ban Quan Ly'),
    position: (user.position as string | undefined) || (legacyUser.viTri as string | undefined) || (username === 'admin' ? 'Quay Truong Showroom' : username === 'sales' ? 'Quay Ban Le Hang Hoa' : username === 'tech' ? 'Ban Sua Chua & Tham Dinh' : 'Phong Lam Viec'),
    statusLabel: (user.statusLabel as string | undefined) || (legacyUser.trangThai as string | undefined) || 'Dang hoat dong',
    sessionExpiresAt:
      typeof user.sessionExpiresAt === 'number' && user.sessionExpiresAt > Date.now()
        ? user.sessionExpiresAt
        : Date.now() + SESSION_TTL_MS,
  };
}

function readPersistedSession(): UserSession | null {
  try {
    const persistedUser = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!persistedUser) {
      return null;
    }

    const parsed = JSON.parse(persistedUser) as Partial<UserSession>;
    if (typeof parsed.sessionExpiresAt === 'number' && parsed.sessionExpiresAt <= Date.now()) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return enrichSessionWithDefaultFields(parsed);
  } catch {
    return null;
  }
}

interface AppStoreState {
  activeTab: TabType;
  currentUser: UserSession | null;
  notificationFocus: {
    notificationId: string;
    sourceModule?: 'SOP' | 'REPORTS' | 'CHECKLIST' | 'TASKS';
    sourceId?: string;
  } | null;
  setActiveTab: (tab: TabType) => void;
  setNotificationFocus: (focus: {
    notificationId: string;
    sourceModule?: 'SOP' | 'REPORTS' | 'CHECKLIST' | 'TASKS';
    sourceId?: string;
  } | null) => void;
  login: (sessionData: Partial<UserSession>) => void;
  logout: () => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  activeTab: 'Today',
  currentUser: readPersistedSession(),
  notificationFocus: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setNotificationFocus: (focus) => set({ notificationFocus: focus }),
  login: (sessionData) => {
    const enriched = enrichSessionWithDefaultFields({
      ...sessionData,
      sessionExpiresAt: Date.now() + SESSION_TTL_MS,
    });
    set({ currentUser: enriched });
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(enriched));
  },
  logout: () => {
    set({ currentUser: null, notificationFocus: null });
    localStorage.removeItem(SESSION_STORAGE_KEY);
  },
}));
