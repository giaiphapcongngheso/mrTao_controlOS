import type { DocumentSnapshot } from 'firebase/firestore';
import {
  getFirestorePaged,
  type FirestoreFilter,
  type FirestorePaginatedResult,
} from './firestore-pagination';

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
}: BaseServiceConfig): BaseService<TEntity, TRequest> {
  const collectionName = resourceToCollectionName(resource);

  return {
    getAll: () => client.get<TEntity[]>(resource),
    getById: (id) => client.get<TEntity>(`${resource}/${id}`),
    create: (payload) => client.post<TEntity>(resource, payload),
    update: (id, payload) => client.put<TEntity>(`${resource}/${id}`, payload),
    delete: async (id) => {
      await client.delete<void>(`${resource}/${id}`);
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
  };
}
