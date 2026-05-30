import ChecklistView from './ChecklistView';
import type { ChecklistItem } from '../../types/checklist.types';
import type { UserSession } from '../../stores/app-store';
import { MODULE_CODE } from '../../constants/staff-permissions.constants';
import { useModulePermissions, normalizeAccessCode } from '../../shared/hooks/use-module-permissions';
import { useChecklistData, useChecklistMutations } from './_hook';

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
  const currentChecklistRoleCode = normalizeAccessCode(currentUser?.roleCode || currentUser?.role || 'SALES');
  const { permissions: checklistPermissions } = useModulePermissions(MODULE_CODE.CHECKLIST, currentUser, isOwner);

  const {
    dataStateRef,
    derivedState,
    roleOptions,
    isLoading,
    updateLocalState,
    restoreLocalState,
  } = useChecklistData({
    currentUser,
    activeStoreId,
    currentRoleCode: currentChecklistRoleCode,
    onMetricsChange,
  });

  const {
    pendingTemplateSync,
    handleToggleChecklistItem,
    handleCreateRoleChecklist,
    handleCreateTodayChecklistBatch,
    handleCreateRoleChecklistBatch,
    handleSaveCategoryBatch,
    handleRequestEditCategory,
    handleDeleteChecklistCategory,
    handleDeleteChecklistItem,
    handleUpdateChecklistItem,
    handleConfirmTemplateSync,
    handleCancelTemplateSync,
  } = useChecklistMutations({
    currentUser,
    activeStoreId,
    currentRoleCode: currentChecklistRoleCode,
    permissions: checklistPermissions,
    dataStateRef,
    updateLocalState,
    restoreLocalState,
  });

  return (
    <ChecklistView
      todayCategories={derivedState.todayCategories}
      processCategories={derivedState.processCategories}
      items={derivedState.todayItems}
      allChecklistItems={derivedState.allItems}
      onToggleItem={handleToggleChecklistItem}
      roleOptions={roleOptions}
      defaultRoleCode={currentChecklistRoleCode}
      onCreateRoleChecklist={handleCreateRoleChecklist}
      onCreateTodayChecklistBatch={handleCreateTodayChecklistBatch}
      onCreateRoleChecklistBatch={handleCreateRoleChecklistBatch}
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
      permissions={checklistPermissions}
      isLoading={isLoading}
    />
  );
}
