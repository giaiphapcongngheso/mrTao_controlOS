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
    mutationFn: ({ id, payload }: { id: string; payload: Partial<KiotProduct> }) =>
      productsService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteProductMutation() {
  const invalidate = useInvalidateProductQueries();
  return useMutation({
    mutationFn: (id: string) => productsService.delete(id),
    onSuccess: invalidate,
  });
}
