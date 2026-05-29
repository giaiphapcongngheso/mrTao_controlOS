import type { User } from 'oidc-client-ts';
import { create } from 'zustand';
import { convertOidcUserToBaseUser } from './auth-helpers';
import { getAuthStoreDeps } from './auth-store-deps';
import type {
  IAuthUser,
  IAuthEmployee,
  IAuthSidebarResource,
  IAuthSidebarResourceParent,
} from '../types/auth.types';
import type { IFlatItem } from '../types/base.types';

const AUTH_PERMISSIONS_KEY = 'auth_permissions';
const AUTH_ORGANIZATION_KEY = 'auth_organization';
const AUTH_USER_KEY = 'auth_user';
const AUTH_EMPLOYEE_KEY = 'auth_employee';
const AUTH_PERM_TOKEN_HASH_KEY = 'auth_perm_token_hash';
const AUTH_SELECTED_EMPLOYEE_ID_KEY = 'auth_selected_employee_id';
const AUTH_RESOURCES_KEY = 'auth_resources';

/** Lấy fingerprint đơn giản từ access token (32 ký tự đầu). Không dùng crypto để tránh phụ thuộc. */
function tokenHash(token: string | null | undefined): string | null {
  if (!token) return null;
  return token.substring(0, 32);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toRequiredString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeSidebarParent(value: unknown): IAuthSidebarResourceParent | undefined {
  if (!isRecord(value)) return undefined;

  const id = toRequiredString(value.id);
  if (!id) return undefined;

  const rawType =
    typeof value.type === 'number'
      ? value.type
      : typeof value.type === 'string'
        ? Number(value.type)
        : NaN;

  return {
    id,
    code: toOptionalString(value.code),
    name: toOptionalString(value.name),
    type: Number.isFinite(rawType) ? rawType : undefined,
    parentId: toOptionalString(value.parentId),
    icon: toOptionalString(value.icon),
    description: toOptionalString(value.description),
    level: toOptionalNumber(value.level),
    displayOrder: toOptionalNumber(value.displayOrder),
  };
}

function normalizeSidebarResources(
  resources: unknown[] | null | undefined,
): IAuthSidebarResource[] | null {
  if (!Array.isArray(resources)) return null;

  const normalizedResources: IAuthSidebarResource[] = [];
  for (const rawResource of resources) {
    if (!isRecord(rawResource)) continue;

    const id = toRequiredString(rawResource.id);
    const code = toRequiredString(rawResource.code);
    const name = toRequiredString(rawResource.name);
    const parent = normalizeSidebarParent(rawResource.parent);

    const rawType =
      typeof rawResource.type === 'number'
        ? rawResource.type
        : typeof rawResource.type === 'string'
          ? Number(rawResource.type)
          : NaN;

    if (!id || !code || !name || !Number.isFinite(rawType)) continue;

    normalizedResources.push({
      id,
      code,
      name,
      type: rawType,
      parentId: toOptionalString(rawResource.parentId) ?? parent?.id,
      icon: toOptionalString(rawResource.icon),
      description: toOptionalString(rawResource.description),
      level: toOptionalNumber(rawResource.level),
      url: toOptionalString(rawResource.url),
      displayOrder: toOptionalNumber(rawResource.displayOrder),
      parent,
    });
  }

  return normalizedResources;
}

export interface AuthState {
  user: IAuthUser | null;
  employeeInfo: IAuthEmployee | null;
  permissions: string[] | null;
  resources: IAuthSidebarResource[] | null;
  organization: IFlatItem | null;
  accessToken: string | null;
  refreshToken: string | null;
  oidcUser: User | null;
  oidcAccessToken: string | null;
  /** Hash của access token tại thời điểm permissions được load lần cuối. Dùng để phát hiện token đổi. */
  permissionTokenHash: string | null;
  /** Trả về true nếu permissions hiện tại khớp với access token hiện tại (không stale). */
  tokenMatchesPermissions: () => boolean;
  /** Employee selection state (many-to-many user-employee) */
  selectedEmployeeId: string | null;
  employeeList: IAuthEmployee[] | null;
  needsEmployeeSelection: boolean;

  syncFromOidcUser: (oidcUser: User) => void;
  saveToken: (user: Record<string, unknown>, tokens: { access: string; refresh: string }) => void;
  setProfileFromApi: (payload: { user?: IAuthUser | null; permissions?: string[] | null }) => void;
  setEmployeeInfo: (employee: IAuthEmployee | null) => void;
  setResources: (resources: unknown[] | null) => void;
  setOrganization: (organization: IFlatItem | null) => void;
  setSelectedEmployeeId: (employeeId: string | null) => void;
  setEmployeeList: (employees: IAuthEmployee[] | null) => void;
  setNeedsEmployeeSelection: (needs: boolean) => void;
  updateUser: (userData: Partial<IAuthUser>) => void;
  updateUserData: (userData: Partial<IAuthUser>) => void;
  /** Xóa employee selection + permissions để buộc chọn lại (dùng khi detect user change) */
  clearEmployeeSelection: () => void;
  clearToken: () => void;
  clearAuth: () => Promise<void>;
  restoreFromOidc: () => Promise<void>;
  /** Đồng bộ state từ localStorage (gọi khi vào app / F5 để không mất dữ liệu đã lưu) */
  rehydrateFromStorage: () => void;
  /** Log state ra console (không log raw token, dùng để debug) */
  logAuthStoreState: () => void;
}

function getInitialFromStorage(): {
  permissions: string[] | null;
  resources: IAuthSidebarResource[] | null;
  organization: IFlatItem | null;
  user: IAuthUser | null;
  employee: IAuthEmployee | null;
  accessToken: string | null;
  refreshToken: string | null;
  permissionTokenHash: string | null;
  selectedEmployeeId: string | null;
} {
  let permissions: string[] | null = null;
  let resources: IAuthSidebarResource[] | null = null;
  let organization: IFlatItem | null = null;
  let user: IAuthUser | null = null;
  let employee: IAuthEmployee | null = null;
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let permissionTokenHash: string | null = null;
  let selectedEmployeeId: string | null = null;

  if (globalThis.window !== undefined) {
    accessToken = localStorage.getItem('accessToken');
    refreshToken = localStorage.getItem('refreshToken');
    permissionTokenHash = localStorage.getItem(AUTH_PERM_TOKEN_HASH_KEY);
    try {
      const storedPermissions = localStorage.getItem(AUTH_PERMISSIONS_KEY);
      const storedResources = localStorage.getItem(AUTH_RESOURCES_KEY);
      const storedOrganization = localStorage.getItem(AUTH_ORGANIZATION_KEY);
      const storedUser = localStorage.getItem(AUTH_USER_KEY);
      const storedEmployee = localStorage.getItem(AUTH_EMPLOYEE_KEY);
      if (storedPermissions) {
        const parsed = JSON.parse(storedPermissions) as string[];
        permissions = Array.isArray(parsed) ? parsed : null;
      }
      if (storedResources) {
        const parsed = JSON.parse(storedResources) as unknown[];
        resources = normalizeSidebarResources(parsed);
      }
      if (storedOrganization) {
        const parsed = JSON.parse(storedOrganization) as IFlatItem;
        organization = parsed && typeof parsed === 'object' && parsed.id != null ? parsed : null;
      }
      if (storedUser) {
        const parsed = JSON.parse(storedUser) as IAuthUser;
        user = parsed && typeof parsed === 'object' && parsed.id != null ? parsed : null;
      }
      if (storedEmployee) {
        const parsed = JSON.parse(storedEmployee) as IAuthEmployee;
        employee = parsed && typeof parsed === 'object' && parsed.id != null ? parsed : null;
      }
      selectedEmployeeId = localStorage.getItem(AUTH_SELECTED_EMPLOYEE_ID_KEY);
    } catch (e) {
      console.warn('[AuthStore] Failed to restore profile from localStorage:', e);
    }
  }

  return {
    permissions,
    resources,
    organization,
    user,
    employee,
    accessToken,
    refreshToken,
    permissionTokenHash,
    selectedEmployeeId,
  };
}

const initial = getInitialFromStorage();

type SetStateAuth = (
  partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>),
) => void;
type GetStateAuth = () => AuthState;

