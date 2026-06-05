import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../share/ui';
import { ActionConfirmDialog } from '../../../share/components/action-confirm-dialog';
import { ChecklistCategory, ChecklistItem, ProcessDocument, ProcessStep, ChecklistDocument } from '../../types/checklist.types';
import ChecklistContentArea from './components/checklist-content-area';
import ChecklistCreateDialog from './components/checklist-create-dialog';
import ChecklistHeader from './components/checklist-header';
import ChecklistTabBar from './components/checklist-tab-bar';
import ChecklistConfigBar from './components/checklist-config-bar';
import ChecklistErrorBanner from './components/checklist-error-banner';
import ProcessContentArea from './components/process-content-area';
import ProcessCreateDialog, { type ProcessDialogValues } from './components/process-create-dialog';
import {
  useFilteredCategories,
  useKpiStats,
  useInlineEdit,
  useChecklistDialog,
} from './_hook';
import { getTodayKey, toLocalDateKey } from './checklist-utils';
import type { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

interface ChecklistViewProps {
  todayCategories: ChecklistCategory[];
  processes: ProcessDocument[];
  items: ChecklistItem[];
  historySnapshots?: ChecklistDocument[];
  historyLoading?: boolean;
  onFetchHistory?: (from: string, to: string, roleCode: string) => Promise<void>;
  onToggleItem: (itemId: string) => void;
  roleOptions: Array<{ code: string; name: string }>;
  defaultRoleCode: string;
  onCreateRoleChecklist: (roleCode: string, categoryId: string, checklistName: string, taskTitle: string) => void;
  onCreateTodayChecklistBatch?: (roleCode: string, categoryId: string, checklistName: string, tasksList: Array<{ title: string; timeLimit?: string }>) => Promise<void>;
  onSaveCategoryBatch?: (params: {
    id: string | null;
    title: string;
    roleCode: string;
    iconName: string;
    colorKey: string;
    tasks: Array<{ id?: string; title: string; timeLimit?: string }>;
  }) => Promise<void>;
  onRequestEditCategory?: (
    categoryId: string,
  ) => Promise<{
    id: string;
    title: string;
    roleCode: string;
    iconName?: string;
    colorKey?: string;
    tasks: Array<{ id?: string; title: string; timeLimit?: string }>;
  } | null>;
  onDeleteCategory?: (id: string) => Promise<void>;
  onDeleteChecklistItem?: (itemId: string) => Promise<void>;
  onUpdateChecklistItem?: (itemId: string, updates: Partial<ChecklistItem>) => Promise<void>;
  pendingTemplateSync?: {
    templateTitle: string;
    snapshotTitle: string;
  } | null;
  onConfirmTemplateSync?: () => Promise<void>;
  onCancelTemplateSync?: () => void;
  onCreateProcess?: (payload: {
    title: string;
    description?: string;
    roleCode: string;
    iconName?: string;
    colorKey?: string;
    steps: ProcessStep[];
  }) => Promise<void>;
  onUpdateProcess?: (id: string, updates: Partial<ProcessDocument>) => Promise<void>;
  onDeleteProcess?: (id: string) => Promise<void>;
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
  isLoading?: boolean;
  errorMessage?: string | null;
  onDismissError?: () => void;
}

function createProcessDialogDefaults(roleCode: string): ProcessDialogValues {
  return {
    title: '',
    roleCode,
    description: '',
    iconName: 'Layers',
    colorKey: 'rose',
    steps: [{
      id: `step-${Date.now()}`,
      title: '',
      tasksText: '',
      subSteps: [],
    }],
  };
}

function mapProcessToDialogValues(process: ProcessDocument): ProcessDialogValues {
  return {
    title: process.title,
    roleCode: process.roleCode,
    description: process.description || '',
    iconName: process.iconName || 'Layers',
    colorKey: process.colorKey || 'rose',
    steps: (process.steps || []).map((step) => ({
      id: step.id,
      title: step.title,
      tasksText: (step.tasks || []).join('\n'),
      subSteps: (step.steps || []).map((subStep) => ({
        id: subStep.id,
        title: subStep.title,
        tasksText: (subStep.tasks || []).join('\n'),
      })),
    })),
  };
}

export default function ChecklistView({
  todayCategories,
  processes,
  items,
  historySnapshots = [],
  historyLoading = false,
  onFetchHistory,
  onToggleItem,
  roleOptions,
  defaultRoleCode,
  onCreateRoleChecklist,
  onCreateTodayChecklistBatch,
  onSaveCategoryBatch,
  onRequestEditCategory,
  onDeleteCategory,
  onDeleteChecklistItem,
  onUpdateChecklistItem,
  pendingTemplateSync,
  onConfirmTemplateSync,
  onCancelTemplateSync,
  onCreateProcess,
  onUpdateProcess,
  onDeleteProcess,
  permissions,
  isLoading = false,
  errorMessage,
  onDismissError,
}: ChecklistViewProps) {
  const [subTab, setSubTab] = useState<'today' | 'process' | 'history'>('today');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Date range state for history filter
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  // Process dialog states
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [processDialogInitialValues, setProcessDialogInitialValues] = useState<ProcessDialogValues | null>(null);
  const [processDialogError, setProcessDialogError] = useState<string | null>(null);
  const [processDialogEditId, setProcessDialogEditId] = useState<string | null>(null);
  const [isSubmittingProcessDialog, setIsSubmittingProcessDialog] = useState(false);

  const toggleExpand = useCallback((catId: string) => {
    setExpandedCategoryId((prev) => prev === catId ? null : catId);
  }, []);

  const {
    isAddingItem,
    setIsAddingItem,
    dialogRoleCode,
    setDialogRoleCode,
    dialogInitialValues,
    dialogError,
    isSubmittingDialog,
    openCreateDialog,
    openEditDialog,
    dialogEditCategoryId,
    handleDialogSubmit,
  } = useChecklistDialog({
    defaultRoleCode,
    onSaveCategoryBatch,
    onRequestEditCategory,
  });
  const selectedRoleCode = dialogRoleCode || defaultRoleCode;

  // Fetch history when tab, date range, or selected role changes.
  useEffect(() => {
    if (subTab === 'history' && dateRange?.from && dateRange?.to && onFetchHistory) {
      const fromStr = toLocalDateKey(dateRange.from);
      const toStr = toLocalDateKey(dateRange.to);
      void onFetchHistory(fromStr, toStr, selectedRoleCode);
    }
  }, [dateRange, onFetchHistory, selectedRoleCode, subTab]);

  const {
    filteredCategories,
    filteredProcesses,
    historyDateGroups,
  } = useFilteredCategories({
    todayCategories,
    processes,
    items,
    historySnapshots,
    subTab,
    searchTerm,
    selectedRoleCode,
    completedViewMode: 'day', // fallback/legacy
    selectedWeekDayKey: getTodayKey(), // fallback/legacy
  });

  const selectedRoleItems = useMemo(
    () => items.filter(
      (item) => item.roleCode?.trim().toUpperCase() === selectedRoleCode.trim().toUpperCase(),
    ),
    [items, selectedRoleCode],
  );
  const kpiStats = useKpiStats(selectedRoleItems);

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

  const handleOpenCreateDialog = useCallback(() => {
    if (subTab === 'process') {
      setProcessDialogEditId(null);
      setProcessDialogError(null);
      setProcessDialogInitialValues(createProcessDialogDefaults(dialogRoleCode || defaultRoleCode));
      setIsProcessDialogOpen(true);
      return;
    }
    openCreateDialog();
  }, [defaultRoleCode, dialogRoleCode, openCreateDialog, subTab]);

  const handleOpenEditChecklistDialog = useCallback((cat: { id: string }) => {
    void openEditDialog(cat.id);
  }, [openEditDialog]);

  const handleOpenEditProcessDialog = useCallback((process: ProcessDocument) => {
    setProcessDialogEditId(process.id);
    setProcessDialogError(null);
    setProcessDialogInitialValues(mapProcessToDialogValues(process));
    setIsProcessDialogOpen(true);
  }, []);

  const handleAddInlineItem = useCallback(async (
    categoryId: string,
    categoryTitle: string,
    title: string,
    timeLimit?: string,
  ) => {
    const roleCode = selectedRoleCode;
    if (onCreateTodayChecklistBatch) {
      // For adding inline to a history category or today
      // Extract original template ID if it is a history ID (which is in format dateKey_templateId)
      let cleanCategoryId = categoryId;
      if (categoryId.includes('_')) {
        cleanCategoryId = categoryId.split('_')[1];
      }
      await onCreateTodayChecklistBatch(roleCode, cleanCategoryId, categoryTitle, [{ title, timeLimit }]);
      return;
    }

    await onCreateRoleChecklist(roleCode, categoryId, categoryTitle, title);
  }, [onCreateRoleChecklist, onCreateTodayChecklistBatch, selectedRoleCode]);

  const handleResetFilters = useCallback(() => {
    setSubTab('today');
    setSearchTerm('');
    setDateRange({
      from: subDays(new Date(), 7),
      to: new Date(),
    });
  }, []);

  const handleCloseChecklistDialog = useCallback(() => {
    setIsAddingItem(false);
  }, [setIsAddingItem]);

  const handleCloseProcessDialog = useCallback(() => {
    setIsProcessDialogOpen(false);
    setProcessDialogError(null);
    setProcessDialogEditId(null);
  }, []);

  const handleSubmitProcessDialog = useCallback(async (payload: {
    title: string;
    description?: string;
    roleCode: string;
    iconName?: string;
    colorKey?: string;
    steps: ProcessStep[];
  }) => {
    setProcessDialogError(null);
    setIsSubmittingProcessDialog(true);

    try {
      if (processDialogEditId) {
        await onUpdateProcess?.(processDialogEditId, payload);
      } else {
        await onCreateProcess?.(payload);
      }
      handleCloseProcessDialog();
    } catch (error: any) {
      setProcessDialogError(error?.message || 'Khong the luu quy trinh. Vui long thu lai.');
      throw error;
    } finally {
      setIsSubmittingProcessDialog(false);
    }
  }, [handleCloseProcessDialog, onCreateProcess, onUpdateProcess, processDialogEditId]);

  return (
    <div className="space-y-2.5 text-left antialiased font-sans h-[calc(100vh-128px)] overflow-y-auto pb-24 pr-1 scrollbar-none md:h-[calc(100vh-96px)] md:pb-10">
      <ChecklistHeader
        subTab={subTab}
        canCreate={permissions.canCreate}
        onOpenCreateDialog={handleOpenCreateDialog}
      />

      <ChecklistErrorBanner
        errorMessage={errorMessage}
        onDismissError={onDismissError}
      />

      <ChecklistTabBar
        subTab={subTab}
        setSubTab={setSubTab}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedRoleCode={selectedRoleCode}
        setSelectedRoleCode={setDialogRoleCode}
        roleOptions={roleOptions}
      />

      <ChecklistConfigBar
        subTab={subTab}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {subTab === 'process' ? (
        <ProcessContentArea
          processes={filteredProcesses}
          isLoading={isLoading}
          canCreate={permissions.canCreate}
          canUpdate={permissions.canUpdate}
          canDelete={permissions.canDelete}
          onOpenCreateDialog={handleOpenCreateDialog}
          onOpenEditDialog={handleOpenEditProcessDialog}
          onDeleteProcess={async (id) => {
            await onDeleteProcess?.(id);
          }}
          onResetFilters={handleResetFilters}
        />
      ) : (
        <ChecklistContentArea
          filteredCategories={filteredCategories}
          subTab={subTab}
          expandedCategoryId={expandedCategoryId}
          onToggleExpand={toggleExpand}
          permissions={permissions}
          onToggleItem={onToggleItem}
          onDeleteCategory={onDeleteCategory}
          onOpenEditCategoryDialog={handleOpenEditChecklistDialog}
          editState={editState}
          onDeleteItem={handleDeleteItem}
          onAddInlineItem={handleAddInlineItem}
          onResetFilters={handleResetFilters}
          kpiStats={kpiStats}
          isLoading={isLoading || historyLoading}
          roleOptions={roleOptions}
          onUpdateChecklistItem={onUpdateChecklistItem}
          historyDateGroups={historyDateGroups}
        />
      )}

      {permissions.canCreate && (
        <Button
          onClick={handleOpenCreateDialog}
          className="fixed bottom-24 right-5 sm:hidden w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-lg cursor-pointer z-40"
          title={subTab === 'process' ? 'Them quy trinh moi' : 'Them checklist moi'}
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </Button>
      )}

      <ChecklistCreateDialog
        isOpen={isAddingItem}
        initialValues={dialogInitialValues}
        roleOptions={roleOptions}
        isSubmittingDialog={isSubmittingDialog}
        dialogError={dialogError}
        onClose={handleCloseChecklistDialog}
        onSubmit={handleDialogSubmit}
        isEditMode={dialogEditCategoryId !== null}
      />

      <ProcessCreateDialog
        isOpen={isProcessDialogOpen}
        roleOptions={roleOptions}
        initialValues={processDialogInitialValues}
        isSubmitting={isSubmittingProcessDialog}
        errorMessage={processDialogError}
        isEditMode={processDialogEditId !== null}
        onClose={handleCloseProcessDialog}
        onSubmit={handleSubmitProcessDialog}
      />

      <ActionConfirmDialog
        open={Boolean(pendingTemplateSync)}
        onOpenChange={(open) => {
          if (!open) {
            onCancelTemplateSync?.();
          }
        }}
        title="Dong bo thay doi template xuong checklist hom nay"
        description={
          pendingTemplateSync
            ? `Template "${pendingTemplateSync.templateTitle}" da thay doi. Ban co muon dong bo xuong checklist hom nay khong?`
            : ''
        }
        onConfirm={() => {
          void onConfirmTemplateSync?.();
        }}
        variant="confirm"
      />
    </div>
  );
}
