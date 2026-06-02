import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CheckSquare,
  ClipboardList,
  Coins,
  FileText,
  Layers,
  Lock,
  Smile,
  Sparkles,
  Warehouse,
  Wrench,
  Camera,
} from 'lucide-react';

export type ChecklistColorKey =
  | 'rose'
  | 'emerald'
  | 'blue'
  | 'amber'
  | 'purple'
  | 'indigo'
  | 'cyan'
  | 'slate';

export type ChecklistIconName =
  | 'Layers'
  | 'Calendar'
  | 'Coins'
  | 'Wrench'
  | 'Warehouse'
  | 'FileText'
  | 'Smile'
  | 'CheckSquare'
  | 'Lock'
  | 'Camera'
  | 'ClipboardList'
  | 'Sparkles';

export type ChecklistColorMeta = {
  label: string;
  themeColor: string;
  barColor: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  accentHex: string;
  filterIdleClass: string;
};

export const DEFAULT_CHECKLIST_COLOR_KEY: ChecklistColorKey = 'rose';
export const DEFAULT_CHECKLIST_ICON_NAME: ChecklistIconName = 'Layers';

export const CHECKLIST_COLOR_META: Record<ChecklistColorKey, ChecklistColorMeta> = {
  rose: {
    label: 'Đỏ đô',
    themeColor: 'border-rose-200 bg-rose-50/20 text-rose-800',
    barColor: 'bg-[#C21A1A]',
    iconBg: 'bg-rose-100 text-rose-700',
    iconColor: 'text-[#C21A1A]',
    badgeBg: 'bg-rose-100/70 text-rose-800',
    accentHex: '#C21A1A',
    filterIdleClass: 'bg-rose-100 text-[#C21A1A]',
  },
  emerald: {
    label: 'Lục bảo',
    themeColor: 'border-emerald-200 bg-emerald-50/20 text-emerald-800',
    barColor: 'bg-emerald-600',
    iconBg: 'bg-emerald-100 text-emerald-700',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-100/70 text-emerald-800',
    accentHex: '#107c41',
    filterIdleClass: 'bg-emerald-100 text-emerald-700',
  },
  blue: {
    label: 'Xanh lam',
    themeColor: 'border-blue-200 bg-blue-50/20 text-blue-800',
    barColor: 'bg-blue-600',
    iconBg: 'bg-blue-100 text-blue-700',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-100/70 text-blue-800',
    accentHex: '#0066CC',
    filterIdleClass: 'bg-blue-100 text-blue-700',
  },
  amber: {
    label: 'Hổ phách',
    themeColor: 'border-amber-200 bg-amber-50/20 text-amber-800',
    barColor: 'bg-amber-500',
    iconBg: 'bg-amber-100 text-amber-700',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-100/70 text-amber-800',
    accentHex: '#E67E22',
    filterIdleClass: 'bg-amber-100 text-amber-700',
  },
  purple: {
    label: 'Tím hoa',
    themeColor: 'border-purple-200 bg-purple-50/20 text-purple-800',
    barColor: 'bg-purple-600',
    iconBg: 'bg-purple-100 text-purple-700',
    iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-100/70 text-purple-800',
    accentHex: '#8E44AD',
    filterIdleClass: 'bg-purple-100 text-purple-700',
  },
  indigo: {
    label: 'Chàm',
    themeColor: 'border-indigo-200 bg-indigo-50/20 text-indigo-800',
    barColor: 'bg-indigo-600',
    iconBg: 'bg-indigo-100 text-indigo-700',
    iconColor: 'text-indigo-600',
    badgeBg: 'bg-indigo-100/70 text-indigo-800',
    accentHex: '#4F46E5',
    filterIdleClass: 'bg-indigo-100 text-indigo-700',
  },
  cyan: {
    label: 'Xanh băng',
    themeColor: 'border-cyan-200 bg-cyan-50/20 text-cyan-800',
    barColor: 'bg-cyan-600',
    iconBg: 'bg-cyan-100 text-cyan-700',
    iconColor: 'text-cyan-600',
    badgeBg: 'bg-cyan-100/70 text-cyan-800',
    accentHex: '#0891B2',
    filterIdleClass: 'bg-cyan-100 text-cyan-700',
  },
  slate: {
    label: 'Xám Slate',
    themeColor: 'border-slate-200 bg-slate-50/20 text-slate-800',
    barColor: 'bg-slate-600',
    iconBg: 'bg-slate-100 text-slate-700',
    iconColor: 'text-slate-600',
    badgeBg: 'bg-slate-100/70 text-slate-800',
    accentHex: '#475569',
    filterIdleClass: 'bg-slate-100 text-slate-700',
  },
};

export const CHECKLIST_ICON_OPTIONS: Array<{
  name: ChecklistIconName;
  label: string;
  icon: LucideIcon;
}> = [
  { name: 'Layers', label: 'Mặc định', icon: Layers },
  { name: 'Calendar', label: 'Mở cửa', icon: Calendar },
  { name: 'Coins', label: 'Tiền tệ', icon: Coins },
  { name: 'Wrench', label: 'Sửa chữa', icon: Wrench },
  { name: 'Warehouse', label: 'Kho bãi', icon: Warehouse },
  { name: 'FileText', label: 'Báo cáo', icon: FileText },
  { name: 'Smile', label: 'Chăm sóc', icon: Smile },
  { name: 'CheckSquare', label: 'Nhiệm vụ', icon: CheckSquare },
  { name: 'Lock', label: 'Chốt ca', icon: Lock },
  { name: 'Camera', label: 'Hình ảnh', icon: Camera },
  { name: 'ClipboardList', label: 'Kế hoạch', icon: ClipboardList },
  { name: 'Sparkles', label: 'Đặc biệt', icon: Sparkles },
];

export function getChecklistColorMeta(colorKey?: string): ChecklistColorMeta {
  return CHECKLIST_COLOR_META[(colorKey as ChecklistColorKey) || DEFAULT_CHECKLIST_COLOR_KEY] || CHECKLIST_COLOR_META[DEFAULT_CHECKLIST_COLOR_KEY];
}

export function resolveChecklistIcon(iconName?: string): LucideIcon {
  return CHECKLIST_ICON_OPTIONS.find((option) => option.name === iconName)?.icon || Layers;
}
