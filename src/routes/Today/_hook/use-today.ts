import { useQuery } from '@tanstack/react-query';
import { todayStatsService, todayTimelineService } from '../../../services/today-service';

export const todayQueryKeys = {
  stats: ['today', 'stats'] as const,
  timeline: ['today', 'timeline'] as const,
};

export function useTodayStatsQuery() {
  return useQuery({
    queryKey: todayQueryKeys.stats,
    queryFn: todayStatsService.getAll,
    enabled: false,
  });
}

export function useTodayTimelineQuery() {
  return useQuery({
    queryKey: todayQueryKeys.timeline,
    queryFn: todayTimelineService.getAll,
    enabled: false,
  });
}
