import TasksContainer from './TasksContainer';
import { useAppShellState } from '../app-shell-state';

export default function TasksRoute() {
  const { activeStoreId, setTaskMetrics } = useAppShellState();

  return <TasksContainer activeStoreId={activeStoreId} onMetricsChange={setTaskMetrics} />;
}
