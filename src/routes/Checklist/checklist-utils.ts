import { ChecklistItem } from '../../types/checklist.types';
import type { CategoryMeta } from './components/checklist-view.types';
import { getChecklistColorMeta } from './checklist-meta';

/**
 * Generates styling metadata for a category based on its title and order index
 */
export function getCategoryMeta(categoryTitle: string, index: number, colorKey?: string): CategoryMeta {
  const palette = getChecklistColorMeta(colorKey);
  return {
    label: `${index + 1}. ${categoryTitle}`,
    themeColor: palette.themeColor,
    barColor: palette.barColor,
    iconBg: palette.iconBg,
    iconColor: palette.iconColor,
    badgeBg: palette.badgeBg,
    accentHex: palette.accentHex
  };
}

/**
 * Returns the current date in YYYY-MM-DD format (local timezone)
 */
export function getTodayKey(): string {
  return toLocalDateKey(new Date());
}

/**
 * Converts a Date to YYYY-MM-DD string using local timezone
 */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats ISO date string to HH:MM time format
 */
export function formatCheckedAt(value?: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('vi-VN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Compares completion time with timeLimit to check if the item is late
 */
export function isItemLate(item: ChecklistItem): boolean {
  if (!item.timeLimit) return false;
  
  const [limitHour, limitMinute] = item.timeLimit.split(':').map(Number);
  if (Number.isNaN(limitHour) || Number.isNaN(limitMinute)) return false;

  let checkTime: Date;
  if (item.isCompleted && item.checkedAt) {
    checkTime = new Date(item.checkedAt);
  } else {
    const today = new Date();
    if (item.dateKey && item.dateKey !== toLocalDateKey(today)) {
      const itemDate = new Date(item.dateKey);
      if (itemDate < today) {
        return true; // Not completed and past day -> late
      }
    }
    checkTime = today;
  }

  const checkHour = checkTime.getHours();
  const checkMinute = checkTime.getMinutes();

  if (checkHour > limitHour) return true;
  if (checkHour === limitHour && checkMinute > limitMinute) return true;
  
  return false;
}

/**
 * Generates an array representing the dates of the current week (Monday to Sunday)
 */
export function getWeekDates(): Array<{ dateStr: string; label: string; dateKey: string }> {
  const current = new Date();
  const week: Array<{ dateStr: string; label: string; dateKey: string }> = [];
  const distance = current.getDay() === 0 ? -6 : 1 - current.getDay();
  const monday = new Date(current);
  monday.setDate(current.getDate() + distance);

  const daysLabel = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dateKey = toLocalDateKey(day);
    week.push({
      dateStr: day.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      label: daysLabel[i],
      dateKey,
    });
  }
  return week;
}

/**
 * Formats a dateKey (YYYY-MM-DD) to Vietnamese readable format.
 * e.g. "2026-06-05" → "Thứ 5, 05/06/2026"
 * If dateKey is today, returns "Hôm nay - Thứ 5, 05/06/2026"
 */
export function formatDateKeyToVietnamese(dateKey: string): string {
  const date = new Date(dateKey + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return dateKey;

  const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayName = dayNames[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const formatted = `${dayName}, ${dd}/${mm}/${yyyy}`;

  if (dateKey === getTodayKey()) {
    return `Hôm nay - ${formatted}`;
  }
  return formatted;
}
