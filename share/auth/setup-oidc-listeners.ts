import { useAuthStore } from './auth-store';
import { getAuthStoreDeps } from './auth-store-deps';
import type { OidcUserLike } from './auth-helpers';

const AUTH_EMPLOYEE_KEY = 'auth_employee';

export interface SetupOidcListenersDeps {
  invalidateTokenCache: () => void;
  scheduleSilentRefresh: () => void;
  /** Gọi /users/info và cập nhật store. Sẽ được gọi khi fingerprint token đổi sau silent renew. */
  fetchProfileAndSave?: () => Promise<void>;
}

/**
 * Đăng ký OIDC event listeners. Gọi sau khi đã setAuthStoreDeps và có auth service (fetchProfileAndSave).
 * App gọi: setAuthStoreDeps({ userManager, clearTokenCache }); rồi setupOidcEventListeners({ fetchProfileAndSave, ... }).
 */
export function setupOidcEventListeners(deps: SetupOidcListenersDeps): void {
  if (typeof window === 'undefined') return;

  const storeDeps = getAuthStoreDeps();
  if (!storeDeps) {
    console.warn('[Auth] setupOidcEventListeners: setAuthStoreDeps chưa được gọi');
    return;
  }

  const { userManager } = storeDeps;
  const { invalidateTokenCache, scheduleSilentRefresh, fetchProfileAndSave } = deps;

  userManager.events.addAccessTokenExpiring(() => {
    console.log('[AuthStore] Access token expiring - ensureValidToken() will handle refresh');
  });

  userManager.events.addAccessTokenExpired(() => {
    console.log('[AuthStore] Access token expired');
    useAuthStore.getState().clearAuth();
  });

  userManager.events.addUserLoaded((user: unknown) => {
    const u = user as OidcUserLike;
    console.log('[AuthStore] User loaded/renewed from OIDC (automaticSilentRenew)');
    useAuthStore.getState().syncFromOidcUser(u);
    const current = useAuthStore.getState().user;
    useAuthStore.getState().saveToken((current ?? u.profile) as Record<string, unknown>, {
      access: u.access_token,
      refresh: u.refresh_token ?? '',
    });
    invalidateTokenCache();
    scheduleSilentRefresh();

    // Nếu fingerprint token đổi: fail-close (xóa permissions cũ) rồi load lại
    if (fetchProfileAndSave && !useAuthStore.getState().tokenMatchesPermissions()) {
      console.log(
        '[AuthStore] Token fingerprint changed after renew — refreshing permissions (fail-close)',
      );
      useAuthStore.setState({ permissions: null });
      fetchProfileAndSave().catch((e) => {
        console.error('[AuthStore] Failed to refresh permissions after token renew:', e);
      });
    }
  });

  userManager.events.addUserUnloaded(() => {
    console.log('[AuthStore] User unloaded from OIDC');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_EMPLOYEE_KEY);
    }
    useAuthStore.setState({
      user: null,
      employeeInfo: null,
      accessToken: null,
      refreshToken: null,
      permissions: null,
      organization: null,
      oidcUser: null,
      oidcAccessToken: null,
    });
  });

  userManager.events.addSilentRenewError((error) => {
    console.error('[AuthStore] Silent renew error:', error);
  });
}
