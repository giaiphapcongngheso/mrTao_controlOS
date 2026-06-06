export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'completed';

export interface TaskItem {
  id: string;
  storeId: string;
  title: string;
  department: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  assignee?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  startDate?: string;
  helpers?: string[];
  link?: string;
}

export type TaskRequestType = Pick<
  Partial<TaskItem>,
  | 'storeId'
  | 'title'
  | 'department'
  | 'priority'
  | 'status'
  | 'deadline'
  | 'assignee'
  | 'notes'
  | 'createdAt'
  | 'updatedAt'
  | 'startDate'
  | 'helpers'
  | 'link'
>;
