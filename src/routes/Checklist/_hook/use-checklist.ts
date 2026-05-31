import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { ChecklistCategory, ChecklistDocument } from '../../../types/checklist.types';
import type { FirestoreFilter } from '../../../shared/services/firestore-pagination';
import { checklistCategoryService, checklistService, processService } from '../../../services/checklist-service';

export const checklistQueryKeys = {
  categories: ['checklist', 'categories'] as const,
  documents: ['checklist', 'documents'] as const,
  documentsPaged: (pageSize: number, storeId: string, roleCode?: string, cursor?: string) =>
    ['checklist', 'documents', 'paged', { pageSize, storeId, roleCode, cursor }] as const,
};

export function useChecklistCategoriesQuery() {
  return useQuery({
    queryKey: checklistQueryKeys.categories,
    queryFn: checklistCategoryService.getAll,
  });
}

export function useChecklistDocumentsQuery() {
  return useQuery({
    queryKey: checklistQueryKeys.documents,
    queryFn: checklistService.getAll,
  });
}

export function useChecklistProcessCategoriesQuery() {
  return useQuery({
    queryKey: ['checklist', 'documents', 'process'] as const,
    queryFn: processService.getAll,
  });
}

/**
 * Cursor-based paginated query for checklist documents.
 * Uses Firestore startAfter + limit (server-side pagination)
 * via BaseService.getPaged() utility.
 */
export function useChecklistDocumentsPagedQuery(
  pageSize: number,
  storeId: string,
  options?: {
    roleCode?: string;
    lastDoc?: DocumentSnapshot | null;
    enabled?: boolean;
  },
) {
  const filters: FirestoreFilter[] = [
    { field: 'storeId', op: '==', value: storeId },
    { field: 'deletedAt', op: '==', value: null },
  ];

  if (options?.roleCode) {
    filters.push({ field: 'roleCode', op: '==', value: options.roleCode });
  }

  return useQuery({
    queryKey: checklistQueryKeys.documentsPaged(
      pageSize,
      storeId,
      options?.roleCode,
      options?.lastDoc?.id,
    ),
    queryFn: () => checklistService.getPaged({
      pageSize,
      filters,
      orderByField: 'updatedAt',
      orderDirection: 'desc',
      lastDoc: options?.lastDoc,
    }),
    enabled: options?.enabled ?? true,
  });
}

function useInvalidateChecklistQueries() {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: checklistQueryKeys.categories }),
      queryClient.invalidateQueries({ queryKey: checklistQueryKeys.documents }),
    ]);
}

export function useCreateChecklistCategoryMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: (payload: Partial<ChecklistCategory>) => checklistCategoryService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateChecklistCategoryMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ChecklistCategory> }) =>
      checklistCategoryService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteChecklistCategoryMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: (id: string) => checklistCategoryService.delete(id),
    onSuccess: invalidate,
  });
}

export function useCreateChecklistDocMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: (payload: Partial<ChecklistDocument>) => checklistService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateChecklistDocMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ChecklistDocument> }) =>
      checklistService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteChecklistDocMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: (id: string) => checklistService.delete(id),
    onSuccess: invalidate,
  });
}
