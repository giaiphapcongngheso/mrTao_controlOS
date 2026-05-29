import type { AxiosInstance } from 'axios';

/**
 * Global API registry for shared components.
 *
 * Each app registers its AxiosInstance at startup via `registerSharedApi(api)`.
 * Shared components/hooks then call `getSharedApi()` to get the instance.
 *
 * @example
 * ```ts
 * // In app's init (e.g. api-client.ts after creating axios instance):
 * import { registerSharedApi } from '@shared/lib';
 * registerSharedApi(api);
 * ```
 */
let sharedApi: AxiosInstance | null = null;

export function registerSharedApi(api: AxiosInstance): void {
  sharedApi = api;
}

export function getSharedApi(): AxiosInstance {
  if (!sharedApi) {
    throw new Error(
      '[shared] API not registered. Call registerSharedApi(api) during app initialization.',
    );
  }
  return sharedApi;
}
