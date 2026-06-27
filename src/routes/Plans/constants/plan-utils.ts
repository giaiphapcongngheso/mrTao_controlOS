import type { PlanDocument, PlanPriority, PlanLevel } from '../../../types/plans.types';

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
