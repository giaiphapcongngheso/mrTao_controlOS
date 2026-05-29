export interface TaskItem {
  id: string;
  storeId: string;
  title: string;
  department: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'waiting' | 'completed';
  deadline: string;
  assignee?: string;
  notes?: string;
}