export const useAuthStore = create<AuthState>((set: SetStateAuth, get: GetStateAuth) => ({
  user: initial.user,
  employeeInfo: initial.employee,
  accessToken: initial.accessToken,
  refreshToken: initial.refreshToken,
  permissions: initial.permissions,
  resources: initial.resources,
  organization: initial.organization,
  oidcUser: null,
  oidcAccessToken: null,
  permissionTokenHash: initial.permissionTokenHash,
  selectedEmployeeId: initial.selectedEmployeeId,
  employeeList: null,
  needsEmployeeSelection: false,

  tokenMatchesPermissions: () => {
    const { accessToken, permissionTokenHash, permissions } = get();
    if (!permissions) return false;
    const current = tokenHash(accessToken);
    return current !== null && current === permissionTokenHash;
  },

  syncFromOidcUser: (oidcUser: User) => {
    const oidcUserData = convertOidcUserToBaseUser(oidcUser) as unknown as IAuthUser;
    const current = get().user;
    const user: IAuthUser = {
      ...oidcUserData,
      employeeId: oidcUserData.employeeId ?? current?.employeeId,
      avatarData: oidcUserData.avatarData ?? current?.avatarData,
      avatarContentType: oidcUserData.avatarContentType ?? current?.avatarContentType,
      userType: oidcUserData.userType ?? current?.userType,
      hasFullSystemAccess: oidcUserData.hasFullSystemAccess ?? current?.hasFullSystemAccess,
    };
    set({
      oidcUser,
      oidcAccessToken: oidcUser.access_token,
      user,
    });
  },

  saveToken: (user: Record<string, unknown>, tokens: { access: string; refresh: string }) => {
    const savedUser: IAuthUser = {
      id: (user.id || '') as string,
      username: (user.username || '') as string,
      email: (user.email || '') as string,
      fullName: (user.fullName || (user as { full_name?: string }).full_name || '') as string,
      employeeId: (user.employeeId ?? (user as { employee_id?: string }).employee_id) as
        | string
        | undefined,
      avatarUrl: (user.avatarUrl ?? (user as { avatar_url?: string }).avatar_url) as
        | string
        | undefined,
      ...user,
    } as IAuthUser;
    set({
      user: savedUser,
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
      permissions: get().permissions,
      organization: get().organization,
    });
    if (globalThis.window !== undefined) {
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(savedUser));
    }
  },

  setProfileFromApi: (payload: { user?: IAuthUser | null; permissions?: string[] | null }) => {
    const { user, permissions } = payload;
    set((state: AuthState) => {
      const next: Partial<AuthState> = {};
      if (permissions !== undefined) {
        next.permissions = permissions;
        // Ghi nhận fingerprint của token tại thời điểm permissions được load
        const hash = tokenHash(state.accessToken);
        next.permissionTokenHash = hash;
        if (globalThis.window !== undefined) {
          if (permissions) {
            localStorage.setItem(AUTH_PERMISSIONS_KEY, JSON.stringify(permissions));
          } else {
            localStorage.removeItem(AUTH_PERMISSIONS_KEY);
          }
          if (hash) {
            localStorage.setItem(AUTH_PERM_TOKEN_HASH_KEY, hash);
          } else {
            localStorage.removeItem(AUTH_PERM_TOKEN_HASH_KEY);
          }
        }
      }
      if (user !== undefined) {
        if (user) {
          const mergedUser: IAuthUser = {
            ...state.user,
            ...user,
            id: user.id ?? state.user?.id ?? user.username,
          };
          next.user = mergedUser;
          if (globalThis.window !== undefined) {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mergedUser));
          }
        } else {
          next.user = null;
          if (globalThis.window !== undefined) {
            localStorage.removeItem(AUTH_USER_KEY);
          }
        }
      }
      return next;
    });
  },

  setEmployeeInfo: (employee: IAuthEmployee | null) => {
    set({ employeeInfo: employee });
    if (globalThis.window !== undefined) {
      if (employee) {
        localStorage.setItem(AUTH_EMPLOYEE_KEY, JSON.stringify(employee));
      } else {
        localStorage.removeItem(AUTH_EMPLOYEE_KEY);
      }
    }
  },

  setResources: (resources: unknown[] | null) => {
    const normalizedResources = normalizeSidebarResources(resources);
    set({ resources: normalizedResources });
    if (globalThis.window !== undefined) {
      if (normalizedResources && normalizedResources.length > 0) {
        localStorage.setItem(AUTH_RESOURCES_KEY, JSON.stringify(normalizedResources));
      } else {
        localStorage.removeItem(AUTH_RESOURCES_KEY);
      }
    }
  },

  setOrganization: (organization: IFlatItem | null) => {
    set({ organization });
    if (globalThis.window !== undefined) {
      if (organization) {
        localStorage.setItem(AUTH_ORGANIZATION_KEY, JSON.stringify(organization));
      } else {
        localStorage.removeItem(AUTH_ORGANIZATION_KEY);
      }
    }
  },

  setSelectedEmployeeId: (employeeId: string | null) => {
    set({ selectedEmployeeId: employeeId, needsEmployeeSelection: false });
    if (globalThis.window !== undefined) {
      if (employeeId) {
        localStorage.setItem(AUTH_SELECTED_EMPLOYEE_ID_KEY, employeeId);
      } else {
        localStorage.removeItem(AUTH_SELECTED_EMPLOYEE_ID_KEY);
      }
    }
  },

  setEmployeeList: (employees: IAuthEmployee[] | null) => {
    set({ employeeList: employees });
  },

  setNeedsEmployeeSelection: (needs: boolean) => {
    set({ needsEmployeeSelection: needs });
  },

  clearEmployeeSelection: () => {
    if (globalThis.window !== undefined) {
      localStorage.removeItem(AUTH_SELECTED_EMPLOYEE_ID_KEY);
      localStorage.removeItem(AUTH_PERMISSIONS_KEY);
      localStorage.removeItem(AUTH_PERM_TOKEN_HASH_KEY);
      localStorage.removeItem(AUTH_EMPLOYEE_KEY);
      localStorage.removeItem(AUTH_RESOURCES_KEY);
      localStorage.removeItem(AUTH_ORGANIZATION_KEY);
    }
    set({
      selectedEmployeeId: null,
      employeeList: null,
      needsEmployeeSelection: false,
      permissions: null,
      permissionTokenHash: null,
      employeeInfo: null,
      resources: null,
      organization: null,
    });
  },

  updateUser: (userData: Partial<IAuthUser>) => {
    set((state: AuthState) => {
      if (!state.user) return state;
      return { user: { ...state.user, ...userData } };
    });
  },

  updateUserData: (userData: Partial<IAuthUser>) => {
    set((state: AuthState) => {
      if (!state.user) return state;
      return { user: { ...state.user, ...userData } };
    });
  },

  clearToken: () => {
    const deps = getAuthStoreDeps();
    if (deps) deps.clearTokenCache();
    if (globalThis.window !== undefined) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem(AUTH_PERMISSIONS_KEY);
      localStorage.removeItem(AUTH_RESOURCES_KEY);
      localStorage.removeItem(AUTH_ORGANIZATION_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_EMPLOYEE_KEY);
      localStorage.removeItem(AUTH_PERM_TOKEN_HASH_KEY);
      localStorage.removeItem(AUTH_SELECTED_EMPLOYEE_ID_KEY);
    }
    set({
      user: null,
      employeeInfo: null,
      accessToken: null,
      refreshToken: null,
      permissions: null,
      resources: null,
      organization: null,
      permissionTokenHash: null,
      selectedEmployeeId: null,
      employeeList: null,
      needsEmployeeSelection: false,
    });
  },

  clearAuth: async () => {
    const deps = getAuthStoreDeps();
    if (deps) {
      deps.clearTokenCache();
      try {
        await deps.userManager.removeUser();
      } catch (e) {
        console.warn('[AuthStore] Failed to remove OIDC user:', e);
      }
    }
    if (globalThis.window !== undefined) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem(AUTH_PERMISSIONS_KEY);
      localStorage.removeItem(AUTH_RESOURCES_KEY);
      localStorage.removeItem(AUTH_ORGANIZATION_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_EMPLOYEE_KEY);
      localStorage.removeItem(AUTH_PERM_TOKEN_HASH_KEY);
      localStorage.removeItem(AUTH_SELECTED_EMPLOYEE_ID_KEY);
    }
    set({
      user: null,
      employeeInfo: null,
      accessToken: null,
      refreshToken: null,
      permissions: null,
      resources: null,
      organization: null,
      oidcUser: null,
      oidcAccessToken: null,
      permissionTokenHash: null,
      selectedEmployeeId: null,
      employeeList: null,
      needsEmployeeSelection: false,
    });
  },

  restoreFromOidc: async () => {
    const deps = getAuthStoreDeps();
    if (!deps) return;
    try {
      const oidcUser = await deps.userManager.getUser();
      if (oidcUser && !(oidcUser as { expired?: boolean }).expired) {
        get().syncFromOidcUser(oidcUser as User);
      }
    } catch (e) {
      console.error('[AuthStore] Failed to restore from OIDC:', e);
    }
  },

  rehydrateFromStorage: () => {
    if (globalThis.window === undefined) return;
    const restored = getInitialFromStorage();
    const current = get();

    // Check if data actually changed to avoid unnecessary re-renders
    const hasChanged =
      JSON.stringify(restored.user) !== JSON.stringify(current.user) ||
      JSON.stringify(restored.permissions) !== JSON.stringify(current.permissions) ||
      JSON.stringify(restored.resources) !== JSON.stringify(current.resources) ||
      JSON.stringify(restored.organization) !== JSON.stringify(current.organization) ||
      JSON.stringify(restored.employee) !== JSON.stringify(current.employeeInfo) ||
      restored.accessToken !== current.accessToken ||
      restored.refreshToken !== current.refreshToken ||
      restored.permissionTokenHash !== current.permissionTokenHash ||
      restored.selectedEmployeeId !== current.selectedEmployeeId;

    if (hasChanged) {
      console.log('[rehydrateFromStorage] Data changed, updating store...');
      set({
        user: restored.user,
        employeeInfo: restored.employee,
        accessToken: restored.accessToken,
        refreshToken: restored.refreshToken,
        permissions: restored.permissions,
        resources: restored.resources,
        organization: restored.organization,
        permissionTokenHash: restored.permissionTokenHash,
        selectedEmployeeId: restored.selectedEmployeeId,
      });
    }
  },

  logAuthStoreState: () => {
    const s = get();
    const currentTokenHash = tokenHash(s.accessToken);
    const tokenHashMatches = !!currentTokenHash && currentTokenHash === s.permissionTokenHash;

    const storageSnapshot =
      globalThis.window !== undefined
        ? {
            hasAccessToken: !!localStorage.getItem('accessToken'),
            hasRefreshToken: !!localStorage.getItem('refreshToken'),
            authPermTokenHash: localStorage.getItem(AUTH_PERM_TOKEN_HASH_KEY),
            authPermissionsRaw: localStorage.getItem(AUTH_PERMISSIONS_KEY),
            authUserRaw: localStorage.getItem(AUTH_USER_KEY),
            authEmployeeRaw: localStorage.getItem(AUTH_EMPLOYEE_KEY),
            authOrganizationRaw: localStorage.getItem(AUTH_ORGANIZATION_KEY),
          }
        : null;

    let storagePermissions: string[] | null = null;
    if (storageSnapshot?.authPermissionsRaw) {
      try {
        const parsed = JSON.parse(storageSnapshot.authPermissionsRaw) as unknown;
        storagePermissions = Array.isArray(parsed) ? (parsed as string[]) : null;
      } catch {
        storagePermissions = null;
      }
    }

    console.log('[AuthStore]', {
      timestamp: new Date().toISOString(),
      phase: 'auth-store-snapshot',
      user: s.user
        ? {
            id: s.user.id,
            fullName: s.user.fullName,
            email: s.user.email,
            employeeId: s.user.employeeId,
          }
        : null,
      hasAccessToken: !!s.accessToken,
      accessTokenLength: s.accessToken?.length ?? 0,
      currentTokenHash,
      permissionTokenHash: s.permissionTokenHash,
      tokenHashMatches,
      tokenMatchesPermissions: s.tokenMatchesPermissions(),
      permissionsCount: s.permissions?.length ?? 0,
      permissions: s.permissions,
      permissionsHead: s.permissions?.slice(0, 20) ?? [],
      resourcesCount: s.resources?.length ?? 0,
      organization: s.organization,
      hasEmployeeInfo: !!s.employeeInfo,
      selectedEmployeeId: s.selectedEmployeeId,
      needsEmployeeSelection: s.needsEmployeeSelection,
      employeeListLength: s.employeeList?.length ?? 0,
      storage: {
        hasAccessToken: storageSnapshot?.hasAccessToken ?? false,
        hasRefreshToken: storageSnapshot?.hasRefreshToken ?? false,
        authPermTokenHash: storageSnapshot?.authPermTokenHash ?? null,
        authPermissionsCount: storagePermissions?.length ?? 0,
        authPermissionsHead: storagePermissions?.slice(0, 20) ?? [],
        authUserRawLength: storageSnapshot?.authUserRaw?.length ?? 0,
        authEmployeeRawLength: storageSnapshot?.authEmployeeRaw?.length ?? 0,
        authOrganizationRawLength: storageSnapshot?.authOrganizationRaw?.length ?? 0,
      },
    });
  },
}));
