import IssuesContainer from './issues-container';
import { useAppShellState } from '../app-shell-state';
import { useAppStore } from '../../stores/app-store';
import { isOwnerUser } from '../../shared/hooks/use-module-permissions';

export default function IssuesRoute() {
  const currentUser = useAppStore((state) => state.currentUser);
  const { activeStoreId, setIssueMetrics } = useAppShellState();

  if (!currentUser) {
    return null;
  }

  return (
    <IssuesContainer
      currentUser={currentUser}
      isOwner={isOwnerUser(currentUser)}
      activeStoreId={activeStoreId}
      onMetricsChange={setIssueMetrics}
    />
  );
}
