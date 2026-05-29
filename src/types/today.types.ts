export interface KPIStats {
  storeId: string;
  todayRevenue: number;
  checklistCompletion: number;
  delayedTasksCount: number;
  sopErrorsCount: number;
  customerComplaintsCount: number;
  lateStaffCount: number;
}

export interface TimelineEvent {
  storeId: string;
  time: string;
  title: string;
  description: string;
  status: 'done' | 'current' | 'pending';
}
