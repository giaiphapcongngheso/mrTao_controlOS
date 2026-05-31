import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TaskItem, TaskRequestType, TaskStatus } from '../../types/tasks.types';
import TasksView from './TasksView';
import {
  useCreateTaskMutation,
  useTasksQuery,
  useUpdateTaskStatusMutation,
} from './_hook/use-tasks';

interface TasksContainerProps {
  activeStoreId: string;
  onMetricsChange?: (payload: { tasks: TaskItem[]; delayedTasksCount: number }) => void;
}

function isDelayedTask(task: TaskItem): boolean {
  if (task.status === 'completed') {
    return false;
  }

  const deadline = task.deadline.toLowerCase();
  return deadline.includes('trễ') || deadline.includes('tre') || deadline.includes('08/05') || deadline.includes('overdue');
}

export default function TasksContainer({
  activeStoreId,
  onMetricsChange,
}: TasksContainerProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    items: tasks,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useTasksQuery(activeStoreId);

  const createTaskMutation = useCreateTaskMutation(activeStoreId);
  const updateTaskStatusMutation = useUpdateTaskStatusMutation(activeStoreId);

  const delayedTasksCount = useMemo(
    () => tasks.filter(isDelayedTask).length,
    [tasks],
  );

  useEffect(() => {
    onMetricsChange?.({
      tasks,
      delayedTasksCount,
    });
  }, [tasks, delayedTasksCount, onMetricsChange]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setErrorMessage(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [errorMessage]);

  const handleAddTask = useCallback(
    async (task: TaskRequestType) => {
      try {
        await createTaskMutation.mutateAsync(task);
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to create task:', error);
        setErrorMessage('Không thể tạo công việc. Vui lòng thử lại.');
        throw error;
      }
    },
    [createTaskMutation],
  );

  const handleUpdateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      try {
        await updateTaskStatusMutation.mutateAsync({ taskId, status });
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to update task status:', error);
        setErrorMessage('Không thể cập nhật trạng thái công việc. Vui lòng thử lại.');
        throw error;
      }
    },
    [updateTaskStatusMutation],
  );

  const queryErrorMessage = queryError
    ? 'Không thể tải danh sách công việc. Vui lòng thử lại.'
    : null;

  return (
    <TasksView
      tasks={tasks}
      isLoading={isLoading}
      isSaving={createTaskMutation.isPending || updateTaskStatusMutation.isPending || isFetching}
      errorMessage={errorMessage || queryErrorMessage}
      onRefresh={() => void refetch()}
      onAddTask={handleAddTask}
      onUpdateTaskStatus={handleUpdateTaskStatus}
    />
  );
}
