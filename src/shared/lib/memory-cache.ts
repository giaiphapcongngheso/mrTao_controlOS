// ─── In-Memory TTL Cache ─────────────────────────────────────────────────────
// Lightweight cache for API responses that don't need realtime updates.
// Cache lives in memory → auto-cleared on page reload (Ctrl+F5).
// Mutations (create/update/delete) invalidate the cache immediately.

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Creates a simple in-memory cache with TTL support.
 * - Serves cached data if within TTL window (stale time).
 * - Automatically cleared on hard page reload (Ctrl+F5).
 * - Provides manual invalidation for mutation side-effects.
 */
export function createMemoryCache<T>(ttlMs: number) {
  let entry: CacheEntry<T> | null = null;

  return {
    /**
     * Get cached data if still fresh, otherwise returns null.
     */
    get(): T | null {
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        entry = null;
        return null;
      }
      return entry.data;
    },

    /**
     * Store data with TTL expiration.
     */
    set(data: T): void {
      entry = {
        data,
        expiresAt: Date.now() + ttlMs,
      };
    },

    /**
     * Force-clear the cache (called on mutations).
     */
    invalidate(): void {
      entry = null;
    },

    /**
     * Check if cache has fresh data.
     */
    has(): boolean {
      if (!entry) return false;
      if (Date.now() > entry.expiresAt) {
        entry = null;
        return false;
      }
      return true;
    },
  };
}

export type MemoryCache<T> = ReturnType<typeof createMemoryCache<T>>;
