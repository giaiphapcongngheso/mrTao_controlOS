import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, 
  Layers, 
  CheckCircle, 
  Info,
  Calendar,
  Search,
  SlidersHorizontal,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button, Input } from '../../../share/ui';
import { ChecklistCategory, ChecklistItem } from '../../types/checklist.types';
import ChecklistContentArea from './components/ChecklistContentArea';
import ChecklistCreateDialog from './components/ChecklistCreateDialog';
import type { CategoryMeta, ChecklistViewCategory } from './components/checklist-view.types';

interface ChecklistViewProps {
  todayCategories: ChecklistCategory[];
  processCategories: ChecklistCategory[];
  items: ChecklistItem[];
  allChecklistItems?: ChecklistItem[];
  onToggleItem: (itemId: string) => void;
  roleOptions: Array<{ code: string; name: string }>;
  defaultRoleCode: string;
  onCreateRoleChecklist: (roleCode: string, categoryId: string, checklistName: string, taskTitle: string) => void;
  onCreateTodayChecklistBatch?: (roleCode: string, categoryId: string, checklistName: string, tasksList: Array<{ title: string; timeLimit?: string }>) => Promise<void>;
  onCreateRoleChecklistBatch?: (roleCode: string, categoryId: string, checklistName: string, tasksList: Array<{ title: string; timeLimit?: string }>) => Promise<void>;
  onCreateCategory?: (title: string, categoryType: 'today' | 'process') => Promise<void>;
  onUpdateCategory?: (id: string, title: string, categoryType: 'today' | 'process') => Promise<void>;
  onDeleteCategory?: (id: string, categoryType: 'today' | 'process') => Promise<void>;
  onDeleteChecklistItem?: (itemId: string) => Promise<void>;
  onUpdateChecklistItem?: (itemId: string, updates: Partial<ChecklistItem>) => Promise<void>;
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
  errorMessage?: string | null;
  onDismissError?: () => void;
}

