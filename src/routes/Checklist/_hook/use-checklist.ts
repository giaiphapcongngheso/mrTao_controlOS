import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentSnapshot } from 'firebase/firestore';
import type {
  ChecklistCategory,
  ChecklistDocument,
  ChecklistItem,
  ChecklistTask,
  ChecklistTemplateDocument,
  ProcessDocument,
  ProcessStep,
} from '../../../types/checklist.types';
import type { FirestoreFilter } from '../../../shared/services/firestore-pagination';
import type { StaffRole } from '../../../types/staff.types';
import type { UserSession } from '../../../stores/app-store';
import { MODULE_CODE } from '../../../constants/staff-permissions.constants';
import { ENTITY_PREFIX } from '../../../constants/entity-id.constants';
import { roleService } from '../../../services/admin';
import {
  checklistCategoryService,
  checklistService,
  checklistTemplateService,
  createChecklistSnapshotOnce,
  getChecklistsByDateRange,
  processService,
} from '../../../services/checklist-service';

import { toastError, toastSuccess, toastWarning } from '../../../shared/lib/toast';
import { useModulePermissions, normalizeAccessCode } from '../../../shared/hooks/use-module-permissions';
import {
  guardAction,
  initBaseEntity,
  initBusinessEntity,
  softDeleteEntity,
} from '../../../types/base.types';
import {
  buildDailySnapshot,
  deriveChecklistState,
  EMPTY_CHECKLIST_DATA_STATE,
  findSnapshotTaskById,
  generateDailySnapshotId,
  mergeTemplateTasksIntoSnapshot,
  normalizeTaskInputs,
  toSnapshotTasks,
  toTemplateTasks,
  type ChecklistDataState,
  type ChecklistRoleOption,
  type PendingTemplateSyncState,
  type SaveCategoryTaskInput,
} from '../checklist-domain';
import { getTodayKey } from '../checklist-utils';
import {
  DEFAULT_CHECKLIST_COLOR_KEY,
  DEFAULT_CHECKLIST_ICON_NAME,
} from '../checklist-meta';

export const checklistQueryKeys = {
  categories: ['checklist', 'categories'] as const,
  documents: ['checklist', 'documents'] as const,
  documentsPaged: (pageSize: number, storeId: string, roleCode?: string, cursor?: string) =>
    ['checklist', 'documents', 'paged', { pageSize, storeId, roleCode, cursor }] as const,
};

export function useChecklistCategoriesQuery() {
  return useQuery({
    queryKey: checklistQueryKeys.categories,
    queryFn: checklistCategoryService.getAll,
  });
}

export function useChecklistDocumentsQuery() {
  return useQuery({
    queryKey: checklistQueryKeys.documents,
    queryFn: checklistService.getAll,
  });
}

export function useChecklistProcessCategoriesQuery() {
  return useQuery({
    queryKey: ['checklist', 'documents', 'process'] as const,
    queryFn: processService.getAll,
  });
}

export function useChecklistDocumentsPagedQuery(
  pageSize: number,
  storeId: string,
  options?: {
    roleCode?: string;
    lastDoc?: DocumentSnapshot | null;
    enabled?: boolean;
  },
) {
  const filters: FirestoreFilter[] = [
    { field: 'storeId', op: '==', value: storeId },
    { field: 'deletedAt', op: '==', value: null },
  ];

  if (options?.roleCode) {
    filters.push({ field: 'roleCode', op: '==', value: options.roleCode });
  }

  return useQuery({
    queryKey: checklistQueryKeys.documentsPaged(
      pageSize,
      storeId,
      options?.roleCode,
      options?.lastDoc?.id,
    ),
    queryFn: () => checklistService.getPaged({
      pageSize,
      filters,
      orderByField: 'updatedAt',
      orderDirection: 'desc',
      lastDoc: options?.lastDoc,
    }),
    enabled: options?.enabled ?? true,
  });
}

