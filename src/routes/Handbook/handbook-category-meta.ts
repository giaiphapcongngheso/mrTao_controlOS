import { FileText, icons, type LucideIcon } from 'lucide-react';
import type { HandbookCategory, HandbookCategoryColorKey } from '../../types/handbook.types';

export type HandbookCategoryColorMeta = {
  label: string;
  iconBg: string;
  iconColor: string;
  filterActiveClass: string;
  filterIdleClass: string;
};

export const HANDBOOK_CATEGORY_ICON_OPTIONS = [
  { name: 'BookOpen', label: 'Sổ tay' },
  { name: 'FileText', label: 'Tài liệu' },
  { name: 'Shield', label: 'Quy định' },
  { name: 'Settings', label: 'Quy trình' },
  { name: 'GraduationCap', label: 'Đào tạo' },
  { name: 'Network', label: 'Sơ đồ' },
  { name: 'Lock', label: 'Phân quyền' },
  { name: 'Scale', label: 'Quy chế' },
  { name: 'Users', label: 'Nhân sự' },
  { name: 'ClipboardList', label: 'Checklist' },
  { name: 'CircleHelp', label: 'Hỏi đáp' },
  { name: 'Info', label: 'Thông tin' },
] as const;

export const DEFAULT_HANDBOOK_CATEGORY_ICON = 'BookOpen';
export const DEFAULT_HANDBOOK_CATEGORY_COLOR: HandbookCategoryColorKey = 'slate';

export const HANDBOOK_CATEGORY_COLOR_META: Record<HandbookCategoryColorKey, HandbookCategoryColorMeta> = {
  slate: {
    label: 'Xám',
    iconBg: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    iconColor: 'text-slate-500',
    filterActiveClass: 'bg-slate-800 text-white shadow-xs hover:bg-slate-900 hover:text-white',
    filterIdleClass: 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800',
  },
  rose: {
    label: 'Đỏ',
    iconBg: 'bg-rose-50 text-red-700 hover:bg-rose-100',
    iconColor: 'text-red-600',
    filterActiveClass: 'bg-[#C21A1A] text-white shadow-xs hover:bg-[#A81515] hover:text-white',
    filterIdleClass: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800',
  },
  orange: {
    label: 'Cam',
    iconBg: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    iconColor: 'text-orange-500',
    filterActiveClass: 'bg-orange-600 text-white shadow-xs hover:bg-orange-700 hover:text-white',
    filterIdleClass: 'border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800',
  },
  emerald: {
    label: 'Xanh lá',
    iconBg: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    iconColor: 'text-emerald-500',
    filterActiveClass: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 hover:text-white',
    filterIdleClass: 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800',
  },
  blue: {
    label: 'Xanh dương',
    iconBg: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    iconColor: 'text-blue-500',
    filterActiveClass: 'bg-blue-700 text-white shadow-xs hover:bg-blue-800 hover:text-white',
    filterIdleClass: 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800',
  },
  indigo: {
    label: 'Indigo',
    iconBg: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    iconColor: 'text-indigo-500',
    filterActiveClass: 'bg-indigo-700 text-white shadow-xs hover:bg-indigo-800 hover:text-white',
    filterIdleClass: 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800',
  },
  pink: {
    label: 'Hồng',
    iconBg: 'bg-pink-50 text-pink-700 hover:bg-pink-100',
    iconColor: 'text-pink-600',
    filterActiveClass: 'bg-pink-600 text-white shadow-xs hover:bg-pink-700 hover:text-white',
    filterIdleClass: 'border border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100 hover:text-pink-800',
  },
  sky: {
    label: 'Sky',
    iconBg: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
    iconColor: 'text-sky-600',
    filterActiveClass: 'bg-sky-700 text-white shadow-xs hover:bg-sky-800 hover:text-white',
    filterIdleClass: 'border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800',
  },
  amber: {
    label: 'Vàng',
    iconBg: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    iconColor: 'text-amber-500',
    filterActiveClass: 'bg-amber-600 text-white shadow-xs hover:bg-amber-700 hover:text-white',
    filterIdleClass: 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800',
  },
  violet: {
    label: 'Tím',
    iconBg: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
    iconColor: 'text-violet-600',
    filterActiveClass: 'bg-violet-700 text-white shadow-xs hover:bg-violet-800 hover:text-white',
    filterIdleClass: 'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800',
  },
};

const iconCache = new Map<string, LucideIcon>();

export function resolveHandbookCategoryIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return FileText;

  if (iconCache.has(iconName)) {
    return iconCache.get(iconName)!;
  }

  let lucideName = iconName.trim();
  if (lucideName.toLowerCase().endsWith('icon')) {
    lucideName = lucideName.slice(0, -4).trim();
  }

  const pascal = lucideName.charAt(0).toUpperCase() + lucideName.slice(1);
  const resolved = (icons as Record<string, LucideIcon | undefined>)[pascal];
  const icon = resolved ?? FileText;

  if (!resolved) {
    console.warn(`[Handbook] Icon "${iconName}" not found in lucide-react. Falling back to FileText.`);
  }

  iconCache.set(iconName, icon);
  return icon;
}

export function getHandbookCategoryColorMeta(colorKey?: string | null): HandbookCategoryColorMeta {
  if (colorKey && colorKey in HANDBOOK_CATEGORY_COLOR_META) {
    return HANDBOOK_CATEGORY_COLOR_META[colorKey as HandbookCategoryColorKey];
  }

  return HANDBOOK_CATEGORY_COLOR_META[DEFAULT_HANDBOOK_CATEGORY_COLOR];
}

export function getStoredCategoryIconConfig(category?: HandbookCategory | null) {
  if (!category?.iconName && !category?.colorKey) {
    return null;
  }

  const color = getHandbookCategoryColorMeta(category.colorKey);
  return {
    icon: resolveHandbookCategoryIcon(category.iconName || DEFAULT_HANDBOOK_CATEGORY_ICON),
    iconBg: color.iconBg,
    iconColor: color.iconColor,
    filterActiveClass: color.filterActiveClass,
    filterIdleClass: color.filterIdleClass,
  };
}