// Dynamic category metadata for UI theming
const DYNAMIC_PALETTES = [
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

function getCategoryMeta(categoryTitle: string, index: number): CategoryMeta {
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

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatCheckedAt(value?: string) {
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

// Compare completion time with timeLimit to check if late
function isItemLate(item: ChecklistItem): boolean {
  if (!item.timeLimit) return false;
  
  const [limitHour, limitMinute] = item.timeLimit.split(':').map(Number);
  if (Number.isNaN(limitHour) || Number.isNaN(limitMinute)) return false;

  let checkTime: Date;
  if (item.isCompleted && item.checkedAt) {
    checkTime = new Date(item.checkedAt);
  } else {
    // If not completed and it is for today or past days, check against current time
    const today = new Date();
    if (item.dateKey && item.dateKey !== today.toISOString().slice(0, 10)) {
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

function getWeekDates(): Array<{ dateStr: string; label: string; dateKey: string }> {
  const current = new Date();
  const week: Array<{ dateStr: string; label: string; dateKey: string }> = [];
  const distance = current.getDay() === 0 ? -6 : 1 - current.getDay();
  const monday = new Date(current);
  monday.setDate(current.getDate() + distance);

  const daysLabel = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dateKey = day.toISOString().slice(0, 10);
    week.push({
      dateStr: day.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      label: daysLabel[i],
      dateKey,
    });
  }
  return week;
}

export default function ChecklistView({
  todayCategories,
  processCategories,
  items,
  allChecklistItems = [],
  onToggleItem,
  roleOptions,
  defaultRoleCode,
  onCreateRoleChecklist,
  onCreateTodayChecklistBatch,
  onCreateRoleChecklistBatch,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onDeleteChecklistItem,
  onUpdateChecklistItem,
  permissions,
  errorMessage,
  onDismissError,
}: ChecklistViewProps) {
  const [subTab, setSubTab] = useState<'today' | 'process' | 'completed'>('today');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tab Completed Viewing Mode
  const [completedViewMode, setCompletedViewMode] = useState<'day' | 'week'>('day');
  const [selectedWeekDayKey, setSelectedWeekDayKey] = useState(getTodayKey());
  const weekDates = useMemo(() => getWeekDates(), []);

  // Inline edit state for checklist items
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemTitle, setEditItemTitle] = useState('');
  const [editItemTimeLimit, setEditItemTimeLimit] = useState('');

  // Batch Dialog form states
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [dialogRoleCode, setDialogRoleCode] = useState(defaultRoleCode);
  const [dialogCategoryId, setDialogCategoryId] = useState('');
  const [dialogChecklistName, setDialogChecklistName] = useState('');
  const [dialogTasks, setDialogTasks] = useState<Array<{ title: string; timeLimit: string }>>([
    { title: '', timeLimit: '08:00' }
  ]);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isSubmittingDialog, setIsSubmittingDialog] = useState(false);

  // States for inline category creator
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryTitle, setEditingCategoryTitle] = useState('');

  const activeCategories = subTab === 'process' ? processCategories : todayCategories;
  const activeCategoryType: 'today' | 'process' = subTab === 'process' ? 'process' : 'today';

  useEffect(() => {
    setDialogRoleCode(defaultRoleCode);
  }, [defaultRoleCode]);

  useEffect(() => {
    if (activeCategories.length > 0 && !dialogCategoryId) {
      setDialogCategoryId(activeCategories[0].id);
    }
  }, [activeCategories, dialogCategoryId]);

  useEffect(() => {
    if (activeCategories.length > 0) {
      setDialogCategoryId(activeCategories[0].id);
    }
  }, [subTab]);

  // Recalculate category accordion expansions
  const toggleExpand = (catId: string) => {
    setExpandedCategoryId(expandedCategoryId === catId ? null : catId);
  };

  // Filter dynamic categories and items
  const filteredCategories = useMemo<ChecklistViewCategory[]>(() => {
    const normalizedSelectedRole = dialogRoleCode.trim().toUpperCase();

    // 1. Process templates (subTab === 'process')
    if (subTab === 'process') {
      const templates = allChecklistItems.filter(
        (it) => it.isTemplate && it.roleCode?.trim().toUpperCase() === normalizedSelectedRole
      );

      return processCategories
        .map((cat, index) => {
          const meta = getCategoryMeta(cat.title, index);

          const catTasks = templates.filter((it) => it.categoryId === cat.id);
          const filteredTasks = catTasks.filter((it) =>
            it.title.toLowerCase().includes(searchTerm.toLowerCase())
          );

          return {
            ...cat,
            countDone: 0,
            countTotal: catTasks.length,
            isCompleted: false,
            meta,
            iconIndex: index,
            tasks: filteredTasks,
          };
        })
        .filter((cat) => (searchTerm.trim() !== '' ? cat.tasks.length > 0 : true));
    }

    // 2. Completed items (subTab === 'completed')
    if (subTab === 'completed') {
      const targetDateKey = completedViewMode === 'day' ? getTodayKey() : selectedWeekDayKey;
      const completedItems = allChecklistItems.filter(
        (it) => it.isCompleted && !it.isTemplate && it.dateKey === targetDateKey
      );

      return todayCategories
        .map((cat, index) => {
          const meta = getCategoryMeta(cat.title, index);

          const catTasks = completedItems.filter((it) => it.categoryId === cat.id);
          const filteredTasks = catTasks.filter((it) =>
            it.title.toLowerCase().includes(searchTerm.toLowerCase())
          );

          return {
            ...cat,
            countDone: catTasks.length,
            countTotal: catTasks.length,
            isCompleted: catTasks.length > 0,
            meta,
            iconIndex: index,
            tasks: filteredTasks,
          };
        })
        .filter((cat) => cat.tasks.length > 0);
    }

    // 3. Today's checklists (subTab === 'today')
    return todayCategories
      .map((cat, index) => {
        const meta = getCategoryMeta(cat.title, index);

        const catTasks = items.filter((it) => it.categoryId === cat.id);
        const filteredTasks = catTasks.filter((it) =>
          it.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const doneCount = catTasks.filter((it) => it.isCompleted).length;

        return {
          ...cat,
          countDone: doneCount,
          countTotal: catTasks.length,
          isCompleted: catTasks.length > 0 && doneCount === catTasks.length,
          meta,
          iconIndex: index,
          tasks: filteredTasks,
        };
      })
      .filter((cat) => (searchTerm.trim() !== '' ? cat.tasks.length > 0 : true));
  }, [todayCategories, processCategories, items, allChecklistItems, subTab, searchTerm, dialogRoleCode, completedViewMode, selectedWeekDayKey]);

  // Compute overall KPI metrics based on today's items
  const kpiStats = useMemo(() => {
    const todayItems = items;
    const total = todayItems.length;
    const completed = todayItems.filter(it => it.isCompleted);
    const completedCount = completed.length;

    let onTimeCount = 0;
    let lateCount = 0;

    todayItems.forEach(item => {
      if (item.timeLimit) {
        if (isItemLate(item)) {
          lateCount++;
        } else if (item.isCompleted) {
          onTimeCount++;
        }
      } else if (item.isCompleted) {
        onTimeCount++;
      }
    });

    const onTimePercent = total > 0 ? Math.round((onTimeCount / total) * 100) : 0;
    const latePercent = total > 0 ? Math.round((lateCount / total) * 100) : 0;
    const completionPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      total,
      completedCount,
      onTimeCount,
      lateCount,
      onTimePercent,
      latePercent,
      completionPercent
    };
  }, [items]);

  // Batch Dialog Add Task Row
  const addDialogTaskRow = () => {
    setDialogTasks([...dialogTasks, { title: '', timeLimit: '08:00' }]);
  };

  // Batch Dialog Delete Task Row
  const removeDialogTaskRow = (index: number) => {
    if (dialogTasks.length <= 1) return;
    setDialogTasks(dialogTasks.filter((_, i) => i !== index));
  };

  // Batch Dialog Task change handler
  const updateDialogTask = (index: number, fields: Partial<{ title: string; timeLimit: string }>) => {
    setDialogTasks(
      dialogTasks.map((task, i) => (i === index ? { ...task, ...fields } : task))
    );
  };

  const openCreateDialog = (options?: {
    roleCode?: string;
    categoryId?: string;
    checklistName?: string;
  }) => {
    setDialogRoleCode(options?.roleCode ?? defaultRoleCode);
    setDialogCategoryId(options?.categoryId ?? activeCategories[0]?.id ?? '');
    setDialogChecklistName(options?.checklistName ?? '');
    setDialogTasks([{ title: '', timeLimit: '08:00' }]);
    setDialogError(null);
    setIsAddingItem(true);
  };

  // Submit batch creation from dialog
  const handleDialogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError(null);
    setIsSubmittingDialog(true);

    const checklistName = dialogChecklistName.trim();
    if (!checklistName) {
      setDialogError('Vui lòng điền tên checklist / quy trình.');
      setIsSubmittingDialog(false);
      return;
    }

    const validTasks = dialogTasks.filter((t) => t.title.trim() !== '');
    if (validTasks.length === 0) {
      setDialogError('Vui lòng thêm ít nhất 1 nội dung công việc.');
      setIsSubmittingDialog(false);
      return;
    }

    try {
      if (subTab === 'today' && onCreateTodayChecklistBatch) {
        await onCreateTodayChecklistBatch(dialogRoleCode, dialogCategoryId, checklistName, validTasks);
      } else if (onCreateRoleChecklistBatch) {
        await onCreateRoleChecklistBatch(dialogRoleCode, dialogCategoryId, checklistName, validTasks);
      } else {
        // Fallback sequentially if batch creator is not provided
        for (const t of validTasks) {
          await onCreateRoleChecklist(dialogRoleCode, dialogCategoryId, checklistName, t.title);
        }
      }
      // Reset & Close
      setIsAddingItem(false);
      setDialogChecklistName('');
      setDialogTasks([{ title: '', timeLimit: '08:00' }]);
    } catch (err: any) {
      setDialogError(err?.message || 'Không thể lưu checklist mới. Vui lòng kiểm tra dữ liệu và thử lại.');
    } finally {
      setIsSubmittingDialog(false);
    }
  };

  // Individual item inline edit save
  const handleInlineSave = async (itemId: string) => {
    if (!editItemTitle.trim()) return;
    try {
      if (onUpdateChecklistItem) {
        await onUpdateChecklistItem(itemId, {
          title: editItemTitle.trim(),
          timeLimit: editItemTimeLimit || undefined,
        });
      }
      setEditingItemId(null);
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  };

  // Individual item delete
  const handleDeleteItem = async (itemId: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa công việc "${title}"?`)) {
      try {
        if (onDeleteChecklistItem) {
          await onDeleteChecklistItem(itemId);
        }
      } catch (err) {
        console.error('Failed to delete item:', err);
      }
    }
  };

  return (
    <div className="space-y-4 text-left antialiased font-sans">
      
      {/* 1. Header block */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        {/* Decorative ambient background accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-slate-200/40 rounded-full blur-xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-xs">CL</span>
            <span>Checklist &amp; Quy trình vận hành</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-1 max-w-xl leading-relaxed">
            {subTab === 'today' && 'Thực thi daily các đầu việc đúng mốc giờ quy định và chụp hình minh chứng ca trực.'}
            {subTab === 'process' && 'Cấu hình và chuẩn hóa quy trình template checklist cho từng vai trò nhân sự.'}
            {subTab === 'completed' && 'Lịch sử lưu trữ đầu việc đã kiểm định hoàn thành theo ngày và tuần.'}
          </p>
        </div>

        {/* Action Button checked with permissions */}
        <div className="relative z-10 flex gap-2 shrink-0 self-start sm:self-auto">
          {subTab === 'today' && permissions.canCreate && (
            <Button
              onClick={() => openCreateDialog()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C21A1A] hover:bg-red-800 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm checklist hôm nay</span>
            </Button>
          )}

          {subTab === 'process' && permissions.canCreate && (
            <Button
              onClick={() => openCreateDialog()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm quy trình chuẩn</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Global Error Message Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200 shadow-2xs">
          <div className="flex items-start gap-2.5 text-rose-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
          </div>
          <Button
            type="button"
            onClick={onDismissError}
            className="text-rose-500 hover:text-rose-700 p-0.5 rounded transition-colors cursor-pointer"
            title="Đóng thông báo lỗi"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 3. Navigation tabs and Search Filter bar */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/90 overflow-x-auto scrollbar-none gap-0.5 shrink-0 w-full lg:w-auto text-left">
          <Button
            onClick={() => setSubTab('today')}
            variant="ghost"
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 lg:flex-initial ${
              subTab === 'today'
                ? 'bg-[#C21A1A] text-white shadow-xs hover:bg-red-800'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Hôm nay</span>
          </Button>
          
          <Button
            onClick={() => setSubTab('process')}
            variant="ghost"
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 lg:flex-initial ${
              subTab === 'process'
                ? 'bg-[#C21A1A] text-white shadow-xs hover:bg-red-800'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Theo quy trình</span>
          </Button>

          <Button
            onClick={() => setSubTab('completed')}
            variant="ghost"
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 lg:flex-initial ${
              subTab === 'completed'
                ? 'bg-[#C21A1A] text-white shadow-xs hover:bg-red-800'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Đã hoàn thành</span>
          </Button>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 flex-1 lg:max-w-md w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={
                subTab === 'process'
                  ? 'Tìm kiếm quy trình chuẩn...'
                  : 'Tìm kiếm công việc hôm nay...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              clearable={false}
              className="w-full text-xs font-bold pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white transition-all shadow-2xs"
            />
            {searchTerm && (
              <Button
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          <Button
            title="Bộ lọc nâng cao"
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-350 transition-colors text-slate-500 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 4. Sub-Configuration Bar inside "Theo quy trình" */}
      {(subTab === 'process' || subTab === 'today') && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
            {subTab === 'process' && (
              <div className="flex items-center gap-2 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Chọn vai trò:</span>
              </div>
            )}
            
            <div className="flex items-center gap-3 flex-wrap">
              {subTab === 'process' && (
                <>
                  <select
                    value={dialogRoleCode}
                    onChange={(e) => setDialogRoleCode(e.target.value)}
                    className="bg-white border border-slate-200 focus:outline-slate-800 focus:ring-1 focus:ring-slate-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer hover:border-slate-350 transition-all shrink-0 shadow-2xs"
                  >
                    {roleOptions.map((role) => (
                      <option key={role.code} value={role.code}>
                        {role.name} ({role.code})
                      </option>
                    ))}
                  </select>

                  <span className="text-slate-300 text-xs hidden sm:inline">|</span>
                </>
              )}

              {/* Dynamic Group Creator */}
              {isCreatingCategory ? (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newCategoryTitle.trim() && onCreateCategory) {
                      void onCreateCategory(newCategoryTitle.trim(), activeCategoryType);
                      setNewCategoryTitle('');
                      setIsCreatingCategory(false);
                    }
                  }}
                  className="flex items-center gap-2 shrink-0 animate-in fade-in slide-in-from-left-2 duration-150"
                >
                  <input
                    type="text"
                    value={newCategoryTitle}
                    onChange={(e) => setNewCategoryTitle(e.target.value)}
                    placeholder="Tên nhóm mới..."
                    autoFocus
                    required
                    className="bg-white border border-slate-300 focus:border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold w-40 shadow-2xs focus:outline-none"
                  />
                  <Button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-xs transition-all"
                  >
                    Lưu
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setNewCategoryTitle('');
                      setIsCreatingCategory(false);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                  >
                    Hủy
                  </Button>
                </form>
              ) : (
                permissions.canCreate && (
                  <Button
                    type="button"
                    onClick={() => setIsCreatingCategory(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-850 border border-slate-200 rounded-xl text-xs font-extrabold tracking-wide transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{subTab === 'process' ? 'Thêm nhóm quy trình' : 'Thêm nhóm checklist'}</span>
                  </Button>
                )
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-slate-450 shrink-0">
            <Info className="w-4 h-4 shrink-0 text-slate-500" />
            <p className="text-[10.5px] font-semibold">
              {subTab === 'process'
                ? 'Quy trình chuẩn hóa template cho mỗi role. Tự động áp dụng daily khi bắt đầu ca trực.'
                : 'Nhóm checklist hôm nay được quản lý riêng để theo dõi vận hành theo ca trực.'}
            </p>
          </div>
        </div>
      )}

      {/* 5. Subbar for Completed View */}
      {subTab === 'completed' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Xem lịch sử:</span>
            </div>

            <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-250 shrink-0">
              <Button
                onClick={() => setCompletedViewMode('day')}
                className={`px-3 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  completedViewMode === 'day' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500'
                }`}
              >
                Theo Ngày
              </Button>
              <Button
                onClick={() => setCompletedViewMode('week')}
                className={`px-3 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  completedViewMode === 'week' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500'
                }`}
              >
                Theo Tuần
              </Button>
            </div>
          </div>

          {completedViewMode === 'week' && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 w-full md:w-auto scrollbar-none">
              {weekDates.map((d) => {
                const isSelected = selectedWeekDayKey === d.dateKey;
                return (
                  <Button
                    key={d.dateKey}
                    onClick={() => setSelectedWeekDayKey(d.dateKey)}
                    className={`px-3 py-1.5 rounded-lg border text-[10.5px] font-bold cursor-pointer transition-all shrink-0 flex flex-col items-center leading-tight ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-black opacity-80">{d.label}</span>
                    <span>{d.dateStr}</span>
                  </Button>
                );
              })}
            </div>
          )}

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400">
              {completedViewMode === 'day' ? 'Hiển thị các công việc đã hoàn thành hôm nay' : `Lịch sử hoàn thành ngày ${selectedWeekDayKey}`}
            </span>
          </div>
        </div>
      )}

      <ChecklistContentArea
        filteredCategories={filteredCategories}
        subTab={subTab}
        expandedCategoryId={expandedCategoryId}
        onToggleExpand={toggleExpand}
        permissions={permissions}
        activeCategoryType={activeCategoryType}
        onToggleItem={onToggleItem}
        onDeleteCategory={onDeleteCategory}
        onUpdateCategory={onUpdateCategory}
        editingCategoryId={editingCategoryId}
        setEditingCategoryId={setEditingCategoryId}
        editingCategoryTitle={editingCategoryTitle}
        setEditingCategoryTitle={setEditingCategoryTitle}
        editingItemId={editingItemId}
        setEditingItemId={setEditingItemId}
        editItemTitle={editItemTitle}
        setEditItemTitle={setEditItemTitle}
        editItemTimeLimit={editItemTimeLimit}
        setEditItemTimeLimit={setEditItemTimeLimit}
        onInlineSave={handleInlineSave}
        onDeleteItem={handleDeleteItem}
        isItemLate={isItemLate}
        formatCheckedAt={formatCheckedAt}
        onQuickAddProcessItem={(categoryId, categoryTitle) =>
          openCreateDialog({
            roleCode: dialogRoleCode || defaultRoleCode,
            categoryId,
            checklistName: categoryTitle,
          })
        }
        onResetFilters={() => {
          setSubTab('today');
          setSearchTerm('');
          setCompletedViewMode('day');
        }}
        kpiStats={kpiStats}
      />
      {/* 7. FLOATING QUICK LAUNCH BUTTON FOR 1-HAND OPERATIONS */}
      {permissions.canCreate && (
        <Button
          onClick={() => openCreateDialog()}
          className="fixed bottom-24 right-5 lg:bottom-12 lg:right-12 w-14 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-lg cursor-pointer z-40"
          title="Thêm checklist mới nhanh (1 tay)"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </Button>
      )}
      {/* 8. MODAL WINDOW BATCH DIALOG: CREATE NEW CHECKLIST/TEMPLATE WORKFLOW */}
      <ChecklistCreateDialog
        isOpen={isAddingItem}
        dialogError={dialogError}
        dialogRoleCode={dialogRoleCode}
        dialogCategoryId={dialogCategoryId}
        dialogChecklistName={dialogChecklistName}
        dialogTasks={dialogTasks}
        roleOptions={roleOptions}
        activeCategories={activeCategories}
        isSubmittingDialog={isSubmittingDialog}
        onClose={() => setIsAddingItem(false)}
        onSubmit={handleDialogSubmit}
        onChangeRoleCode={setDialogRoleCode}
        onChangeCategoryId={setDialogCategoryId}
        onChangeChecklistName={setDialogChecklistName}
        onAddTaskRow={addDialogTaskRow}
        onRemoveTaskRow={removeDialogTaskRow}
        onUpdateTask={updateDialogTask}
      />

    </div>
  );
}
