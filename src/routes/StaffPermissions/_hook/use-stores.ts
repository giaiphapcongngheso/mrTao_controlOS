import { useQuery } from '@tanstack/react-query';
import { storeService } from '../../../services/admin/store-service';

export const storeQueryKeys = {
  all: ['stores'] as const,
};

export function useStoresQuery() {
  return useQuery({
    queryKey: storeQueryKeys.all,
    queryFn: storeService.getAll,
    enabled: false,
  });
}
