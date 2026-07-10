import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { KPIStats } from '../../../types/today.types';
import type { ChecklistItem } from '../../../types/checklist.types';
import { reportsDailyService } from '../../../services/reports-service';
import { checklistService } from '../../../services/checklist-service';
import { tasksService } from '../../../services/tasks-service';
import { issuesService } from '../../../services/issues-service';
import { RESOLVED_SOP_ISSUE_STATUS } from '../../../types/issues.types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardData {
  stats: KPIStats;
  todayChecklistItems: ChecklistItem[];
  isLoading: boolean;
  errorMessage: string | null;
  /** True when primary data came from a submitted daily report */
  isFromReport: boolean;
}

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const dashboardQueryKeys = {
  report: (storeId: string, dateKey: string) =>
    ['dashboard', 'report', storeId, dateKey] as const,
  liveAggregate: (storeId: string, dateKey: string) =>
    ['dashboard', 'live', storeId, dateKey] as const,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getTodayDateKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getIsoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Aggregates KPI dashboard data from two sources (with fallback):
 *
 * 1. Primary: `reports/daily` — if a report for today has been submitted,
 *    it already contains revenue, checklistPct, delayedCount, etc.
 *
 * 2. Fallback: Live aggregate from `checklists`, `tasks`, `issues` —
 *    computed client-side when no report exists yet.
 *
 * Note: "Nhân sự vắng" is NOT populated (feature not developed).
 */
export function useTodayDashboard(storeId: string): DashboardData {
  const todayDateKey = useMemo(getTodayDateKey, []);
  const isoToday = useMemo(getIsoToday, []);

  // ── Primary: Daily Report ──────────────────────────────────────────────────

  const reportQuery = useQuery({
    queryKey: dashboardQueryKeys.report(storeId, todayDateKey),
    queryFn: async () => {
      const reports = await reportsDailyService.getAll();
      return reports.find(
        (r) =>
          r.storeId === storeId &&
          r.dateKey === todayDateKey &&
          r.period === 'day',
      ) ?? null;
    },
    enabled: Boolean(storeId),
    staleTime: 2 * 60 * 1000, // 2 minutes — dashboard needs fresher data
  });

  const hasReport = reportQuery.data != null;

  // ── Fallback: Live Aggregate (only when no report) ─────────────────────────

  const liveQuery = useQuery({
    queryKey: dashboardQueryKeys.liveAggregate(storeId, todayDateKey),
    queryFn: async () => {
      const [checklists, tasks, issues] = await Promise.all([
        checklistService.getAll({ storeId, dateKey: todayDateKey, deletedAt: 'null' }),
        tasksService.getAll({ storeId }),
        issuesService.getAll({ storeId }),
      ]);

      // Checklists for today
      const todayChecklists = (checklists || []).filter(
        (c) => c.storeId === storeId && c.dateKey === todayDateKey && !c.deletedAt,
      );
      const allTasks = todayChecklists.flatMap((c) => c.tasks || []);
      const completedTasks = allTasks.filter((t) => t.isCompleted);
      const checklistCompletion =
        allTasks.length > 0
          ? Math.round((completedTasks.length / allTasks.length) * 100)
          : 0;

      // Delayed tasks (past deadline, not completed)
      const storeTasks = (tasks || []).filter((t) => t.storeId === storeId);
      const delayedTasks = storeTasks.filter(
        (t) => t.status !== 'completed' && t.deadline && t.deadline < isoToday,
      );

      // SOP errors (category = sop_error, not resolved)
      const storeIssues = (issues || []).filter((i) => i.storeId === storeId);
      const sopErrors = storeIssues.filter(
        (i) => i.category === 'sop_error' && i.status !== RESOLVED_SOP_ISSUE_STATUS,
      );

      // Customer complaints (category = exception, today)
      const complaints = storeIssues.filter(
        (i) => i.category === 'exception' && i.date === isoToday,
      );

      // Build checklist items for the counter
      const checklistItems: ChecklistItem[] = allTasks.map((task) => ({
        id: task.id,
        storeId,
        categoryId: '',
        templateId: task.templateId,
        title: task.title,
        isCompleted: task.isCompleted,
        timeLimit: task.timeLimit,
        dateKey: task.dateKey,
        checkedAt: task.checkedAt,
        checkedByName: task.checkedByName,
        checkedByUsername: task.checkedByUsername,
        imageUrls: task.imageUrls,
        isRequired: task.isRequired,
        evidenceRequired: task.evidenceRequired,
        createdAt: task.createdAt ?? '',
        updatedAt: task.updatedAt ?? '',
      }));

      return {
        checklistCompletion,
        delayedTasksCount: delayedTasks.length,
        sopErrorsCount: sopErrors.length,
        customerComplaintsCount: complaints.length,
        checklistItems,
      };
    },
    enabled: Boolean(storeId) && !hasReport && !reportQuery.isLoading,
    staleTime: 2 * 60 * 1000,
  });

  // ── Merge Results ──────────────────────────────────────────────────────────

  const stats = useMemo<KPIStats>(() => {
    if (hasReport) {
      const report = reportQuery.data!;
      return {
        storeId,
        todayRevenue: report.revenue ?? 0,
        checklistCompletion: report.checklistPct ?? 0,
        delayedTasksCount: report.delayedCount ?? 0,
        sopErrorsCount: report.sopErrorsCount ?? 0,
        customerComplaintsCount: report.complaintsCount ?? 0,
        lateStaffCount: 0, // Feature not developed
        status: report.status ?? 'green',
      };
    }

    if (liveQuery.data) {
      const live = liveQuery.data;
      // Auto-compute status for live data
      let liveStatus: 'green' | 'yellow' | 'red' = 'green';
      if (live.checklistCompletion < 60 || live.sopErrorsCount > 2 || live.customerComplaintsCount > 0) {
        liveStatus = 'red';
      } else if (live.checklistCompletion < 90 || live.delayedTasksCount > 0 || live.sopErrorsCount > 0) {
        liveStatus = 'yellow';
      }

      return {
        storeId,
        todayRevenue: 0, // No revenue without report
        checklistCompletion: live.checklistCompletion,
        delayedTasksCount: live.delayedTasksCount,
        sopErrorsCount: live.sopErrorsCount,
        customerComplaintsCount: live.customerComplaintsCount,
        lateStaffCount: 0, // Feature not developed
        status: liveStatus,
      };
    }

    return {
      storeId,
      todayRevenue: 0,
      checklistCompletion: 0,
      delayedTasksCount: 0,
      sopErrorsCount: 0,
      customerComplaintsCount: 0,
      lateStaffCount: 0,
      status: 'green',
    };
  }, [storeId, hasReport, reportQuery.data, liveQuery.data]);

  const todayChecklistItems = useMemo<ChecklistItem[]>(() => {
    if (liveQuery.data) {
      return liveQuery.data.checklistItems;
    }
    return [];
  }, [liveQuery.data]);

  const isLoading = reportQuery.isLoading || (!hasReport && liveQuery.isLoading);

  const errorMessage = useMemo(() => {
    if (reportQuery.error && liveQuery.error) {
      return 'Không thể tải dữ liệu dashboard. Vui lòng thử lại.';
    }
    if (reportQuery.error) {
      return 'Không thể tải báo cáo ngày. Đang dùng dữ liệu trực tiếp.';
    }
    return null;
  }, [reportQuery.error, liveQuery.error]);

  return {
    stats,
    todayChecklistItems,
    isLoading,
    errorMessage,
    isFromReport: hasReport,
  };
}
