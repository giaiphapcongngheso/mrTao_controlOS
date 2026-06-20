export interface TaskTemplate {
  id: string;
  name: string;
  defaultTitle: string;
  defaultDepartment: string;
  defaultPriority: 'high' | 'medium' | 'low';
  defaultSubtasks: { title: string }[];
  defaultAssignee?: string;
  defaultNotes?: string;
  icon?: string;
  createdAt?: string;
}
