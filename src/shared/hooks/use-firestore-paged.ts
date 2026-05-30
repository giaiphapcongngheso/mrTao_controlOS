import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { DocumentSnapshot } from 'firebase/firestore';
import {
  getFirestorePaged,
  type FirestoreFilter,
  type FirestorePaginatedResult,
} from '../services/firestore-pagination';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseFirestoreInfiniteQueryOptions {
  /** React Query cache key */
  queryKey: readonly unknown[];
  /** Firestore collection name, e.g. 'issues', 'tasks', 'notifications' */
  collectionName: string;
  /** Number of documents per page. Default: 20 */
  pageSize?: number;
  /** Field to sort by. Default: 'updatedAt' */
  orderByField?: string;
  /** Sort direction. Default: 'desc' */
  orderDirection?: 'asc' | 'desc';
  /** Array of Firestore where-clause filters */
  filters?: FirestoreFilter[];
  /** Enable/disable the query. Default: true */
  enabled?: boolean;
}

export interface UseFirestoreInfiniteQueryResult<T> {
  /** Flattened items from all loaded pages */
  items: T[];
  /** Load the next page */
  fetchNextPage: () => void;
  /** Whether there are more pages to load */
  hasNextPage: boolean;
  /** Whether the next page is currently loading */
  isFetchingNextPage: boolean;
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether any fetch (initial or next page) is in progress */
  isFetching: boolean;
  /** Error object if the query failed */
  error: Error | null;
  /** Whether the query has errored */
  isError: boolean;
  /** Refetch all pages */
  refetch: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Generic infinite query hook for Firestore cursor-based pagination.
 * Works with ANY Firestore collection — pass the collection name, filters, and sort config.
 *
 * @example
 * // Issues by store
 * const { items, fetchNextPage, hasNextPage } = useFirestoreInfiniteQuery<SOPIssue>({
 *   queryKey: ['issues', 'list', storeId],
 *   collectionName: 'issues',
 *   filters: [{ field: 'storeId', op: '==', value: storeId }],
 *   enabled: !!storeId,
 * });
 *
 * @example
 * // Tasks by assignee
 * const { items, fetchNextPage } = useFirestoreInfiniteQuery<TaskItem>({
 *   queryKey: ['tasks', 'list', userId],
 *   collectionName: 'tasks',
 *   filters: [{ field: 'assignee', op: '==', value: userId }],
 *   orderByField: 'createdAt',
 * });
 */
export function useFirestoreInfiniteQuery<T>(
  options: UseFirestoreInfiniteQueryOptions,
): UseFirestoreInfiniteQueryResult<T> {
  const {
    queryKey,
    collectionName,
    pageSize,
    orderByField,
    orderDirection,
    filters,
    enabled = true,
  } = options;

  const queryResult = useInfiniteQuery<FirestorePaginatedResult<T>>({
    queryKey,
    queryFn: ({ pageParam }) =>
      getFirestorePaged<T>({
        collectionName,
        pageSize,
        orderByField,
        orderDirection,
        filters,
        lastDoc: pageParam as DocumentSnapshot | null,
      }),
    initialPageParam: null as DocumentSnapshot | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.lastDoc : undefined),
    enabled,
  });

  const items = useMemo(() => {
    if (!queryResult.data) {
      return [];
    }
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
