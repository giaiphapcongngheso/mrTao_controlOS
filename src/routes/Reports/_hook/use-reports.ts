import { useQuery } from '@tanstack/react-query';
import { reportsService } from '../../../services/admin/reports-service';

export const reportsQueryKeys = {
  daily: ['reports', 'daily'] as const,
};

export function useDailyReportQuery() {
  return useQuery({
    queryKey: reportsQueryKeys.daily,
    queryFn: reportsService.getAll,
    enabled: false,
  });
}
