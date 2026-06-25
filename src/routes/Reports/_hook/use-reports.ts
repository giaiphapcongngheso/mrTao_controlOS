import { useQuery } from '@tanstack/react-query';
import { reportsDailyService } from '../../../services/reports-service';

export const reportsQueryKeys = {
  daily: ['reports', 'daily'] as const,
};

export function useDailyReportQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportsQueryKeys.daily,
    queryFn: reportsDailyService.getAll,
    enabled: options?.enabled ?? true,
  });
}

export function useReportDetailQuery(reportId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...reportsQueryKeys.daily, reportId],
    queryFn: () => reportsDailyService.getById(reportId),
    enabled: !!reportId && (options?.enabled ?? true),
  });
}
