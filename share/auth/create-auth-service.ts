import axios, { isCancel } from 'axios';
import { useAuthStore } from './auth-store';
import type { IAuthUser, IAuthEmployee, IFlatItem } from '../types';

/** Organization từ /info (có thể có thêm field) */
interface UserInfoOrganization {
  id?: string;
  code?: string | null;
  name?: string;
  [key: string]: unknown;
}

/** Employee từ /info (có thể có thêm field) */
interface UserInfoEmployee {
  id?: string;
  code?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  organization?: UserInfoOrganization | null;
  position?: { id?: string; code?: string; name?: string } | null;
  board?: { id?: string; code?: string; name?: string } | null;
  [key: string]: unknown;
}

/** Response shape từ userService.getInfo (phần dùng trong fetchProfileAndSave) */
export interface UserInfoResponse {
  data?: {
    id?: string;
    username?: string;
    fullName?: string;
    email?: string;
    employeeId?: string;
    avatarUrl?: string;
    avatarData?: string;
    avatarContentType?: string;
    organizationId?: string;
    organizationName?: string;
    organization?: UserInfoOrganization | null;
    employee?: UserInfoEmployee | null;
    permissions?: string[];
    roles?: Array<{ permissions?: string[]; Permissions?: string[] }>;
    userType?: number;
    hasFullSystemAccess?: boolean;
    resources?: unknown[];
    createdDate?: Date;
    createdByUser?: string;
    isFirstLogin?: boolean;
  } | null;
  statusCode: number;
  message?: string;
}

/** Employee shape trả về từ GET /user-employees/{username}/employees */
export interface UserEmployeeItem {
  id?: string;
  code?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  organization?: UserInfoOrganization | null;
  position?: { id?: string; code?: string; name?: string } | null;
  board?: { id?: string; code?: string; name?: string } | null;
  [key: string]: unknown;
}

/** Response shape từ getEmployeesByUsername */
export interface UserEmployeesResponse {
  data?: UserEmployeeItem[] | null;
  statusCode: number;
  message?: string;
}

export interface AuthServiceDeps {
  userService: {
    getInfo: (config?: {
      timeout?: number;
      skipErrorToast?: boolean;
      params?: Record<string, unknown>;
    }) => Promise<UserInfoResponse>;
  };
  /** Service lấy danh sách employees theo username (many-to-many) */
  userEmployeeService?: {
    getEmployeesByUsername: (username: string) => Promise<UserEmployeesResponse>;
  };
  /** @deprecated Không dùng nữa — organization lấy từ /info (organizationId, organizationName) */
  employeeService?: {
    getById: (params: { id: string; includes?: string }) => Promise<unknown>;
  };
  /** Gọi khi /info lỗi (hiển thị màn hình lỗi trong app) */
  setAuthInfoError?: (message: string | null) => void;
}

let fetchProfilePromise: Promise<void> | null = null;
let fetchEmployeesPromise: Promise<void> | null = null;

function toFlatItem(o: UserInfoOrganization | null | undefined): IFlatItem | undefined {
  if (!o || o.id == null) return undefined;
  return {
    id: o.id,
    code: o.code ?? '',
    name: o.name ?? '',
  };
}

function toAuthEmployee(emp: UserEmployeeItem): IAuthEmployee {
  return {
    id: emp.id ?? '',
    code: emp.code ?? '',
    fullName: emp.name ?? ([emp.lastName, emp.firstName].filter(Boolean).join(' ') || ''),
    organization: toFlatItem(emp.organization) ?? undefined,
    position: toFlatItem(emp.position as UserInfoOrganization) ?? undefined,
    board: toFlatItem(emp.board as UserInfoOrganization) ?? undefined,
  };
}

/**
 * Tạo auth service:
 * 1. fetchEmployeesAndSelect: gọi /user-employees/{username}/employees → hiển thị chọn
 * 2. fetchProfileAndSave: gọi /info với employeeId đã chọn
 */
