import type { TaskItem } from '../types/tasks.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export const tasksService = createBaseService<TaskItem, Partial<TaskItem>>({
  client: dataClient,
  resource: RESOURCE_PATH.TASKS,
});
