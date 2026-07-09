import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { checklistService } from '../../../services/checklist-service';
import { tasksService } from '../../../services/tasks-service';
import { issuesService } from '../../../services/issues-service';
import { todayStatsService } from '../../../services/today-service';
import { isOpenSopIssue } from '../../../types/issues.types';
import type { ReportMetrics } from '../components/report-form';
import { kiotVietService } from '../../../services/kiotviet-service';

const getDateRangeForPeriod = (period: 'day' | 'week' | 'month', dateKey: string) => {
  if (!dateKey) {
    const today = new Date().toISOString().slice(0, 10);
    return { from: today, to: today };
  }

  const [y, m, d] = dateKey.split('-').map(Number);

  if (period === 'day') {
    return { from: dateKey, to: dateKey };
  }

  if (period === 'week') {
    const targetDate = new Date(y, m - 1, d);
    const day = targetDate.getDay();
    const diffToMonday = targetDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(y, m - 1, diffToMonday);
    const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);

    const format = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    return { from: format(monday), to: format(sunday) };
  }

  // month
  const mm = String(m).padStart(2, '0');
  const lastDay = new Date(y, m, 0).getDate();
  const lastDayStr = String(lastDay).padStart(2, '0');
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${lastDayStr}` };
};

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
  period?: 'day' | 'week' | 'month';
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
  period = 'day',
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

  // 5. KiotViet today's revenue and bill count
  const kiotRevenueQuery = useQuery({
    queryKey: ['kiotviet-revenue', dateKey, period],
    queryFn: async () => {
      const range = getDateRangeForPeriod(period, dateKey);
      const allInvoices: any[] = [];
      let currentItem = 0;
      const pageSize = 100;

      while (true) {
        let response;
        if (import.meta.env.DEV) {
          const clientId = String(import.meta.env.VITE_KIOT_CLIENT_ID || '');
          const clientSecret = String(import.meta.env.VITE_KIOT_CLIENT_SECRET || '');
          const retailer = String(import.meta.env.VITE_KIOT_RETAILER || '');
          const params = new URLSearchParams({
            clientId,
            clientSecret,
            retailer,
            fromPurchaseDate: range.from,
            toPurchaseDate: range.to + 'T23:59:59',
            pageSize: String(pageSize),
            currentItem: String(currentItem),
          });
          const res = await fetch(`/api/kiotviet/invoices?${params.toString()}`);
          response = await res.json();
        } else {
          response = await kiotVietService.fetchApi<{ data?: any[] }>('/invoices', {
            fromPurchaseDate: range.from,
            toPurchaseDate: range.to + 'T23:59:59',
            pageSize,
            currentItem,
          });
        }

        const data = response?.data || [];
        allInvoices.push(...data);

        if (data.length < pageSize) {
          break;
        }
        currentItem += data.length;
      }

      // Lọc các hóa đơn đã hoàn thành (status === 1) trong khoảng ngày của báo cáo
      const completedInvoices = allInvoices.filter((inv: any) => {
        const isCompleted = inv.status === 1;
        if (!inv.purchaseDate) return false;
        const invoiceDateStr = inv.purchaseDate.slice(0, 10);
        const inRange = invoiceDateStr >= range.from && invoiceDateStr <= range.to;
        return isCompleted && inRange;
      });
      const totalRev = completedInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      const billCount = completedInvoices.length;
      return { totalRev, billCount };
    },
    enabled,
    staleTime: 60_000,
  });

  // Compute derived metrics
  const metrics = useMemo<ReportMetrics>(() => {
    const range = getDateRangeForPeriod(period, dateKey);

    // Checklist metrics - filter by date range
    const allChecklists = (checklistsQuery.data ?? []).filter(
      (doc) => doc.storeId === storeId && doc.dateKey >= range.from && doc.dateKey <= range.to,
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

    // Today stats — revenue, complaints, staff
    const storeStats = (todayStatsQuery.data ?? []).find(
      (stat) => stat.storeId === storeId,
    );
    const revenue = kiotRevenueQuery.data?.totalRev ?? storeStats?.todayRevenue ?? 0;
    const billCount = kiotRevenueQuery.data?.billCount ?? 0;
    const complaintsCount = storeStats?.customerComplaintsCount ?? 0;
    const staffIssuesCount = storeStats?.lateStaffCount ?? 0;

    return {
      revenue,
      billCount,
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
    period,
    issuesQuery.data,
    storeId,
    tasksQuery.data,
    todayStatsQuery.data,
    kiotRevenueQuery.data,
  ]);

  const isLoading = checklistsQuery.isLoading
    || tasksQuery.isLoading
    || issuesQuery.isLoading
    || todayStatsQuery.isLoading
    || kiotRevenueQuery.isLoading;

  const error = checklistsQuery.error
    ?? tasksQuery.error
    ?? issuesQuery.error
    ?? todayStatsQuery.error
    ?? kiotRevenueQuery.error
    ?? null;

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: reportMetricsKeys.all });
  }, [queryClient]);

  return { metrics, isLoading, error, refetch };
}
