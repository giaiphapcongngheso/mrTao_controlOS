import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksService } from '../../../services/tasks-service';
import { roleService } from '../../../services/admin';
import type { TaskItem, TaskRequestType, TaskStatus } from '../../../types/tasks.types';

export const rolesQueryKeys = {
  all: ['roles'] as const,
};

export function useRolesQuery() {
  return useQuery({
    queryKey: rolesQueryKeys.all,
    queryFn: roleService.getAll,
  });
}

export const tasksQueryKeys = {
  all: ['tasks'] as const,
  lists: () => [...tasksQueryKeys.all, 'list'] as const,
  list: (storeId: string) => [...tasksQueryKeys.lists(), storeId] as const,
};

function getTaskSortTime(task: TaskItem): number {
  const rawDate = task.updatedAt || task.createdAt;
  const timestamp = rawDate ? new Date(rawDate).getTime() : Number.NaN;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function useTasksQuery(storeId: string) {
  const queryResult = useQuery({
    queryKey: tasksQueryKeys.list(storeId),
    queryFn: tasksService.getAll,
    enabled: !!storeId,
  });

  const items = useMemo(() => {
    return (queryResult.data ?? [])
      .filter((task) => task.storeId === storeId)
      .sort((a, b) => {
        const timeDiff = getTaskSortTime(b) - getTaskSortTime(a);
        if (timeDiff !== 0) {
          return timeDiff;
        }
        return b.id.localeCompare(a.id);
      });
  }, [queryResult.data, storeId]);

  return {
    ...queryResult,
    items,
  };
}

export function useCreateTaskMutation(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['createTask', storeId],
    mutationFn: async (task: TaskRequestType) => {
      const now = new Date().toISOString();
      return await tasksService.create({
        ...task,
        storeId,
        createdAt: task.createdAt ?? now,
        updatedAt: now,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tasksQueryKeys.list(storeId) });
    },
  });
}

export function useUpdateTaskStatusMutation(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['updateTaskStatus', storeId],
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      return await tasksService.update(taskId, {
        status,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tasksQueryKeys.list(storeId) });
    },
  });
}

export function useDeleteTaskMutation(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['deleteTask', storeId],
    mutationFn: async (taskId: string) => {
      return await tasksService.delete(taskId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tasksQueryKeys.list(storeId) });
    },
  });
}

export function useUpdateTaskMutation(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['updateTask', storeId],
    mutationFn: async ({ taskId, input }: { taskId: string; input: Partial<TaskRequestType> }) => {
      return await tasksService.update(taskId, {
        ...input,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tasksQueryKeys.list(storeId) });
    },
  });
}
