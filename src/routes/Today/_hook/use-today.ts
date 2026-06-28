import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { KPIStats, TimelineEvent } from '../../../types/today.types';
import { checklistService } from '../../../services/checklist-service';
import { todayStatsService } from '../../../services/today-service';

export const todayQueryKeys = {
  stats: (storeId: string) => ['today', 'stats', storeId] as const,
  timeline: (storeId: string, dateKey: string) => ['today', 'timeline', storeId, dateKey] as const,
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

function getTodayDateKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

/**
 * Fetches today's timeline directly from checklist completion data.
 * Each completed checklist task becomes a "done" event with timestamp.
 * Pending (uncompleted) tasks become "pending" events.
 */
export function useTodayTimelineQuery(storeId: string) {
  const todayDateKey = useMemo(getTodayDateKey, []);

  return useQuery<TimelineEvent[]>({
    queryKey: todayQueryKeys.timeline(storeId, todayDateKey),
    queryFn: async () => {
      const checklists = await checklistService.getAll();

      // Filter today's checklists for this store
      const todayChecklists = (checklists || []).filter(
        (c) => c.storeId === storeId && c.dateKey === todayDateKey && !c.deletedAt,
      );

      const allTasks = todayChecklists.flatMap((c) => c.tasks || []);
      const events: TimelineEvent[] = [];

      for (const task of allTasks) {
        if (task.isCompleted && task.checkedAt) {
          // Completed → "done" event
          const checkedDate = new Date(task.checkedAt);
          const timeStr = `${String(checkedDate.getHours()).padStart(2, '0')}:${String(checkedDate.getMinutes()).padStart(2, '0')}`;
          events.push({
            storeId,
            time: timeStr,
            title: task.title,
            description: `Hoàn thành bởi ${task.checkedByName || 'nhân viên'}`,
            status: 'done',
          });
        } else {
          // Not completed → "pending" event
          const timeLimit = task.timeLimit || '—';
          events.push({
            storeId,
            time: timeLimit,
            title: task.title,
            description: 'Chưa hoàn thành',
            status: 'pending',
          });
        }
      }

      return events.sort((a, b) => getTimelineSortValue(b) - getTimelineSortValue(a));
    },
    enabled: Boolean(storeId),
    staleTime: 2 * 60 * 1000,
  });
}


