import React from 'react';
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Coins,
  Edit2,
  FileText,
  Image,
  Info,
  Layers,
  Plus,
  Smile,
  Trash2,
  Warehouse,
  Wrench,
  Calendar,
  X,
} from 'lucide-react';
import { Button, Input, Textarea } from '../../../../share/ui';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../../../../share/ui/dialog';
import { DeleteConfirm } from '../../../../share/components/delete-confirm';
import { Badge } from '../../../../share/ui/badge';
import { DatePicker } from '../../../../share/components/custom/date-picker';
import { toastError } from '../../../shared/lib/toast';
import { ActionConfirmDialog } from '../../../../share/components/action-confirm-dialog';
import type {
  ChecklistPermissions,
  ChecklistSubTab,
  ChecklistViewCategory,
} from './checklist-view.types';
import { isItemLate, formatCheckedAt } from '../checklist.utils';

const parseTimeToDate = (timeStr: string) => {
  if (!timeStr) return undefined;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
};

const formatDateToTime = (date: Date | undefined) => {
  if (!date) return '08:00';
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const CATEGORY_ICON_COMPONENTS = [Calendar, Coins, Wrench, Warehouse, FileText, Layers] as const;

// ── Memoized Category Card ──────────────────────────────────────────────────
interface CategoryCardProps {
  cat: ChecklistViewCategory;
  isExpanded: boolean;
  subTab: ChecklistSubTab;
  permissions: ChecklistPermissions;
  activeCategoryType: 'today' | 'process';
  onToggleExpand: (categoryId: string) => void;
  onToggleItem: (itemId: string) => void;
  onConfirmDeleteCategory: (id: string, title: string) => void;
  onOpenEditCategoryDialog: (cat: ChecklistViewCategory) => void;
  editingItemId: string | null;
  setEditingItemId: React.Dispatch<React.SetStateAction<string | null>>;
  editItemTitle: string;
  setEditItemTitle: React.Dispatch<React.SetStateAction<string>>;
  editItemTimeLimit: string;
  setEditItemTimeLimit: React.Dispatch<React.SetStateAction<string>>;
  onInlineSave: (itemId: string) => Promise<void>;
  onConfirmDeleteItem: (itemId: string, title: string) => void;
  onAddInlineItem: (categoryId: string, categoryTitle: string, title: string, timeLimit?: string) => Promise<void>;
}

const ChecklistCategoryCard = React.memo(function ChecklistCategoryCard({
  cat,
  isExpanded,
  subTab,
  permissions,
  activeCategoryType,
  onToggleExpand,
  onToggleItem,
  onConfirmDeleteCategory,
  onOpenEditCategoryDialog,
  editingItemId,
  setEditingItemId,
  editItemTitle,
  setEditItemTitle,
  editItemTimeLimit,
  setEditItemTimeLimit,
  onInlineSave,
  onConfirmDeleteItem,
  onAddInlineItem,
}: CategoryCardProps) {
  const ratio = cat.countTotal > 0 ? (cat.countDone / cat.countTotal) : 0;
  const isFinishedList = cat.countTotal > 0 && cat.countDone === cat.countTotal;
  const CategoryIcon = CATEGORY_ICON_COMPONENTS[cat.iconIndex % CATEGORY_ICON_COMPONENTS.length];
  const percentText = Math.round(ratio * 100);

  // States for adding inline task
  const [isAddingInline, setIsAddingInline] = React.useState(false);
  const [newItemTitle, setNewItemTitle] = React.useState('');
  const [newItemTimeLimit, setNewItemTimeLimit] = React.useState('08:00');
  const [isSubmittingNewItem, setIsSubmittingNewItem] = React.useState(false);
  const [uncheckTarget, setUncheckTarget] = React.useState<{ id: string; title: string; timeLimit: string } | null>(null);
  const lastToggleCompletedRef = React.useRef<{ id: string; time: number } | null>(null);
  const lastClickRef = React.useRef<{ id: string; time: number } | null>(null);

  const handleSaveInlineItem = React.useCallback(async () => {
    const trimmed = newItemTitle.trim();
    if (!trimmed) return;
    setIsSubmittingNewItem(true);
    try {
      await onAddInlineItem(
        cat.id,
        cat.title,
        trimmed,
        subTab === 'today' ? newItemTimeLimit : undefined
      );
      setNewItemTitle('');
      setIsAddingInline(false);
    } catch (error) {
      console.error('Lỗi khi thêm inline item:', error);
      toastError('Không thể thêm công việc mới. Vui lòng thử lại.');
    } finally {
      setIsSubmittingNewItem(false);
    }
  }, [cat.id, cat.title, newItemTitle, subTab, newItemTimeLimit, onAddInlineItem]);

  const handleCancelInlineItem = React.useCallback(() => {
    setIsAddingInline(false);
    setNewItemTitle('');
  }, []);

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${isExpanded
        ? 'border-slate-200 shadow-sm'
        : 'border-slate-200/80 shadow-none hover:shadow-sm'
        }`}
    >
      {/* ── Category Header ─────────────────────────────────── */}
      <div
        onClick={() => onToggleExpand(cat.id)}
        className="px-4 py-3.5 flex items-center gap-4 cursor-pointer select-none group/header animate-in fade-in"
      >
        {/* Icon */}
        <span
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cat.meta.iconBg} transition-transform duration-200 group-hover/header:scale-105`}
        >
          <CategoryIcon className={`w-5 h-5 ${cat.meta.iconColor}`} />
        </span>

        {/* Title + Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold uppercase tracking-tight text-slate-800 truncate" style={{ color: cat.meta.accentHex }}>
              {cat.meta.label}
            </h3>

            {subTab !== 'process' && isFinishedList && (
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-px rounded uppercase tracking-wider shrink-0 animate-in zoom-in-75">
                Xong
              </span>
            )}
          </div>

          {/* Progress bar row */}
          <div className="flex items-center gap-3 mt-1.5">
            {subTab === 'process' ? (
              <span className="text-xs font-bold text-slate-400">
                {cat.countTotal} đầu việc chuẩn
              </span>
            ) : (
              <>
                <span className="text-xs font-bold text-slate-500 shrink-0">
                  {cat.countDone}/{cat.countTotal} <span className="hidden sm:inline">việc hoàn thành</span>
                </span>
                <div className="hidden sm:block w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${cat.meta.barColor}`}
                    style={{ width: `${percentText}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-400 shrink-0">
                  {percentText}%
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions & Toggle Expand */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {permissions.canUpdate && (
            <button
              type="button"
              title="Chỉnh sửa nhóm"
              onClick={() => {
                onOpenEditCategoryDialog(cat);
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border border-slate-150 text-slate-400 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          )}
          {permissions.canDelete && (
            <button
              type="button"
              title="Xóa nhóm"
              onClick={() => {
                onConfirmDeleteCategory(cat.id, cat.title);
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border border-slate-150 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          )}
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border border-slate-150 text-slate-400 flex items-center justify-center transition-all select-none">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </span>
        </div>
      </div>

      {/* ── Expanded Task List ──────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-slate-100">
          {cat.tasks.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-8 text-center font-medium">
              Chưa có công việc nào trong danh mục này.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {cat.tasks.map((item) => {
                const isLate = isItemLate(item);
                const isCurrentlyEditing = editingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (subTab === 'process' || isCurrentlyEditing) return;

                      const now = Date.now();
                      const lastClick = lastClickRef.current;
                      lastClickRef.current = { id: item.id, time: now };

                      const isDoubleClick = Boolean(lastClick && lastClick.id === item.id && now - lastClick.time < 500);

                      if (isDoubleClick) {
                        // Double Click
                        if (item.isCompleted) {
                          const lastToggle = lastToggleCompletedRef.current;
                          if (lastToggle && lastToggle.id === item.id && now - lastToggle.time < 500) {
                            return;
                          }

                          const tempItem = { ...item, isCompleted: false, checkedAt: undefined };
                          const isLateAfterUncheck = isItemLate(tempItem);

                          if (isLateAfterUncheck) {
                            setUncheckTarget({
                              id: item.id,
                              title: item.title,
                              timeLimit: item.timeLimit || '',
                            });
                          } else {
                            onToggleItem(item.id);
                          }
                        }
                      } else {
                        // Single Click
                        if (!item.isCompleted) {
                          onToggleItem(item.id);
                          lastToggleCompletedRef.current = {
                            id: item.id,
                            time: Date.now(),
                          };
                        }
                      }
                    }}
                    className={`group/row px-4 py-3 flex items-center gap-3.5 transition-colors duration-150 ${subTab === 'process'
                      ? 'hover:bg-slate-50/80'
                      : 'hover:bg-slate-50/80 cursor-pointer select-none'
                      } ${isCurrentlyEditing ? 'bg-slate-50 ring-1 ring-inset ring-slate-200' : ''}`}
                  >
                    {/* Check / Status icon */}
                    <span className="shrink-0 pointer-events-none">
                      {subTab === 'process' ? (
                        <FileText className="w-[18px] h-[18px] text-slate-300" />
                      ) : item.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className={`w-5 h-5 ${isLate ? 'text-rose-400' : 'text-slate-300 group-hover/row:text-slate-400'} transition-colors`} />
                      )}
                    </span>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {isCurrentlyEditing ? (
                        <div
                          className="flex flex-col sm:flex-row gap-2 w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Textarea
                            rows={1}
                            value={editItemTitle}
                            onChange={(e) => {
                              setEditItemTitle(e.target.value);
                              e.target.style.height = '34px';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            ref={(el) => {
                              if (el) {
                                el.style.height = '34px';
                                el.style.height = `${el.scrollHeight}px`;
                              }
                            }}
                            placeholder="Nhập tên đầu việc..."
                            className="flex-1 min-w-0 h-[34px] min-h-[34px] py-1.5 resize-none overflow-hidden text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:border-slate-500 leading-normal"
                          />
                          {subTab !== 'process' && (
                            <div className="w-28 shrink-0">
                              <DatePicker
                                value={parseTimeToDate(editItemTimeLimit)}
                                onChange={(date) => setEditItemTimeLimit(formatDateToTime(date))}
                                timeOnly={true}
                                clearable={false}
                                size="sm"
                              />
                            </div>
                          )}
                          <div className="flex gap-1 shrink-0 items-center">
                            <button
                              type="button"
                              onClick={() => { void onInlineSave(item.id); }}
                              className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer transition-colors active:scale-95"
                              title="Lưu"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer transition-colors active:scale-95"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className={`text-sm leading-relaxed ${subTab !== 'process' && item.isCompleted
                            ? 'text-slate-400 line-through font-normal'
                            : 'text-slate-600 font-medium'
                            }`}>
                            {item.title}
                          </span>

                          {/* Meta tags / Badges */}
                          {subTab === 'process' && item.checklistName && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-500 border-none shrink-0 animate-in fade-in duration-200">
                              {item.checklistName}
                            </Badge>
                          )}
                          {subTab !== 'process' && isLate && (
                            <Badge variant="destructive" className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 items-center gap-0.5 animate-in fade-in duration-200">
                              <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                              <span>Trễ hạn</span>
                            </Badge>
                          )}
                          {subTab !== 'process' && item.isCompleted && !isLate && item.timeLimit && (
                            <Badge variant="success" className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 animate-in fade-in duration-200">
                              Đúng hạn
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right-side actions */}
                    {!isCurrentlyEditing && (
                      <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                        {/* Delete */}
                        {permissions.canDelete && (
                          <button
                            type="button"
                            onClick={() => { onConfirmDeleteItem(item.id, item.title); }}
                            className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-150 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover/row:opacity-100"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Time badge */}
                        {subTab !== 'process' && item.timeLimit && (
                          <span className={`text-xs font-mono font-bold px-2 py-1 rounded-lg flex items-center gap-1 select-none ${isLate
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : 'bg-slate-50 text-slate-500 border border-slate-150'
                            }`}>
                            <Clock className="w-3 h-3" />
                            {item.timeLimit}
                          </span>
                        )}

                        {/* Image evidence */}
                        {subTab !== 'process' && (
                          <button
                            type="button"
                            className="hidden sm:flex w-7 h-7 rounded-lg bg-slate-50 border border-slate-150 text-slate-400 hover:text-slate-600 hover:bg-slate-100 items-center justify-center transition-colors cursor-pointer"
                            title="Bằng chứng hình ảnh"
                          >
                            <Image className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Checked Info Popover */}
                        {subTab !== 'process' && item.isCompleted && (item.checkedByName || item.checkedAt) && (
                          <div className="relative group/checked-info">
                            <button
                              type="button"
                              className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer"
                              title="Thông tin hoàn thành"
                            >
                              <Award className="w-3.5 h-3.5" />
                            </button>
                            {/* Popover */}
                            <div className="absolute bottom-full right-0 mb-2 z-30 w-56 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl opacity-0 pointer-events-none group-hover/checked-info:opacity-100 group-hover/checked-info:pointer-events-auto transition-all duration-200 translate-y-1 group-hover/checked-info:translate-y-0 border border-slate-800">
                              <div className="font-bold border-b border-slate-800 pb-1.5 mb-1.5 flex items-center gap-1.5 text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Đã hoàn thành</span>
                              </div>
                              <div className="space-y-1 text-[11px]">
                                <p className="text-slate-300">
                                  Người thực hiện: <span className="font-semibold text-white">{item.checkedByName || 'N/A'}</span>
                                </p>
                                {item.checkedAt && (
                                  <p className="text-slate-350">
                                    Thời gian: <span className="font-semibold text-white">{formatCheckedAt(item.checkedAt)}</span>
                                  </p>
                                )}
                              </div>
                              {/* Arrow */}
                              <div className="absolute top-full right-3 w-2 h-2 bg-slate-900 border-r border-b border-slate-800 rotate-45 -translate-y-[5px]"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isAddingInline && (
            <div
              className="px-4 py-3 flex items-center gap-3.5 bg-slate-50/80 border-t border-slate-100 ring-1 ring-inset ring-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="shrink-0">
                <Plus className="w-[18px] h-[18px] text-slate-400" />
              </span>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Textarea
                  rows={1}
                  value={newItemTitle}
                  onChange={(e) => {
                    setNewItemTitle(e.target.value);
                    e.target.style.height = '34px';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = '34px';
                      el.style.height = `${el.scrollHeight}px`;
                      el.focus();
                    }
                  }}
                  placeholder="Nhập tên đầu việc mới..."
                  className="flex-1 min-w-0 h-[34px] min-h-[34px] py-1.5 resize-none overflow-hidden text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:border-slate-500 leading-normal"
                />
                {subTab === 'today' && (
                  <div className="w-28 shrink-0">
                    <DatePicker
                      value={parseTimeToDate(newItemTimeLimit)}
                      onChange={(date) => setNewItemTimeLimit(formatDateToTime(date))}
                      timeOnly={true}
                      clearable={false}
                      size="sm"
                    />
                  </div>
                )}
                <div className="flex gap-1 shrink-0 items-center">
                  <Button
                    type="button"
                    disabled={isSubmittingNewItem || !newItemTitle.trim()}
                    onClick={handleSaveInlineItem}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white w-[30px] h-[30px]"
                    title="Lưu"
                  >
                    {isSubmittingNewItem ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmittingNewItem}
                    onClick={handleCancelInlineItem}
                    variant="secondary"
                    className="w-[30px] h-[30px]"
                    title="Hủy"
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {subTab !== 'completed' && permissions.canCreate && !isAddingInline && (
            <div className="px-4 py-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddingInline(true)}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer transition-colors active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                <span>Thêm đầu việc mới vào nhóm này</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Confirm Dialog for Unchecking late items */}
      <ActionConfirmDialog
        open={uncheckTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUncheckTarget(null);
        }}
        title="Bỏ hoàn thành công việc trễ hạn"
        description={`Bỏ hoàn thành công việc "${uncheckTarget?.title || ''}" lúc này sẽ làm nó bị TRỄ HẠN do thời gian hiện tại đã quá giờ quy định (${uncheckTarget?.timeLimit || ''}). Bạn có chắc chắn muốn bỏ hoàn thành?`}
        onConfirm={() => {
          if (uncheckTarget) {
            onToggleItem(uncheckTarget.id);
          }
          setUncheckTarget(null);
        }}
        variant="confirm"
      />
    </div>
  );
});

// ── Main Content Area (Memoized) ────────────────────────────────────────────
interface ChecklistContentAreaProps {
  filteredCategories: ChecklistViewCategory[];
  subTab: ChecklistSubTab;
  isLoading?: boolean;
  expandedCategoryId: string | null;
  onToggleExpand: (categoryId: string) => void;
  permissions: ChecklistPermissions;
  activeCategoryType: 'today' | 'process';
  onToggleItem: (itemId: string) => void;
  onDeleteCategory?: (id: string, categoryType: 'today' | 'process') => Promise<void>;
  onUpdateCategory?: (id: string, title: string, categoryType: 'today' | 'process') => Promise<void>;
  onOpenEditCategoryDialog: (cat: ChecklistViewCategory) => void;
  editingItemId: string | null;
  setEditingItemId: React.Dispatch<React.SetStateAction<string | null>>;
  editItemTitle: string;
  setEditItemTitle: React.Dispatch<React.SetStateAction<string>>;
  editItemTimeLimit: string;
  setEditItemTimeLimit: React.Dispatch<React.SetStateAction<string>>;
  onInlineSave: (itemId: string) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddInlineItem: (categoryId: string, categoryTitle: string, title: string, timeLimit?: string) => Promise<void>;
  onResetFilters: () => void;
  kpiStats: {
    total: number;
    completedCount: number;
    onTimeCount: number;
    lateCount: number;
    onTimePercent: number;
    latePercent: number;
    completionPercent: number;
  };
}

const ChecklistContentArea = React.memo(function ChecklistContentArea({
  filteredCategories,
  subTab,
  isLoading = false,
  expandedCategoryId,
  onToggleExpand,
  permissions,
  activeCategoryType,
  onToggleItem,
  onDeleteCategory,
  onUpdateCategory,
  onOpenEditCategoryDialog,
  editingItemId,
  setEditingItemId,
  editItemTitle,
  setEditItemTitle,
  editItemTimeLimit,
  setEditItemTimeLimit,
  onInlineSave,
  onDeleteItem,
  onAddInlineItem,
  onResetFilters,
  kpiStats,
}: ChecklistContentAreaProps) {
  // States for delete confirmation
  const [deleteCategoryTarget, setDeleteCategoryTarget] = React.useState<{ id: string; title: string } | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = React.useState<{ id: string; title: string } | null>(null);

  const handleConfirmDeleteCategory = React.useCallback((id: string, title: string) => {
    setDeleteCategoryTarget({ id, title });
  }, []);

  const handleConfirmDeleteItem = React.useCallback((id: string, title: string) => {
    setDeleteItemTarget({ id, title });
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* ── Category Cards Column ────────────────────────── */}
      <div className="lg:col-span-8 space-y-3">
        {isLoading ? (
          <div className="bg-white p-10 text-center rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
            <span className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin mx-auto block" />
            <p className="text-sm font-semibold text-slate-500">Dang tai checklist...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white p-14 text-center rounded-2xl border border-dashed border-slate-200 space-y-3 animate-in fade-in">
            <Smile className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-slate-500">Không có dữ liệu checklist phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc vai trò để xem kết quả khác.</p>
            </div>
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors cursor-pointer active:scale-95"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <ChecklistCategoryCard
              key={cat.id}
              cat={cat}
              isExpanded={expandedCategoryId === cat.id}
              subTab={subTab}
              permissions={permissions}
              activeCategoryType={activeCategoryType}
              onToggleExpand={onToggleExpand}
              onToggleItem={onToggleItem}
              onConfirmDeleteCategory={handleConfirmDeleteCategory}
              onOpenEditCategoryDialog={onOpenEditCategoryDialog}
              editingItemId={editingItemId}
              setEditingItemId={setEditingItemId}
              editItemTitle={editItemTitle}
              setEditItemTitle={setEditItemTitle}
              editItemTimeLimit={editItemTimeLimit}
              setEditItemTimeLimit={setEditItemTimeLimit}
              onInlineSave={onInlineSave}
              onConfirmDeleteItem={handleConfirmDeleteItem}
              onAddInlineItem={onAddInlineItem}
            />
          ))
        )}
      </div>

      {/* ── KPI Sidebar ──────────────────────────────────── */}
      <div className="lg:col-span-4 space-y-3">
        {/* Stats card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 text-left overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-slate-400 via-slate-600 to-slate-800" />

          <div className="p-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              Thống kê tiến độ hôm nay
            </h3>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-3 bg-emerald-50/60 border border-emerald-100/80 rounded-xl">
                <span className="text-[11px] font-bold uppercase text-emerald-600 tracking-wider block">Đúng hạn</span>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="text-xl font-extrabold text-emerald-700 tabular-nums">{kpiStats.onTimeCount}</span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100/60 px-1.5 py-0.5 rounded tabular-nums">{kpiStats.onTimePercent}%</span>
                </div>
              </div>

              <div className="p-3 bg-rose-50/60 border border-rose-100/80 rounded-xl">
                <span className="text-[11px] font-bold uppercase text-rose-600 tracking-wider block">Trễ hạn</span>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="text-xl font-extrabold text-rose-700 tabular-nums">{kpiStats.lateCount}</span>
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-100/60 px-1.5 py-0.5 rounded tabular-nums">{kpiStats.latePercent}%</span>
                </div>
              </div>
            </div>

            {/* Overall progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Tổng hoàn thành</span>
                <span className="tabular-nums">{kpiStats.completedCount}/{kpiStats.total} ({kpiStats.completionPercent}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500 ease-out"
                  style={{ width: `${kpiStats.total > 0 ? (kpiStats.onTimeCount / kpiStats.total) * 100 : 0}%` }}
                  title="Đúng hạn"
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500 ease-out"
                  style={{ width: `${kpiStats.total > 0 ? (kpiStats.lateCount / kpiStats.total) * 100 : 0}%` }}
                  title="Trễ hạn"
                />
              </div>

              <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 pt-0.5">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Đúng hạn</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Trễ hạn</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-200" />Chưa xong</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 text-left space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ghi chú</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Báo cáo đúng hạn checklist giúp tăng 15% điểm thưởng KPI chất lượng dịch vụ showroom. Các đầu việc tiền mặt và bàn giao két an toàn bắt buộc đính kèm minh chứng hình ảnh thực tế.
          </p>
        </div>
      </div>

      {/* Delete Category Confirmation */}
      <DeleteConfirm
        open={deleteCategoryTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCategoryTarget(null);
        }}
        title="Xóa nhóm công việc"
        description={`Bạn có chắc chắn muốn xóa nhóm "${deleteCategoryTarget?.title || ''}"? Tất cả công việc bên trong cũng sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa nhóm"
        cancelText="Hủy"
        onConfirm={async () => {
          if (deleteCategoryTarget && onDeleteCategory) {
            await onDeleteCategory(deleteCategoryTarget.id, activeCategoryType);
          }
          setDeleteCategoryTarget(null);
        }}
      />

      {/* Delete Item Confirmation */}
      <DeleteConfirm
        open={deleteItemTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteItemTarget(null);
        }}
        title="Xóa công việc"
        description={`Bạn có chắc chắn muốn xóa công việc "${deleteItemTarget?.title || ''}"?`}
        confirmText="Xóa công việc"
        cancelText="Hủy"
        onConfirm={async () => {
          if (deleteItemTarget && onDeleteItem) {
            await onDeleteItem(deleteItemTarget.id);
          }
          setDeleteItemTarget(null);
        }}
      />

    </div>
  );
});

export default ChecklistContentArea;
