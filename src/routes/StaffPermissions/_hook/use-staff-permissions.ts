import { useQuery } from '@tanstack/react-query';
import { staffPermissionService } from '../../../services/admin/staff-permissions-service';

export const staffPermissionQueryKeys = {
  all: ['staff', 'permissions'] as const,
};

export function useStaffPermissionsQuery() {
  return useQuery({
    queryKey: staffPermissionQueryKeys.all,
    queryFn: staffPermissionService.getAll,
    enabled: false,
  });
}
