import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TaskItem, TaskRequestType, TaskStatus, SubTask } from '../../types/tasks.types';
import TasksView from './TasksView';
import {
  useCreateTaskMutation,
  useTasksQuery,
  useUpdateTaskStatusMutation,
  useRolesQuery,
  useDeleteTaskMutation,
  useUpdateTaskMutation,
} from './_hook/use-tasks';
import { useAppStore } from '../../stores/app-store';
import { useModulePermissions, isOwnerUser } from '../../shared/hooks/use-module-permissions';
import { MODULE_CODE } from '../../constants/staff-permissions.constants';
import { useStaffQuery } from '../StaffPermissions/_hook/use-staff';
import { isTaskOverdue } from './_hook/use-task-deadline';

interface TasksContainerProps {
  activeStoreId: string;
  onMetricsChange?: (payload: { tasks: TaskItem[]; delayedTasksCount: number }) => void;
}

function isDelayedTask(task: TaskItem): boolean {
  return isTaskOverdue(task);
}

export default function TasksContainer({
  activeStoreId,
  onMetricsChange,
}: TasksContainerProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { currentUser } = useAppStore();
  const isOwner = useMemo(() => isOwnerUser(currentUser), [currentUser]);
  const { permissions, isLoading: permissionsLoading } = useModulePermissions(
    MODULE_CODE.GIAO_VIEC,
    currentUser,
    isOwner,
  );

  const {
    items: tasks,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useTasksQuery(activeStoreId);

  const { data: rawStaff = [], isLoading: isStaffLoading } = useStaffQuery();
  const staffMembers = useMemo(() => {
    return rawStaff.filter(
      (staff) => staff.storeId === activeStoreId && staff.status === 'active'
    );
  }, [rawStaff, activeStoreId]);

  const { data: rawRoles = [], isLoading: isRolesLoading } = useRolesQuery();
  const roles = useMemo(() => {
    return rawRoles.filter(
      (role) => role.storeId === activeStoreId && role.status === 'active'
    );
  }, [rawRoles, activeStoreId]);

  const createTaskMutation = useCreateTaskMutation(activeStoreId);
  const updateTaskStatusMutation = useUpdateTaskStatusMutation(activeStoreId);
  const deleteTaskMutation = useDeleteTaskMutation(activeStoreId);
  const updateTaskMutation = useUpdateTaskMutation(activeStoreId);

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

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        await deleteTaskMutation.mutateAsync(taskId);
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to delete task:', error);
        setErrorMessage('Không thể xóa công việc. Vui lòng thử lại.');
        throw error;
      }
    },
    [deleteTaskMutation],
  );

  const handleUpdateTask = useCallback(
    async (taskId: string, input: Partial<TaskRequestType>) => {
      try {
        await updateTaskMutation.mutateAsync({ taskId, input });
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to update task:', error);
        setErrorMessage('Không thể cập nhật công việc. Vui lòng thử lại.');
        throw error;
      }
    },
    [updateTaskMutation],
  );

  const handleUpdateSubtasks = useCallback(
    async (taskId: string, subtasks: SubTask[]) => {
      const completed = subtasks.filter((s) => s.completed).length;
      const progress = subtasks.length > 0 ? Math.round((completed / subtasks.length) * 100) : undefined;
      try {
        await updateTaskMutation.mutateAsync({ taskId, input: { subtasks, progress } });
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to update subtasks:', error);
        setErrorMessage('Không thể cập nhật checklist. Vui lòng thử lại.');
        throw error;
      }
    },
    [updateTaskMutation],
  );

  const queryErrorMessage = queryError
    ? 'Không thể tải danh sách công việc. Vui lòng thử lại.'
    : null;

  return (
    <TasksView
      tasks={tasks}
      staffMembers={staffMembers}
      roles={roles}
      isLoading={isLoading || permissionsLoading || isStaffLoading || isRolesLoading}
      isSaving={
        createTaskMutation.isPending ||
        updateTaskStatusMutation.isPending ||
        deleteTaskMutation.isPending ||
        updateTaskMutation.isPending ||
        isFetching
      }
      errorMessage={errorMessage || queryErrorMessage}
      onRefresh={() => void refetch()}
      onAddTask={handleAddTask}
      onUpdateTaskStatus={handleUpdateTaskStatus}
      onDeleteTask={handleDeleteTask}
      onUpdateTask={handleUpdateTask}
      onUpdateSubtasks={handleUpdateSubtasks}
      canCreate={permissions.canCreate}
      canUpdate={permissions.canUpdate}
      canDelete={permissions.canDelete}
      currentUser={currentUser}
    />
  );
}

