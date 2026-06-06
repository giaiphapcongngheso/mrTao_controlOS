import { lazy, LazyExoticComponent, ComponentType } from 'react';

/**
 * A safe wrapper around React.lazy that catches chunk loading errors
 * (often caused by deployment updates where old JS hash files are deleted on the server)
 * and automatically reloads the page to load the latest bundle.
 */
export function safeLazy<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isChunkError =
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('ChunkLoadError');

      if (isChunkError) {
        // Prevent infinite reload loops by checking sessionStorage
        const reloadKey = 'chunk-load-error-reload-timestamp';
        const lastReload = sessionStorage.getItem(reloadKey);
        const now = Date.now();

        // If not reloaded in the last 10 seconds, reload the page
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem(reloadKey, String(now));
          window.location.reload();
          // Return an unresolved promise to keep React suspended while the page is reloading
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });
}
