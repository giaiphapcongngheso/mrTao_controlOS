import { useQuery } from '@tanstack/react-query';
import type { KPIStats, TimelineEvent } from '../../../types/today.types';
import { todayStatsService, todayTimelineService } from '../../../services/today-service';

export const todayQueryKeys = {
  stats: (storeId: string) => ['today', 'stats', storeId] as const,
  timeline: (storeId: string) => ['today', 'timeline', storeId] as const,
};

function getTimelineSortValue(event: TimelineEvent): number {
  const parsed = new Date(event.time).getTime();
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  const match = event.time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return 0;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function useTodayStatsQuery(storeId: string) {
  return useQuery<KPIStats | null>({
    queryKey: todayQueryKeys.stats(storeId),
    queryFn: async () => {
      const stats = await todayStatsService.getAll();
      return stats.find((item) => item.storeId === storeId) ?? null;
    },
    enabled: Boolean(storeId),
  });
}

export function useTodayTimelineQuery(storeId: string) {
  return useQuery<TimelineEvent[]>({
    queryKey: todayQueryKeys.timeline(storeId),
    queryFn: async () => {
      const events = await todayTimelineService.getAll();
      return events
        .filter((event) => event.storeId === storeId)
        .sort((a, b) => getTimelineSortValue(b) - getTimelineSortValue(a));
    },
    enabled: Boolean(storeId),
  });
}