export function createAuthService(deps: AuthServiceDeps) {
  const { userService, userEmployeeService, setAuthInfoError } = deps;

  /**
   * Bước 1: Lấy danh sách employees theo username.
   * - Nếu đã có selectedEmployeeId trong store (từ localStorage) → bỏ qua, dùng luôn.
   * - Nếu chưa có → gọi API, lưu list vào store, set needsEmployeeSelection = true.
   */
  const fetchEmployeesAndSelect = async (): Promise<void> => {
    if (fetchEmployeesPromise) {
      return fetchEmployeesPromise;
    }

    const state = useAuthStore.getState();

    // Nếu đã có selectedEmployeeId (từ localStorage sau reload) → không cần chọn lại
    if (state.selectedEmployeeId) {
      return;
    }

    // Nếu không có userEmployeeService → fallback: gọi /info trực tiếp (backward compat)
    if (!userEmployeeService) {
      return;
    }

    const username = state.user?.username;
    if (!username) {
      console.warn('[createAuthService] No username available, skipping employee fetch');
      return;
    }

    setAuthInfoError?.(null);

    fetchEmployeesPromise = (async () => {
      try {
        const res = await userEmployeeService.getEmployeesByUsername(username);
        const employees = res?.data ?? [];

        if (!employees || employees.length === 0) {
          // Empty list = no UserEmployee records (e.g. admin user) — skip selection,
          // fetchProfileAndSave will call /info without employeeId
          return;
        }

        const authEmployees = employees.map(toAuthEmployee);
        useAuthStore.getState().setEmployeeList(authEmployees);

        // Luôn hiển thị dialog chọn (kể cả chỉ có 1 employee)
        useAuthStore.getState().setNeedsEmployeeSelection(true);
      } catch (e: unknown) {
        let message = 'Không thể lấy danh sách nhân viên.';
        if (isCancel(e)) {
          message = 'Yêu cầu bị hủy. Vui lòng thử lại.';
        } else if (axios.isAxiosError(e)) {
          if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
            message = 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.';
          } else {
            message =
              (e.response?.data as { message?: string } | undefined)?.message ||
              e.message ||
              message;
          }
        } else if (e instanceof Error) {
          message = e.message;
        }
        setAuthInfoError?.(message);
      } finally {
        fetchEmployeesPromise = null;
      }
    })();

    return fetchEmployeesPromise;
  };

  /**
   * Bước 2: Gọi /info (có truyền employeeId đã chọn).
   * Gọi SAU khi đã có selectedEmployeeId.
   */
  const fetchProfileAndSave = async (): Promise<void> => {
    if (fetchProfilePromise) {
      return fetchProfilePromise;
    }

    setAuthInfoError?.(null);

    fetchProfilePromise = (async () => {
      try {
        const selectedEmployeeId = useAuthStore.getState().selectedEmployeeId;

        const userRes = await userService.getInfo({
          timeout: 30_000,
          skipErrorToast: true,
          ...(selectedEmployeeId ? { params: { employeeId: selectedEmployeeId } } : {}),
        });

        const user = userRes?.data ?? null;

        if (!user || userRes.statusCode !== 200) {
          const message =
            userRes?.message || 'Không thể lấy thông tin người dùng. Vui lòng thử đăng nhập lại.';
          setAuthInfoError?.(message);
          return;
        }

        const permissionsFromRoles =
          user.roles?.flatMap(
            (r) =>
              (r as { permissions?: string[] }).permissions ??
              (r as { Permissions?: string[] }).Permissions ??
              [],
          ) ?? [];
        const permissions = user.permissions ?? permissionsFromRoles;
        const uniquePermissions = [...new Set(permissions)];

        useAuthStore.getState().setProfileFromApi({
          user: {
            id: user.id ?? user.username ?? '',
            username: user.username ?? '',
            fullName: user.fullName ?? '',
            email: user.email ?? '',
            employeeId: user.employeeId,
            avatarUrl: user.avatarUrl,
            avatarData: user.avatarData,
            avatarContentType: user.avatarContentType,
            isFirstLogin: user.isFirstLogin,
            userType: user.userType,
            hasFullSystemAccess: user.hasFullSystemAccess,
          } as IAuthUser,
          permissions: uniquePermissions,
        });

        const organization: IFlatItem | null =
          toFlatItem(user.organization) ??
          (user.organizationId != null || user.organizationName != null
            ? {
                id: user.organizationId ?? '',
                code: (user as { organizationCode?: string }).organizationCode ?? '',
                name: user.organizationName ?? '',
              }
            : null);
        useAuthStore.getState().setOrganization(organization);

        const resources = Array.isArray(user.resources) ? user.resources : null;
        useAuthStore.getState().setResources(resources);

        if (user.employee) {
          const emp = user.employee;
          const empOrg = toFlatItem(emp.organization) ?? organization ?? undefined;
          const employee: IAuthEmployee = {
            id: emp.id ?? user.employeeId ?? user.id ?? '',
            code: emp.code ?? '',
            fullName:
              emp.name ??
              ([emp.lastName, emp.firstName].filter(Boolean).join(' ') || user.fullName) ??
              '',
            organization: empOrg,
            position: toFlatItem(emp.position as UserInfoOrganization) ?? undefined,
            board: toFlatItem(emp.board as UserInfoOrganization) ?? undefined,
          };
          useAuthStore.getState().setEmployeeInfo(employee);
        } else {
          const employee: IAuthEmployee = {
            id: user.employeeId ?? '',
            code: (user as { employeeCode?: string }).employeeCode ?? '',
            fullName: user.fullName ?? '',
            organization: organization ?? undefined,
          };
          useAuthStore.getState().setEmployeeInfo(employee);
        }
      } catch (e: unknown) {
        let message = 'Không thể lấy thông tin người dùng.';
        let shouldSetError = true;

        if (isCancel(e)) {
          message = 'Yêu cầu bị hủy. Vui lòng thử lại.';
          shouldSetError = false;
        } else if (axios.isAxiosError(e)) {
          if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
            message = 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.';
          } else {
            message =
              (e.response?.data as { message?: string } | undefined)?.message ||
              e.message ||
              message;
          }
        } else if (e instanceof Error) {
          message = e.message;
        }

        if (shouldSetError) {
          setAuthInfoError?.(message);
        }
      } finally {
        fetchProfilePromise = null;
      }
    })();

    return fetchProfilePromise;
  };

  return { fetchProfileAndSave, fetchEmployeesAndSelect };
}
