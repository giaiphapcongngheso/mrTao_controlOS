export interface StaffRank {
  storeId: string;
  staffId: string;
  name: string;
  role: string;
  score: number;
  classification: 'excellent' | 'good' | 'pass' | 'needs_improvement';
  avatar?: string;
  calculatedPayout?: number; // Tiền KPI thực nhận tính toán được
  actualWorkdays?: number;   // Số ngày công thực tế của tháng đó
  disciplineCoeff?: number;  // Hệ số kỷ luật áp dụng
}

export interface KPIConfig {
  id: string; // Document ID
  storeId: string;
  staffId: string; // ID nhân viên áp dụng cụ thể
  goalName: string;
  kpiName: string;
  unit: string;
  monthlyTarget: number;
  weight: number; // Trọng số, ví dụ 0.45 (45%)
  dailyTarget: number;
  proofSource: string;
  month?: string; // Định dạng YYYY-MM để quản lý theo từng tháng
}

export interface KPIDailyValue {
  id: string; // Định dạng staffId_kpiConfigId_date
  storeId: string;
  staffId: string;
  kpiConfigId: string; // ID của cấu hình chỉ số chung
  date: string; // Định dạng YYYY-MM-DD
  value: number;
}

export interface KPIGoal {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KPIStaffMonthlyConfig {
  id: string; // Định dạng `staffId_month` (ví dụ: `nv1_2026-06`)
  storeId: string;
  staffId: string;
  month: string; // Định dạng YYYY-MM
  actualWorkdays: number; // Ngày công thực tế
  disciplineCoefficient: number; // Hệ số kỷ luật (mặc định 1.0)
  synergyCoefficient?: number; // Hệ số cộng hưởng (nếu có, mặc định 1.0)
  payoutBaseOverride?: number; // Quỹ KPI tối đa ghi đè cho tháng này (nếu có)
}

