import type { TaskItem, TaskStatus } from '../../types/tasks.types';
import { Circle, Play, Clock, CheckCircle2 } from 'lucide-react';

// ============ TASK STATUS CONSTANTS ============

/** Status display text (Vietnamese) */
export const TASK_STATUS_TEXT: Record<TaskStatus, string> = {
  not_started: 'Chưa làm',
  in_progress: 'Đang làm',
  waiting: 'Chờ duyệt',
  completed: 'Hoàn thành',
};

/** Status icons mapping */
export const TASK_STATUS_ICONS = {
  not_started: Circle,
  in_progress: Play,
  waiting: Clock,
  completed: CheckCircle2,
} as const;

/** Priority display text (Vietnamese) */
export const TASK_PRIORITY_TEXT: Record<string, string> = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

// ============ TASK CODE GENERATOR ============

/**
 * Generate a human-readable task code from task data.
 * Format: CV-{DEPT}-{DATE}-{ID}
 */
export function generateTaskCode(task: TaskItem): string {
  const deptCode = task.department
    ? task.department
      .split(' ')
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 4)
    : 'GEN';

  let dateStr = new Date().toISOString().slice(0, 10);
  const targetDate = task.createdAt || task.deadline || '';
  const dateMatch = targetDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dateMatch) {
    dateStr = `${dateMatch[3]}-${dateMatch[2]}${dateMatch[1]}`;
  } else {
    const dateMatch2 = targetDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch2) {
      dateStr = `${dateMatch2[1]}-${dateMatch2[2]}${dateMatch2[3]}`;
    }
  }

  const indexStr = task.id ? task.id.slice(-2).toUpperCase() : '01';
  return `CV-${deptCode}-${dateStr}-${indexStr}`;
}

// ============ HTML UTILITIES ============

/**
 * Strip HTML tags and truncate text.
 * Used for displaying notes preview in table cells.
 */
export function stripHtmlAndTruncate(htmlStr?: string, maxLen: number = 100): string {
  if (!htmlStr) return '';
  const cleanText = htmlStr
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
  if (cleanText.length <= maxLen) return cleanText;
  return cleanText.substring(0, maxLen) + '...';
}
