import type { PlanLevel, PlanStatus, PriorityStatus, ReviewFrequency, DaySlotStatus, IndicatorStatus } from '../../../types/plans.types';

// ─── Plan Level Labels ───────────────────────────────────────────────────────

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

// ─── Plan Status Config ──────────────────────────────────────────────────────

export const PLAN_STATUS_CONFIG: Record<PlanStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Bản nháp', color: 'text-slate-500', bgColor: 'bg-slate-100' },
  active: { label: 'Đang hoạt động', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  completed: { label: 'Hoàn thành', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  archived: { label: 'Lưu trữ', color: 'text-slate-400', bgColor: 'bg-slate-50' },
};

// ─── Priority Status Config ─────────────────────────────────────────────────

export const PRIORITY_STATUS_CONFIG: Record<PriorityStatus, { label: string; color: string; bgColor: string; dotColor: string }> = {
  not_started: { label: 'Chưa bắt đầu', color: 'text-slate-500', bgColor: 'bg-slate-100', dotColor: 'bg-slate-400' },
  in_progress: { label: 'Đang tiến hành', color: 'text-blue-600', bgColor: 'bg-blue-50', dotColor: 'bg-blue-500' },
  warning: { label: 'Đang chậm', color: 'text-amber-600', bgColor: 'bg-amber-50', dotColor: 'bg-amber-500' },
  completed: { label: 'Hoàn thành', color: 'text-emerald-600', bgColor: 'bg-emerald-50', dotColor: 'bg-emerald-500' },
};

// ─── Day Slot Status ────────────────────────────────────────────────────────

export const DAY_SLOT_STATUS_CONFIG: Record<DaySlotStatus, { label: string; color: string; bgColor: string }> = {
  not_started: { label: 'Chưa bắt đầu', color: 'text-slate-500', bgColor: 'bg-slate-100' },
  in_progress: { label: 'Đang thực hiện', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  completed: { label: 'Chờ hoàn thành', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  pending_review: { label: 'Sắp diễn ra', color: 'text-violet-600', bgColor: 'bg-violet-50' },
};

// ─── Indicator Status ───────────────────────────────────────────────────────

export const INDICATOR_STATUS_CONFIG: Record<IndicatorStatus, { label: string; color: string; bgColor: string }> = {
  above_target: { label: 'Đạt mục tiêu', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  near_target: { label: 'Gần đạt', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  below_target: { label: 'Dưới mục tiêu', color: 'text-red-600', bgColor: 'bg-red-50' },
};

// ─── Review Frequency Labels ────────────────────────────────────────────────

export const REVIEW_FREQUENCY_LABELS: Record<ReviewFrequency, string> = {
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
};

// ─── Default Time Slots for Day Plan ────────────────────────────────────────

export const DEFAULT_DAY_TIME_SLOTS = [
  '08:00',
  '09:30',
  '11:00',
  '13:30',
  '15:00',
  '17:00',
] as const;

// ─── Week Days ──────────────────────────────────────────────────────────────

export const WEEK_DAYS = [
  { key: 'mon', label: 'Thứ 2', short: 'T2' },
  { key: 'tue', label: 'Thứ 3', short: 'T3' },
  { key: 'wed', label: 'Thứ 4', short: 'T4' },
  { key: 'thu', label: 'Thứ 5', short: 'T5' },
  { key: 'fri', label: 'Thứ 6', short: 'T6' },
  { key: 'sat', label: 'Thứ 7', short: 'T7' },
] as const;

// ─── Plan Linked Module Labels ──────────────────────────────────────────────

export const LINKED_MODULE_CONFIG = [
  { key: 'checklist' as const, label: 'Checklist', description: 'Theo dõi các checklist theo ưu tiên' },
  { key: 'tasks' as const, label: 'Công việc', description: 'Quản lý & giao việc chi tiết để đạt kết quả' },
  { key: 'kpi' as const, label: 'KPI', description: 'Đo lường tiến độ & kết quả theo KPI' },
  { key: 'reports' as const, label: 'Báo cáo', description: 'Xem báo cáo hiệu quả theo thời gian thực' },
] as const;
