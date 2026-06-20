import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { checklistService } from '../../../services/checklist-service';
import { tasksService } from '../../../services/tasks-service';
import { issuesService } from '../../../services/issues-service';
import { todayStatsService } from '../../../services/today-service';
import { isOpenSopIssue } from '../../../types/issues.types';
import type { ReportMetrics } from '../components/report-form';

// Query keys for report metrics
export const reportMetricsKeys = {
  all: ['report-metrics'] as const,
  checklists: ['report-metrics', 'checklists'] as const,
  tasks: ['report-metrics', 'tasks'] as const,
  issues: ['report-metrics', 'issues'] as const,
  todayStats: ['report-metrics', 'today-stats'] as const,
};

interface UseReportMetricsOptions {
  storeId: string;
  dateKey: string;
  enabled?: boolean;
}

interface UseReportMetricsResult {
  metrics: ReportMetrics;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch report metrics directly from Firestore services.
 * Does NOT depend on AppShellState — always queries real data.
 */
export function useReportMetrics({
  storeId,
  dateKey,
  enabled = true,
}: UseReportMetricsOptions): UseReportMetricsResult {
  const queryClient = useQueryClient();

  // 1. Checklists — filter by dateKey and storeId
  const checklistsQuery = useQuery({
    queryKey: [...reportMetricsKeys.checklists, storeId, dateKey],
    queryFn: checklistService.getAll,
    enabled,
    staleTime: 60_000, // 1 min
  });

  // 2. Tasks — all tasks for the store
  const tasksQuery = useQuery({
    queryKey: [...reportMetricsKeys.tasks, storeId],
    queryFn: tasksService.getAll,
    enabled,
    staleTime: 60_000,
  });

  // 3. SOP Issues — all issues for the store
  const issuesQuery = useQuery({
    queryKey: [...reportMetricsKeys.issues, storeId],
    queryFn: issuesService.getAll,
    enabled,
    staleTime: 60_000,
  });

  // 4. Today Stats — revenue, complaints, staff issues
  const todayStatsQuery = useQuery({
    queryKey: [...reportMetricsKeys.todayStats, storeId],
    queryFn: todayStatsService.getAll,
    enabled,
    staleTime: 60_000,
  });

  // Compute derived metrics
  const metrics = useMemo<ReportMetrics>(() => {
    // Checklist metrics
    const allChecklists = (checklistsQuery.data ?? []).filter(
      (doc) => doc.storeId === storeId && doc.dateKey === dateKey,
    );
    const allTasks = allChecklists.flatMap((doc) => doc.tasks ?? []);
    const totalChecklist = allTasks.length;
    const completedChecklist = allTasks.filter((t) => t.isCompleted).length;
    const checklistPercentage = totalChecklist > 0
      ? Math.round((completedChecklist / totalChecklist) * 100)
      : 0;

    // Tasks metrics — count non-completed as delayed
    const storeTasks = (tasksQuery.data ?? []).filter(
      (task) => task.storeId === storeId,
    );
    const delayedCount = storeTasks.filter(
      (task) => task.status !== 'completed',
    ).length;

    // SOP issues metrics
    const storeIssues = (issuesQuery.data ?? []).filter(
      (issue) => issue.storeId === storeId,
    );
    const sopErrorsCount = storeIssues.filter(isOpenSopIssue).length;

    // Today stats — revenue, billCount, complaints, staff
    const storeStats = (todayStatsQuery.data ?? []).find(
      (stat) => stat.storeId === storeId,
    );
    const revenue = storeStats?.todayRevenue ?? 0;
    const complaintsCount = storeStats?.customerComplaintsCount ?? 0;
    const staffIssuesCount = storeStats?.lateStaffCount ?? 0;

    return {
      revenue,
      billCount: 0, // Not available in todayStats — will use DailyReport fallback
      checklistPercentage,
      checklistRatio: `${completedChecklist}/${totalChecklist}`,
      delayedCount,
      sopErrorsCount,
      complaintsCount,
      staffIssuesCount,
    };
  }, [
    checklistsQuery.data,
    dateKey,
    issuesQuery.data,
    storeId,
    tasksQuery.data,
    todayStatsQuery.data,
  ]);

  const isLoading = checklistsQuery.isLoading
    || tasksQuery.isLoading
    || issuesQuery.isLoading
    || todayStatsQuery.isLoading;

  const error = checklistsQuery.error
    ?? tasksQuery.error
    ?? issuesQuery.error
    ?? todayStatsQuery.error
    ?? null;

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: reportMetricsKeys.all });
  }, [queryClient]);

  return { metrics, isLoading, error, refetch };
}
