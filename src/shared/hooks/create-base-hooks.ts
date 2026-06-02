import type { DocumentSnapshot } from 'firebase/firestore';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { BaseService, BasePagedOptions } from '../services/create-base-service';
import type { FirestorePaginatedResult } from '../services/firestore-pagination';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BaseQueryOptions {
  /** Enable/disable the query. Default: true */
  enabled?: boolean;
}

export interface BaseGetByIdQueryOptions extends BaseQueryOptions {
  /** The document ID to fetch */
  id: string;
}

export interface BaseGetPagedQueryOptions extends BaseQueryOptions {
  /** Paged query options forwarded to service.getPaged */
  paged?: Omit<BasePagedOptions, 'lastDoc'>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates typed React Query hooks for any service created by createBaseService.
 * Returns useGetAllQuery, useGetByIdQuery, and useGetPagedQuery hooks bound to
 * the service and the provided base query key.
 *
 * @example
 * export const handbookHooks = createBaseHooks(handbookService, ['handbook']);
 *
 * // Inside a component:
 * const { data, isLoading } = handbookHooks.useGetAllQuery();
 * const { data: doc } = handbookHooks.useGetByIdQuery({ id: docId });
 * const { items, fetchNextPage } = handbookHooks.useGetPagedQuery({
 *   paged: { filters: [{ field: 'storeId', op: '==', value: storeId }] },
 * });
 */
export function createBaseHooks<TEntity, TRequest = Partial<TEntity>>(
  service: BaseService<TEntity, TRequest>,
  baseQueryKey: readonly unknown[],
) {
  const keys = {
    all: baseQueryKey,
    lists: () => [...baseQueryKey, 'list'] as const,
    detail: (id: string) => [...baseQueryKey, 'detail', id] as const,
    paged: (pagedOptions?: Omit<BasePagedOptions, 'lastDoc'>) =>
      [...baseQueryKey, 'paged', pagedOptions ?? {}] as const,
  };

  // ─── useGetAllQuery ───────────────────────────────────────────────────────

  /**
   * Fetches all documents from the resource collection.
   * Wraps service.getAll() with useQuery.
   */
  function useGetAllQuery(options?: BaseQueryOptions) {
    return useQuery<TEntity[]>({
      queryKey: keys.lists(),
      queryFn: () => service.getAll(),
      enabled: options?.enabled ?? true,
    });
  }

  // ─── useGetByIdQuery ──────────────────────────────────────────────────────

  /**
   * Fetches a single document by ID.
   * Wraps service.getById() with useQuery.
   */
  function useGetByIdQuery({ id, enabled = true }: BaseGetByIdQueryOptions) {
    return useQuery<TEntity>({
      queryKey: keys.detail(id),
      queryFn: () => service.getById(id),
      enabled: enabled && !!id,
    });
  }

  // ─── useGetPagedQuery ─────────────────────────────────────────────────────

  /**
   * Infinite-scroll hook for cursor-based paginated Firestore queries.
   * Wraps service.getPaged() with useInfiniteQuery.
   */
  function useGetPagedQuery(options?: BaseGetPagedQueryOptions) {
    const { paged, enabled = true } = options ?? {};

    const queryResult = useInfiniteQuery<FirestorePaginatedResult<TEntity>>({
      queryKey: keys.paged(paged),
      queryFn: ({ pageParam }) =>
        service.getPaged({
          ...paged,
          lastDoc: pageParam as DocumentSnapshot | null,
        }),
      initialPageParam: null as DocumentSnapshot | null,
      getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.lastDoc : undefined),
      enabled,
    });

    const items = useMemo(() => {
      if (!queryResult.data) return [];
      return queryResult.data.pages.flatMap((page) => page.items);
    }, [queryResult.data]);

    return {
      items,
      fetchNextPage: queryResult.fetchNextPage,
      hasNextPage: queryResult.hasNextPage,
      isFetchingNextPage: queryResult.isFetchingNextPage,
      isLoading: queryResult.isLoading,
      isFetching: queryResult.isFetching,
      error: queryResult.error,
      isError: queryResult.isError,
      refetch: queryResult.refetch,
    };
  }

  return {
    keys,
    useGetAllQuery,
    useGetByIdQuery,
    useGetPagedQuery,
  };
}
