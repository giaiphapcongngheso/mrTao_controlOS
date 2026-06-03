import { useNavigate } from '@tanstack/react-router';
import TodayView from './TodayView';
import { TAB_ROUTE_MAP, useAppShellState } from '../app-shell-state';

export default function TodayRoute() {
  const navigate = useNavigate();
  const { stats, todayChecklistItems } = useAppShellState();

  return (
    <TodayView
      stats={stats}
      onSetTab={(tab) => {
        void navigate({ to: TAB_ROUTE_MAP[tab] });
      }}
      completedChecklistsCount={todayChecklistItems.filter((item) => item.isCompleted).length}
      totalChecklistsCount={todayChecklistItems.length}
    />
  );
}
