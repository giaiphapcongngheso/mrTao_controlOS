import type { DocumentSnapshot } from 'firebase/firestore';
import {
  getFirestorePaged,
  type FirestoreFilter,
  type FirestorePaginatedResult,
} from './firestore-pagination';
import { createMemoryCache, type MemoryCache } from '../lib/memory-cache';

// ─── HttpClient Interface ────────────────────────────────────────────────────

export interface HttpClient {
  get: <T>(url: string, config?: RequestInit) => Promise<T>;
  post: <T>(url: string, body?: unknown, config?: RequestInit) => Promise<T>;
  put: <T>(url: string, body?: unknown, config?: RequestInit) => Promise<T>;
  delete: <T>(url: string, config?: RequestInit) => Promise<T>;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface BaseServiceConfig {
  client: HttpClient;
  resource: string;
  /**
   * Optional TTL for in-memory cache on getAll() results (in milliseconds).
   * When set, getAll() serves cached data if within the TTL window.
   * Cache is automatically invalidated on create/update/delete mutations.
   * Cache is cleared on hard page reload (Ctrl+F5) since it lives in memory.
   *
   * Recommended: 5 * 60 * 1000 (5 minutes) for slow-changing data like roles, templates.
   * Do NOT use for frequently-changing data like checklist snapshots.
   */
  cacheTtlMs?: number;
}

// ─── Pagination Options ──────────────────────────────────────────────────────

export interface BasePagedOptions {
  /** Number of documents per page. Default: 20 */
  pageSize?: number;
  /** Field to sort by. Default: 'updatedAt' */
  orderByField?: string;
  /** Sort direction. Default: 'desc' */
  orderDirection?: 'asc' | 'desc';
  /** Array of where-clause filters */
  filters?: FirestoreFilter[];
  /** Cursor from previous page */
  lastDoc?: DocumentSnapshot | null;
}

// ─── Service Interface ───────────────────────────────────────────────────────

export interface BaseService<TEntity, TRequest = Partial<TEntity>> {
  getAll: () => Promise<TEntity[]>;
  getById: (id: string) => Promise<TEntity>;
  create: (payload: TRequest) => Promise<TEntity>;
  update: (id: string, payload: TRequest) => Promise<TEntity>;
  delete: (id: string) => Promise<void>;
  /**
   * Paginated Firestore query using cursor-based pagination.
   * Uses the generic getFirestorePaged utility under the hood.
   * Collection name is auto-resolved from the service's resource path.
   */
  getPaged: (options?: BasePagedOptions) => Promise<FirestorePaginatedResult<TEntity>>;
  /**
   * Force-clear the getAll() cache. Use when external factors
   * may have changed the data (e.g., another user edited remotely).
   * No-op if cacheTtlMs is not configured.
   */
  invalidateCache: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve a resource path (e.g. '/issues') into a Firestore collection name (e.g. 'issues').
 * Mirrors the toCollectionName logic in firebase-client.ts.
 */
function resourceToCollectionName(resourcePath: string): string {
  return resourcePath
    .replace(/^\/+/, '')
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createBaseService<TEntity, TRequest = Partial<TEntity>>({
  client,
  resource,
  cacheTtlMs,
}: BaseServiceConfig): BaseService<TEntity, TRequest> {
  const collectionName = resourceToCollectionName(resource);

  // Optional in-memory cache for getAll()
  const cache: MemoryCache<TEntity[]> | null = cacheTtlMs
    ? createMemoryCache<TEntity[]>(cacheTtlMs)
    : null;

  return {
    getAll: async () => {
      // Serve from cache if fresh
      if (cache) {
        const cached = cache.get();
        if (cached !== null) {
          return cached;
        }
      }

      const data = await client.get<TEntity[]>(resource);

      // Store in cache for future calls
      if (cache) {
        cache.set(data);
      }

      return data;
    },

    getById: (id) => client.get<TEntity>(`${resource}/${id}`),

    create: async (payload) => {
      const result = await client.post<TEntity>(resource, payload);
      // Invalidate cache on mutation
      cache?.invalidate();
      return result;
    },

    update: async (id, payload) => {
      const result = await client.put<TEntity>(`${resource}/${id}`, payload);
      // Invalidate cache on mutation
      cache?.invalidate();
      return result;
    },

    delete: async (id) => {
      await client.delete<void>(`${resource}/${id}`);
      // Invalidate cache on mutation
      cache?.invalidate();
    },

    getPaged: (options?: BasePagedOptions) =>
      getFirestorePaged<TEntity>({
        collectionName,
        pageSize: options?.pageSize,
        orderByField: options?.orderByField,
        orderDirection: options?.orderDirection,
        filters: options?.filters,
        lastDoc: options?.lastDoc,
      }),

    invalidateCache: () => {
      cache?.invalidate();
    },
  };
}
