import type { TaskItem, TaskRequestType } from '../types/tasks.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export const tasksService = createBaseService<TaskItem, TaskRequestType>({
  client: dataClient,
  resource: RESOURCE_PATH.TASKS,
});
