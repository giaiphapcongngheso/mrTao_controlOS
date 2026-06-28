import { useNavigate } from '@tanstack/react-router';
import TodayView from './TodayView';
import { TAB_ROUTE_MAP, useAppShellState } from '../app-shell-state';
import { useTodayDashboard } from './_hook/use-today-dashboard';
import { usePlanTargets } from './_hook/use-plan-targets';
import { useTodayTimelineQuery } from './_hook/use-today';

export default function TodayRoute() {
  const navigate = useNavigate();
  const { activeStoreId, tasks: appShellTasks } = useAppShellState();

  // Primary dashboard data (from daily report or live aggregate)
  const dashboard = useTodayDashboard(activeStoreId);

  // System goals from Plans module
  const planTargets = usePlanTargets(
    activeStoreId,
    dashboard.stats.checklistCompletion,
    dashboard.stats.delayedTasksCount,
    dashboard.stats.sopErrorsCount,
    appShellTasks.length,
  );

  // Timeline from checklist completion data
  const timelineQuery = useTodayTimelineQuery(activeStoreId);

  return (
    <TodayView
      stats={dashboard.stats}
      timelineEvents={timelineQuery.data ?? []}
      isStatsLoading={dashboard.isLoading}
      isTimelineLoading={timelineQuery.isLoading}
      statsErrorMessage={dashboard.errorMessage}
      timelineErrorMessage={timelineQuery.error ? 'Không thể tải timeline hôm nay.' : null}
      onSetTab={(tab) => {
        void navigate({ to: TAB_ROUTE_MAP[tab] });
      }}
      completedChecklistsCount={dashboard.todayChecklistItems.filter((item) => item.isCompleted).length}
      totalChecklistsCount={dashboard.todayChecklistItems.length}
      planTargets={planTargets}
      isFromReport={dashboard.isFromReport}
    />
  );
}

