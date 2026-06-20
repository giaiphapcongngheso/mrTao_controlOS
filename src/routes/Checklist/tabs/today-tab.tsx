import React, { useCallback, useMemo, useState } from 'react';
import { Award, Info } from 'lucide-react';
import { Card } from '../../../../share/ui';
import type { ChecklistItem } from '../../../types/checklist.types';
import type {
  ChecklistPermissions,
  ChecklistViewCategory,
  HistoryDateGroup,
} from '../checklist-view.types';
import ChecklistContentArea from './_content-area';
import RadialProgress from '../shared/radial-progress';
import { isItemLate } from '../checklist-utils';
import { useInlineEdit } from '../_hook/use-inline-edit';

interface TodayTabProps {
  filteredCategories: ChecklistViewCategory[];
  historyDateGroups: HistoryDateGroup[];
  permissions: ChecklistPermissions;
  isLoading: boolean;
  historyLoading: boolean;
  roleOptions: Array<{ code: string; name: string }>;
  selectedRoleCode: string;
  subTab: 'today' | 'history';
  onToggleItem: (itemId: string, dateKey?: string) => void;
  onDeleteCategory?: (id: string) => Promise<void>;
  onOpenEditCategoryDialog: (cat: { id: string }) => void;
  onCreateRoleChecklist: (roleCode: string, categoryId: string, checklistName: string, taskTitle: string) => void;
  onCreateTodayChecklistBatch?: (roleCode: string, categoryId: string, checklistName: string, tasksList: Array<{ title: string; timeLimit?: string }>) => Promise<void>;
  onDeleteChecklistItem?: (itemId: string, dateKey?: string) => Promise<void>;
  onUpdateChecklistItem?: (itemId: string, updates: Partial<ChecklistItem>, dateKey?: string) => Promise<void>;
  onResetFilters: () => void;
}

/**
 * TodayTab — Combines the content area (flat table or category cards) with the KPI sidebar.
 * Used for both 'today' and 'history' sub-tabs since they share the same layout structure.
 */
