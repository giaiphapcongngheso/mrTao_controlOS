import { ChecklistItem } from '../../types/checklist.types';
import type { CategoryMeta } from './components/checklist-view.types';

// Dynamic category metadata for UI theming
export const DYNAMIC_PALETTES = [
  {
    themeColor: 'border-emerald-200 bg-emerald-50/20 text-emerald-800',
    barColor: 'bg-emerald-600',
    iconBg: 'bg-emerald-100 text-emerald-700',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-100/70 text-emerald-850',
    accentHex: '#107c41'
  },
  {
    themeColor: 'border-blue-200 bg-blue-50/20 text-blue-800',
    barColor: 'bg-blue-600',
    iconBg: 'bg-blue-100 text-blue-700',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-100/70 text-blue-850',
    accentHex: '#0066CC'
  },
  {
    themeColor: 'border-amber-200 bg-amber-50/20 text-amber-800',
    barColor: 'bg-amber-500',
    iconBg: 'bg-amber-100 text-amber-700',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-100/70 text-amber-850',
    accentHex: '#E67E22'
  },
  {
    themeColor: 'border-purple-200 bg-purple-50/20 text-purple-800',
    barColor: 'bg-purple-600',
    iconBg: 'bg-purple-100 text-purple-700',
    iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-100/70 text-purple-850',
    accentHex: '#8E44AD'
  },
  {
    themeColor: 'border-rose-200 bg-rose-50/20 text-rose-800',
    barColor: 'bg-[#C21A1A]',
    iconBg: 'bg-rose-100 text-rose-700',
    iconColor: 'text-[#C21A1A]',
    badgeBg: 'bg-rose-100/70 text-[#C21A1A]',
    accentHex: '#C21A1A'
  },
  {
    themeColor: 'border-cyan-200 bg-cyan-50/20 text-cyan-800',
    barColor: 'bg-cyan-600',
    iconBg: 'bg-cyan-100 text-cyan-700',
    iconColor: 'text-cyan-600',
    badgeBg: 'bg-cyan-100/70 text-cyan-850',
    accentHex: '#008B8B'
  },
  {
    themeColor: 'border-teal-200 bg-teal-50/20 text-teal-800',
    barColor: 'bg-teal-650',
    iconBg: 'bg-teal-100 text-teal-700',
    iconColor: 'text-teal-600',
    badgeBg: 'bg-teal-100/70 text-teal-850',
    accentHex: '#008080'
  }
];

/**
 * Generates styling metadata for a category based on its title and order index
 */
export function getCategoryMeta(categoryTitle: string, index: number): CategoryMeta {
  const palette = DYNAMIC_PALETTES[index % DYNAMIC_PALETTES.length];
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
