import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChecklistCategory, ChecklistDocument, ChecklistItem } from '../../../types/checklist.types';
import { checklistCategoryService, checklistService, processService } from '../../../services/checklist-service';

export const checklistQueryKeys = {
  categories: ['checklist', 'categories'] as const,
  documents: ['checklist', 'documents'] as const,
  documentsPage: (page: number, pageSize: number) => ['checklist', 'documents', 'page', page, pageSize] as const,
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

export interface ChecklistPageResult<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function paginateArray<TItem>(allItems: TItem[], page: number, pageSize: number): ChecklistPageResult<TItem> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const start = (safePage - 1) * safePageSize;
  const items = allItems.slice(start, start + safePageSize);

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages,
  };
}

export function useChecklistDocumentsPageQuery(page: number, pageSize: number) {
  return useQuery({
    queryKey: checklistQueryKeys.documentsPage(page, pageSize),
    queryFn: checklistService.getAll,
    enabled: false,
    select: (allDocs: ChecklistDocument[]) => paginateArray(allDocs, page, pageSize),
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
