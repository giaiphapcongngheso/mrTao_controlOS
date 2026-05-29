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
import type { ChecklistItem } from '../../../types/checklist.types';
import type {
  ChecklistPermissions,
  ChecklistSubTab,
  ChecklistViewCategory,
} from './checklist-view.types';
import { isItemLate, formatCheckedAt } from '../checklist.utils';

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
  onDeleteCategory?: (id: string, categoryType: 'today' | 'process') => Promise<void>;
  onUpdateCategory?: (id: string, title: string, categoryType: 'today' | 'process') => Promise<void>;
  editingCategoryId: string | null;
  setEditingCategoryId: React.Dispatch<React.SetStateAction<string | null>>;
  editingCategoryTitle: string;
  setEditingCategoryTitle: React.Dispatch<React.SetStateAction<string>>;
  editingItemId: string | null;
  setEditingItemId: React.Dispatch<React.SetStateAction<string | null>>;
  editItemTitle: string;
  setEditItemTitle: React.Dispatch<React.SetStateAction<string>>;
  editItemTimeLimit: string;
  setEditItemTimeLimit: React.Dispatch<React.SetStateAction<string>>;
  onInlineSave: (itemId: string) => Promise<void>;
  onDeleteItem: (itemId: string, title: string) => Promise<void>;
  onQuickAddProcessItem: (categoryId: string, categoryTitle: string) => void;
}

