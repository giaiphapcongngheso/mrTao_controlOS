import type { PlanDocument, PlanPriority, PlanLevel, PlanStatus, PriorityStatus, ReviewFrequency, DaySlotStatus, IndicatorStatus } from '../../types/plans.types';

// ============================================================================
// Constants
// ============================================================================

export const PLAN_LEVEL_LABELS: Record<PlanLevel, string> = {
  quarter: 'Quý',
  month: 'Tháng',
  week: 'Tuần',
  day: 'Ngày',
};

export const PLAN_LEVEL_SHORT: Record<PlanLevel, string> = {
  quarter: 'Q',
  month: 'T',
  week: 'Tu',
  day: 'N',
};

export const PLAN_STATUS_CONFIG: Record<PlanStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Bản nháp', color: 'text-slate-500', bgColor: 'bg-slate-100' },
  active: { label: 'Đang hoạt động', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  completed: { label: 'Hoàn thành', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  archived: { label: 'Lưu trữ', color: 'text-slate-400', bgColor: 'bg-slate-50' },
};

export const PRIORITY_STATUS_CONFIG: Record<PriorityStatus, { label: string; color: string; bgColor: string; dotColor: string }> = {
  not_started: { label: 'Chưa bắt đầu', color: 'text-slate-500', bgColor: 'bg-slate-100', dotColor: 'bg-slate-400' },
  in_progress: { label: 'Đang tiến hành', color: 'text-blue-600', bgColor: 'bg-blue-50', dotColor: 'bg-blue-500' },
  warning: { label: 'Đang chậm', color: 'text-amber-600', bgColor: 'bg-amber-50', dotColor: 'bg-amber-500' },
  completed: { label: 'Hoàn thành', color: 'text-emerald-600', bgColor: 'bg-emerald-50', dotColor: 'bg-emerald-500' },
};

export const DAY_SLOT_STATUS_CONFIG: Record<DaySlotStatus, { label: string; color: string; bgColor: string }> = {
  not_started: { label: 'Chưa bắt đầu', color: 'text-slate-500', bgColor: 'bg-slate-100' },
  in_progress: { label: 'Đang thực hiện', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  completed: { label: 'Chờ hoàn thành', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  pending_review: { label: 'Sắp diễn ra', color: 'text-violet-600', bgColor: 'bg-violet-50' },
};

export const INDICATOR_STATUS_CONFIG: Record<IndicatorStatus, { label: string; color: string; bgColor: string }> = {
  above_target: { label: 'Đạt mục tiêu', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  near_target: { label: 'Gần đạt', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  below_target: { label: 'Dưới mục tiêu', color: 'text-red-600', bgColor: 'bg-red-50' },
};

export const REVIEW_FREQUENCY_LABELS: Record<ReviewFrequency, string> = {
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
};

export const DEFAULT_DAY_TIME_SLOTS = [
  '08:00',
  '09:30',
  '11:00',
  '13:30',
  '15:00',
  '17:00',
] as const;

export const WEEK_DAYS = [
  { key: 'mon', label: 'Thứ 2', short: 'T2' },
  { key: 'tue', label: 'Thứ 3', short: 'T3' },
  { key: 'wed', label: 'Thứ 4', short: 'T4' },
  { key: 'thu', label: 'Thứ 5', short: 'T5' },
  { key: 'fri', label: 'Thứ 6', short: 'T6' },
  { key: 'sat', label: 'Thứ 7', short: 'T7' },
] as const;

export const LINKED_MODULE_CONFIG = [
  { key: 'checklist' as const, label: 'Checklist', description: 'Theo dõi các checklist theo ưu tiên' },
  { key: 'tasks' as const, label: 'Công việc', description: 'Quản lý & giao việc chi tiết để đạt kết quả' },
  { key: 'kpi' as const, label: 'KPI', description: 'Đo lường tiến độ & kết quả theo KPI' },
  { key: 'reports' as const, label: 'Báo cáo', description: 'Xem báo cáo hiệu quả theo thời gian thực' },
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate overall progress from priorities array.
 * Returns 0-100 percentage.
 */
export function calculatePlanProgress(priorities: PlanPriority[]): number {
  if (!priorities.length) return 0;
  const total = priorities.reduce((sum, p) => sum + (p.progress || 0), 0);
  return Math.round(total / priorities.length);
}

/**
 * Count priorities by status group.
 */
export function countPriorityStatuses(priorities: PlanPriority[]) {
  return {
    total: priorities.length,
    completed: priorities.filter((p) => p.status === 'completed').length,
    inProgress: priorities.filter((p) => p.status === 'in_progress').length,
    warning: priorities.filter((p) => p.status === 'warning').length,
    notStarted: priorities.filter((p) => p.status === 'not_started').length,
  };
}

/**
 * Format number as Vietnamese currency (VND).
 * Example: 2200000000 → "2,2 tỷ" or 700000000 → "700 triệu"
 */
export function formatCurrencyVN(value: number): string {
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    return `${billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(1).replace('.', ',')} tỷ`;
  }
  if (value >= 1_000_000_000_000) {
    // scale safety
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1).replace('.', ',')} triệu`;
  }
  return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Format number with Vietnamese locale separators.
 * Example: 2200000000 → "2.200.000.000"
 */
export function formatNumberVN(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Get quarter label from a date.
 * Example: "2026-07-01" → "Q3/2026"
 */
export function getQuarterLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `Q${quarter}/${date.getFullYear()}`;
}

/**
 * Get month label from a date.
 * Example: "2026-07-15" → "Tháng 7/2026"
 */
export function getMonthLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
}

/**
 * Get week number within a month (1-based).
 */
export function getWeekOfMonth(dateStr: string): number {
  const date = new Date(dateStr);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
}

/**
 * Format date to Vietnamese short format.
 * Example: "2026-07-01" → "01/07/2026"
 */
export function formatDateVN(dateStr: string): string {
  const date = new Date(dateStr);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Calculate the number of weeks between two dates.
 */
export function getWeekCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Calculate elapsed weeks from start date to now.
 */
export function getElapsedWeeks(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)));
}

/**
 * Filter plans by level.
 */
export function filterPlansByLevel(plans: PlanDocument[], level: PlanLevel): PlanDocument[] {
  return plans.filter((p) => p.level === level && p.status !== 'archived');
}

/**
 * Get child plans for a parent plan.
 */
export function getChildPlans(plans: PlanDocument[], parentId: string): PlanDocument[] {
  return plans.filter((p) => p.parentPlanId === parentId && p.status !== 'archived');
}

/**
 * Check if a deadline is overdue.
 */
export function isOverdue(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

/**
 * Get number of days until deadline.
 * Returns negative if overdue.
 */
export function getDaysUntilDeadline(deadline: string): number {
  const target = new Date(deadline);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
