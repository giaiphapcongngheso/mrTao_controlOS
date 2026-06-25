// Route component wrapper for report detail view
import { useParams } from '@tanstack/react-router';
// Import component view and state hooks
import { useAppStore } from '../../stores/app-store';
import { useAppShellState } from '../app-shell-state';
import ReportDetailView from './report-detail-view';

export default function ReportDetailRoute() {
  const { reportId } = useParams({ from: '/app/reports/$reportId' });
  const currentUser = useAppStore((state) => state.currentUser);
  const { dailyReport } = useAppShellState();

  return (
    <ReportDetailView
      reportId={reportId}
      dailyReport={dailyReport}
      currentUser={currentUser}
    />
  );
}
