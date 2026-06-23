import type { StaffRank, KPIConfig, KPIDailyValue } from './types/kpi.types';
import type { DailyReport } from './types/reports.types';
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


// KPI templates by role
export const KPI_TEMPLATES_BY_ROLE: Record<string, Omit<KPIConfig, 'id' | 'storeId'>[]> = {
  QUAN_LY: [
    { role: 'QUAN_LY', goalName: 'Tăng kết quả kinh doanh', kpiName: 'Doanh thu cửa hàng đạt mục tiêu', unit: 'VNĐ', monthlyTarget: 650000000, weight: 0.40, dailyTarget: 21666667, proofSource: 'KiotViet - Báo cáo doanh thu' },
    { role: 'QUAN_LY', goalName: 'Tăng kết quả kinh doanh', kpiName: 'Số đơn bán máy toàn cửa hàng', unit: 'Đơn', monthlyTarget: 30, weight: 0.25, dailyTarget: 1, proofSource: 'KiotViet - Hóa đơn bán máy' },
    { role: 'QUAN_LY', goalName: 'Nâng cao trải nghiệm khách hàng', kpiName: 'Số khách hàng cũ được chăm sóc lại toàn cửa hàng', unit: 'Khách', monthlyTarget: 300, weight: 0.20, dailyTarget: 10, proofSource: 'Sheet CSKH/Zalo' },
    { role: 'QUAN_LY', goalName: 'Tuân thủ quy trình và dữ liệu', kpiName: 'Đối soát tiền hàng và báo cáo đúng hạn', unit: 'Ngày', monthlyTarget: 30, weight: 0.15, dailyTarget: 1, proofSource: 'Báo cáo cuối ngày/Sổ quỹ' }
  ],
  SALES: [
    { role: 'SALES', goalName: 'Tăng kết quả kinh doanh', kpiName: 'Doanh số cá nhân đạt mục tiêu', unit: 'VNĐ', monthlyTarget: 450000000, weight: 0.45, dailyTarget: 15000000, proofSource: 'KiotViet theo nhân viên' },
    { role: 'SALES', goalName: 'Tăng kết quả kinh doanh', kpiName: 'Số đơn bán máy cá nhân', unit: 'Đơn', monthlyTarget: 21, weight: 0.25, dailyTarget: 1, proofSource: 'KiotViet hóa đơn' },
    { role: 'SALES', goalName: 'Nâng cao trải nghiệm khách hàng', kpiName: 'Số khách hàng cũ được chăm sóc lại cá nhân', unit: 'Khách', monthlyTarget: 150, weight: 0.15, dailyTarget: 5, proofSource: 'Sheet CSKH/Zalo' },
    { role: 'SALES', goalName: 'Nâng cao trải nghiệm khách hàng', kpiName: 'Số lượng đánh giá mới Google + Facebook + Zalo', unit: 'Đánh giá', monthlyTarget: 20, weight: 0.15, dailyTarget: 1, proofSource: 'Google/Facebook/Zalo' }
  ],
  KỸ_THUẬT: [
    { role: 'KỸ_THUẬT', goalName: 'Tăng kết quả kinh doanh', kpiName: 'Doanh thu sửa chữa đạt mục tiêu', unit: 'VNĐ', monthlyTarget: 42000000, weight: 0.35, dailyTarget: 1400000, proofSource: 'KiotViet/Phiếu sửa chữa' },
    { role: 'KỸ_THUẬT', goalName: 'Tăng kết quả kinh doanh', kpiName: 'Số ca sửa chữa hoàn thành', unit: 'Ca', monthlyTarget: 45, weight: 0.25, dailyTarget: 2, proofSource: 'Phiếu sửa chữa' },
    { role: 'KỸ_THUẬT', goalName: 'Tuân thủ quy trình và dữ liệu', kpiName: 'Số máy được test đủ trước khi bàn giao', unit: 'Máy', monthlyTarget: 45, weight: 0.25, dailyTarget: 2, proofSource: 'Checklist test máy' },
    { role: 'KỸ_THUẬT', goalName: 'Nâng cao trải nghiệm khách hàng', kpiName: 'Số lượng đánh giá/review mảng kỹ thuật', unit: 'Đánh giá', monthlyTarget: 20, weight: 0.15, dailyTarget: 1, proofSource: 'Google/Facebook/Zalo' }
  ],
  KHO: [
    { role: 'KHO', goalName: 'Tuân thủ quy trình và dữ liệu', kpiName: 'Kiểm kho định kỳ chính xác', unit: '%', monthlyTarget: 100, weight: 0.40, dailyTarget: 100, proofSource: 'Biên bản kiểm kho' },
    { role: 'KHO', goalName: 'Tuân thủ quy trình và dữ liệu', kpiName: 'Sắp xếp hàng hóa sạch sẽ, đúng quy chuẩn', unit: 'Ngày', monthlyTarget: 30, weight: 0.30, dailyTarget: 1, proofSource: 'Checklist vệ sinh showroom' },
    { role: 'KHO', goalName: 'Tăng kết quả kinh doanh', kpiName: 'Đóng gói và gửi hàng đúng hạn', unit: 'Đơn', monthlyTarget: 150, weight: 0.30, dailyTarget: 5, proofSource: 'Lịch sử vận đơn' }
  ]
};

// INITIAL KPI CONFIGS (Lưu vào DB cấu hình chung)
export const INITIAL_KPI_CONFIGS: KPIConfig[] = Object.entries(KPI_TEMPLATES_BY_ROLE).flatMap(
  ([roleKey, templates]) =>
    templates.map((tpl, idx) => ({
      id: `cfg_${roleKey.toLowerCase()}_${idx + 1}`,
      storeId: DEFAULT_STORE_ID,
      ...tpl
    } as KPIConfig))
);

// INITIAL KPI DAILY VALUES (Lưu vào DB giá trị ngày của nhân viên)
// Cho Nguyễn Trường Giang (Quản lý - NV-005) đạt doanh thu 22,000,000đ mỗi ngày từ 02/06 đến 30/06
const giangDailyValues: KPIDailyValue[] = [];
// config id của "Doanh thu cửa hàng đạt mục tiêu" của quản lý là cfg_quan_ly_1
const revenueConfigId = 'cfg_quan_ly_1';
for (let day = 1; day <= 30; day++) {
  const dateStr = `2026-06-${day.toString().padStart(2, '0')}`;
  // Ngày 01/06 đạt 0đ, các ngày khác đạt 22M
  const val = day === 1 ? 0 : 22000000;
  giangDailyValues.push({
    id: `NV-005_${revenueConfigId}_${dateStr}`,
    storeId: DEFAULT_STORE_ID,
    staffId: 'NV-005',
    kpiConfigId: revenueConfigId,
    date: dateStr,
    value: val
  });
}

export const INITIAL_KPI_DAILY_VALUES: KPIDailyValue[] = giangDailyValues;

