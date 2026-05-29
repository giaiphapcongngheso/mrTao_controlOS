/**
 * Fire-and-forget BE cache invalidation on logout.
 * Uses native fetch (NOT axios/getSharedApi) because helpdesk, workflow, hrm
 * do not call registerSharedApi().
 *
 * Must be called with token/employeeId captured BEFORE clearAuth() wipes the store.
 */
export async function callBeLogout({
  accessToken,
  employeeId,
  apiBaseUrl,
}: {
  accessToken: string | null;
  employeeId: string | null;
  apiBaseUrl: string;
}): Promise<void> {
  if (!accessToken) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    if (employeeId) {
      headers['X-Employee-Id'] = employeeId;
    }

    await fetch(`${apiBaseUrl}/v1/auth/logout`, {
      method: 'POST',
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    // Never throw — logout must proceed even if BE call fails
    console.warn('[logout] BE cache invalidation failed:', error);
  } finally {
    clearTimeout(timeoutId);
  }
}
