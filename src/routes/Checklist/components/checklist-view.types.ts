import type { ChecklistCategory, ChecklistItem } from '../../../types/checklist.types';

export type ChecklistSubTab = 'today' | 'process' | 'history';

export type ChecklistPermissions = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export type CategoryMeta = {
  label: string;
  themeColor: string;
  barColor: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  accentHex: string;
};

export type ChecklistViewCategory = ChecklistCategory & {
  meta: CategoryMeta;
  tasks: ChecklistItem[];
};

/** Represents a group of categories for a single date in history view */
export type HistoryDateGroup = {
  dateKey: string;
  dayLabel: string;
  isToday: boolean;
  categories: ChecklistViewCategory[];
  totalTasks: number;
  completedTasks: number;
};
