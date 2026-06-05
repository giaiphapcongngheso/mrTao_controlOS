import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { UserSession } from '../../../stores/app-store';
import type {
  ChecklistItem,
  ChecklistDocument,
  ChecklistTemplateDocument,
  ProcessDocument,
  ProcessStep,
  ChecklistTask,
} from '../../../types/checklist.types';
import type { SystemLogActionType } from '../../../types/system-log.types';
import { ENTITY_PREFIX } from '../../../constants/entity-id.constants';
import {
  checklistService,
  checklistTemplateService,
  createChecklistSnapshotOnce,
  processService,
} from '../../../services/checklist-service';
import { systemLogService } from '../../../services/system-log-service';
import { toastError, toastSuccess, toastWarning } from '../../../shared/lib/toast';
import { normalizeAccessCode } from '../../../shared/hooks/use-module-permissions';
import { guardAction, initBusinessEntity, softDeleteEntity } from '../../../types/base.types';
import { getTodayKey } from '../checklist-utils';
import {
  buildDailySnapshot,
  generateDailySnapshotId,
  findSnapshotTaskById,
  mergeTemplateTasksIntoSnapshot,
  normalizeTaskInputs,
  toSnapshotTasks,
  toTemplateTasks,
  type ChecklistDataState,
  type PendingTemplateSyncState,
  type SaveCategoryTaskInput,
} from '../checklist-domain';
import {
  DEFAULT_CHECKLIST_COLOR_KEY,
  DEFAULT_CHECKLIST_ICON_NAME,
} from '../checklist-meta';

type ChecklistPermissions = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

type UseChecklistMutationsParams = {
  currentUser: UserSession;
  activeStoreId: string;
  currentRoleCode: string;
  permissions: ChecklistPermissions;
  dataStateRef: MutableRefObject<ChecklistDataState>;
  updateLocalState: (updater: (state: ChecklistDataState) => ChecklistDataState) => ChecklistDataState;
  restoreLocalState: (previousState: ChecklistDataState) => void;
};

function replaceById<T extends { id: string }>(items: T[], nextItem: T): T[] {
  return items.map((item) => (item.id === nextItem.id ? nextItem : item));
}

function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}

