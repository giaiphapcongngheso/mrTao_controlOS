import ChecklistView from './checklist-view';
import type { ChecklistItem } from '../../types/checklist.types';
import type { UserSession } from '../../stores/app-store';
import { useChecklist } from './_hook';

interface ChecklistContainerProps {
  currentUser: UserSession;
  isOwner: boolean;
  activeStoreId: string;
  onMetricsChange?: (payload: { items: ChecklistItem[]; checklistCompletion: number }) => void;
}

export default function ChecklistContainer({
  currentUser,
  isOwner,
  activeStoreId,
  onMetricsChange,
}: ChecklistContainerProps) {
  const {
    currentRoleCode,
    derivedState,
    roleOptions,
    isLoading,
    permissions,
    templates,
    historySnapshots,
    historyLoading,
    fetchHistoryByDateRange,
    pendingTemplateSync,
    handleToggleChecklistItem,
    handleCreateRoleChecklist,
    handleCreateTodayChecklistBatch,
    handleSaveCategoryBatch,
    handleRequestEditCategory,
    handleDeleteChecklistCategory,
    handleDeleteChecklistItem,
    handleUpdateChecklistItem,
    handleConfirmTemplateSync,
    handleCancelTemplateSync,
    handleCreateProcess,
    handleUpdateProcess,
    handleDeleteProcess,
    refreshChecklistData,
  } = useChecklist({
    currentUser,
    isOwner,
    activeStoreId,
    onMetricsChange,
  });

  const isManagerOrOwner = currentUser?.roleCode === 'CHU_CUA_HANG' ||
    currentUser?.roleCode === 'QUAN_TRI_VIEN' ||
    currentUser?.roleCode === 'QUAN_LY_CUA_HANG' ||
    currentUser?.roleCode === 'QUAN_LY';

  return (
    <ChecklistView
      todayCategories={derivedState.todayCategories}
      templates={templates}
      processes={derivedState.processes}
      items={derivedState.todayItems}
      historySnapshots={historySnapshots}
      historyLoading={historyLoading}
      onFetchHistory={fetchHistoryByDateRange}
      onToggleItem={handleToggleChecklistItem}
      roleOptions={roleOptions}
      defaultRoleCode={currentRoleCode}
      onCreateRoleChecklist={handleCreateRoleChecklist}
      onCreateTodayChecklistBatch={handleCreateTodayChecklistBatch}
      onSaveCategoryBatch={handleSaveCategoryBatch}
      onRequestEditCategory={handleRequestEditCategory}
      onDeleteCategory={handleDeleteChecklistCategory}
      onDeleteChecklistItem={handleDeleteChecklistItem}
      onUpdateChecklistItem={handleUpdateChecklistItem}
      pendingTemplateSync={
        pendingTemplateSync
          ? {
            templateTitle: pendingTemplateSync.templateTitle,
            snapshotTitle: pendingTemplateSync.snapshotTitle,
          }
          : null
      }
      onConfirmTemplateSync={handleConfirmTemplateSync}
      onCancelTemplateSync={handleCancelTemplateSync}
      onCreateProcess={handleCreateProcess}
      onUpdateProcess={handleUpdateProcess}
      onDeleteProcess={handleDeleteProcess}
      permissions={{
        ...permissions,
        canCreate: isManagerOrOwner ? permissions.canCreate : false,
        canUpdate: isManagerOrOwner ? permissions.canUpdate : false,
        canDelete: isManagerOrOwner ? permissions.canDelete : false,
      }}
      isLoading={isLoading}
      isOwner={isManagerOrOwner}
      onRefresh={refreshChecklistData}
    />
  );
}
