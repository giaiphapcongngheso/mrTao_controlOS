import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { UserSession } from '../../../stores/app-store';
import type {
  ChecklistItem,
  ChecklistDocument,
  ChecklistTemplateDocument,
  ChecklistTemplateTask,
} from '../../../types/checklist.types';
import type { SystemLogActionType } from '../../../types/system-log.types';
import { ENTITY_PREFIX } from '../../../constants/entity-id.constants';
import {
  checklistService,
  checklistTemplateService,
  createChecklistSnapshotOnce,
  processService,
  softDeleteChecklistTemplateCascade,
} from '../../../services/checklist-service';
import { systemLogService } from '../../../services/system-log-service';
import { toastError, toastSuccess, toastWarning } from '../../../shared/lib/toast';
import { normalizeAccessCode } from '../../../shared/hooks/use-module-permissions';
import { guardAction, initBaseEntity, initBusinessEntity, softDeleteEntity } from '../../../types/base.types';
import { getTodayKey } from '../checklist-utils';
import {
  buildTodaySnapshotFromTemplate,
  findProcessTaskById,
  findSnapshotTaskById,
  mergeTemplateTasksIntoSnapshot,
  normalizeTaskInputs,
  toSnapshotTasks,
  toTemplateTasks,
  type ChecklistCategoryType,
  type ChecklistDataState,
  type PendingTemplateSyncState,
  type SaveCategoryTaskInput,
} from '../checklist-domain';

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

  const handleCreateRoleChecklistBatch = useCallback(async (
    roleCode: string,
    categoryId: string,
    checklistName: string,
    tasksList: Array<{ title: string; timeLimit?: string }>,
  ) => {
    const err = guardAction(permissions, 'canCreate', null, 'cong viec quy trinh');
    if (err) {
      toastError(err);
      return;
    }

    const normalizedRoleCode = normalizeAccessCode(roleCode);
    const safeTitle = checklistName.trim();
    const newTasks = toTemplateTasks(tasksList);
    if (!safeTitle || newTasks.length === 0) {
      return;
    }

    const nowIso = new Date().toISOString();
    const existingDoc = categoryId ? dataStateRef.current.processes.find((doc) => doc.id === categoryId) : null;

    if (existingDoc) {
      const updatedDoc = {
        ...existingDoc,
        tasks: [...(existingDoc.tasks || []), ...newTasks],
        updatedAt: nowIso,
      };
      const previousState = updateLocalState((state) => ({
        ...state,
        processes: replaceById(state.processes, updatedDoc),
      }));

      try {
        await processService.update(existingDoc.id, {
          tasks: updatedDoc.tasks,
          updatedAt: nowIso,
        });
      } catch (error) {
        restoreLocalState(previousState);
        console.error('Khong the luu quy trinh:', error);
        toastError('Khong the luu quy trinh. Vui long thu lai.');
        throw error;
      }
      return;
    }

    const baseEntity = await initBusinessEntity(ENTITY_PREFIX.PROCESS);
    const newProcess = {
      ...baseEntity,
      storeId: activeStoreId,
      roleCode: normalizedRoleCode,
      title: safeTitle,
      tasks: newTasks,
    };
    const previousState = updateLocalState((state) => ({
      ...state,
      processes: [...state.processes, newProcess],
    }));

    try {
      await processService.create(newProcess);
      void appendChecklistLog('CREATE', 'Checklist - Tao quy trinh', `Tao nhom quy trinh "${safeTitle}".`);
    } catch (error) {
      restoreLocalState(previousState);
      console.error('Khong the luu quy trinh:', error);
      toastError('Khong the luu quy trinh. Vui long thu lai.');
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
    let targetSnapshot = dataStateRef.current.snapshots.find(
      (doc) => doc.dateKey === todayKey && (doc.templateId === categoryId || doc.id === categoryId) && !doc.deletedAt,
    );

    if (!targetSnapshot) {
      const template = dataStateRef.current.templates.find((entry) => entry.id === categoryId);
      if (template) {
        targetSnapshot = await createChecklistSnapshotOnce(
          await buildTodaySnapshotFromTemplate(template, activeStoreId, todayKey),
        );
      } else {
        const baseEntity = await initBusinessEntity(ENTITY_PREFIX.CHECKLIST);
        targetSnapshot = await checklistService.create({
          ...baseEntity,
          storeId: activeStoreId,
          roleCode: normalizeAccessCode(roleCode),
          title: safeTitle,
          dateKey: todayKey,
          templateId: null,
          tasks: [],
        });
      }
    }

    const extraTasks = toSnapshotTasks(safeTasks, todayKey);
    const updatedSnapshot = {
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
    await handleCreateRoleChecklistBatch(roleCode, categoryId, checklistName, [{ title: taskTitle }]);
  }, [handleCreateRoleChecklistBatch]);

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

    const processFound = findProcessTaskById(dataStateRef.current.processes, itemId);
    if (processFound) {
      const err = guardAction(permissions, 'canDelete', processFound.doc, `cong viec "${processFound.task.title}"`);
      if (err) {
        toastError(err);
        return;
      }

      const updatedDoc = {
        ...processFound.doc,
        tasks: processFound.doc.tasks.filter((task) => task.id !== itemId),
        updatedAt: new Date().toISOString(),
      };
      const previousState = updateLocalState((state) => ({
        ...state,
        processes: replaceById(state.processes, updatedDoc),
      }));

      try {
        await processService.update(processFound.doc.id, {
          tasks: updatedDoc.tasks,
          updatedAt: updatedDoc.updatedAt,
        });
      } catch (error) {
        restoreLocalState(previousState);
        console.error('Khong the xoa cong viec quy trinh:', error);
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

    const processFound = findProcessTaskById(dataStateRef.current.processes, itemId);
    if (processFound) {
      const err = guardAction(permissions, 'canUpdate', processFound.doc, `cong viec "${processFound.task.title}"`);
      if (err) {
        toastError(err);
        return;
      }

      const updatedDoc = {
        ...processFound.doc,
        updatedAt: new Date().toISOString(),
        tasks: processFound.doc.tasks.map((task) => (
          task.id === itemId
            ? {
              ...task,
              ...(updates.title !== undefined ? { title: safeTitle || task.title } : {}),
              ...(updates.timeLimit !== undefined ? { timeLimit: updates.timeLimit } : {}),
            }
            : task
        )),
      };
      const previousState = updateLocalState((state) => ({
        ...state,
        processes: replaceById(state.processes, updatedDoc),
      }));

      try {
        await processService.update(processFound.doc.id, {
          tasks: updatedDoc.tasks,
          updatedAt: updatedDoc.updatedAt,
        });
      } catch (error) {
        restoreLocalState(previousState);
        console.error('Khong the cap nhat cong viec quy trinh:', error);
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
    categoryType: ChecklistCategoryType;
    id: string | null;
    title: string;
    roleCode: string;
    tasks: SaveCategoryTaskInput[];
  }) => {
    const err = guardAction(
      permissions,
      params.id ? 'canUpdate' : 'canCreate',
      null,
      params.categoryType === 'process' ? 'nhom quy trinh' : 'nhom checklist',
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

    if (params.categoryType === 'process') {
      if (params.id) {
        const targetProcess = dataStateRef.current.processes.find((doc) => doc.id === params.id);
        if (!targetProcess) {
          throw new Error('Khong tim thay nhom quy trinh de cap nhat.');
        }

        const updatedProcess = {
          ...targetProcess,
          title: safeTitle,
          roleCode: normalizedRoleCode,
          tasks: templateTasks,
          updatedAt: nowIso,
        };
        const previousState = updateLocalState((state) => ({
          ...state,
          processes: replaceById(state.processes, updatedProcess),
        }));

        try {
          await processService.update(targetProcess.id, {
            title: safeTitle,
            roleCode: normalizedRoleCode,
            tasks: templateTasks,
            updatedAt: nowIso,
          });
          toastSuccess('Đã lưu quy trình.');
        } catch (error) {
          restoreLocalState(previousState);
          console.error('Khong the luu quy trinh:', error);
          toastError('Khong the luu quy trinh. Vui long thu lai.');
          throw new Error('Khong the luu quy trinh. Vui long thu lai.');
        }
        return;
      }

      try {
        const baseEntity = await initBusinessEntity(ENTITY_PREFIX.PROCESS);
        const persistedProcess = {
          ...baseEntity,
          storeId: activeStoreId,
          roleCode: normalizedRoleCode,
          title: safeTitle,
          tasks: templateTasks,
        };
        await processService.create(persistedProcess);
        updateLocalState((state) => ({
          ...state,
          processes: [...state.processes, persistedProcess],
        }));
        toastSuccess('Đã tạo quy trình.');
      } catch (error) {
        console.error('Khong the luu quy trinh:', error);
        toastError('Khong the luu quy trinh. Vui long thu lai.');
        throw new Error('Khong the luu quy trinh. Vui long thu lai.');
      }
      return;
    }

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
        tasks: templateTasks,
        updatedAt: nowIso,
      };
      const previousState = updateLocalState((state) => ({
        ...state,
        templates: replaceById(state.templates, updatedTemplate),
      }));

      const todaySnapshot = dataStateRef.current.snapshots.find(
        (doc) => doc.templateId === originalTemplate.id && doc.dateKey === todayKey && !doc.deletedAt,
      );
      if (todaySnapshot) {
        setPendingTemplateSync({
          templateId: originalTemplate.id,
          snapshotId: todaySnapshot.id,
          templateTitle: safeTitle,
          snapshotTitle: todaySnapshot.title,
          previousTemplateTaskIds: originalTemplate.tasks.map((task) => task.id),
          updatedTemplateTasks: templateTasks,
        });
      }

      try {
        await checklistTemplateService.update(originalTemplate.id, {
          title: safeTitle,
          roleCode: normalizedRoleCode,
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
        tasks: templateTasks,
      };
      const persistedTemplate = await checklistTemplateService.create(newTemplate);
      updateLocalState((state) => ({
        ...state,
        templates: [...state.templates, persistedTemplate],
      }));
      toastSuccess(
        'Đã tạo checklist.',
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

    try {
      const newSnapshot = await buildTodaySnapshotFromTemplate(newTemplate, activeStoreId, todayKey);
      const persistedSnapshot = await createChecklistSnapshotOnce(newSnapshot);
      updateLocalState((state) => ({
        ...state,
        snapshots: [...state.snapshots, persistedSnapshot],
      }));
    } catch (error) {
      console.error('Khong the tao snapshot checklist hom nay:', error);
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
    categoryType: ChecklistCategoryType,
  ) => {
    if (categoryType === 'process') {
      const targetProcess = dataStateRef.current.processes.find((doc) => doc.id === categoryId && !doc.deletedAt);
      if (!targetProcess) {
        return null;
      }
      return {
        id: targetProcess.id,
        title: targetProcess.title,
        roleCode: targetProcess.roleCode,
        tasks: (targetProcess.tasks || []).map((task) => ({
          id: task.id,
          title: task.title,
          timeLimit: task.timeLimit,
        })),
      };
    }

    const targetTemplate = dataStateRef.current.templates.find((template) => template.id === categoryId && !template.deletedAt);
    if (!targetTemplate) {
      return null;
    }

    return {
      id: targetTemplate.id,
      title: targetTemplate.title,
      roleCode: targetTemplate.roleCode,
      tasks: (targetTemplate.tasks || []).map((task) => ({
        id: task.id,
        title: task.title,
        timeLimit: task.timeLimit,
      })),
    };
  }, [dataStateRef]);

  const handleDeleteChecklistCategory = useCallback(async (
    id: string,
    categoryType: ChecklistCategoryType,
  ) => {
    const err = guardAction(permissions, 'canDelete', null, 'nhom checklist');
    if (err) {
      toastError(err);
      return;
    }

    const deletedFields = softDeleteEntity(currentUser);
    if (categoryType === 'process') {
      const targetProcess = dataStateRef.current.processes.find((doc) => doc.id === id && !doc.deletedAt);
      if (!targetProcess) {
        toastError('Khong tim thay nhom quy trinh.');
        return;
      }

      const previousState = updateLocalState((state) => ({
        ...state,
        processes: removeById(state.processes, id),
      }));
      try {
        await processService.update(targetProcess.id, deletedFields);
      } catch (error) {
        restoreLocalState(previousState);
        console.error('Khong the xoa nhom checklist:', error);
        toastError('Xoa nhom that bai. Vui long thu lai.');
      }
      return;
    }

    const targetTemplate = dataStateRef.current.templates.find((template) => template.id === id && !template.deletedAt);
    if (!targetTemplate) {
      toastError('Khong tim thay template checklist.');
      return;
    }

    const relatedSnapshots = dataStateRef.current.snapshots.filter((doc) => doc.templateId === id && !doc.deletedAt);
    const previousState = updateLocalState((state) => ({
      ...state,
      templates: removeById(state.templates, id),
      snapshots: state.snapshots.filter((snapshot) => snapshot.templateId !== id),
    }));

    try {
      await softDeleteChecklistTemplateCascade(
        targetTemplate.id,
        relatedSnapshots.map((snapshot) => snapshot.id),
        deletedFields,
      );
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
      title: pendingTemplateSync.templateTitle,
      tasks: mergedTasks,
      updatedAt: nowIso,
    };
    const previousState = updateLocalState((state) => ({
      ...state,
      snapshots: replaceById(state.snapshots, updatedSnapshot),
    }));

    try {
      await checklistService.update(snapshot.id, {
        title: pendingTemplateSync.templateTitle,
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

  return {
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
  };
}
