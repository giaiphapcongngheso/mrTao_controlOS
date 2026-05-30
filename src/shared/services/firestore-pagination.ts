import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  type DocumentSnapshot,
  type QueryConstraint,
  type WhereFilterOp,
} from 'firebase/firestore';
import { getFirestoreDb } from '../../services/firebase-config';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A single Firestore where() filter condition.
 * Reusable across any module that queries Firestore.
 */
export interface FirestoreFilter {
  field: string;
  op: WhereFilterOp;
  value: unknown;
}

/**
 * Options for paginated Firestore queries. Collection-agnostic.
 */
export interface FirestorePagedOptions {
  /** Firestore collection name, e.g. 'issues', 'notifications', 'tasks' */
  collectionName: string;
  /** Number of documents per page. Default: 20 */
  pageSize?: number;
  /** Field to sort by. Default: 'updatedAt' */
  orderByField?: string;
  /** Sort direction. Default: 'desc' */
  orderDirection?: 'asc' | 'desc';
  /** Array of where-clause filters */
  filters?: FirestoreFilter[];
  /** Cursor from previous page for startAfter pagination */
  lastDoc?: DocumentSnapshot | null;
}

/**
 * Result of a paginated Firestore query.
 */
export interface FirestorePaginatedResult<T> {
  items: T[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_ORDER_BY_FIELD = 'updatedAt';
const DEFAULT_ORDER_DIRECTION = 'desc';

// ─── Core Function ───────────────────────────────────────────────────────────

/**
 * Generic paginated Firestore query.
 * Works with ANY collection — just pass the collection name, filters, and sort config.
 *
 * @example
 * // Paginate issues by store
 * const result = await getFirestorePaged<SOPIssue>({
 *   collectionName: 'issues',
 *   filters: [{ field: 'storeId', op: '==', value: 'store-123' }],
 * });
 *
 * @example
 * // Paginate tasks with custom sort
 * const result = await getFirestorePaged<TaskItem>({
 *   collectionName: 'tasks',
 *   orderByField: 'createdAt',
 *   filters: [{ field: 'assignee', op: '==', value: 'user-456' }],
 *   lastDoc: previousResult.lastDoc,
 * });
 */
export async function getFirestorePaged<T>(
  options: FirestorePagedOptions,
): Promise<FirestorePaginatedResult<T>> {
  const {
    collectionName,
    pageSize = DEFAULT_PAGE_SIZE,
    orderByField = DEFAULT_ORDER_BY_FIELD,
    orderDirection = DEFAULT_ORDER_DIRECTION,
    filters = [],
    lastDoc = null,
  } = options;

  const db = getFirestoreDb();
  const colRef = collection(db, collectionName);

  const constraints: QueryConstraint[] = [
    ...filters.map((f) => where(f.field, f.op, f.value)),
    orderBy(orderByField, orderDirection),
    limit(pageSize),
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);

  const items = snapshot.docs.map((docSnap) => ({
    ...docSnap.data(),
    id: docSnap.id,
  })) as T[];

  const lastDocSnapshot = snapshot.docs[snapshot.docs.length - 1] ?? null;
  const hasMore = snapshot.docs.length === pageSize;

  return { items, lastDoc: lastDocSnapshot, hasMore };
}
