import { useQuery } from '@tanstack/react-query';
import { kpiStaffRankService } from '../../../services/admin/kpi-service';

export const kpiQueryKeys = {
  staffRanks: ['kpi', 'staff-ranks'] as const,
};

export function useKpiStaffRanksQuery() {
  return useQuery({
    queryKey: kpiQueryKeys.staffRanks,
    queryFn: kpiStaffRankService.getAll,
    enabled: false,
  });
}
