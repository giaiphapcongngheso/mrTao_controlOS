import { useCallback, useMemo, useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../share/ui';
import { ActionConfirmDialog } from '../../../share/components/action-confirm-dialog';
import type {
  ChecklistItem,
  ChecklistCategory,
  ProcessDocument,
  ProcessStep,
  ChecklistTemplateDocument,
} from '../../types/checklist.types';

import {
  ChecklistHeader,
  ChecklistTabBar,
  ChecklistConfigBar,
  ChecklistErrorBanner,
  ChecklistCreateDialog,
} from './shared';
import { TodayTab, ProcessTab, TemplateTab, HistoryTab } from './tabs';
import {
  useFilteredCategories,
  useChecklistDialog,
} from './_hook';
import { getTodayKey, toLocalDateKey, isItemLate } from './checklist-utils';
import type { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

interface ChecklistViewProps {
  todayCategories: ChecklistCategory[];
  templates: ChecklistTemplateDocument[];
  processes: ProcessDocument[];
  items: ChecklistItem[];
  historySnapshots?: import('../../types/checklist.types').ChecklistDocument[];
  historyLoading?: boolean;
  onFetchHistory?: (from: string, to: string, roleCode: string) => Promise<void>;
  onToggleItem: (itemId: string, dateKey?: string) => void;
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
  onDeleteChecklistItem?: (itemId: string, dateKey?: string) => Promise<void>;
  onUpdateChecklistItem?: (itemId: string, updates: Partial<ChecklistItem>, dateKey?: string) => Promise<void>;
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
  isOwner?: boolean;
  onRefresh?: () => Promise<void>;
}

export default function ChecklistView({
  todayCategories,
  templates,
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
  isOwner = false,
  onRefresh,
}: ChecklistViewProps) {
  // ── Tab & Filter State ──
  const [subTab, setSubTab] = useState<'today' | 'checklist_template' | 'process' | 'history'>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerformer, setSelectedPerformer] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Template filter state
  const [templateFilterRole, setTemplateFilterRole] = useState('all');
  const [templateFilterFrequency, setTemplateFilterFrequency] = useState('all');
  const [templateFilterStatus, setTemplateFilterStatus] = useState('all');
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreatingProcess, setIsCreatingProcess] = useState(false);

  // History date range
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  // Redirect non-owners away from history tab
  useEffect(() => {
    if (!isOwner && subTab === 'history') {
      setSubTab('today');
    }
  }, [isOwner, subTab]);

  // ── Role Code Logic ──
  const defaultSelectedRoleCode = useMemo(() => {
    if (!isOwner) return defaultRoleCode;
    const normalizedDefault = defaultRoleCode.trim().toUpperCase();
    const ownerHasTemplates = templates.some(
      (t) => (t.roleCode || '').trim().toUpperCase() === normalizedDefault
    );
    if (ownerHasTemplates) return defaultRoleCode;
    if (templates.length > 0) return templates[0].roleCode.trim().toUpperCase();
    return defaultRoleCode;
  }, [defaultRoleCode, isOwner, templates]);

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
    defaultRoleCode: defaultSelectedRoleCode,
    onSaveCategoryBatch,
    onRequestEditCategory,
  });
  const selectedRoleCode = dialogRoleCode || defaultSelectedRoleCode;

  const createRoleOptions = useMemo(() => {
    if (dialogEditCategoryId !== null) return roleOptions;
    const existingRoleCodes = new Set(templates.map((t) => t.roleCode.toUpperCase()));
    return roleOptions.filter((r) => !existingRoleCodes.has(r.code.toUpperCase()));
  }, [roleOptions, templates, dialogEditCategoryId]);

  // Fetch history when tab, date range, or selected role changes
  useEffect(() => {
    if (subTab === 'history' && dateRange?.from && dateRange?.to && onFetchHistory) {
      const fromStr = toLocalDateKey(dateRange.from);
      const toStr = toLocalDateKey(dateRange.to);
      void onFetchHistory(fromStr, toStr, selectedRoleCode);
    }
  }, [dateRange, onFetchHistory, selectedRoleCode, subTab]);

  // ── Filtered Data ──
  const {
    filteredCategories,
    filteredProcesses,
    historyDateGroups,
  } = useFilteredCategories({
    todayCategories,
    templates,
    processes,
    items,
    historySnapshots,
    subTab,
    searchTerm,
    selectedRoleCode,
    completedViewMode: 'day',
    selectedWeekDayKey: getTodayKey(),
  });

  // Apply extra Performer & Status filters dynamically for 'today' tab
  const filteredCategoriesWithExtraFilters = useMemo(() => {
    if (subTab !== 'today') return filteredCategories;

    return filteredCategories
      .map((cat) => {
        const tasks = cat.tasks.filter((task) => {
          if (selectedPerformer !== 'all' && task.checkedByName !== selectedPerformer) return false;
          if (selectedStatus !== 'all') {
            const isLate = isItemLate(task);
            if (selectedStatus === 'completed' && !task.isCompleted) return false;
            if (selectedStatus === 'not_completed' && (task.isCompleted || isLate)) return false;
            if (selectedStatus === 'late' && (task.isCompleted || !isLate)) return false;
            if (selectedStatus === 'in_progress' && (task.isCompleted || isLate)) return false;
          }
          return true;
        });
        return { ...cat, tasks, countTotal: tasks.length, countDone: tasks.filter((t) => t.isCompleted).length };
      })
      .filter((cat) => cat.tasks.length > 0);
  }, [filteredCategories, subTab, selectedPerformer, selectedStatus]);

  // ── Handlers ──
  const handleOpenCreateDialog = useCallback(() => {
    if (subTab === 'checklist_template') {
      setEditingTemplateId('new');
      return;
    }
    if (subTab === 'process') {
      setIsCreatingProcess(true);
      return;
    }
    openCreateDialog();
  }, [openCreateDialog, subTab]);

  const handleCloseCreatingProcess = useCallback(() => {
    setIsCreatingProcess(false);
  }, []);

  const handleOpenEditChecklistDialog = useCallback((cat: { id: string }) => {
    void openEditDialog(cat.id);
  }, [openEditDialog]);

  const handleResetFilters = useCallback(() => {
    setSubTab('today');
    setSearchTerm('');
    setSelectedPerformer('all');
    setSelectedStatus('all');
    setSelectedDate(new Date());
    setDateRange({ from: subDays(new Date(), 7), to: new Date() });
  }, []);

  const handleCloseChecklistDialog = useCallback(() => {
    setIsAddingItem(false);
  }, [setIsAddingItem]);

  // ── Render ──
  return (
    <div className="space-y-3.5 text-left antialiased font-sans h-[calc(100vh-128px)] overflow-y-auto pb-24 pr-1 scrollbar-none md:h-[calc(100vh-96px)] md:pb-10">
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
        items={items}
        selectedPerformer={selectedPerformer}
        setSelectedPerformer={setSelectedPerformer}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onRefresh={onRefresh}
        showHistory={isOwner}
        showRoleSelect={isOwner}
        templateFilterRole={templateFilterRole}
        setTemplateFilterRole={setTemplateFilterRole}
        templateFilterFrequency={templateFilterFrequency}
        setTemplateFilterFrequency={setTemplateFilterFrequency}
        templateFilterStatus={templateFilterStatus}
        setTemplateFilterStatus={setTemplateFilterStatus}
        templateSearchTerm={templateSearchTerm}
        setTemplateSearchTerm={setTemplateSearchTerm}
        canCreate={permissions.canCreate}
        onOpenCreateTemplate={() => setEditingTemplateId('new')}
      />

      {subTab === 'history' ? null : (
        <ChecklistConfigBar
          subTab={subTab}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      )}

      {/* ── Tab Content Routing ────────────────────────── */}
      {subTab === 'checklist_template' ? (
        <TemplateTab
          templates={templates}
          roleOptions={roleOptions}
          onSaveCategoryBatch={onSaveCategoryBatch!}
          onDeleteCategory={onDeleteCategory!}
          permissions={permissions}
          filterRole={templateFilterRole}
          filterFrequency={templateFilterFrequency}
          filterStatus={templateFilterStatus}
          searchTerm={templateSearchTerm}
          editingTemplateId={editingTemplateId}
          setEditingTemplateId={setEditingTemplateId}
        />
      ) : subTab === 'process' ? (
        <ProcessTab
          processes={filteredProcesses}
          permissions={permissions}
          isLoading={isLoading}
          roleOptions={roleOptions}
          defaultRoleCode={defaultRoleCode}
          dialogRoleCode={dialogRoleCode || defaultSelectedRoleCode}
          onCreateProcess={onCreateProcess}
          onUpdateProcess={onUpdateProcess}
          onDeleteProcess={onDeleteProcess}
          onResetFilters={handleResetFilters}
          isCreatingProcess={isCreatingProcess}
          onCloseCreatingProcess={handleCloseCreatingProcess}
        />
      ) : subTab === 'history' ? (
        <HistoryTab
          historySnapshots={historySnapshots}
          templates={templates}
          roleOptions={roleOptions}
          historyLoading={historyLoading}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedRoleCode={selectedRoleCode}
          onRoleCodeChange={setDialogRoleCode}
        />
      ) : (
        <TodayTab
          filteredCategories={filteredCategoriesWithExtraFilters}
          historyDateGroups={historyDateGroups}
          permissions={permissions}
          isLoading={isLoading}
          historyLoading={historyLoading}
          roleOptions={roleOptions}
          selectedRoleCode={selectedRoleCode}
          subTab={subTab}
          onToggleItem={onToggleItem}
          onDeleteCategory={onDeleteCategory}
          onOpenEditCategoryDialog={handleOpenEditChecklistDialog}
          onCreateRoleChecklist={onCreateRoleChecklist}
          onCreateTodayChecklistBatch={onCreateTodayChecklistBatch}
          onDeleteChecklistItem={onDeleteChecklistItem}
          onUpdateChecklistItem={onUpdateChecklistItem}
          onResetFilters={handleResetFilters}
        />
      )}

      {/* ── Mobile FAB ──────────────────────── */}
      {permissions.canCreate && (
        <Button
          onClick={handleOpenCreateDialog}
          className="fixed bottom-24 right-5 sm:hidden w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-lg cursor-pointer z-40"
          title={subTab === 'process' ? 'Thêm quy trình mới' : 'Thêm checklist mẫu mới'}
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </Button>
      )}

      {/* ── Dialogs ──────────────────────── */}
      <ChecklistCreateDialog
        isOpen={isAddingItem}
        initialValues={dialogInitialValues}
        roleOptions={createRoleOptions}
        isSubmittingDialog={isSubmittingDialog}
        dialogError={dialogError}
        onClose={handleCloseChecklistDialog}
        onSubmit={handleDialogSubmit}
        isEditMode={dialogEditCategoryId !== null}
      />

      <ActionConfirmDialog
        open={Boolean(pendingTemplateSync)}
        onOpenChange={(open) => {
          if (!open) {
            onCancelTemplateSync?.();
          }
        }}
        title="Đồng bộ thay đổi template xuống checklist hôm nay"
        description={
          pendingTemplateSync
            ? `Template "${pendingTemplateSync.templateTitle}" đã thay đổi. Bạn có muốn đồng bộ xuống checklist hôm nay không?`
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
