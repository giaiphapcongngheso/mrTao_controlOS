import ChecklistContainer from './checklist-container';
import { useAppShellState } from '../app-shell-state';
import { useAppStore } from '../../stores/app-store';
import { isOwnerUser } from '../../shared/hooks/use-module-permissions';

export default function ChecklistRoute() {
  const currentUser = useAppStore((state) => state.currentUser);
  const { activeStoreId, setTodayMetrics } = useAppShellState();

  if (!currentUser) {
    return null;
  }

  return (
    <ChecklistContainer
      currentUser={currentUser}
      isOwner={isOwnerUser(currentUser)}
      activeStoreId={activeStoreId}
      onMetricsChange={setTodayMetrics}
    />
  );
}
