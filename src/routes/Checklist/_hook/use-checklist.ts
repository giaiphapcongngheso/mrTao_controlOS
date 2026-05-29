import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChecklistCategory, ChecklistItem } from '../../../types/checklist.types';
import { checklistCategoryService, checklistItemService } from '../../../services/checklist-service';

export const checklistQueryKeys = {
  categories: ['checklist', 'categories'] as const,
  items: ['checklist', 'items'] as const,
  itemsPage: (page: number, pageSize: number) => ['checklist', 'items', 'page', page, pageSize] as const,
};

export function useChecklistCategoriesQuery() {
  return useQuery({
    queryKey: checklistQueryKeys.categories,
    queryFn: checklistCategoryService.getAll,
    enabled: false,
  });
}

export function useChecklistItemsQuery() {
  return useQuery({
    queryKey: checklistQueryKeys.items,
    queryFn: checklistItemService.getAll,
    enabled: false,
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

export function useChecklistItemsPageQuery(page: number, pageSize: number) {
  return useQuery({
    queryKey: checklistQueryKeys.itemsPage(page, pageSize),
    queryFn: checklistItemService.getAll,
    enabled: false,
    select: (allItems) => paginateArray(allItems, page, pageSize),
  });
}

function useInvalidateChecklistQueries() {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: checklistQueryKeys.categories }),
      queryClient.invalidateQueries({ queryKey: checklistQueryKeys.items }),
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

export function useCreateChecklistItemMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: (payload: Partial<ChecklistItem>) => checklistItemService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateChecklistItemMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ChecklistItem> }) =>
      checklistItemService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteChecklistItemMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: (id: string) => checklistItemService.delete(id),
    onSuccess: invalidate,
  });
}