export function useChecklistMutations({
  currentUser,
  activeStoreId,
  currentRoleCode,
  permissions,
  dataStateRef,
  updateLocalState,
  restoreLocalState,
}: UseChecklistMutationsParams) {
  const [pendingTemplateSync, setPendingTemplateSync] = useState<PendingTemplateSyncState | null>(null);

  // Fire-and-forget log writer - never blocks UI
  const appendChecklistLog = useCallback(async (
    actionType: SystemLogActionType,
    target: string,
    details: string,
  ) => {
    const actorName = currentUser?.fullName || currentUser?.username || 'He thong';
    const actorRole = currentUser?.role || currentRoleCode;

    try {
      await systemLogService.update(`LOG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, {
        storeId: activeStoreId,
        timestamp: new Date().toISOString(),
        actor: actorName,
        role: actorRole,
        actionType,
        target,
        details,
      });
    } catch (error) {
      console.error('Khong the ghi log checklist:', error);
    }
  }, [activeStoreId, currentRoleCode, currentUser]);

  const handleToggleChecklistItem = useCallback(async (itemId: string) => {
    const found = findSnapshotTaskById(dataStateRef.current.snapshots, itemId);
    if (!found) {
      toastError(`Khong tim thay cong viec voi ID: ${itemId}`);
      return;
    }

    const { doc: targetDoc, task: targetTask } = found;
    const err = guardAction(permissions, 'canUpdate', targetTask, `cong viec "${targetTask.title}"`);
    if (err) {
      toastError(err);
      return;
    }

    const nowIso = new Date().toISOString();
    const checkerName = currentUser?.fullName || currentUser?.username || 'He thong';
    const checkerUsername = currentUser?.username || 'system';
    const nextCompleted = !targetTask.isCompleted;
    const updatedDoc: ChecklistDocument = {
      ...targetDoc,
      updatedAt: nowIso,
      tasks: targetDoc.tasks.map((task) => (
        task.id === itemId
          ? {
            ...task,
            isCompleted: nextCompleted,
            checkedAt: nextCompleted ? nowIso : null,
            checkedByName: nextCompleted ? checkerName : null,
            checkedByUsername: nextCompleted ? checkerUsername : null,
            updatedAt: nowIso,
          }
          : task
      )),
    };

    // Optimistic update - UI responds immediately
    const previousState = updateLocalState((state) => ({
      ...state,
      snapshots: replaceById(state.snapshots, updatedDoc),
    }));

    // Background persist - no invalidation needed, state is already correct
    try {
      await checklistService.update(targetDoc.id, {
        tasks: updatedDoc.tasks,
        updatedAt: nowIso,
      });
      void appendChecklistLog(
        'UPDATE',
        'Checklist - Cap nhat trang thai',
        `${nextCompleted ? 'Hoan thanh' : 'Bo hoan thanh'} cong viec "${targetTask.title}".`,
      );
    } catch (error) {
      restoreLocalState(previousState);
      console.error('Khong the cap nhat trang thai checklist:', error);
      toastError('Cap nhat trang thai checklist that bai. Vui long thu lai.');
    }
  }, [
    appendChecklistLog,
    currentUser,
    dataStateRef,
    permissions,
    restoreLocalState,
    updateLocalState,
  ]);

  const handleCreateTodayChecklistBatch = useCallback(async (
    roleCode: string,
    categoryId: string,
    checklistName: string,
    tasksList: Array<{ title: string; timeLimit?: string }>,
  ) => {
    const err = guardAction(permissions, 'canCreate', null, 'cong viec checklist');
    if (err) {
      toastError(err);
      return;
    }

    const safeTitle = checklistName.trim();
    const safeTasks = normalizeTaskInputs(tasksList);
    if (!safeTitle || safeTasks.length === 0) {
      return;
    }

    const todayKey = getTodayKey();
    const nowIso = new Date().toISOString();
    const normalizedRole = normalizeAccessCode(roleCode);
    const dailySnapshotId = generateDailySnapshotId(todayKey, normalizedRole);

    let targetSnapshot = dataStateRef.current.snapshots.find(
      (doc) => doc.id === dailySnapshotId && !doc.deletedAt,
    );

    if (!targetSnapshot) {
      const roleTemplates = dataStateRef.current.templates.filter(
        (entry) => normalizeAccessCode(entry.roleCode) === normalizedRole && !entry.deletedAt
      );
      // Tạo mới daily snapshot với các templates hiện tại (nếu có)
      const freshSnapshot = buildDailySnapshot(roleTemplates, activeStoreId, normalizedRole, todayKey);
      targetSnapshot = await createChecklistSnapshotOnce(freshSnapshot);
    }

    const extraTasks = toSnapshotTasks(safeTasks, categoryId, todayKey);
    const updatedSnapshot: ChecklistDocument = {
      ...targetSnapshot,
      tasks: [...(targetSnapshot.tasks || []), ...extraTasks],
      updatedAt: nowIso,
    };

    const previousState = updateLocalState((state) => ({
      ...state,
      snapshots: state.snapshots.some((snapshot) => snapshot.id === updatedSnapshot.id)
        ? replaceById(state.snapshots, updatedSnapshot)
        : [...state.snapshots, updatedSnapshot],
    }));

    try {
      await checklistService.update(updatedSnapshot.id, {
        tasks: updatedSnapshot.tasks,
        updatedAt: nowIso,
      });
      void appendChecklistLog('UPDATE', 'Checklist - Them cong viec phat sinh', `Cap nhat nhom "${safeTitle}" hom nay.`);
    } catch (error) {
      restoreLocalState(previousState);
      console.error('Khong the them cong viec checklist hom nay:', error);
      toastError('Khong the them cong viec moi. Vui long thu lai.');
      throw error;
    }
  }, [
    activeStoreId,
    appendChecklistLog,
    dataStateRef,
    permissions,
    restoreLocalState,
    updateLocalState,
  ]);

  const handleCreateRoleChecklist = useCallback(async (
    roleCode: string,
    categoryId: string,
    checklistName: string,
    taskTitle: string,
  ) => {
    await handleCreateTodayChecklistBatch(roleCode, categoryId, checklistName, [{ title: taskTitle }]);
  }, [handleCreateTodayChecklistBatch]);

  const handleDeleteChecklistItem = useCallback(async (itemId: string) => {
    const snapshotFound = findSnapshotTaskById(dataStateRef.current.snapshots, itemId);
    if (snapshotFound) {
      const err = guardAction(permissions, 'canDelete', snapshotFound.task, `cong viec "${snapshotFound.task.title}"`);
      if (err) {
        toastError(err);
        return;
      }

      const nowIso = new Date().toISOString();
      const updatedDoc = {
        ...snapshotFound.doc,
        updatedAt: nowIso,
        tasks: snapshotFound.doc.tasks.map((task) => (
          task.id === itemId ? { ...task, ...softDeleteEntity(currentUser) } : task
        )),
      };
      const previousState = updateLocalState((state) => ({
        ...state,
        snapshots: replaceById(state.snapshots, updatedDoc),
      }));

      try {
        await checklistService.update(snapshotFound.doc.id, {
          tasks: updatedDoc.tasks,
          updatedAt: nowIso,
        });
        void appendChecklistLog('DELETE', 'Checklist - Xoa cong viec', `Xoa cong viec "${snapshotFound.task.title}".`);
      } catch (error) {
        restoreLocalState(previousState);
        console.error('Khong the xoa cong viec checklist:', error);
        toastError('Xoa cong viec that bai. Vui long thu lai.');
        throw error;
      }
      return;
    }

    toastError(`Khong tim thay cong viec voi ID: ${itemId}`);
  }, [
    appendChecklistLog,
    currentUser,
    dataStateRef,
    permissions,
    restoreLocalState,
    updateLocalState,
  ]);

  const handleUpdateChecklistItem = useCallback(async (itemId: string, updates: Partial<ChecklistItem>) => {
    const safeTitle = updates.title?.trim();
    if (updates.title !== undefined && !safeTitle) {
      return;
    }

    const snapshotFound = findSnapshotTaskById(dataStateRef.current.snapshots, itemId);
    if (snapshotFound) {
      const err = guardAction(permissions, 'canUpdate', snapshotFound.task, `cong viec "${snapshotFound.task.title}"`);
      if (err) {
        toastError(err);
        return;
      }

      const nowIso = new Date().toISOString();
      const updatedDoc = {
        ...snapshotFound.doc,
        updatedAt: nowIso,
        tasks: snapshotFound.doc.tasks.map((task) => (
          task.id === itemId
            ? {
              ...task,
              ...(updates.title !== undefined ? { title: safeTitle } : {}),
              ...(updates.timeLimit !== undefined ? { timeLimit: updates.timeLimit } : {}),
              ...(updates.imageUrls !== undefined ? { imageUrls: updates.imageUrls } : {}),
              updatedAt: nowIso,
            }
            : task
        )),
      };
      const previousState = updateLocalState((state) => ({
        ...state,
        snapshots: replaceById(state.snapshots, updatedDoc),
      }));

      try {
        await checklistService.update(snapshotFound.doc.id, {
          tasks: updatedDoc.tasks,
          updatedAt: nowIso,
        });
      } catch (error) {
        restoreLocalState(previousState);
        console.error('Khong the cap nhat checklist item:', error);
        toastError('Cap nhat cong viec that bai. Vui long thu lai.');
        throw error;
      }
      return;
    }

    toastError(`Khong tim thay cong viec voi ID: ${itemId}.`);
  }, [
    dataStateRef,
    permissions,
    restoreLocalState,
    updateLocalState,
  ]);

  const handleSaveCategoryBatch = useCallback(async (params: {
    id: string | null;
    title: string;
    roleCode: string;
    iconName: string;
    colorKey: string;
    tasks: SaveCategoryTaskInput[];
  }) => {
    const err = guardAction(
      permissions,
      params.id ? 'canUpdate' : 'canCreate',
      null,
      'nhom checklist',
    );
    if (err) {
      throw new Error(err);
    }

    const normalizedRoleCode = normalizeAccessCode(params.roleCode);
    const safeTitle = params.title.trim();
    const templateTasks = toTemplateTasks(params.tasks);
    if (!safeTitle || templateTasks.length === 0) {
      throw new Error('Nhom checklist phai co ten va toi thieu 1 cong viec.');
    }

    const nowIso = new Date().toISOString();
    const todayKey = getTodayKey();
    if (params.id) {
      const originalTemplate = dataStateRef.current.templates.find((template) => template.id === params.id);
      if (!originalTemplate) {
        throw new Error('Khong tim thay template checklist de cap nhat.');
      }

      const updatedTemplate = {
        ...originalTemplate,
        title: safeTitle,
        roleCode: normalizedRoleCode,
        iconName: params.iconName || DEFAULT_CHECKLIST_ICON_NAME,
        colorKey: params.colorKey || DEFAULT_CHECKLIST_COLOR_KEY,
        tasks: templateTasks,
        updatedAt: nowIso,
      };
      const previousState = updateLocalState((state) => ({
        ...state,
        templates: replaceById(state.templates, updatedTemplate),
      }));

      const dailySnapshotId = generateDailySnapshotId(todayKey, normalizedRoleCode);
      const todaySnapshot = dataStateRef.current.snapshots.find(
        (doc) => doc.id === dailySnapshotId && !doc.deletedAt,
      );
      if (todaySnapshot) {
        setPendingTemplateSync({
          templateId: originalTemplate.id,
          snapshotId: todaySnapshot.id,
          templateTitle: safeTitle,
          snapshotTitle: todayKey, // snapshot has no title now, use dateKey
          previousTemplateTaskIds: originalTemplate.tasks.map((task) => task.id),
          updatedTemplateTasks: templateTasks,
        });
      }

      try {
        await checklistTemplateService.update(originalTemplate.id, {
          title: safeTitle,
          roleCode: normalizedRoleCode,
          iconName: params.iconName || DEFAULT_CHECKLIST_ICON_NAME,
          colorKey: params.colorKey || DEFAULT_CHECKLIST_COLOR_KEY,
          tasks: templateTasks,
          updatedAt: nowIso,
        });
        toastSuccess('Đã lưu checklist.');
      } catch (error) {
        restoreLocalState(previousState);
        setPendingTemplateSync(null);
        console.error('Khong the luu template checklist:', error);
        toastError('Khong the luu checklist. Vui long thu lai.');
        throw new Error('Khong the luu checklist. Vui long thu lai.');
      }
      return;
    }

    let newTemplate: ChecklistTemplateDocument | null = null;
    try {
      const templateEntity = await initBusinessEntity(ENTITY_PREFIX.CHECKLIST_TEMPLATE);
      newTemplate = {
        ...templateEntity,
        storeId: activeStoreId,
        roleCode: normalizedRoleCode,
        title: safeTitle,
        iconName: params.iconName || DEFAULT_CHECKLIST_ICON_NAME,
        colorKey: params.colorKey || DEFAULT_CHECKLIST_COLOR_KEY,
        tasks: templateTasks,
      };
      const persistedTemplate = await checklistTemplateService.create(newTemplate);
      updateLocalState((state) => ({
        ...state,
        templates: [...state.templates, persistedTemplate],
      }));
      toastSuccess(
        'Đã tạo checklist mẫu.',
        'Checklist hôm nay sẽ được đồng bộ trong nền.',
      );
    } catch (error) {
      console.error('Khong the luu checklist:', error);
      toastError('Khong the luu checklist. Vui long thu lai.');
      throw new Error('Khong the luu checklist. Vui long thu lai.');
    }

    if (!newTemplate) {
      return;
    }

    // Gộp checklist mẫu mới vào daily snapshot hôm nay (hoặc tạo mới daily snapshot)
    try {
      const dailySnapshotId = generateDailySnapshotId(todayKey, normalizedRoleCode);
      const existingSnapshot = dataStateRef.current.snapshots.find(
        (s) => s.id === dailySnapshotId && !s.deletedAt
      );

      let updatedSnapshot: ChecklistDocument;
      if (existingSnapshot) {
        const extraTasks = toSnapshotTasks(params.tasks, newTemplate.id, todayKey);
        updatedSnapshot = {
          ...existingSnapshot,
          tasks: [...existingSnapshot.tasks, ...extraTasks],
          updatedAt: nowIso,
        };
      } else {
        updatedSnapshot = buildDailySnapshot([newTemplate], activeStoreId, normalizedRoleCode, todayKey);
      }

      const persistedSnapshot = await createChecklistSnapshotOnce(updatedSnapshot);
      updateLocalState((state) => ({
        ...state,
        snapshots: state.snapshots.some((s) => s.id === persistedSnapshot.id)
          ? replaceById(state.snapshots, persistedSnapshot)
          : [...state.snapshots, persistedSnapshot],
      }));
    } catch (error) {
      console.error('Khong the tao/cap nhat snapshot checklist hom nay:', error);
      toastWarning('Đã tạo checklist mẫu, nhưng chưa đồng bộ được checklist hôm nay.');
    }
  }, [
    activeStoreId,
    dataStateRef,
    permissions,
    restoreLocalState,
    updateLocalState,
  ]);

  const handleRequestEditCategory = useCallback(async (
    categoryId: string,
  ) => {
    const targetTemplate = dataStateRef.current.templates.find((template) => template.id === categoryId && !template.deletedAt);
    if (!targetTemplate) {
      return null;
    }

    return {
      id: targetTemplate.id,
      title: targetTemplate.title,
      roleCode: targetTemplate.roleCode,
      iconName: targetTemplate.iconName || DEFAULT_CHECKLIST_ICON_NAME,
      colorKey: targetTemplate.colorKey || DEFAULT_CHECKLIST_COLOR_KEY,
      tasks: (targetTemplate.tasks || []).map((task) => ({
        id: task.id,
        title: task.title,
        timeLimit: task.timeLimit,
      })),
    };
  }, [dataStateRef]);

  const handleDeleteChecklistCategory = useCallback(async (
    id: string,
  ) => {
    const err = guardAction(permissions, 'canDelete', null, 'nhom checklist');
    if (err) {
      toastError(err);
      return;
    }

    const deletedFields = softDeleteEntity(currentUser);
    const nowIso = new Date().toISOString();

    const targetTemplate = dataStateRef.current.templates.find((template) => template.id === id && !template.deletedAt);
    if (!targetTemplate) {
      toastError('Khong tim thay template checklist.');
      return;
    }

    // Không delete cả document daily snapshot, chỉ soft-delete các task thuộc template bị xoá
    const updatedSnapshots = dataStateRef.current.snapshots.map((snapshot) => {
      if (normalizeAccessCode(snapshot.roleCode) !== normalizeAccessCode(targetTemplate.roleCode)) {
        return snapshot;
      }
      return {
        ...snapshot,
        tasks: snapshot.tasks.map((task) =>
          task.templateId === id ? { ...task, ...deletedFields } : task
        ),
        updatedAt: nowIso,
      };
    });

    const previousState = updateLocalState((state) => ({
      ...state,
      templates: removeById(state.templates, id),
      snapshots: updatedSnapshots,
    }));

    try {
      // 1. Soft-delete template
      await checklistTemplateService.update(targetTemplate.id, deletedFields);
      
      // 2. Cập nhật các snapshots có chứa tasks của template này
      const activeSnapshotsToUpdate = updatedSnapshots.filter(
        (s) => normalizeAccessCode(s.roleCode) === normalizeAccessCode(targetTemplate.roleCode) && !s.deletedAt
      );
      await Promise.all(
        activeSnapshotsToUpdate.map((snapshot) =>
          checklistService.update(snapshot.id, {
            tasks: snapshot.tasks,
            updatedAt: nowIso,
          })
        )
      );
      
      toastSuccess('Đã xóa nhóm checklist.');
    } catch (error) {
      restoreLocalState(previousState);
      console.error('Khong the xoa nhom checklist:', error);
      toastError('Xoa nhom that bai. Vui long thu lai.');
    }
  }, [
    currentUser,
    dataStateRef,
    permissions,
    restoreLocalState,
    updateLocalState,
  ]);

  const handleConfirmTemplateSync = useCallback(async () => {
    if (!pendingTemplateSync) {
      return;
    }

    const snapshot = dataStateRef.current.snapshots.find((doc) => doc.id === pendingTemplateSync.snapshotId && !doc.deletedAt);
    if (!snapshot) {
      setPendingTemplateSync(null);
      return;
    }

    const nowIso = new Date().toISOString();
    const mergedTasks = mergeTemplateTasksIntoSnapshot({
      snapshot,
      pendingSync: pendingTemplateSync,
      nowIso,
      todayKey: getTodayKey(),
    });
    const updatedSnapshot = {
      ...snapshot,
      tasks: mergedTasks,
      updatedAt: nowIso,
    };
    const previousState = updateLocalState((state) => ({
      ...state,
      snapshots: replaceById(state.snapshots, updatedSnapshot),
    }));

    try {
      await checklistService.update(snapshot.id, {
        tasks: mergedTasks,
        updatedAt: nowIso,
      });
      setPendingTemplateSync(null);
    } catch (error) {
      restoreLocalState(previousState);
      console.error('Khong the dong bo template xuong snapshot hom nay:', error);
      toastError('Dong bo template that bai. Vui long thu lai.');
    }
  }, [
    dataStateRef,
    pendingTemplateSync,
    restoreLocalState,
    updateLocalState,
  ]);

  const handleCancelTemplateSync = useCallback(() => {
    setPendingTemplateSync(null);
  }, []);

  const handleCreateProcess = useCallback(async (payload: {
    title: string;
    description?: string;
    roleCode: string;
    iconName?: string;
    colorKey?: string;
    steps: ProcessStep[];
  }) => {
    const err = guardAction(permissions, 'canCreate', null, 'quy trinh');
    if (err) {
      toastError(err);
      return;
    }
    try {
      const baseEntity = await initBusinessEntity(ENTITY_PREFIX.PROCESS);
      const newProcess: ProcessDocument = {
        ...baseEntity,
        storeId: activeStoreId,
        roleCode: normalizeAccessCode(payload.roleCode),
        title: payload.title.trim(),
        description: payload.description,
        iconName: payload.iconName,
        colorKey: payload.colorKey,
        steps: payload.steps,
      };
      await processService.create(newProcess);
      updateLocalState((state) => ({
        ...state,
        processes: [...state.processes, newProcess],
      }));
      toastSuccess('Đã tạo quy trình.');
    } catch (error) {
      console.error('Khong the tao quy trinh:', error);
      toastError('Khong the tao quy trinh. Vui long thu lai.');
      throw error;
    }
  }, [activeStoreId, permissions, updateLocalState]);

  const handleUpdateProcess = useCallback(async (id: string, updates: Partial<ProcessDocument>) => {
    const err = guardAction(permissions, 'canUpdate', null, 'quy trinh');
    if (err) {
      toastError(err);
      return;
    }
    const nowIso = new Date().toISOString();
    const targetProcess = dataStateRef.current.processes.find((doc) => doc.id === id && !doc.deletedAt);
    if (!targetProcess) {
      toastError('Khong tim thay quy trinh.');
      return;
    }
    const updatedProcess = { ...targetProcess, ...updates, updatedAt: nowIso };
    const previousState = updateLocalState((state) => ({
      ...state,
      processes: replaceById(state.processes, updatedProcess),
    }));
    try {
      await processService.update(id, { ...updates, updatedAt: nowIso });
      toastSuccess('Đã lưu quy trình.');
    } catch (error) {
      restoreLocalState(previousState);
      console.error('Khong the cap nhat quy trinh:', error);
      toastError('Khong the cap nhat quy trinh. Vui long thu lai.');
      throw error;
    }
  }, [dataStateRef, permissions, restoreLocalState, updateLocalState]);

  const handleDeleteProcess = useCallback(async (id: string) => {
    const err = guardAction(permissions, 'canDelete', null, 'quy trinh');
    if (err) {
      toastError(err);
      return;
    }
    const deletedFields = softDeleteEntity(currentUser);
    const previousState = updateLocalState((state) => ({
      ...state,
      processes: removeById(state.processes, id),
    }));
    try {
      await processService.update(id, deletedFields);
    } catch (error) {
      restoreLocalState(previousState);
      console.error('Khong the xoa quy trinh:', error);
      toastError('Xoa quy trinh that bai. Vui long thu lai.');
    }
  }, [currentUser, permissions, restoreLocalState, updateLocalState]);

  return {
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
  };
}