function useInvalidateChecklistQueries() {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: checklistQueryKeys.categories }),
      queryClient.invalidateQueries({ queryKey: checklistQueryKeys.documents }),
    ]);
}

export function useCreateChecklistCategoryMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: (payload: Partial<ChecklistCategory>) => checklistCategoryService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateChecklistCategoryMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ChecklistCategory> }) =>
      checklistCategoryService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteChecklistCategoryMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: (id: string) => checklistCategoryService.delete(id),
    onSuccess: invalidate,
  });
}

export function useCreateChecklistDocMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: (payload: Partial<ChecklistDocument>) => checklistService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateChecklistDocMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ChecklistDocument> }) =>
      checklistService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteChecklistDocMutation() {
  const invalidate = useInvalidateChecklistQueries();
  return useMutation({
    mutationFn: (id: string) => checklistService.delete(id),
    onSuccess: invalidate,
  });
}

type UseChecklistParams = {
  currentUser: UserSession;
  isOwner: boolean;
  activeStoreId: string;
  onMetricsChange?: (payload: { items: ChecklistItem[]; checklistCompletion: number }) => void;
};

function replaceById<T extends { id: string }>(items: T[], nextItem: T): T[] {
  return items.map((item) => (item.id === nextItem.id ? nextItem : item));
}

function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}

