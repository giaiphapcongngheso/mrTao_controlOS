import { parse, isPast, isToday, isTomorrow, isThisWeek, differenceInHours } from 'date-fns';
import type { TaskItem } from '../../../types/tasks.types';

// Date format patterns commonly used in the project
const DATE_FORMATS = [
  'dd/MM/yyyy HH:mm',
  'dd/MM/yyyy',
  'yyyy-MM-dd',
  'yyyy-MM-dd HH:mm:ss',
];

/**
 * Parse a deadline string into a Date object.
 * Supports: dd/MM/yyyy, dd/MM/yyyy HH:mm, yyyy-MM-dd, ISO string.
 */
export function parseTaskDeadline(deadline: string): Date | null {
  if (!deadline || deadline === 'Today') return null;

  // Try each known format
  for (const fmt of DATE_FORMATS) {
    try {
      const result = parse(deadline.trim(), fmt, new Date());
      if (!isNaN(result.getTime())) return result;
    } catch {
      // continue to next format
    }
  }

  // Fallback: native Date parse (handles ISO strings)
  const nativeParsed = new Date(deadline);
  return isNaN(nativeParsed.getTime()) ? null : nativeParsed;
}

/**
 * Check if a task is overdue (past deadline and not completed).
 */
export function isTaskOverdue(task: TaskItem): boolean {
  if (task.status === 'completed') return false;
  const deadlineDate = parseTaskDeadline(task.deadline);
  if (!deadlineDate) return false;
  return isPast(deadlineDate);
}

/**
 * Get urgency level for a task based on its deadline.
 */
export type DeadlineUrgency = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'normal';

export function getDeadlineUrgency(task: TaskItem): DeadlineUrgency {
  if (task.status === 'completed') return 'normal';

  const deadlineDate = parseTaskDeadline(task.deadline);
  if (!deadlineDate) return 'normal';

  if (isPast(deadlineDate)) return 'overdue';
  if (isToday(deadlineDate)) return 'today';
  if (isTomorrow(deadlineDate)) return 'tomorrow';
  if (isThisWeek(deadlineDate)) return 'this_week';
  return 'normal';
}

/**
 * Get human-readable urgency label in Vietnamese.
 */
export function getUrgencyLabel(urgency: DeadlineUrgency): string | null {
  switch (urgency) {
    case 'overdue':
      return 'Quá hạn';
    case 'today':
      return 'Hôm nay';
    case 'tomorrow':
      return 'Ngày mai';
    default:
      return null;
  }
}

/**
 * Get urgency CSS classes for badge styling.
 */
export function getUrgencyBadgeClass(urgency: DeadlineUrgency): string {
  switch (urgency) {
    case 'overdue':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'today':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'tomorrow':
      return 'bg-orange-50 text-orange-600 border-orange-200';
    default:
      return '';
  }
}

/**
 * Calculate progress from subtasks.
 * Returns 0-100 or undefined if no subtasks.
 */
export function calculateProgress(task: TaskItem): number | undefined {
  const subtasks = task.subtasks;
  if (!subtasks || subtasks.length === 0) return undefined;

  const completed = subtasks.filter((s) => s.completed).length;
  return Math.round((completed / subtasks.length) * 100);
}

/**
 * Get hours remaining until deadline.
 */
export function getHoursUntilDeadline(task: TaskItem): number | null {
  const deadlineDate = parseTaskDeadline(task.deadline);
  if (!deadlineDate) return null;
  return differenceInHours(deadlineDate, new Date());
}
