import { useQuery } from '@tanstack/react-query';
import { tasksService } from '../../../services/tasks-service';

export const tasksQueryKeys = {
  all: ['tasks'] as const,
};

export function useTasksQuery() {
  return useQuery({
    queryKey: tasksQueryKeys.all,
    queryFn: tasksService.getAll,
    enabled: false,
  });
}
