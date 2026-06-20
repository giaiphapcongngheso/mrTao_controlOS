export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'completed';

// Sub-task item for task checklists
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

// Comment on a task
export interface TaskComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

// Activity log entry for audit trail
export interface ActivityEntry {
  id: string;
  action: 'created' | 'status_changed' | 'assigned' | 'comment_added' | 'subtask_completed' | 'attachment_added';
  actor: string;
  detail?: string;
  timestamp: string;
}

// File attachment metadata
export interface TaskAttachment {
  id: string;
  name: string;
  url: string; // base64 or Firebase Storage URL
  type: string; // MIME type
  size: number; // bytes
  uploadedBy: string;
  uploadedAt: string;
}

// Reminder configuration for a task
export interface TaskReminder {
  enabled: boolean;
  beforeDeadline: '1_day' | '2_hours' | '30_min';
  recurring?: 'daily' | 'weekly' | 'none';
}

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

  // Sprint 1: Sub-tasks & Progress
  subtasks?: SubTask[];
  progress?: number; // 0-100, auto-calculated from subtasks

  // Sprint 3: Collaboration
  comments?: TaskComment[];
  activityLog?: ActivityEntry[];

  // Sprint 3: Attachments
  attachments?: TaskAttachment[];

  // Sprint 3: Reminder
  reminder?: TaskReminder;
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
  | 'subtasks'
  | 'progress'
  | 'comments'
  | 'activityLog'
  | 'attachments'
  | 'reminder'
>;
