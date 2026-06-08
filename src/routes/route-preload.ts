import type { TabType } from '../types/app.types';

// Preload map: trigger import() on hover to pre-cache route chunk
// before user clicks, eliminating lazy-load delay on first navigation.
// Separated from router.tsx to avoid circular dependency with AppShell.
export const ROUTE_PRELOAD_MAP: Partial<Record<TabType, () => Promise<unknown>>> = {
  Today: () => import('./Today/today-route'),
  Checklist: () => import('./Checklist/checklist-route'),
  Tasks: () => import('./Tasks/tasks-route'),
  KPI: () => import('./Kpi/kpi-route'),
  SOP: () => import('./Issues/issues-route'),
  Reports: () => import('./Reports/reports-route'),
  Handbook: () => import('./Handbook/HandbookView'),
  Marketing: () => import('./marketing/marketing-view'),
  Warehouse: () => import('./warehouse/warehouse-view'),
  Staff: () => import('./StaffPermissions/staff-route'),
  Plans: () => import('./Plans/plans-route'),
  Customers: () => import('./Customers/customers-route'),
  Notifications: () => import('./Notifications/NotificationsView'),
};