const ChecklistCategoryCard = React.memo(function ChecklistCategoryCard({
  cat,
  isExpanded,
  subTab,
  permissions,
  activeCategoryType,
  onToggleExpand,
  onToggleItem,
  onDeleteCategory,
  onUpdateCategory,
  editingCategoryId,
  setEditingCategoryId,
  editingCategoryTitle,
  setEditingCategoryTitle,
  editingItemId,
  setEditingItemId,
  editItemTitle,
  setEditItemTitle,
  editItemTimeLimit,
  setEditItemTimeLimit,
  onInlineSave,
  onDeleteItem,
  onQuickAddProcessItem,
}: CategoryCardProps) {
  const ratio = cat.countTotal > 0 ? (cat.countDone / cat.countTotal) : 0;
  const isFinishedList = cat.countTotal > 0 && cat.countDone === cat.countTotal;
  const CategoryIcon = CATEGORY_ICON_COMPONENTS[cat.iconIndex % CATEGORY_ICON_COMPONENTS.length];

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-2xs ${
        isExpanded ? 'border-slate-350 shadow-xs ring-4 ring-slate-100/50' : 'border-slate-200/90'
      }`}
    >
      <div
        onClick={() => onToggleExpand(cat.id)}
        className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none relative"
      >
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${cat.meta.barColor}`}
        ></div>

        <div className="flex items-center gap-3.5 min-w-0 flex-1 text-left">
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-extrabold ${cat.meta.iconBg}`}>
            <CategoryIcon className={`w-5 h-5 ${cat.meta.iconColor}`} />
          </span>

          <div className="min-w-0 flex-1">
            {editingCategoryId === cat.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingCategoryTitle.trim() && onUpdateCategory) {
                    void onUpdateCategory(cat.id, editingCategoryTitle.trim(), activeCategoryType);
                    setEditingCategoryId(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 mt-0.5 animate-in zoom-in-95 duration-100"
              >
                <Input
                  type="text"
                  value={editingCategoryTitle}
                  onChange={(e) => setEditingCategoryTitle(e.target.value)}
                  autoFocus
                  required
                  onBlur={() => {
                    if (editingCategoryTitle.trim() && onUpdateCategory && editingCategoryTitle.trim() !== cat.title) {
                      void onUpdateCategory(cat.id, editingCategoryTitle.trim(), activeCategoryType);
                    }
                    setEditingCategoryId(null);
                  }}
                  className="bg-slate-50 border border-slate-350 focus:border-slate-800 focus:outline-none px-2.5 py-1 rounded-lg text-sm font-bold w-48 shadow-2xs"
                />
                <Button
                  type="submit"
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-sm rounded-md font-black uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Lưu
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h3 className="font-black text-sm uppercase tracking-tight text-slate-800 flex items-center gap-1.5">
                  <span style={{ color: cat.meta.accentHex }}>{cat.meta.label}</span>
                  {subTab !== 'process' && isFinishedList && (
                    <span className="text-sm text-emerald-600 font-black bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Hoàn tất</span>
                  )}
                </h3>

                {(permissions.canUpdate || permissions.canDelete) && (
                  <div className="flex items-center gap-1 opacity-0 group-hover/title:opacity-100 transition-opacity pl-2">
                    {permissions.canUpdate && (
                      <Button
                        type="button"
                        variant="ghost"
                        title="Đổi tên nhóm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategoryId(cat.id);
                          setEditingCategoryTitle(cat.title);
                        }}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer active:scale-90"
                      >
                        <Edit2 className="w-3 h-3 stroke-[2.5]" />
                      </Button>
                    )}
                    {permissions.canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        title={subTab === 'process' ? 'Xóa nhóm quy trình' : 'Xóa nhóm checklist'}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Bạn có chắc chắn muốn xóa nhóm "${cat.title}"? Tất cả công việc bên trong cũng sẽ bị xóa vĩnh viễn.`)) {
                            if (onDeleteCategory) {
                              void onDeleteCategory(cat.id, activeCategoryType);
                            }
                          }
                        }}
                        className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer active:scale-90"
                      >
                        <Trash2 className="w-3 h-3 stroke-[2.5]" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 mt-1.5 flex-wrap sm:flex-nowrap">
              {subTab === 'process' ? (
                <span className="text-sm font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 shrink-0">
                  {cat.countTotal} đầu việc chuẩn
                </span>
              ) : (
                <>
                  <span className={`text-sm font-extrabold px-2 py-0.5 rounded-md shrink-0 ${cat.meta.badgeBg}`}>
                    {cat.countDone}/{cat.countTotal} việc đã xong
                  </span>
                  <div className="w-20 sm:w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${cat.meta.barColor}`}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono font-black text-slate-400 shrink-0">
                    {Math.round(ratio * 100)}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <span className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-800 transition-colors">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </div>

      {subTab !== 'process' && (
        <div className="w-full bg-slate-100 h-[1px]">
          <div
            className={`h-full transition-all duration-500 ${cat.meta.barColor}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}

      {isExpanded && (
        <div className="bg-slate-50/40 divide-y divide-slate-150/50 border-t border-slate-100">
          {cat.tasks.length === 0 ? (
            <p className="text-sm text-slate-400 italic p-6 text-center font-bold">Chưa có công việc nào trong danh mục này.</p>
          ) : (
            cat.tasks.map((item) => {
              const isLate = isItemLate(item);
              const isCurrentlyEditing = editingItemId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (subTab !== 'process' && !isCurrentlyEditing) {
                      onToggleItem(item.id);
                    }
                  }}
                  className={`py-1.5 px-3 flex items-center justify-between gap-3 transition-all ${
                    subTab === 'process'
                      ? 'hover:bg-white/80'
                      : 'hover:bg-white/80 cursor-pointer select-none'
                  } ${isCurrentlyEditing ? 'bg-white p-2 border-l-2 border-slate-850' : ''}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className="transition-transform group-hover:scale-105 duration-200 shrink-0">
                      {subTab === 'process' ? (
                        <FileText className="w-4 h-4 text-slate-400" />
                      ) : item.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                      ) : (
                        <Circle className={`w-5 h-5 ${isLate ? 'text-rose-500' : 'text-slate-350 hover:text-slate-500'}`} />
                      )}
                    </span>

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
                              e.target.style.height = '36px';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            ref={(el) => {
                              if (el) {
                                el.style.height = '36px';
                                el.style.height = `${el.scrollHeight}px`;
                              }
                            }}
                            placeholder="Nhập tên đầu việc..."
                            className="flex-1 min-w-0 h-9 min-h-[36px] py-1.5 resize-none overflow-hidden text-sm font-bold text-slate-700 bg-slate-50 border border-slate-250 rounded-lg px-2.5 focus:outline-none focus:border-slate-800 leading-normal"
                          />
                          <Input
                            type="time"
                            value={editItemTimeLimit}
                            onChange={(e) => setEditItemTimeLimit(e.target.value)}
                            containerClassName="w-32"
                            className="text-sm font-mono font-bold text-slate-650 bg-slate-50 border border-slate-250 rounded-lg px-2 py-1.5 focus:outline-none"
                          />
                          <div className="flex gap-1 shrink-0 items-center justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                void onInlineSave(item.id);
                              }}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-colors active:scale-90"
                              title="Duyệt lưu"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setEditingItemId(null)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer transition-colors active:scale-90"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5 stroke-[3]" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className={`text-sm font-bold leading-normal block truncate ${
                            subTab !== 'process' && item.isCompleted
                              ? 'text-slate-400 line-through font-medium'
                              : 'text-slate-700'
                          }`}>
                            {item.title}
                          </span>

                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {subTab === 'process' && item.checklistName && (
                              <span className="text-sm text-slate-400 font-bold bg-slate-100 px-1 py-0.5 rounded-sm">
                                Bộ: {item.checklistName}
                              </span>
                            )}
                            {item.roleCode && (
                              <span className="text-sm text-blue-700 bg-blue-50 px-1 py-0.5 rounded-sm uppercase tracking-wider font-extrabold">
                                Role: {item.roleCode}
                              </span>
                            )}
                            {subTab !== 'process' && item.isCompleted && (item.checkedByName || item.checkedAt) && (
                              <span className="text-sm text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                                Đã check bởi {item.checkedByName || 'N/A'}{item.checkedAt ? ` lúc ${formatCheckedAt(item.checkedAt)}` : ''}
                              </span>
                            )}
                            {subTab !== 'process' && isLate && (
                              <span className="text-sm text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-black flex items-center gap-1 animate-pulse">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>Trễ hạn</span>
                              </span>
                            )}
                            {subTab !== 'process' && item.isCompleted && !isLate && item.timeLimit && (
                              <span className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-extrabold">
                                Đúng hạn
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {!isCurrentlyEditing && (
                    <div className="flex items-center gap-2 shrink-0 pl-2" onClick={(e) => e.stopPropagation()}>
                      {item.timeLimit && (
                        <span className={`text-sm font-mono font-black px-2 py-0.5 rounded-md flex items-center gap-1 select-none ${
                          subTab !== 'process' && isLate
                            ? 'bg-rose-50 border border-rose-200 text-rose-700'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          <Clock className="w-3 h-3 stroke-[2.2]" />
                          <span>Trước {item.timeLimit}</span>
                        </span>
                      )}

                      {subTab !== 'process' && (
                        <span className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors" title="Bằng chứng hình ảnh ca trực">
                          <Image className="w-3.5 h-3.5 stroke-[2]" />
                        </span>
                      )}

                      {permissions.canUpdate && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setEditingItemId(item.id);
                            setEditItemTitle(item.title);
                            setEditItemTimeLimit(item.timeLimit || '08:00');
                          }}
                          className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer active:scale-90"
                          title="Chỉnh sửa công việc"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {permissions.canDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            void onDeleteItem(item.id, item.title);
                          }}
                          className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer active:scale-90"
                          title="Xóa công việc"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      <ChevronRight className="w-3.5 h-3.5 text-slate-350" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {subTab === 'process' && permissions.canCreate && (
            <div className="py-3 px-4 text-left">
              <Button
                onClick={() => onQuickAddProcessItem(cat.id, cat.title)}
                variant="ghost"
                className="inline-flex items-center gap-1.5 text-sm font-black text-slate-800 hover:text-slate-950 hover:underline cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Thêm công việc chuẩn vào nhóm này</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ── Main Content Area (Memoized) ────────────────────────────────────────────
interface ChecklistContentAreaProps {
  filteredCategories: ChecklistViewCategory[];
  subTab: ChecklistSubTab;
  expandedCategoryId: string | null;
  onToggleExpand: (categoryId: string) => void;
  permissions: ChecklistPermissions;
  activeCategoryType: 'today' | 'process';
  onToggleItem: (itemId: string) => void;
  onDeleteCategory?: (id: string, categoryType: 'today' | 'process') => Promise<void>;
  onUpdateCategory?: (id: string, title: string, categoryType: 'today' | 'process') => Promise<void>;
  editingCategoryId: string | null;
  setEditingCategoryId: React.Dispatch<React.SetStateAction<string | null>>;
  editingCategoryTitle: string;
  setEditingCategoryTitle: React.Dispatch<React.SetStateAction<string>>;
  editingItemId: string | null;
  setEditingItemId: React.Dispatch<React.SetStateAction<string | null>>;
  editItemTitle: string;
  setEditItemTitle: React.Dispatch<React.SetStateAction<string>>;
  editItemTimeLimit: string;
  setEditItemTimeLimit: React.Dispatch<React.SetStateAction<string>>;
  onInlineSave: (itemId: string) => Promise<void>;
  onDeleteItem: (itemId: string, title: string) => Promise<void>;
  onQuickAddProcessItem: (categoryId: string, categoryTitle: string) => void;
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
  expandedCategoryId,
  onToggleExpand,
  permissions,
  activeCategoryType,
  onToggleItem,
  onDeleteCategory,
  onUpdateCategory,
  editingCategoryId,
  setEditingCategoryId,
  editingCategoryTitle,
  setEditingCategoryTitle,
  editingItemId,
  setEditingItemId,
  editItemTitle,
  setEditItemTitle,
  editItemTimeLimit,
  setEditItemTimeLimit,
  onInlineSave,
  onDeleteItem,
  onQuickAddProcessItem,
  onResetFilters,
  kpiStats,
}: ChecklistContentAreaProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
      <div className="lg:col-span-8 space-y-3.5">
        {filteredCategories.length === 0 ? (
          <div className="bg-white p-16 text-center rounded-2xl border border-dashed border-slate-200 space-y-4 shadow-2xs">
            <Smile className="w-12 h-12 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Không có dữ liệu checklist phù hợp</p>
              <p className="text-sm text-slate-400 mt-1">Không tìm thấy checklist hoặc các công việc đã hoàn thành trong nhóm này.</p>
            </div>
            <Button
              onClick={onResetFilters}
              variant="outline"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 uppercase tracking-wider hover:bg-slate-100 hover:border-slate-350 transition-all cursor-pointer active:scale-95"
            >
              Đặt lại bộ lọc
            </Button>
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
              onInlineSave={onInlineSave}
              onDeleteItem={onDeleteItem}
              onQuickAddProcessItem={onQuickAddProcessItem}
            />
          ))
        )}
      </div>

      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs text-left relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-500 to-slate-800"></div>

          <h3 className="font-extrabold text-slate-800 font-display text-sm uppercase tracking-wider mb-4 pb-2 border-b border-slate-150 flex items-center gap-2">
            <Award className="w-4 h-4 text-slate-700" />
            Thống kê tiến độ hôm nay
          </h3>

          <div className="space-y-4 text-sm font-bold">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col justify-between h-20 text-left">
                <span className="text-sm font-black uppercase text-emerald-700 tracking-wider">Đúng hạn</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-black text-emerald-700">{kpiStats.onTimeCount}</span>
                  <span className="text-sm font-black text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-md">{kpiStats.onTimePercent}%</span>
                </div>
              </div>

              <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl flex flex-col justify-between h-20 text-left">
                <span className="text-sm font-black uppercase text-rose-700 tracking-wider">Trễ hạn</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-black text-rose-700">{kpiStats.lateCount}</span>
                  <span className="text-sm font-black text-rose-600 bg-rose-100/50 px-2 py-0.5 rounded-md">{kpiStats.latePercent}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-sm font-black text-slate-700 uppercase tracking-wide">
                <span>Tổng hoàn thành</span>
                <span>{kpiStats.completedCount}/{kpiStats.total} ({kpiStats.completionPercent}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex border border-slate-200">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500 shadow-inner"
                  style={{ width: `${kpiStats.total > 0 ? (kpiStats.onTimeCount / kpiStats.total) * 100 : 0}%` }}
                  title="Đúng hạn"
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${kpiStats.total > 0 ? (kpiStats.lateCount / kpiStats.total) * 100 : 0}%` }}
                  title="Trễ hạn"
                />
              </div>

              <div className="flex items-center justify-start gap-4 text-sm font-extrabold text-slate-400 pt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Đúng hạn</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Trễ hạn / Quá giờ</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-200"></span>Chưa hoàn thành</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 text-left space-y-2 relative overflow-hidden">
          <div className="flex items-center gap-2 text-slate-700">
            <Info className="w-4 h-4 shrink-0" />
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Ghi chú showroom chuẩn</h4>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed font-semibold">
            Báo cáo đúng hạn checklist giúp tăng 15% điểm thưởng KPI chất lượng dịch vụ showroom. Các đầu việc tiền mặt và bàn giao két an toàn bắt buộc đính kèm minh chứng hình ảnh thực tế.
          </p>
        </div>
      </div>
    </div>
  );
});

export default ChecklistContentArea;
