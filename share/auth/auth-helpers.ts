import type { IBaseEmployee, IBaseUser, IFlatItem } from '../types';

export interface OidcUserProfile {
  sub: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  picture?: string;
  [key: string]: unknown;
}

export interface OidcUserLike {
  profile: OidcUserProfile;
  access_token: string;
  refresh_token?: string;
  expired?: boolean;
}

/**
 * Decode JWT token to extract payload
 */
export const decodeJwt = (token: string): Record<string, unknown> | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const TOKEN_VALID_THRESHOLD_SEC = 60;

/**
 * Kiểm tra accessToken trong store còn hạn (dùng khi F5, OIDC chưa restore user)
 */
export function isAccessTokenValid(accessToken: string | null): boolean {
  if (!accessToken) return false;
  const decoded = decodeJwt(accessToken);
  const exp = (decoded?.exp as number) || 0;
  return exp > Date.now() / 1000 + TOKEN_VALID_THRESHOLD_SEC;
}

/**
 * Find current work position from Workers or Offices collection
 * Current position is determined by: EndedDate is null or in the future
 * Sorted by createdDate (newest first)
 * Priority: Offices first (office employees), then Workers (production workers)
 */
export const findCurrentWorkPosition = <T extends IBaseEmployee>(
  employee: T,
): { organization?: IFlatItem; position?: IFlatItem; board?: IFlatItem } | null => {
  const now = new Date();

  // Try to find current position from Offices first (office employees)
  const currentOffice = employee.offices
    ?.filter((o) => (!o.endedDate || new Date(o.endedDate) > now) && (o as any).createdDate)
    .sort(
      (a, b) =>
        new Date((b as any).createdDate).getTime() - new Date((a as any).createdDate).getTime(),
    )[0];

  if (currentOffice) {
    return {
      organization: currentOffice.organization,
      position: currentOffice.position,
      board: currentOffice.board,
    };
  }

  // If no office position found, try Workers (production workers)
  const currentWorker = employee.workers
    ?.filter((w) => (!w.endedDate || new Date(w.endedDate) > now) && (w as any).createdDate)
    .sort(
      (a, b) =>
        new Date((b as any).createdDate).getTime() - new Date((a as any).createdDate).getTime(),
    )[0];

  if (currentWorker) {
    return {
      organization: currentWorker.organization,
      position: currentWorker.position,
      board: currentWorker.board,
    };
  }

  return null;
};

/**
 * Convert OIDC user profile to base user object
 * @param oidcUser - OIDC user payload
 * @param accessToken - Optional; uses oidcUser.access_token when not provided
 */
export const convertOidcUserToBaseUser = (
  oidcUser: OidcUserLike,
  _accessToken?: string,
): IBaseUser & Record<string, unknown> => {
  const profile = oidcUser.profile;

  return {
    id: profile.sub,
    username: profile.preferred_username || profile.name || '',
    email: profile.email || '',
    fullName: profile.name || '',
    avatarUrl: profile.picture,
    // employeeId chỉ lấy từ store/API (setProfileFromApi, fetchProfileAndSave), không từ JWT
    employeeId: undefined,
    // Add other fields from claims
    ...(profile as Record<string, unknown>),
  };
};
