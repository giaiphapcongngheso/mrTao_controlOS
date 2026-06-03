import ReportsView from './ReportsView';
import { useAppShellState } from '../app-shell-state';
import { useAppStore } from '../../stores/app-store';

export default function ReportsRoute() {
  const currentUser = useAppStore((state) => state.currentUser);
  const { dailyReport, stats, todayChecklistItems, tasks, issues } = useAppShellState();

  return (
    <ReportsView
      dailyReport={dailyReport}
      stats={stats}
      checklistItems={todayChecklistItems}
      tasks={tasks}
      issues={issues}
      currentUser={currentUser}
    />
  );
}
