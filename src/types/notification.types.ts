export type NotificationType = 'khan' | 'can_duyet' | 'nhac_viec' | 'canh_bao';

export type NotificationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'commented'
  | 'task_created';

export interface AppNotification {
  id: string;
  storeId: string;
  title: string;
  type: NotificationType;
  typeLabel: string;
  requester: string;
  role: string;
  approver: string;
  target?: string;
  evidence?: boolean;
  status: NotificationStatus;
  comments?: string;
  sourceModule?: 'SOP' | 'REPORTS' | 'CHECKLIST' | 'TASKS';
  sourceId?: string;
  createdAt?: string;
  updatedAt?: string;
}
