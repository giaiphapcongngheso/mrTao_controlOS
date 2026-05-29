import React, { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../share/ui';
import { ChecklistCategory, ChecklistItem } from '../../types/checklist.types';
import ChecklistContentArea from './components/ChecklistContentArea';
import ChecklistCreateDialog from './components/ChecklistCreateDialog';
import ChecklistHeader from './components/ChecklistHeader';
import ChecklistTabBar from './components/ChecklistTabBar';
import ChecklistConfigBar from './components/ChecklistConfigBar';
import ChecklistErrorBanner from './components/ChecklistErrorBanner';
import {
  useFilteredCategories,
  useKpiStats,
  useInlineEdit,
  useChecklistDialog,
} from './_hook';
import { getTodayKey, getWeekDates } from './checklist.utils';

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

/**
 * ChecklistView component representing the UI shell of the operational checklists.
 * Combines hooks and isolated visual sub-components into a thin orchestrator page.
 */
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


  const activeCategories = useMemo(
    () => subTab === 'process' ? processCategories : todayCategories,
    [subTab, processCategories, todayCategories]
  );
  const activeCategoryType: 'today' | 'process' = subTab === 'process' ? 'process' : 'today';

  // Toggle category accordion expansion
  const toggleExpand = useCallback((catId: string) => {
    setExpandedCategoryId(prev => prev === catId ? null : catId);
  }, []);

  // 1. Batch Create Dialog Hook
  const {
    isAddingItem,
    setIsAddingItem,
    dialogRoleCode,
    setDialogRoleCode,
    dialogCategoryId,
    setDialogCategoryId,
    dialogTasks,
    dialogError,
    isSubmittingDialog,
    addDialogTaskRow,
    removeDialogTaskRow,
    updateDialogTask,
    openCreateDialog,
    openEditDialog,
    dialogEditCategoryId,
    handleDialogSubmit,
  } = useChecklistDialog({
    defaultRoleCode,
    activeCategories,
    subTab,
    onCreateRoleChecklist,
    onCreateTodayChecklistBatch,
    onCreateRoleChecklistBatch,
    onUpdateCategory,
    onDeleteChecklistItem,
    onUpdateChecklistItem,
  });

  // 2. Filtered Categories Hook
  const filteredCategories = useFilteredCategories({
    todayCategories,
    processCategories,
    items,
    allChecklistItems,
    subTab,
    searchTerm,
    selectedRoleCode: dialogRoleCode,
    completedViewMode,
    selectedWeekDayKey,
  });

  // 3. Operational KPI stats Hook
  const kpiStats = useKpiStats(items);

  // 4. Inline Edit Item Hook
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

  // Stable callback references for child components
  const handleOpenCreateDialog = useCallback(() => {
    openCreateDialog();
  }, [openCreateDialog]);

  const handleOpenEditDialog = useCallback((cat: Parameters<typeof openEditDialog>[0]) => {
    openEditDialog(cat);
  }, [openEditDialog]);

  const handleAddInlineItem = useCallback(async (
    categoryId: string,
    categoryTitle: string,
    title: string,
    timeLimit?: string
  ) => {
    const roleCode = dialogRoleCode || defaultRoleCode;
    if (subTab === 'today') {
      if (onCreateTodayChecklistBatch) {
        await onCreateTodayChecklistBatch(roleCode, categoryId, categoryTitle, [{ title, timeLimit }]);
      } else {
        await onCreateRoleChecklist(roleCode, categoryId, categoryTitle, title);
      }
    } else {
      if (onCreateRoleChecklistBatch) {
        await onCreateRoleChecklistBatch(roleCode, categoryId, categoryTitle, [{ title, timeLimit }]);
      } else {
        await onCreateRoleChecklist(roleCode, categoryId, categoryTitle, title);
      }
    }
  }, [dialogRoleCode, defaultRoleCode, subTab, onCreateTodayChecklistBatch, onCreateRoleChecklistBatch, onCreateRoleChecklist]);

  const handleResetFilters = useCallback(() => {
    setSubTab('today');
    setSearchTerm('');
    setCompletedViewMode('day');
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsAddingItem(false);
  }, [setIsAddingItem]);

  return (
    <div className="space-y-2.5 text-left antialiased font-sans">
      {/* 1. Header Block */}
      <ChecklistHeader
        subTab={subTab}
        canCreate={permissions.canCreate}
        onOpenCreateDialog={handleOpenCreateDialog}
      />

      {/* 2. Error Message Banner */}
      <ChecklistErrorBanner
        errorMessage={errorMessage}
        onDismissError={onDismissError}
      />

      {/* 3. Navigation tabs and Search Filter bar */}
      <ChecklistTabBar
        subTab={subTab}
        setSubTab={setSubTab}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedRoleCode={dialogRoleCode}
        setSelectedRoleCode={setDialogRoleCode}
        roleOptions={roleOptions}
      />

      {/* 4. Sub-Configuration Bar / Completed view logs selector */}
      <ChecklistConfigBar
        subTab={subTab}
        completedViewMode={completedViewMode}
        setCompletedViewMode={setCompletedViewMode}
        selectedWeekDayKey={selectedWeekDayKey}
        setSelectedWeekDayKey={setSelectedWeekDayKey}
        weekDates={weekDates}
      />

      {/* 5. Main content renderer */}
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
        onOpenEditCategoryDialog={handleOpenEditDialog}
        editingItemId={editingItemId}
        setEditingItemId={setEditingItemId}
        editItemTitle={editItemTitle}
        setEditItemTitle={setEditItemTitle}
        editItemTimeLimit={editItemTimeLimit}
        setEditItemTimeLimit={setEditItemTimeLimit}
        onInlineSave={handleInlineSave}
        onDeleteItem={handleDeleteItem}
        onAddInlineItem={handleAddInlineItem}
        onResetFilters={handleResetFilters}
        kpiStats={kpiStats}
      />

      {/* 6. Floating Action Button (FAB) */}
      {permissions.canCreate && (
        <Button
          onClick={handleOpenCreateDialog}
          className="fixed bottom-24 right-5 lg:bottom-12 lg:right-12 w-14 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-lg cursor-pointer z-40"
          title="Thêm checklist mới nhanh (1 tay)"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </Button>
      )}

      {/* 7. Modal Create Dialog */}
      <ChecklistCreateDialog
        isOpen={isAddingItem}
        subTab={subTab}
        dialogError={dialogError}
        dialogRoleCode={dialogRoleCode}
        dialogCategoryId={dialogCategoryId}
        dialogTasks={dialogTasks}
        roleOptions={roleOptions}
        isSubmittingDialog={isSubmittingDialog}
        onClose={handleCloseDialog}
        onSubmit={handleDialogSubmit}
        onChangeRoleCode={setDialogRoleCode}
        onChangeCategoryId={setDialogCategoryId}
        onAddTaskRow={addDialogTaskRow}
        onRemoveTaskRow={removeDialogTaskRow}
        onUpdateTask={updateDialogTask}
        isEditMode={dialogEditCategoryId !== null}
      />
    </div>
  );
}
