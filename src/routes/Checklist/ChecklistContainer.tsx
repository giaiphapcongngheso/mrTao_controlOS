import React, { useCallback, useEffect, useState } from 'react';
import ChecklistView from './ChecklistView';
import type { ChecklistCategory, ChecklistDocument, ChecklistItem, ChecklistTask } from '../../types/checklist.types';
import type { StaffRole } from '../../types/staff.types';
import type { UserSession } from '../../stores/app-store';
import type { SystemLogActionType } from '../../types/system-log.types';
import { DEFAULT_STORE_ID } from '../../data';
import { MODULE_CODE } from '../../constants/staff-permissions.constants';
import { roleService, staffPermissionService } from '../../services/admin';
import { checklistService } from '../../services/checklist-service';
import { systemLogService } from '../../services/system-log-service';
import { getTodayKey } from './checklist.utils';
import { toastError } from '../../shared/lib/toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ChecklistRoleOption {
  code: string;
  name: string;
}

interface ChecklistContainerProps {
  currentUser: UserSession;
  isOwner: boolean;
  activeStoreId: string;
  onMetricsChange?: (payload: { items: ChecklistItem[]; checklistCompletion: number }) => void;
}

function normalizeAccessCode(value?: string | null): string {
  return (value || '').trim().toUpperCase();
}

/** Generate a short unique ID for embedded tasks */
function generateTaskId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Flatten a ChecklistDocument into ChecklistItem[] for the view layer.
 * Each task inherits storeId, categoryId (doc.id), roleCode, checklistName from parent.
 */
function flattenDocToItems(doc: ChecklistDocument): ChecklistItem[] {
  return (doc.tasks || []).map((task) => ({
    id: task.id,
    storeId: doc.storeId,
    categoryId: doc.id,
    title: task.title,
    isCompleted: task.isCompleted,
    timeLimit: task.timeLimit,
    roleCode: doc.roleCode,
    dateKey: task.dateKey,
    checklistName: doc.title,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    checkedAt: task.checkedAt,
    checkedByName: task.checkedByName,
    checkedByUsername: task.checkedByUsername,
  }));
}

/**
 * Derive a ChecklistCategory from a document + its flattened items count.
 */