const TodayTab = React.memo(function TodayTab({
  filteredCategories,
  historyDateGroups,
  permissions,
  isLoading,
  historyLoading,
  roleOptions,
  selectedRoleCode,
  subTab,
  onToggleItem,
  onDeleteCategory,
  onOpenEditCategoryDialog,
  onCreateRoleChecklist,
  onCreateTodayChecklistBatch,
  onDeleteChecklistItem,
  onUpdateChecklistItem,
  onResetFilters,
}: TodayTabProps) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const toggleExpand = useCallback((catId: string) => {
    setExpandedCategoryId((prev) => prev === catId ? null : catId);
  }, []);
  const {
    editingItemId,
    setEditingItemId,
    editItemTitle,
    setEditItemTitle,
    editItemTimeLimit,
    setEditItemTimeLimit,
    handleInlineSave,
    handleDeleteItem,
  } = useInlineEdit({
    onUpdateChecklistItem,
    onDeleteChecklistItem,
  });

  const editState = useMemo(() => ({
    editingItemId,
    setEditingItemId,
    editItemTitle,
    setEditItemTitle,
    editItemTimeLimit,
    setEditItemTimeLimit,
    onInlineSave: handleInlineSave,
  }), [
    editingItemId,
    editItemTitle,
    editItemTimeLimit,
    handleInlineSave,
    setEditItemTimeLimit,
    setEditItemTitle,
    setEditingItemId,
  ]);

  // Compute KPI stats dynamically
  const kpiStats = useMemo(() => {
    let total = 0;
    let completedCount = 0;
    let lateCount = 0;
    let onTimeCount = 0;

    filteredCategories.forEach((cat) => {
      cat.tasks.forEach((task) => {
        total++;
        if (task.isCompleted) {
          completedCount++;
          if (isItemLate(task)) {
            lateCount++;
          } else {
            onTimeCount++;
          }
        } else {
          if (isItemLate(task)) {
            lateCount++;
          }
        }
      });
    });

    const notCompletedCount = total - completedCount;
    const completionPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const onTimePercent = total > 0 ? Math.round((onTimeCount / total) * 100) : 0;
    const latePercent = total > 0 ? Math.round((lateCount / total) * 100) : 0;

    return { total, completedCount, notCompletedCount, onTimeCount, lateCount, onTimePercent, latePercent, completionPercent };
  }, [filteredCategories]);

  const handleAddInlineItem = useCallback(async (
    categoryId: string,
    categoryTitle: string,
    title: string,
    timeLimit?: string,
  ) => {
    const roleCode = selectedRoleCode;
    if (onCreateTodayChecklistBatch) {
      let cleanCategoryId = categoryId;
      if (categoryId.includes('_')) {
        cleanCategoryId = categoryId.split('_')[1];
      }
      await onCreateTodayChecklistBatch(roleCode, cleanCategoryId, categoryTitle, [{ title, timeLimit }]);
      return;
    }

    await onCreateRoleChecklist(roleCode, categoryId, categoryTitle, title);
  }, [onCreateRoleChecklist, onCreateTodayChecklistBatch, selectedRoleCode]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4.5 items-start">
      {/* Left Column: List/Table Content */}
      <div className="lg:col-span-8 w-full min-w-0">
        <ChecklistContentArea
          filteredCategories={filteredCategories}
          subTab={subTab}
          expandedCategoryId={expandedCategoryId}
          onToggleExpand={toggleExpand}
          permissions={permissions}
          onToggleItem={onToggleItem}
          onDeleteCategory={onDeleteCategory}
          onOpenEditCategoryDialog={onOpenEditCategoryDialog}
          editState={editState}
          onDeleteItem={handleDeleteItem}
          onAddInlineItem={handleAddInlineItem}
          onResetFilters={onResetFilters}
          kpiStats={kpiStats}
          isLoading={isLoading || historyLoading}
          roleOptions={roleOptions}
          onUpdateChecklistItem={onUpdateChecklistItem}
          historyDateGroups={historyDateGroups}
        />
      </div>

      {/* Right Column: KPI Sidebar */}
      <div className="lg:col-span-4 w-full space-y-3.5">
        {/* Card 1: Thống kê hôm nay */}
        <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
          <div className="p-4.5 space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-500" />
              <span>Thống kê hôm nay</span>
            </h3>

            {/* Flex row containing grid stats and radial chart */}
            <div className="flex items-center justify-between gap-4">
              {/* 2x2 Grid stats */}
              <div className="grid grid-cols-2 gap-2.5 flex-1">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-left">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tổng việc</span>
                  <div className="text-lg font-black text-slate-700 mt-1 select-none tabular-nums">
                    {kpiStats.total}
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50/60 border border-emerald-100/50 rounded-xl text-left">
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Đã xong</span>
                  <div className="text-lg font-black text-emerald-700 mt-1 select-none tabular-nums">
                    {kpiStats.completedCount}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-left">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Chưa xong</span>
                  <div className="text-lg font-black text-slate-700 mt-1 select-none tabular-nums">
                    {kpiStats.notCompletedCount}
                  </div>
                </div>

                <div className="p-2.5 bg-rose-50/60 border border-rose-100/50 rounded-xl text-left">
                  <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Quá hạn</span>
                  <div className="text-lg font-black text-rose-700 mt-1 select-none tabular-nums">
                    {kpiStats.lateCount}
                  </div>
                </div>
              </div>

              {/* SVG Radial percentage progress */}
              <RadialProgress percentage={kpiStats.completionPercent} />
            </div>
          </div>
        </Card>

        {/* Card 2: Nguyên tắc sử dụng */}
        <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
          <div className="p-4.5 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-400" />
              <span>Nguyên tắc sử dụng</span>
            </h4>
            <ul className="text-xs font-medium text-slate-500 leading-relaxed pl-4 list-disc space-y-2 text-left">
              <li>Checklist tự sinh theo vai trò và khung giờ chuẩn.</li>
              <li>Hoàn thành đúng giờ giúp nâng cao hiệu suất và trải nghiệm khách hàng showroom.</li>
              <li>Cập nhật ghi chú/bằng chứng hình ảnh đầy đủ để minh bạch và dễ đối soát chất lượng dịch vụ.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
});

export default TodayTab;
