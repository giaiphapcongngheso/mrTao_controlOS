import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { KiotProduct } from '../../../types/kiotviet.types';
import { productsService } from '../../../services/products-service';

export const productsQueryKeys = {
  all: ['products'] as const,
  lists: () => [...productsQueryKeys.all, 'list'] as const,
};

function useInvalidateProductQueries() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() });
}

export function useCreateProductMutation() {
  const invalidate = useInvalidateProductQueries();
  return useMutation({
    mutationFn: (payload: Partial<KiotProduct>) => productsService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateProductMutation() {
  const invalidate = useInvalidateProductQueries();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<KiotProduct> }) =>
      productsService.update(String(id), payload),
    onSuccess: invalidate,
  });
}

export function useDeleteProductMutation() {
  const invalidate = useInvalidateProductQueries();
  return useMutation({
    mutationFn: (id: number) => productsService.delete(String(id)),
    onSuccess: invalidate,
  });
}
