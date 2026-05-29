import { useQuery } from '@tanstack/react-query';
import { staffService } from '../../../services/admin/staff-service';

export const staffQueryKeys = {
  all: ['staff'] as const,
};

export function useStaffQuery() {
  return useQuery({
    queryKey: staffQueryKeys.all,
    queryFn: staffService.getAll,
    enabled: false,
  });
}
