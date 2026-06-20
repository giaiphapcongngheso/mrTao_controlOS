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

export interface BaseServiceAutoLogConfig<TEntity, TRequest> {
  target: string;
  /** Custom callback to build log details string based on action and payload */
  resolveDetails?: (action: 'CREATE' | 'UPDATE' | 'DELETE', id?: string, payload?: TRequest) => string | null;
}

export interface BaseServiceConfig<TEntity, TRequest = Partial<TEntity>> {
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
  /** Optional configuration for automatic audit logging on mutations */
  autoLog?: BaseServiceAutoLogConfig<TEntity, TRequest>;
}

// ─── Mutation Options ────────────────────────────────────────────────────────

export interface MutationOptions {
  /** Override default details string for this specific call */
  logDetails?: string;
  /** Prevent automatic audit log creation for this specific call */
  bypassAutoLog?: boolean;
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
  create: (payload: TRequest, options?: MutationOptions) => Promise<TEntity>;
  update: (id: string, payload: TRequest, options?: MutationOptions) => Promise<TEntity>;
  delete: (id: string, options?: MutationOptions) => Promise<void>;
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

// ─── Log Handler Registration ───────────────────────────────────────────────

export interface LogHandlerParams {
  actionType: 'CREATE' | 'UPDATE' | 'DELETE';
  target: string;
  details: string;
  storeId?: string;
  id?: string;
  payload?: any;
}

export type LogHandler = (params: LogHandlerParams) => Promise<any> | void;

let activeLogHandler: LogHandler | null = null;

export function registerLogHandler(handler: LogHandler) {
  activeLogHandler = handler;
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

// ─── Log Friendly Helpers ───────────────────────────────────────────────────

function getFriendlyTargetName(target: string, id?: string, _payload?: any): string {
  const baseName = target.toLowerCase();
  if (target === 'Checklist' && id) {
    const parts = id.split(/[-_]/);
    if (parts.length >= 3) {
      const dateStr = parts[1];
      const roleCode = parts[2];
      if (dateStr && roleCode && dateStr.length === 6) {
        const formattedDate = `${dateStr.slice(0, 2)}/${dateStr.slice(2, 4)}/20${dateStr.slice(4, 6)}`;
        return `${baseName} vai trò ${roleCode} ngày ${formattedDate}`;
      }
    }
  }
  return baseName;
}

function getChangedFieldsString(payload?: any): string {
  if (!payload || typeof payload !== 'object') return '';
  const keys = Object.keys(payload).filter(
    (k) => k !== 'updatedAt' && k !== 'updatedBy' && k !== 'id' && k !== 'createdAt' && k !== 'storeId'
  );
  if (keys.length === 0) return '';

  const keyLabels: Record<string, string> = {
    tasks: 'danh sách công việc',
    status: 'trạng thái',
    title: 'tiêu đề',
    description: 'mô tả',
    fullName: 'họ tên',
    phone: 'số điện thoại',
    role: 'vai trò',
    internalNotes: 'ghi chú nội bộ',
    isCompleted: 'hoàn thành',
  };

  const translatedKeys = keys.map((k) => keyLabels[k] || k);
  return ` (Cập nhật: ${translatedKeys.join(', ')})`;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createBaseService<TEntity, TRequest = Partial<TEntity>>({
  client,
  resource,
  cacheTtlMs,
  autoLog,
}: BaseServiceConfig<TEntity, TRequest>): BaseService<TEntity, TRequest> {
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

    create: async (payload, options) => {
      const result = await client.post<TEntity>(resource, payload);
      // Invalidate cache on mutation
      cache?.invalidate();

      // Trigger automatic log
      if (autoLog && !options?.bypassAutoLog && activeLogHandler) {
        let details = options?.logDetails || '';
        if (!details) {
          if (autoLog.resolveDetails) {
            details = autoLog.resolveDetails('CREATE', undefined, payload) || '';
          }
          if (!details) {
            const nameField = (payload && typeof payload === 'object')
              ? (payload as any).name || (payload as any).title || (payload as any).fullName || (payload as any).code || (payload as any).username || ''
              : '';
            const targetName = getFriendlyTargetName(autoLog.target, undefined, payload);
            details = `Đã tạo ${targetName}${nameField ? ` "${nameField}"` : ''}`;
          }
        }

        const storeId = (payload && typeof payload === 'object') ? (payload as any).storeId : undefined;

        void Promise.resolve(
          activeLogHandler({
            actionType: 'CREATE',
            target: autoLog.target,
            details,
            storeId,
            payload,
          })
        ).catch((err) => console.error('Auto log processing failed:', err));
      }

      return result;
    },

    update: async (id, payload, options) => {
      const result = await client.put<TEntity>(`${resource}/${id}`, payload);
      // Invalidate cache on mutation
      cache?.invalidate();

      // Trigger automatic log
      if (autoLog && !options?.bypassAutoLog && activeLogHandler) {
        let details = options?.logDetails || '';
        if (!details) {
          if (autoLog.resolveDetails) {
            details = autoLog.resolveDetails('UPDATE', id, payload) || '';
          }
          if (!details) {
            const nameField = (payload && typeof payload === 'object')
              ? (payload as any).name || (payload as any).title || (payload as any).fullName || (payload as any).code || (payload as any).username || ''
              : '';
            const targetName = getFriendlyTargetName(autoLog.target, id, payload);
            const changedFields = getChangedFieldsString(payload);
            details = `Đã cập nhật ${targetName}${nameField ? ` "${nameField}"` : ''}${changedFields} (ID: ${id})`;
          }
        }

        const storeId = (payload && typeof payload === 'object') ? (payload as any).storeId : undefined;

        void Promise.resolve(
          activeLogHandler({
            actionType: 'UPDATE',
            target: autoLog.target,
            details,
            storeId,
            id,
            payload,
          })
        ).catch((err) => console.error('Auto log processing failed:', err));
      }

      return result;
    },

    delete: async (id, options) => {
      await client.delete<void>(`${resource}/${id}`);
      // Invalidate cache on mutation
      cache?.invalidate();

      // Trigger automatic log
      if (autoLog && !options?.bypassAutoLog && activeLogHandler) {
        let details = options?.logDetails || '';
        if (!details) {
          if (autoLog.resolveDetails) {
            details = autoLog.resolveDetails('DELETE', id, undefined) || '';
          }
          if (!details) {
            const targetName = getFriendlyTargetName(autoLog.target, id, undefined);
            details = `Đã xóa ${targetName} (ID: ${id})`;
          }
        }

        void Promise.resolve(
          activeLogHandler({
            actionType: 'DELETE',
            target: autoLog.target,
            details,
            id,
          })
        ).catch((err) => console.error('Auto log processing failed:', err));
      }
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