function docToCategory(doc: ChecklistDocument, items: ChecklistItem[]): ChecklistCategory {
  const catItems = items.filter((it) => it.categoryId === doc.id);
  const doneCount = catItems.filter((it) => it.isCompleted).length;
  return {
    id: doc.id,
    storeId: doc.storeId,
    title: doc.title,
    countDone: doneCount,
    countTotal: catItems.length,
    isCompleted: catItems.length > 0 && doneCount === catItems.length,
    categoryType: doc.categoryType,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChecklistContainer({
  currentUser,
  isOwner,
  activeStoreId,
  onMetricsChange,
}: ChecklistContainerProps) {
  // Core state: raw documents from Firestore
  const [checklistDocs, setChecklistDocs] = useState<ChecklistDocument[]>([]);
  // Derived state for the view layer
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [todayChecklistCategories, setTodayChecklistCategories] = useState<ChecklistCategory[]>([]);
  const [processChecklistCategories, setProcessChecklistCategories] = useState<ChecklistCategory[]>([]);
  const [checklistRoleOptions, setChecklistRoleOptions] = useState<ChecklistRoleOption[]>([]);
  const [checklistPermissions, setChecklistPermissions] = useState({
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  });

  const currentChecklistRoleCode = normalizeAccessCode(currentUser?.roleCode || currentUser?.role || 'SALES');

  // ─── Derived state recalculation ──────────────────────────────────────────

  const recalculateDerivedState = useCallback((docs: ChecklistDocument[]) => {
    const roleDocs = docs.filter(
      (doc) =>
        doc.storeId === activeStoreId &&
        normalizeAccessCode(doc.roleCode) === currentChecklistRoleCode,
    );

    // Flatten all tasks from role docs into items
    const allItems = roleDocs.flatMap(flattenDocToItems);

    // Split docs by type
    const todayDocs = roleDocs.filter((d) => d.categoryType === 'today');
    const processDocs = roleDocs.filter((d) => d.categoryType === 'process');

    // Build categories with counts
    const todayCats = todayDocs.map((d) => docToCategory(d, allItems));
    const processCats = processDocs.map((d) => docToCategory(d, allItems));

    // For today tab items: filter by today's dateKey
    const todayKey = getTodayKey();
    const todayItems = allItems.filter(
      (item) => item.dateKey === todayKey,
    );

    setChecklistItems(todayItems);
    setTodayChecklistCategories(todayCats);
    setProcessChecklistCategories(processCats);

    // Metrics
    const totalDone = todayItems.filter((it) => it.isCompleted).length;
    const totalCount = todayItems.length;
    const overallRatio = totalCount > 0 ? Math.round((totalDone / totalCount) * 100) : 0;
    onMetricsChange?.({
      items: todayItems,
      checklistCompletion: Math.min(overallRatio, 100),
    });
  }, [activeStoreId, currentChecklistRoleCode, onMetricsChange]);

  // ─── Logging helper ───────────────────────────────────────────────────────

  const appendChecklistLog = useCallback(async (
    actionType: SystemLogActionType,
    target: string,
    details: string,
  ) => {
    const actorName = currentUser?.fullName || currentUser?.username || 'Hệ thống';
    const actorRole = currentUser?.role || currentChecklistRoleCode;

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
      console.error('Không thể ghi log checklist:', error);
    }
  }, [currentUser, activeStoreId, currentChecklistRoleCode]);

  // ─── Load Permissions ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const loadChecklistPermissions = async () => {
      try {
        const allPermissions = await staffPermissionService.getAll();
        if (cancelled) {
          return;
        }

        if (isOwner) {
          setChecklistPermissions({ canCreate: true, canUpdate: true, canDelete: true });
          return;
        }

        const roleCode = normalizeAccessCode(currentUser.roleCode);
        const checklistPermRow = allPermissions.find(
          (permission) =>
            normalizeAccessCode(permission.roleCode) === roleCode &&
            normalizeAccessCode(permission.module) === MODULE_CODE.CHECKLIST,
        );

        setChecklistPermissions({
          canCreate: !!checklistPermRow?.canCreate,
          canUpdate: !!checklistPermRow?.canUpdate,
          canDelete: !!checklistPermRow?.canDelete,
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải quyền checklist:', error);
          setChecklistPermissions({ canCreate: false, canUpdate: false, canDelete: false });
        }
      }
    };

    void loadChecklistPermissions();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.roleCode, currentUser?.username, isOwner]);

  // ─── Load Role Options ────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const fallbackRole: ChecklistRoleOption = {
      code: currentChecklistRoleCode || 'SALES',
      name: currentUser.role || currentChecklistRoleCode || 'Nhân sự',
    };

    const loadRoleOptions = async () => {
      try {
        const roles = await roleService.getAll();
        if (cancelled) {
          return;
        }

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

        setChecklistRoleOptions(Array.from(roleMap.values()));
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải danh sách vai trò checklist:', error);
          setChecklistRoleOptions([fallbackRole]);
          toastError('Không thể tải vai trò checklist. Vui lòng kiểm tra quyền truy cập.');
        }
      }
    };

    void loadRoleOptions();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.role, currentChecklistRoleCode]);

  // ─── Load Checklist Data (single query!) ──────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const loadChecklists = async () => {
      try {
        const allDocs = await checklistService.getAll();
        if (cancelled) {
          return;
        }

        // Filter by store
        const storeDocs = (allDocs || []).filter((doc) => doc.storeId === activeStoreId);

        // Initialize today tasks for process docs that haven't been initialized today
        const todayKey = getTodayKey();
        let needsUpdate = false;
        const updatedDocs = storeDocs.map((doc) => {
          if (doc.categoryType !== 'process') {
            return doc;
          }

          // Check if process doc's tasks already have today's dateKey
          const hasTodayTasks = (doc.tasks || []).some((t) => t.dateKey === todayKey);
          if (hasTodayTasks) {
            return doc;
          }

          // Create today's task instances from the template tasks
          const templateTasks = (doc.tasks || []).filter((t) => !t.dateKey);
          if (templateTasks.length === 0) {
            return doc;
          }

          needsUpdate = true;
          const nowIso = new Date().toISOString();
          const newDailyTasks: ChecklistTask[] = templateTasks.map((t) => ({
            id: generateTaskId(),
            title: t.title,
            timeLimit: t.timeLimit,
            isCompleted: false,
            dateKey: todayKey,
            createdAt: nowIso,
          }));

          return {
            ...doc,
            tasks: [...doc.tasks, ...newDailyTasks],
            updatedAt: nowIso,
          };
        });

        // Persist newly created daily tasks
        if (needsUpdate) {
          await Promise.all(
            updatedDocs
              .filter((doc, i) => doc !== storeDocs[i])
              .map((doc) =>
                checklistService.update(doc.id, { tasks: doc.tasks, updatedAt: doc.updatedAt }),
              ),
          );
        }

        setChecklistDocs(updatedDocs);
        recalculateDerivedState(updatedDocs);
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải checklist:', error);
          toastError('Không thể tải checklist. Vui lòng kiểm tra quyền truy cập hoặc kết nối mạng.');
        }
      }
    };

    void loadChecklists();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, activeStoreId, currentChecklistRoleCode, recalculateDerivedState]);

  // ─── Toggle Item ──────────────────────────────────────────────────────────

  const handleToggleChecklistItem = useCallback(async (itemId: string) => {
    const nowIso = new Date().toISOString();
    const checkerName = currentUser?.fullName || currentUser?.username || 'Hệ thống';
    const checkerUsername = currentUser?.username || 'system';

    // Find which document contains this task
    const targetDoc = checklistDocs.find((doc) =>
      (doc.tasks || []).some((t) => t.id === itemId),
    );
    if (!targetDoc) {
      return;
    }

    const targetTask = targetDoc.tasks.find((t) => t.id === itemId);
    if (!targetTask) {
      return;
    }

    const nextCompleted = !targetTask.isCompleted;

    // Optimistic update
    const updatedTasks = targetDoc.tasks.map((t) => {
      if (t.id === itemId) {
        return {
          ...t,
          isCompleted: nextCompleted,
          checkedAt: nextCompleted ? nowIso : null,
          checkedByName: nextCompleted ? checkerName : null,
          checkedByUsername: nextCompleted ? checkerUsername : null,
          updatedAt: nowIso,
        };
      }
      return t;
    });

    const updatedDocs = checklistDocs.map((doc) =>
      doc.id === targetDoc.id ? { ...doc, tasks: updatedTasks, updatedAt: nowIso } : doc,
    );

    setChecklistDocs(updatedDocs);
    recalculateDerivedState(updatedDocs);

    try {
      await checklistService.update(targetDoc.id, {
        tasks: updatedTasks,
        updatedAt: nowIso,
      });

      void appendChecklistLog(
        'UPDATE',
        'Checklist - Cập nhật trạng thái',
        `${nextCompleted ? 'Hoàn thành' : 'Bỏ hoàn thành'} công việc "${targetTask.title}".`,
      );
    } catch (error) {
      console.error('Không thể cập nhật trạng thái checklist:', error);
      // Rollback
      setChecklistDocs(checklistDocs);
      recalculateDerivedState(checklistDocs);
      toastError('Cập nhật trạng thái checklist thất bại. Vui lòng thử lại.');
    }
  }, [checklistDocs, currentUser, recalculateDerivedState, appendChecklistLog]);

  // ─── Create Checklist (category + tasks in 1 document) ────────────────────

  const handleCreateRoleChecklist = useCallback(async (
    roleCode: string,
    _categoryId: string,
    checklistName: string,
    taskTitle: string,
  ) => {
    const normalizedRoleCode = normalizeAccessCode(roleCode);
    const safeChecklistName = checklistName.trim();
    const safeTaskTitle = taskTitle.trim();

    if (!normalizedRoleCode || !safeChecklistName || !safeTaskTitle) {
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const todayKey = getTodayKey();

      const newDoc = await checklistService.create({
        storeId: activeStoreId,
        title: safeChecklistName,
        categoryType: 'process',
        roleCode: normalizedRoleCode,
        tasks: [
          {
            id: generateTaskId(),
            title: safeTaskTitle,
            isCompleted: false,
            createdAt: nowIso,
          },
          {
            id: generateTaskId(),
            title: safeTaskTitle,
            isCompleted: false,
            dateKey: todayKey,
            createdAt: nowIso,
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const updatedDocs = [...checklistDocs, newDoc];
      setChecklistDocs(updatedDocs);
      recalculateDerivedState(updatedDocs);

      void appendChecklistLog(
        'CREATE',
        'Checklist - Tạo checklist',
        `Tạo checklist "${safeChecklistName}" cho vai trò ${normalizedRoleCode}: ${safeTaskTitle}.`,
      );
    } catch (error) {
      console.error('Không thể tạo checklist:', error);
      toastError('Không thể tạo checklist mới. Vui lòng kiểm tra quyền ghi dữ liệu.');
    }
  }, [activeStoreId, checklistDocs, recalculateDerivedState, appendChecklistLog]);

  // ─── Create Batch (process templates) ─────────────────────────────────────

  const handleCreateRoleChecklistBatch = useCallback(async (
    roleCode: string,
    _categoryId: string,
    checklistName: string,
    tasksList: Array<{ title: string; timeLimit?: string }>,
  ) => {
    const normalizedRoleCode = normalizeAccessCode(roleCode);
    const safeChecklistName = checklistName.trim();

    if (!normalizedRoleCode || !safeChecklistName || !tasksList || tasksList.length === 0) {
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const todayKey = getTodayKey();

      // Build tasks: template (no dateKey) + today instance (with dateKey)
      const tasks: ChecklistTask[] = [];
      for (const task of tasksList) {
        const safeTitle = task.title.trim();
        if (!safeTitle) continue;

        // Template task (permanent, no dateKey)
        tasks.push({
          id: generateTaskId(),
          title: safeTitle,
          timeLimit: task.timeLimit,
          isCompleted: false,
          createdAt: nowIso,
        });

        // Today's instance
        tasks.push({
          id: generateTaskId(),
          title: safeTitle,
          timeLimit: task.timeLimit,
          isCompleted: false,
          dateKey: todayKey,
          createdAt: nowIso,
        });
      }

      const newDoc = await checklistService.create({
        storeId: activeStoreId,
        title: safeChecklistName,
        categoryType: 'process',
        roleCode: normalizedRoleCode,
        tasks,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const updatedDocs = [...checklistDocs, newDoc];
      setChecklistDocs(updatedDocs);
      recalculateDerivedState(updatedDocs);

      void appendChecklistLog(
        'CREATE',
        'Checklist - Tạo checklist',
        `Tạo ${tasksList.length} công việc checklist "${safeChecklistName}" cho vai trò ${normalizedRoleCode}.`,
      );
    } catch (error) {
      console.error('Không thể tạo checklist hàng loạt:', error);
      toastError('Không thể tạo checklist hàng loạt. Vui lòng kiểm tra quyền ghi dữ liệu.');
      throw error;
    }
  }, [activeStoreId, checklistDocs, recalculateDerivedState, appendChecklistLog]);

  // ─── Create Today Checklist Batch ─────────────────────────────────────────

  const handleCreateTodayChecklistBatch = useCallback(async (
    roleCode: string,
    _categoryId: string,
    checklistName: string,
    tasksList: Array<{ title: string; timeLimit?: string }>,
  ) => {
    const normalizedRoleCode = normalizeAccessCode(roleCode);
    const safeChecklistName = checklistName.trim();

    if (!normalizedRoleCode || !safeChecklistName || !tasksList || tasksList.length === 0) {
      return;
    }

    const safeTasks = tasksList
      .map((task) => ({ title: task.title.trim(), timeLimit: task.timeLimit }))
      .filter((task) => task.title);

    if (safeTasks.length === 0) {
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const todayKey = getTodayKey();

      const tasks: ChecklistTask[] = safeTasks.map((task) => ({
        id: generateTaskId(),
        title: task.title,
        timeLimit: task.timeLimit,
        isCompleted: false,
        dateKey: todayKey,
        createdAt: nowIso,
      }));

      const newDoc = await checklistService.create({
        storeId: activeStoreId,
        title: safeChecklistName,
        categoryType: 'today',
        roleCode: normalizedRoleCode,
        tasks,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const updatedDocs = [...checklistDocs, newDoc];
      setChecklistDocs(updatedDocs);
      recalculateDerivedState(updatedDocs);

      void appendChecklistLog(
        'CREATE',
        'Checklist - Tạo checklist hôm nay',
        `Tạo ${safeTasks.length} công việc checklist hôm nay "${safeChecklistName}" cho vai trò ${normalizedRoleCode}.`,
      );
    } catch (error) {
      console.error('Không thể tạo checklist hôm nay:', error);
      toastError('Không thể tạo checklist hôm nay. Vui lòng kiểm tra quyền ghi dữ liệu.');
      throw error;
    }
  }, [activeStoreId, checklistDocs, recalculateDerivedState, appendChecklistLog]);

  // ─── Delete Item (task from a document) ───────────────────────────────────

  const handleDeleteChecklistItem = useCallback(async (itemId: string) => {
    try {
      const targetDoc = checklistDocs.find((doc) =>
        (doc.tasks || []).some((t) => t.id === itemId),
      );
      if (!targetDoc) {
        return;
      }

      const taskToDelete = targetDoc.tasks.find((t) => t.id === itemId);
      const updatedTasks = targetDoc.tasks.filter((t) => t.id !== itemId);
      const nowIso = new Date().toISOString();

      await checklistService.update(targetDoc.id, {
        tasks: updatedTasks,
        updatedAt: nowIso,
      });

      const updatedDocs = checklistDocs.map((doc) =>
        doc.id === targetDoc.id ? { ...doc, tasks: updatedTasks, updatedAt: nowIso } : doc,
      );
      setChecklistDocs(updatedDocs);
      recalculateDerivedState(updatedDocs);

      void appendChecklistLog(
        'DELETE',
        'Checklist - Xóa công việc',
        `Xóa công việc checklist: "${taskToDelete?.title}".`,
      );
    } catch (error) {
      console.error('Không thể xóa checklist item:', error);
      toastError('Xóa công việc thất bại. Vui lòng thử lại.');
      throw error;
    }
  }, [checklistDocs, recalculateDerivedState, appendChecklistLog]);

  // ─── Update Item ──────────────────────────────────────────────────────────

  const handleUpdateChecklistItem = useCallback(async (itemId: string, updates: Partial<ChecklistItem>) => {
    try {
      const targetDoc = checklistDocs.find((doc) =>
        (doc.tasks || []).some((t) => t.id === itemId),
      );
      if (!targetDoc) {
        return;
      }

      const nowIso = new Date().toISOString();
      const updatedTasks = targetDoc.tasks.map((t) => {
        if (t.id === itemId) {
          return {
            ...t,
            ...(updates.title !== undefined ? { title: updates.title } : {}),
            ...(updates.timeLimit !== undefined ? { timeLimit: updates.timeLimit } : {}),
            updatedAt: nowIso,
          };
        }
        return t;
      });

      await checklistService.update(targetDoc.id, {
        tasks: updatedTasks,
        updatedAt: nowIso,
      });

      const updatedDocs = checklistDocs.map((doc) =>
        doc.id === targetDoc.id ? { ...doc, tasks: updatedTasks, updatedAt: nowIso } : doc,
      );
      setChecklistDocs(updatedDocs);
      recalculateDerivedState(updatedDocs);

      void appendChecklistLog(
        'UPDATE',
        'Checklist - Cập nhật công việc',
        `Cập nhật công việc checklist.`,
      );
    } catch (error) {
      console.error('Không thể cập nhật checklist item:', error);
      toastError('Cập nhật công việc thất bại. Vui lòng thử lại.');
      throw error;
    }
  }, [checklistDocs, recalculateDerivedState, appendChecklistLog]);

  // ─── Create Category (document) ───────────────────────────────────────────

  const handleCreateChecklistCategory = useCallback(async (
    title: string,
    categoryType: 'today' | 'process',
  ): Promise<string | null> => {
    const safeTitle = title.trim();
    if (!safeTitle) {
      return null;
    }

    try {
      const nowIso = new Date().toISOString();
      const newDoc = await checklistService.create({
        storeId: activeStoreId,
        title: safeTitle,
        categoryType,
        roleCode: currentChecklistRoleCode,
        tasks: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const updatedDocs = [...checklistDocs, newDoc];
      setChecklistDocs(updatedDocs);
      recalculateDerivedState(updatedDocs);

      void appendChecklistLog('CREATE', 'Checklist - Tạo nhóm', `Tạo nhóm checklist: "${safeTitle}".`);
      return newDoc.id;
    } catch (error) {
      console.error('Không thể tạo nhóm checklist:', error);
      toastError('Không thể tạo nhóm mới. Vui lòng kiểm tra kết nối.');
      return null;
    }
  }, [activeStoreId, currentChecklistRoleCode, checklistDocs, recalculateDerivedState, appendChecklistLog]);

  // ─── Update Category (document title) ─────────────────────────────────────

  const handleUpdateChecklistCategory = useCallback(async (
    id: string,
    title: string,
    _categoryType: 'today' | 'process',
  ) => {
    const safeTitle = title.trim();
    if (!safeTitle) {
      return;
    }

    try {
      await checklistService.update(id, { title: safeTitle, updatedAt: new Date().toISOString() });

      const updatedDocs = checklistDocs.map((doc) =>
        doc.id === id ? { ...doc, title: safeTitle } : doc,
      );
      setChecklistDocs(updatedDocs);
      recalculateDerivedState(updatedDocs);

      void appendChecklistLog('UPDATE', 'Checklist - Đổi tên nhóm', `Đổi tên nhóm checklist thành "${safeTitle}".`);
    } catch (error) {
      console.error('Không thể cập nhật nhóm checklist:', error);
      toastError('Cập nhật nhóm thất bại. Vui lòng thử lại.');
    }
  }, [checklistDocs, recalculateDerivedState, appendChecklistLog]);

  // ─── Delete Category (entire document) ────────────────────────────────────

  const handleDeleteChecklistCategory = useCallback(async (
    id: string,
    _categoryType: 'today' | 'process',
  ) => {
    try {
      await checklistService.delete(id);

      const updatedDocs = checklistDocs.filter((doc) => doc.id !== id);
      setChecklistDocs(updatedDocs);
      recalculateDerivedState(updatedDocs);

      void appendChecklistLog('DELETE', 'Checklist - Xóa nhóm', 'Xóa nhóm checklist và toàn bộ công việc liên quan.');
    } catch (error) {
      console.error('Không thể xóa nhóm checklist:', error);
      toastError('Xóa nhóm thất bại. Vui lòng thử lại.');
    }
  }, [checklistDocs, recalculateDerivedState, appendChecklistLog]);

  // ─── Flatten all items for the "allChecklistItems" prop ────────────────────

  const allChecklistItems = checklistDocs
    .filter((doc) => doc.storeId === activeStoreId)
    .flatMap(flattenDocToItems);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ChecklistView
      todayCategories={todayChecklistCategories}
      processCategories={processChecklistCategories}
      items={checklistItems}
      allChecklistItems={allChecklistItems}
      onToggleItem={handleToggleChecklistItem}
      roleOptions={checklistRoleOptions}
      defaultRoleCode={currentChecklistRoleCode}
      onCreateRoleChecklist={handleCreateRoleChecklist}
      onCreateTodayChecklistBatch={handleCreateTodayChecklistBatch}
      onCreateRoleChecklistBatch={handleCreateRoleChecklistBatch}
      onCreateCategory={handleCreateChecklistCategory}
      onUpdateCategory={handleUpdateChecklistCategory}
      onDeleteCategory={handleDeleteChecklistCategory}
      onDeleteChecklistItem={handleDeleteChecklistItem}
      onUpdateChecklistItem={handleUpdateChecklistItem}
      permissions={checklistPermissions}
    />
  );
}
