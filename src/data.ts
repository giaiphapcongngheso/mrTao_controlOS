import type { StaffRank } from './types/kpi.types';
import type { DailyReport } from './types/reports.types';
import type { StaffMember } from './types/staff.types';
import type { KPIStats } from './types/today.types';

export const DEFAULT_STORE_ID = 'store-mr-tao-q1';

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
  { name: 'Nguyễn Trường Giang', role: 'Sales', score: 92, classification: 'good', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' },
  { name: 'Trần Thanh Hoài', role: 'Kỹ thuật', score: 86, classification: 'pass', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100' },
  { name: 'Đặng Hùng An', role: 'Kho', score: 72, classification: 'needs_improvement', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100' },
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

export const INITIAL_STAFF_MEMBERS: StaffMember[] = [
  { id: 'NV-001', fullName: 'Nguyễn Minh Đức', role: 'CHU_CUA_HANG', username: 'admin', phone: '0912345678', status: 'active', joinedDate: '2024-01-15' },
  { id: 'NV-002', fullName: 'Nguyễn Văn A', role: 'SALES', username: 'sales', phone: '0987654321', status: 'active', joinedDate: '2024-03-10' },
  { id: 'NV-003', fullName: 'Trần Thị B', role: 'KHO', username: 'tech', phone: '0901238899', status: 'active', joinedDate: '2024-05-18' },
  { id: 'NV-004', fullName: 'Lê Hoàng C', role: 'CSKH', username: 'cskh', phone: '0933445566', status: 'active', joinedDate: '2025-02-22' },
  { id: 'NV-005', fullName: 'Phạm Quang D', role: 'QUAN_LY', username: 'manager', phone: '0944556677', status: 'active', joinedDate: '2024-11-01' },
].map((staff): StaffMember => ({ storeId: DEFAULT_STORE_ID, ...staff } as StaffMember));
