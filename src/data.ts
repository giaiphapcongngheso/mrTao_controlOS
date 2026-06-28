import type { StaffRank } from './types/kpi.types';
import type { DailyReport } from './types/reports.types';
import type { KPIStats } from './types/today.types';

export const DEFAULT_STORE_ID = 'store-mr-tao-q1';

/**
 * @deprecated Dashboard now reads real data from reportsDailyService + live aggregate.
 * Kept only for dev/testing/seeding purposes.
 */
export const INITIAL_KPI_STATS: KPIStats = {
  storeId: DEFAULT_STORE_ID,
  todayRevenue: 25800000,
  checklistCompletion: 85,
  delayedTasksCount: 3,
  sopErrorsCount: 1,
  customerComplaintsCount: 0,
  lateStaffCount: 1,
};

export const INITIAL_STAFF_RANKS: StaffRank[] = [
  { staffId: 'NV-005', name: 'Nguyễn Trường Giang', role: 'QUAN_LY', score: 40, classification: 'needs_improvement', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' },
  { staffId: 'NV-002', name: 'Nguyễn Văn A', role: 'SALES', score: 0, classification: 'needs_improvement', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100' },
  { staffId: 'NV-003', name: 'Trần Thị B', role: 'KHO', score: 0, classification: 'needs_improvement', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100' },
].map((rank): StaffRank => ({ storeId: DEFAULT_STORE_ID, ...rank } as StaffRank));

export const DAILY_REPORT_DATA: DailyReport = {
  storeId: DEFAULT_STORE_ID,
  revenue: 25800000,
  billCount: 38,
  estimatedProfit: 6450000,
  newCustomers: 12,
  returningCustomers: 8,
  bestseller: 'iPhone 11',
  bestsellerCount: 6,
};




