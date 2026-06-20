import ReportsView from './reports-view';
import { useAppShellState } from '../app-shell-state';
import { useAppStore } from '../../stores/app-store';

export default function ReportsRoute() {
  const currentUser = useAppStore((state) => state.currentUser);
  const { dailyReport } = useAppShellState();

  return (
    <ReportsView
      dailyReport={dailyReport}
      currentUser={currentUser}
    />
  );
}
