import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  DAILY_REPORT_DATA,
  DEFAULT_STORE_ID,
  INITIAL_STAFF_RANKS,
} from '../data';
import type { ChecklistItem } from '../types/checklist.types';
import type { SOPIssue } from '../types/issues.types';
import type { StaffRank } from '../types/kpi.types';
import type { DailyReport } from '../types/reports.types';
import type { TaskItem } from '../types/tasks.types';
import type { KPIStats } from '../types/today.types';
import type { TabType } from '../types/app.types';

export const TAB_ROUTE_MAP: Record<TabType, string> = {
  Today: '/today',
  Checklist: '/checklist',
  Tasks: '/tasks',
  KPI: '/kpi',
  SOP: '/sop',
  Reports: '/reports',
  Handbook: '/handbook',
  Marketing: '/marketing',
  Warehouse: '/warehouse',
  Staff: '/staff',
  Plans: '/plans',
  Customers: '/customers',
  Notifications: '/notifications',
};

export const PATH_TAB_MAP: Record<string, TabType> = {
  '/': 'Today',
  '/today': 'Today',
  '/checklist': 'Checklist',
  '/tasks': 'Tasks',
  '/kpi': 'KPI',
  '/sop': 'SOP',
  '/reports': 'Reports',
  '/handbook': 'Handbook',
  '/marketing': 'Marketing',
  '/warehouse': 'Warehouse',
  '/staff': 'Staff',
  '/plans': 'Plans',
  '/customers': 'Customers',
  '/notifications': 'Notifications',
};

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

export function getTabFromPath(pathname: string): TabType {
  const normalized = normalizePathname(pathname);
  if (normalized.startsWith('/reports')) {
    return 'Reports';
  }
  if (normalized.startsWith('/plans')) {
    return 'Plans';
  }
  return PATH_TAB_MAP[normalized] ?? 'Today';
}

interface AppShellStateValue {
  stats: KPIStats;
  todayChecklistItems: ChecklistItem[];
  tasks: TaskItem[];
  staffRanks: StaffRank[];
  issues: SOPIssue[];
  dailyReport: DailyReport;
  activeStoreId: string;
  setTodayMetrics: (payload: { items: ChecklistItem[]; checklistCompletion: number }) => void;
  setTaskMetrics: (payload: { tasks: TaskItem[]; delayedTasksCount: number }) => void;
  setIssueMetrics: (payload: { issues: SOPIssue[]; sopErrorsCount: number }) => void;
}

const AppShellStateContext = createContext<AppShellStateValue | null>(null);

export function AppShellStateProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<KPIStats>({
    storeId: DEFAULT_STORE_ID,
    todayRevenue: 0,
    checklistCompletion: 0,
    delayedTasksCount: 0,
    sopErrorsCount: 0,
    customerComplaintsCount: 0,
    lateStaffCount: 0,
  });
  const [todayChecklistItems, setTodayChecklistItems] = useState<ChecklistItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [staffRanks] = useState<StaffRank[]>(INITIAL_STAFF_RANKS);
  const [issues, setIssues] = useState<SOPIssue[]>([]);
  const [dailyReport] = useState<DailyReport>(DAILY_REPORT_DATA);

  const setTodayMetrics = useCallback(({ items, checklistCompletion }: { items: ChecklistItem[]; checklistCompletion: number }) => {
    setTodayChecklistItems(items);
    setStats((prev) =>
      prev.checklistCompletion === checklistCompletion
        ? prev
        : {
            ...prev,
            checklistCompletion,
          },
    );
  }, []);

  const setTaskMetrics = useCallback(({ tasks: nextTasks, delayedTasksCount }: { tasks: TaskItem[]; delayedTasksCount: number }) => {
    setTasks(nextTasks);
    setStats((prev) =>
      prev.delayedTasksCount === delayedTasksCount
        ? prev
        : {
            ...prev,
            delayedTasksCount,
          },
    );
  }, []);

  const setIssueMetrics = useCallback(({ issues: nextIssues, sopErrorsCount }: { issues: SOPIssue[]; sopErrorsCount: number }) => {
    setIssues(nextIssues);
    setStats((prev) =>
      prev.sopErrorsCount === sopErrorsCount
        ? prev
        : {
            ...prev,
            sopErrorsCount,
          },
    );
  }, []);

  const value = useMemo<AppShellStateValue>(
    () => ({
      stats,
      todayChecklistItems,
      tasks,
      staffRanks,
      issues,
      dailyReport,
      activeStoreId: dailyReport.storeId || DEFAULT_STORE_ID,
      setTodayMetrics,
      setTaskMetrics,
      setIssueMetrics,
    }),
    [dailyReport, issues, staffRanks, stats, tasks, todayChecklistItems],
  );

  return <AppShellStateContext.Provider value={value}>{children}</AppShellStateContext.Provider>;
}

export function useAppShellState() {
  const context = useContext(AppShellStateContext);
  if (!context) {
    throw new Error('useAppShellState must be used within AppShellStateProvider.');
  }
  return context;
}
