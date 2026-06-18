import { useNavigate } from '@tanstack/react-router';
import TodayView from './TodayView';
import { TAB_ROUTE_MAP, useAppShellState } from '../app-shell-state';
import { useTodayStatsQuery, useTodayTimelineQuery } from './_hook/use-today';

export default function TodayRoute() {
  const navigate = useNavigate();
  const { stats, todayChecklistItems, activeStoreId } = useAppShellState();
  const statsQuery = useTodayStatsQuery(activeStoreId);
  const timelineQuery = useTodayTimelineQuery(activeStoreId);
  const mergedStats = {
    ...stats,
    ...(statsQuery.data ?? {}),
  };

  return (
    <TodayView
      stats={mergedStats}
      timelineEvents={timelineQuery.data ?? []}
      isStatsLoading={statsQuery.isLoading}
      isTimelineLoading={timelineQuery.isLoading}
      statsErrorMessage={statsQuery.error ? 'Khong the tai KPI hom nay.' : null}
      timelineErrorMessage={timelineQuery.error ? 'Khong the tai timeline hom nay.' : null}
      onSetTab={(tab) => {
        void navigate({ to: TAB_ROUTE_MAP[tab] });
      }}
      completedChecklistsCount={todayChecklistItems.filter((item) => item.isCompleted).length}
      totalChecklistsCount={todayChecklistItems.length}
    />
  );
}