export function useChecklist({
  currentUser,
  isOwner,
  activeStoreId,
  onMetricsChange,
}: UseChecklistParams) {
  const currentRoleCode = normalizeAccessCode(currentUser?.roleCode || currentUser?.role || 'SALES');
  const { permissions } = useModulePermissions(MODULE_CODE.CHECKLIST, currentUser, isOwner);

  const [dataState, setDataState] = useState<ChecklistDataState>(EMPTY_CHECKLIST_DATA_STATE);
  const [roleOptions, setRoleOptions] = useState<ChecklistRoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historySnapshots, setHistorySnapshots] = useState<ChecklistDocument[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingTemplateSync, setPendingTemplateSync] = useState<PendingTemplateSyncState | null>(null);
  const dataStateRef = useRef(dataState);

  useEffect(() => {
    dataStateRef.current = dataState;
  }, [dataState]);

  const filterState = useCallback((state: ChecklistDataState): ChecklistDataState => ({
    templates: state.templates.filter((template) =>
      template.storeId === activeStoreId &&
      !template.deletedAt,
    ),
    snapshots: state.snapshots.filter((snapshot) =>
      snapshot.storeId === activeStoreId &&
      !snapshot.deletedAt,
    ),
    processes: state.processes.filter((processDoc) =>
      processDoc.storeId === activeStoreId &&
      !processDoc.deletedAt,
    ),
  }), [activeStoreId]);

  const replaceLocalState = useCallback((nextState: ChecklistDataState) => {
    dataStateRef.current = nextState;
    setDataState(nextState);
  }, []);

  const updateLocalState = useCallback((updater: (state: ChecklistDataState) => ChecklistDataState) => {
    const previousState = dataStateRef.current;
    const nextState = updater(previousState);
    replaceLocalState(nextState);
    return previousState;
  }, [replaceLocalState]);

  const restoreLocalState = useCallback((previousState: ChecklistDataState) => {
    replaceLocalState(previousState);
  }, [replaceLocalState]);

  const derivedState = useMemo(() => deriveChecklistState(dataState), [dataState]);

  useEffect(() => {
    const currentRoleTodayItems = derivedState.todayItems.filter(
      (item) => normalizeAccessCode(item.roleCode) === currentRoleCode,
    );
    const completedCount = currentRoleTodayItems.filter((item) => item.isCompleted).length;
    const checklistCompletion = currentRoleTodayItems.length > 0
      ? Math.round((completedCount / currentRoleTodayItems.length) * 100)
      : 0;

    onMetricsChange?.({
      items: currentRoleTodayItems,
      checklistCompletion,
    });
  }, [currentRoleCode, derivedState.todayItems, onMetricsChange]);

  const ensureMissingSnapshotsInBackground = useCallback((
    filteredState: ChecklistDataState,
    todayKey: string,
  ) => {
    const getDayOfWeekIndex = (dateStr: string) => {
      const date = new Date(dateStr);
      const day = date.getDay(); // 0: CN, 1: T2, ..., 6: T7
      return String(day);
    };
    const currentDayOfWeekStr = getDayOfWeekIndex(todayKey);

    const currentRoleTemplates = filteredState.templates.filter((template) => {
      if (normalizeAccessCode(template.roleCode) !== currentRoleCode) {
        return false;
      }
      if (template.status === 'hidden') {
        return false;
      }
      if (template.autoCreateDaily === false) {
        return false;
      }
      if (template.frequency === 'weekly' && template.frequencyDetail) {
        if (template.frequencyDetail !== currentDayOfWeekStr) {
          return false;
        }
      }
      if (template.frequency === 'monthly' && template.frequencyDetail) {
        const dayOfMonth = String(new Date(todayKey).getDate());
        if (template.frequencyDetail !== dayOfMonth) {
          return false;
        }
      }
      return true;
    });
    const currentRoleSnapshots = filteredState.snapshots.filter(
      (snapshot) => normalizeAccessCode(snapshot.roleCode) === currentRoleCode,
    );

    if (currentRoleTemplates.length === 0) {
      return;
    }

    const dailySnapshotId = generateDailySnapshotId(todayKey, currentRoleCode);
    const existingSnapshot = currentRoleSnapshots.find(
      (snapshot) => snapshot.id === dailySnapshotId && snapshot.dateKey === todayKey && !snapshot.deletedAt,
    );

    let updatedSnapshot: ChecklistDocument;
    let shouldCreateSnapshot = false;

    if (!existingSnapshot) {
      updatedSnapshot = buildDailySnapshot(
        currentRoleTemplates,
        activeStoreId,
        currentRoleCode,
        todayKey,
      );
      shouldCreateSnapshot = true;
    } else {
      const existingTemplateIdsInSnapshot = new Set(
        existingSnapshot.tasks
          .map((task) => task.templateId)
          .filter((id): id is string => Boolean(id)),
      );

      const missingTemplates = currentRoleTemplates.filter(
        (template) => !existingTemplateIdsInSnapshot.has(template.id),
      );

      if (missingTemplates.length === 0) {
        return;
      }

      const nowIso = new Date().toISOString();
      const newTasks: ChecklistTask[] = missingTemplates.flatMap((template) =>
        template.tasks.map((task) => ({
          ...initBaseEntity('t', task.id),
          title: task.title,
          timeLimit: task.timeLimit,
          isCompleted: false,
          dateKey: todayKey,
          templateId: template.id,
          checkedAt: null,
          checkedByName: null,
          checkedByUsername: null,
          isRequired: task.isRequired,
          evidenceRequired: template.evidenceRequired,
        })),
      );

      updatedSnapshot = {
        ...existingSnapshot,
        tasks: [...existingSnapshot.tasks, ...newTasks],
        updatedAt: nowIso,
      };
    }

    const persistSnapshot = shouldCreateSnapshot
      ? createChecklistSnapshotOnce(updatedSnapshot)
      : checklistService.update(updatedSnapshot.id, {
        tasks: updatedSnapshot.tasks,
        updatedAt: updatedSnapshot.updatedAt,
      });

    void persistSnapshot.then((persistedSnapshot) => {
      const nextSnapshot = shouldCreateSnapshot ? persistedSnapshot : updatedSnapshot;
      if (!nextSnapshot || nextSnapshot.deletedAt) {
        return;
      }

      const currentState = dataStateRef.current;
      const snapshotsById = new Map(
        currentState.snapshots.map((snapshot) => [snapshot.id, snapshot] as const),
      );
      snapshotsById.set(nextSnapshot.id, nextSnapshot);

      replaceLocalState({
        ...currentState,
        snapshots: Array.from(snapshotsById.values()),
      });
    }).catch((error) => {
      console.error('Không thể đồng bộ snapshot checklist trong nền:', error);
    });
  }, [activeStoreId, currentRoleCode, replaceLocalState]);

  const fetchHistoryByDateRange = useCallback(async (from: string, to: string, roleCode: string) => {
    setHistoryLoading(true);
    try {
      const normalizedRoleCode = normalizeAccessCode(roleCode || currentRoleCode);
      const snapshots = await getChecklistsByDateRange(activeStoreId, normalizedRoleCode, from, to);
      setHistorySnapshots(snapshots || []);
    } catch (error) {
      console.error('Không thể tải lịch sử checklist:', error);
      toastError('Không thể tải lịch sử checklist.');
    } finally {
      setHistoryLoading(false);
    }
  }, [activeStoreId, currentRoleCode]);

  const refreshChecklistData = useCallback(async () => {
    setIsLoading(true);
    const todayKey = getTodayKey();
    try {
      const [allTemplates, allSnapshots, allProcesses] = await Promise.all([
        checklistTemplateService.getAll(),
        checklistService.getAll(),
        processService.getAll(),
      ]);
      const filteredState = filterState({
        templates: allTemplates || [],
        snapshots: allSnapshots || [],
        processes: allProcesses || [],
      });

      replaceLocalState(filteredState);
      setIsLoading(false);

      ensureMissingSnapshotsInBackground(filteredState, todayKey);
    } catch (error) {
      console.error('Không thể refresh dữ liệu checklist:', error);
      setIsLoading(false);
    }
  }, [ensureMissingSnapshotsInBackground, filterState, replaceLocalState]);

  useEffect(() => {
    let cancelled = false;
    const fallbackRole: ChecklistRoleOption = {
      code: currentRoleCode || 'SALES',
      name: currentUser.role || currentRoleCode || 'Nhân sự',
    };

    const loadRoleOptions = async () => {
      try {
        const roles = await roleService.getAll();
        if (cancelled) return;

        const normalizedRoles = (roles || [])
          .filter((role: StaffRole) => role?.status !== 'inactive')
          .map((role: StaffRole) => ({
            code: normalizeAccessCode(role.code),
            name: role.name,
          }))
          .filter((role) => role.code);

        const roleMap = new Map<string, ChecklistRoleOption>();
        normalizedRoles.forEach((role) => roleMap.set(role.code, role));
        if (!roleMap.has(fallbackRole.code)) {
          roleMap.set(fallbackRole.code, fallbackRole);
        }
        setRoleOptions(Array.from(roleMap.values()));
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải danh sách vai trò checklist:', error);
          setRoleOptions([fallbackRole]);
          toastError('Không thể tải vai trò checklist. Vui lòng kiểm tra quyền truy cập.');
        }
      }
    };

    void loadRoleOptions();
    return () => {
      cancelled = true;
    };
  }, [currentRoleCode, currentUser.role]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await refreshChecklistData();
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải checklist:', error);
          toastError('Không thể tải checklist. Vui lòng kiểm tra quyền truy cập hoặc kết nối mạng.');
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [refreshChecklistData]);



  const handleToggleChecklistItem = useCallback(async (itemId: string, dateKey?: string) => {
    const found = findSnapshotTaskById(dataStateRef.current.snapshots, itemId, dateKey);
    if (!found) {
      toastError(`Không tìm thấy công việc với ID: ${itemId}`);
      return;
    }

    const { doc: targetDoc, task: targetTask } = found;
    const nextCompleted = !targetTask.isCompleted;

    if (nextCompleted && targetTask.evidenceRequired === 'required') {
      const imagesCount = (targetTask.imageUrls || []).length;
      if (imagesCount === 0) {
        toastError(`Bắt buộc phải tải ảnh minh chứng trước khi hoàn thành đầu việc "${targetTask.title}"!`);
        const event = new CustomEvent('open-checklist-item-detail', { detail: targetTask });
        window.dispatchEvent(event);
        return;
      }
    }

    const err = guardAction(permissions, 'canUpdate', targetTask, `công việc "${targetTask.title}"`);
    if (err) {
      toastError(err);
      return;
    }

    const nowIso = new Date().toISOString();
    const checkerName = currentUser?.fullName || currentUser?.username || 'Hệ thống';
    const checkerUsername = currentUser?.username || 'system';
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

    const previousState = updateLocalState((state) => ({
      ...state,
      snapshots: replaceById(state.snapshots, updatedDoc),
    }));

    try {
      await checklistService.update(
        targetDoc.id,
        {
          tasks: updatedDoc.tasks,
          updatedAt: nowIso,
        },
        {
          logDetails: `${nextCompleted ? 'Hoàn thành' : 'Bỏ hoàn thành'} công việc "${targetTask.title}".`,
        }
      );
    } catch (error) {
      restoreLocalState(previousState);
      console.error('Không thể cập nhật trạng thái checklist:', error);
      toastError('Cập nhật trạng thái checklist thất bại. Vui lòng thử lại.');
    }
  }, [
    currentUser,
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
    const err = guardAction(permissions, 'canCreate', null, 'công việc checklist');
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
      (doc) => doc.id === dailySnapshotId && doc.dateKey === todayKey && !doc.deletedAt,
    );

    if (!targetSnapshot) {
      const roleTemplates = dataStateRef.current.templates.filter(
        (entry) => normalizeAccessCode(entry.roleCode) === normalizedRole && !entry.deletedAt,
      );
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
      await checklistService.update(
        updatedSnapshot.id,
        {
          tasks: updatedSnapshot.tasks,
          updatedAt: nowIso,
        },
        {
          logDetails: `Cập nhật nhóm "${safeTitle}" hôm nay (Thêm công việc phát sinh).`,
        }
      );
    } catch (error) {
      restoreLocalState(previousState);
      console.error('Không thể thêm công việc checklist hôm nay:', error);
      toastError('Không thể thêm công việc mới. Vui lòng thử lại.');
      throw error;
    }
  }, [
    activeStoreId,
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

  const handleDeleteChecklistItem = useCallback(async (itemId: string, dateKey?: string) => {
    const snapshotFound = findSnapshotTaskById(dataStateRef.current.snapshots, itemId, dateKey);
    if (snapshotFound) {
      const err = guardAction(permissions, 'canDelete', snapshotFound.task, `công việc "${snapshotFound.task.title}"`);
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
        await checklistService.update(
          snapshotFound.doc.id,
          {
            tasks: updatedDoc.tasks,
            updatedAt: nowIso,
          },
          {
            logDetails: `Xóa công việc "${snapshotFound.task.title}".`,
          }
        );
      } catch (error) {
        restoreLocalState(previousState);
        console.error('Không thể xóa công việc checklist:', error);
        toastError('Xóa công việc thất bại. Vui lòng thử lại.');
        throw error;
      }
      return;
    }

    toastError(`Không tìm thấy công việc với ID: ${itemId}`);
  }, [
    currentUser,
    permissions,
    restoreLocalState,
    updateLocalState,
  ]);

  const handleUpdateChecklistItem = useCallback(async (itemId: string, updates: Partial<ChecklistItem>, dateKey?: string) => {
    const safeTitle = updates.title?.trim();
    if (updates.title !== undefined && !safeTitle) {
      return;
    }

    const snapshotFound = findSnapshotTaskById(dataStateRef.current.snapshots, itemId, dateKey);
    if (snapshotFound) {
      const err = guardAction(permissions, 'canUpdate', snapshotFound.task, `công việc "${snapshotFound.task.title}"`);
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
        console.error('Không thể cập nhật checklist item:', error);
        toastError('Cập nhật công việc thất bại. Vui lòng thử lại.');
        throw error;
      }
      return;
    }

    toastError(`Không tìm thấy công việc với ID: ${itemId}.`);
  }, [
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
    frequency?: string;
    frequencyDetail?: string;
    shift?: string;
    autoCreateDaily?: boolean;
    evidenceRequired?: string;
    status?: string;
    defaultAssignee?: string;
    inspectorId?: string;
    inspectorName?: string;
  }) => {
    const err = guardAction(
      permissions,
      params.id ? 'canUpdate' : 'canCreate',
      null,
      'nhóm checklist',
    );
    if (err) {
      throw new Error(err);
    }

    const normalizedRoleCode = normalizeAccessCode(params.roleCode);
    const roleName = roleOptions.find((r) => r.code === normalizedRoleCode)?.name || normalizedRoleCode;
    const safeTitle = (params.title || roleName).trim();
    const templateTasks = toTemplateTasks(params.tasks);
    if (!safeTitle || templateTasks.length === 0) {
      throw new Error('Checklist mẫu phải có tối thiểu 1 công việc.');
    }

    const nowIso = new Date().toISOString();
    const todayKey = getTodayKey();
    if (params.id) {
      const originalTemplate = dataStateRef.current.templates.find((template) => template.id === params.id);
      if (!originalTemplate) {
        throw new Error('Không tìm thấy template checklist để cập nhật.');
      }

      const updatedTemplate: ChecklistTemplateDocument = {
        ...originalTemplate,
        title: safeTitle,
        roleCode: normalizedRoleCode,
        iconName: params.iconName || DEFAULT_CHECKLIST_ICON_NAME,
        colorKey: params.colorKey || DEFAULT_CHECKLIST_COLOR_KEY,
        tasks: templateTasks,
        updatedAt: nowIso,
        frequency: params.frequency,
        frequencyDetail: params.frequencyDetail,
        shift: params.shift,
        autoCreateDaily: params.autoCreateDaily,
        evidenceRequired: params.evidenceRequired,
        status: params.status,
        defaultAssignee: params.defaultAssignee,
        inspectorId: params.inspectorId,
        inspectorName: params.inspectorName,
      };
      const previousState = updateLocalState((state) => ({
        ...state,
        templates: replaceById(state.templates, updatedTemplate),
      }));

      const dailySnapshotId = generateDailySnapshotId(todayKey, normalizedRoleCode);
      const todaySnapshot = dataStateRef.current.snapshots.find(
        (doc) => doc.id === dailySnapshotId && doc.dateKey === todayKey && !doc.deletedAt,
      );
      if (todaySnapshot) {
        setPendingTemplateSync({
          templateId: originalTemplate.id,
          snapshotId: todaySnapshot.id,
          templateTitle: safeTitle,
          snapshotTitle: todayKey,
          previousTemplateTaskIds: originalTemplate.tasks.map((task) => task.id),
          updatedTemplateTasks: templateTasks,
          evidenceRequired: params.evidenceRequired,
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
          frequency: params.frequency,
          frequencyDetail: params.frequencyDetail,
          shift: params.shift,
          autoCreateDaily: params.autoCreateDaily,
          evidenceRequired: params.evidenceRequired,
          status: params.status,
          defaultAssignee: params.defaultAssignee,
          inspectorId: params.inspectorId,
          inspectorName: params.inspectorName,
        });
        toastSuccess('Đã lưu checklist.');
      } catch (error) {
        restoreLocalState(previousState);
        setPendingTemplateSync(null);
        console.error('Không thể lưu template checklist:', error);
        toastError('Không thể lưu checklist. Vui lòng thử lại.');
        throw new Error('Không thể lưu checklist. Vui lòng thử lại.');
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
        frequency: params.frequency,
        frequencyDetail: params.frequencyDetail,
        shift: params.shift,
        autoCreateDaily: params.autoCreateDaily,
        evidenceRequired: params.evidenceRequired,
        status: params.status,
        defaultAssignee: params.defaultAssignee,
        inspectorId: params.inspectorId,
        inspectorName: params.inspectorName,
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
      console.error('Không thể lưu checklist:', error);
      toastError('Không thể lưu checklist. Vui lòng thử lại.');
      throw new Error('Không thể lưu checklist. Vui lòng thử lại.');
    }

    if (!newTemplate) {
      return;
    }

    try {
      const dailySnapshotId = generateDailySnapshotId(todayKey, normalizedRoleCode);
      const existingSnapshot = dataStateRef.current.snapshots.find(
        (s) => s.id === dailySnapshotId && s.dateKey === todayKey && !s.deletedAt,
      );

      let updatedSnapshot: ChecklistDocument;
      let shouldCreateSnapshot = false;
      if (existingSnapshot) {
        const extraTasks = toSnapshotTasks(params.tasks, newTemplate.id, todayKey, params.evidenceRequired);
        updatedSnapshot = {
          ...existingSnapshot,
          tasks: [...existingSnapshot.tasks, ...extraTasks],
          updatedAt: nowIso,
        };
      } else {
        const currentDayOfWeekStr = String(new Date(todayKey).getDay());
        let matchesFrequency = true;
        if (newTemplate.status === 'hidden' || newTemplate.autoCreateDaily === false) {
          matchesFrequency = false;
        } else if (newTemplate.frequency === 'weekly' && newTemplate.frequencyDetail) {
          matchesFrequency = newTemplate.frequencyDetail === currentDayOfWeekStr;
        } else if (newTemplate.frequency === 'monthly' && newTemplate.frequencyDetail) {
          matchesFrequency = newTemplate.frequencyDetail === String(new Date(todayKey).getDate());
        }

        if (matchesFrequency) {
          updatedSnapshot = buildDailySnapshot([newTemplate], activeStoreId, normalizedRoleCode, todayKey);
          shouldCreateSnapshot = true;
        } else {
          return;
        }
      }

      const persistedSnapshot = shouldCreateSnapshot
        ? await createChecklistSnapshotOnce(updatedSnapshot)
        : await checklistService.update(updatedSnapshot.id, {
          tasks: updatedSnapshot.tasks,
          updatedAt: updatedSnapshot.updatedAt,
        });
      const nextSnapshot = shouldCreateSnapshot ? persistedSnapshot : updatedSnapshot;
      updateLocalState((state) => ({
        ...state,
        snapshots: state.snapshots.some((s) => s.id === nextSnapshot.id)
          ? replaceById(state.snapshots, nextSnapshot)
          : [...state.snapshots, nextSnapshot],
      }));
    } catch (error) {
      console.error('Không thể tạo/cập nhật snapshot checklist hôm nay:', error);
      toastWarning('Đã tạo checklist mẫu, nhưng chưa đồng bộ được checklist hôm nay.');
    }
  }, [
    activeStoreId,
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
      title: targetTemplate.title || '',
      roleCode: targetTemplate.roleCode,
      iconName: targetTemplate.iconName || DEFAULT_CHECKLIST_ICON_NAME,
      colorKey: targetTemplate.colorKey || DEFAULT_CHECKLIST_COLOR_KEY,
      tasks: (targetTemplate.tasks || []).map((task) => ({
        id: task.id,
        title: task.title,
        timeLimit: task.timeLimit,
        isRequired: task.isRequired,
      })),
      frequency: targetTemplate.frequency,
      frequencyDetail: targetTemplate.frequencyDetail,
      shift: targetTemplate.shift,
      autoCreateDaily: targetTemplate.autoCreateDaily,
      evidenceRequired: targetTemplate.evidenceRequired,
      status: targetTemplate.status,
      defaultAssignee: targetTemplate.defaultAssignee,
      inspectorId: targetTemplate.inspectorId,
      inspectorName: targetTemplate.inspectorName,
    };
  }, []);

  const handleDeleteChecklistCategory = useCallback(async (
    id: string,
  ) => {
    const err = guardAction(permissions, 'canDelete', null, 'nhóm checklist');
    if (err) {
      toastError(err);
      return;
    }

    const deletedFields = softDeleteEntity(currentUser);
    const nowIso = new Date().toISOString();

    const targetTemplate = dataStateRef.current.templates.find((template) => template.id === id && !template.deletedAt);
    if (!targetTemplate) {
      toastError('Không tìm thấy template checklist.');
      return;
    }

    const updatedSnapshots = dataStateRef.current.snapshots.map((snapshot) => {
      if (normalizeAccessCode(snapshot.roleCode) !== normalizeAccessCode(targetTemplate.roleCode)) {
        return snapshot;
      }
      return {
        ...snapshot,
        tasks: snapshot.tasks.map((task) =>
          task.templateId === id ? { ...task, ...deletedFields } : task,
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
      await checklistTemplateService.update(targetTemplate.id, deletedFields);

      const activeSnapshotsToUpdate = updatedSnapshots.filter(
        (s) => normalizeAccessCode(s.roleCode) === normalizeAccessCode(targetTemplate.roleCode) && !s.deletedAt,
      );
      await Promise.all(
        activeSnapshotsToUpdate.map((snapshot) =>
          checklistService.update(snapshot.id, {
            tasks: snapshot.tasks,
            updatedAt: nowIso,
          }),
        ),
      );

      toastSuccess('Đã xóa nhóm checklist.');
    } catch (error) {
      restoreLocalState(previousState);
      console.error('Không thể xóa nhóm checklist:', error);
      toastError('Xóa nhóm thất bại. Vui lòng thử lại.');
    }
  }, [
    currentUser,
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
      evidenceRequired: pendingTemplateSync.evidenceRequired,
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
      console.error('Không thể đồng bộ template xuống snapshot hôm nay:', error);
      toastError('Đồng bộ template thất bại. Vui lòng thử lại.');
    }
  }, [
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
    objective?: string;
    whenToUse?: string;
    responsibleRole?: string;
    mandatoryControls?: string[];
    attachments?: Array<{ name: string; url: string; type: 'pdf' | 'excel' | 'word' | 'other' }>;
    status?: string;
  }) => {
    const err = guardAction(permissions, 'canCreate', null, 'quy trình');
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
        objective: payload.objective,
        whenToUse: payload.whenToUse,
        responsibleRole: payload.responsibleRole,
        mandatoryControls: payload.mandatoryControls,
        attachments: payload.attachments,
        status: payload.status || 'active',
      };
      await processService.create(newProcess);
      updateLocalState((state) => ({
        ...state,
        processes: [...state.processes, newProcess],
      }));
      toastSuccess('Đã tạo quy trình.');
    } catch (error) {
      console.error('Không thể tạo quy trình:', error);
      toastError('Không thể tạo quy trình. Vui lòng thử lại.');
      throw error;
    }
  }, [activeStoreId, permissions, updateLocalState]);

  const handleUpdateProcess = useCallback(async (id: string, updates: Partial<ProcessDocument>) => {
    const err = guardAction(permissions, 'canUpdate', null, 'quy trình');
    if (err) {
      toastError(err);
      return;
    }
    const nowIso = new Date().toISOString();
    const targetProcess = dataStateRef.current.processes.find((doc) => doc.id === id && !doc.deletedAt);
    if (!targetProcess) {
      toastError('Không tìm thấy quy trình.');
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
      console.error('Không thể cập nhật quy trình:', error);
      toastError('Không thể cập nhật quy trình. Vui lòng thử lại.');
      throw error;
    }
  }, [permissions, restoreLocalState, updateLocalState]);

  const handleDeleteProcess = useCallback(async (id: string) => {
    const err = guardAction(permissions, 'canDelete', null, 'quy trình');
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
      console.error('Không thể xóa quy trình:', error);
      toastError('Xóa quy trình thất bại. Vui lòng thử lại.');
    }
  }, [currentUser, permissions, restoreLocalState, updateLocalState]);

  return {
    currentRoleCode,
    permissions,
    roleOptions,
    isLoading,
    templates: dataState.templates,
    derivedState,
    historySnapshots,
    historyLoading,
    pendingTemplateSync,
    refreshChecklistData,
    fetchHistoryByDateRange,
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
