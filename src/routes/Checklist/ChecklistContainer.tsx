import React, { useCallback, useEffect, useState } from 'react';
import ChecklistView from './ChecklistView';
import type { ChecklistCategory, ChecklistItem } from '../../types/checklist.types';
import type { StaffRole } from '../../types/staff.types';
import type { UserSession } from '../../stores/app-store';
import type { SystemLogActionType } from '../../types/system-log.types';
import { DEFAULT_STORE_ID } from '../../data';
import { MODULE_CODE } from '../../constants/staff-permissions.constants';
import { roleService, staffPermissionService } from '../../services/admin';
import {
  checklistItemService,
  checklistProcessItemService,
  checklistTodayCategoryService,
  checklistProcessCategoryService,
} from '../../services/checklist-service';
import { systemLogService } from '../../services/system-log-service';
import { getTodayKey } from './checklist.utils';

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

function sortChecklistItems(items: ChecklistItem[], categories: ChecklistCategory[]): ChecklistItem[] {
  const categoryOrderMap = new Map(categories.map((cat, index) => [cat.id, index]));
  return [...items].sort((a, b) => {
    const orderA = categoryOrderMap.get(a.categoryId) ?? Number.MAX_SAFE_INTEGER;
    const orderB = categoryOrderMap.get(b.categoryId) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return a.title.localeCompare(b.title, 'vi');
  });
}

export default function ChecklistContainer({
  currentUser,
  isOwner,
  activeStoreId,
  onMetricsChange,
}: ChecklistContainerProps) {
  const [todayChecklistCategories, setTodayChecklistCategories] = useState<ChecklistCategory[]>([]);
  const [processChecklistCategories, setProcessChecklistCategories] = useState<ChecklistCategory[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [allChecklistItems, setAllChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistRoleOptions, setChecklistRoleOptions] = useState<ChecklistRoleOption[]>([]);
  const [checklistErrorMessage, setChecklistErrorMessage] = useState<string | null>(null);
  const [checklistPermissions, setChecklistPermissions] = useState({
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  });

  const currentChecklistRoleCode = normalizeAccessCode(currentUser?.roleCode || currentUser?.role || 'SALES');

  const recalculateChecklistProgress = useCallback((itemsList: ChecklistItem[], categoriesList: ChecklistCategory[]) => {
    let totalDoneAll = 0;
    let totalCountAll = 0;

    const updatedCategories = categoriesList.map((cat) => {
      const catItems = itemsList.filter((it) => it.categoryId === cat.id);
      const doneValue = catItems.filter((it) => it.isCompleted).length;
      const totalValue = catItems.length;

      totalDoneAll += doneValue;
      totalCountAll += totalValue;

      return {
        ...cat,
        countDone: doneValue,
        countTotal: totalValue,
        isCompleted: totalValue > 0 && doneValue === totalValue,
      };
    });

    setTodayChecklistCategories(updatedCategories);

    const overallRatio = totalCountAll > 0 ? Math.round((totalDoneAll / totalCountAll) * 100) : 0;
    const finalPercent = overallRatio > 100 ? 100 : overallRatio;

    onMetricsChange?.({
      items: itemsList,
      checklistCompletion: finalPercent,
    });
  }, [onMetricsChange]);

  const appendChecklistLog = useCallback(async (
    actionType: SystemLogActionType,
    target: string,
    details: string,
  ) => {
    const actorName = currentUser?.fullName || currentUser?.username || 'He thong';
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
      console.error('Khong the ghi log checklist:', error);
    }
  }, [currentUser, activeStoreId, currentChecklistRoleCode]);

  const handleDismissError = useCallback(() => {
    setChecklistErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!checklistErrorMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setChecklistErrorMessage(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [checklistErrorMessage]);

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
          console.error('Failed to load checklist permissions:', error);
          setChecklistPermissions({ canCreate: false, canUpdate: false, canDelete: false });
        }
      }
    };

    void loadChecklistPermissions();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.roleCode, currentUser?.username, isOwner]);

  useEffect(() => {
    let cancelled = false;

    const fallbackRole: ChecklistRoleOption = {
      code: currentChecklistRoleCode || 'SALES',
      name: currentUser.role || currentChecklistRoleCode || 'Nhan su',
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
          console.error('Khong the tai danh sach vai tro checklist:', error);
          setChecklistRoleOptions([fallbackRole]);
          setChecklistErrorMessage('Khong the tai vai tro checklist. Vui long kiem tra quyen truy cap.');
        }
      }
    };

    void loadRoleOptions();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.role, currentChecklistRoleCode]);

  useEffect(() => {
    let cancelled = false;

    const loadChecklistByRole = async () => {
      let todayCategoriesFromDb: ChecklistCategory[] = [];
      let processCategoriesFromDb: ChecklistCategory[] = [];
      try {
        const todayKey = getTodayKey();

        const [todayCategoryRows, processCategoryRows] = await Promise.all([
          checklistTodayCategoryService.getAll(),
          checklistProcessCategoryService.getAll(),
        ]);
        if (cancelled) {
          return;
        }
        todayCategoriesFromDb = (todayCategoryRows || [])
          .filter((cat) => cat.storeId === activeStoreId)
          .map((cat) => ({ ...cat, categoryType: 'today' }));
        processCategoriesFromDb = (processCategoryRows || [])
          .filter((cat) => cat.storeId === activeStoreId)
          .map((cat) => ({ ...cat, categoryType: 'process' }));

        setTodayChecklistCategories(todayCategoriesFromDb);
        setProcessChecklistCategories(processCategoriesFromDb);

        const [allDailyItems, allProcessTemplates] = await Promise.all([
          checklistItemService.getAll(),
          checklistProcessItemService.getAll(),
        ]);

        if (cancelled) {
          return;
        }

        setAllChecklistItems([
          ...allDailyItems.filter((item) => !item.isTemplate),
          ...allProcessTemplates,
        ]);

        const activeTodayCategoryIdSet = new Set(todayCategoriesFromDb.map((group) => group.id));
        const activeProcessCategoryIdSet = new Set(processCategoriesFromDb.map((group) => group.id));
        const roleDailyItems = allDailyItems.filter(
          (item) =>
            item.storeId === activeStoreId &&
            !item.isTemplate &&
            normalizeAccessCode(item.roleCode) === currentChecklistRoleCode &&
            activeTodayCategoryIdSet.has(item.categoryId),
        );
        const roleProcessTemplates = allProcessTemplates.filter(
          (item) =>
            item.storeId === activeStoreId &&
            normalizeAccessCode(item.roleCode) === currentChecklistRoleCode &&
            activeProcessCategoryIdSet.has(item.categoryId),
        );

        let dailyItems = roleDailyItems.filter((item) => item.dateKey === todayKey);

        if (dailyItems.length === 0 && roleProcessTemplates.length > 0) {
          dailyItems = await Promise.all(
            roleProcessTemplates.map((template) =>
              checklistItemService.create({
                storeId: activeStoreId,
                categoryId: template.categoryId,
                title: template.title,
                isCompleted: false,
                roleCode: currentChecklistRoleCode,
                dateKey: todayKey,
                isTemplate: false,
                checklistName: template.checklistName,
                templateId: template.id,
                createdAt: new Date().toISOString(),
              }),
            ),
          );

          void appendChecklistLog(
            'RESET',
            'Checklist - Khoi tao ngay',
            `Khoi tao checklist ngay ${todayKey} cho vai tro ${currentChecklistRoleCode}.`,
          );
        }

        if (cancelled) {
          return;
        }

        const sortedDailyItems = sortChecklistItems(dailyItems, [...todayCategoriesFromDb, ...processCategoriesFromDb]);
        setChecklistItems(sortedDailyItems);
        recalculateChecklistProgress(sortedDailyItems, todayCategoriesFromDb);
        setChecklistErrorMessage(null);
      } catch (error) {
        if (!cancelled) {
          console.error('Khong the tai checklist theo vai tro:', error);
          setChecklistItems([]);
          recalculateChecklistProgress([], todayCategoriesFromDb.length > 0 ? todayCategoriesFromDb : []);
          setChecklistErrorMessage('Khong the tai checklist. Vui long kiem tra quyen Firestore hoac ket noi mang.');
        }
      }
    };

    void loadChecklistByRole();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, activeStoreId, currentChecklistRoleCode]);

  const handleToggleChecklistItem = useCallback(async (itemId: string) => {
    const nowIso = new Date().toISOString();
    const checkerName = currentUser?.fullName || currentUser?.username || 'He thong';
    const checkerUsername = currentUser?.username || 'system';
    const targetItem = checklistItems.find((item) => item.id === itemId);

    const updatedItems = checklistItems.map((item) => {
      if (item.id === itemId) {
        const nextCompleted = !item.isCompleted;
        return {
          ...item,
          isCompleted: nextCompleted,
          checkedAt: nextCompleted ? nowIso : undefined,
          checkedByName: nextCompleted ? checkerName : undefined,
          checkedByUsername: nextCompleted ? checkerUsername : undefined,
          updatedAt: nowIso,
        };
      }
      return item;
    });

    const sortedItems = sortChecklistItems(updatedItems, [...todayChecklistCategories, ...processChecklistCategories]);
    setChecklistItems(sortedItems);
    recalculateChecklistProgress(sortedItems, todayChecklistCategories);

    if (!targetItem) {
      return;
    }

    const toggledItem = updatedItems.find((item) => item.id === itemId);
    const isCompleted = Boolean(toggledItem?.isCompleted);

    void appendChecklistLog(
      'UPDATE',
      'Checklist - Cap nhat trang thai',
      `${isCompleted ? 'Hoan thanh' : 'Bo hoan thanh'} dau viec: ${targetItem.title}.`,
    );

    try {
      await checklistItemService.update(itemId, {
        isCompleted,
        checkedAt: isCompleted ? nowIso : undefined,
        checkedByName: isCompleted ? checkerName : undefined,
        checkedByUsername: isCompleted ? checkerUsername : undefined,
        updatedAt: nowIso,
      });
    } catch (error) {
      console.error('Khong the cap nhat trang thai checklist:', error);
      setChecklistItems(checklistItems);
      recalculateChecklistProgress(checklistItems, todayChecklistCategories);
      setChecklistErrorMessage('Cap nhat checklist that bai. Vui long thu lai.');
    }
  }, [checklistItems, todayChecklistCategories, processChecklistCategories, currentUser, recalculateChecklistProgress, appendChecklistLog]);

  const handleCreateRoleChecklist = useCallback(async (
    roleCode: string,
    categoryId: string,
    checklistName: string,
    taskTitle: string,
  ) => {
    const normalizedRoleCode = normalizeAccessCode(roleCode);
    const normalizedCategoryId = categoryId;
    const safeChecklistName = checklistName.trim();
    const safeTaskTitle = taskTitle.trim();

    if (!normalizedRoleCode || !normalizedCategoryId || !safeChecklistName || !safeTaskTitle) {
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const createdTemplate = await checklistProcessItemService.create({
        storeId: activeStoreId,
        categoryId: normalizedCategoryId,
        title: safeTaskTitle,
        isCompleted: false,
        roleCode: normalizedRoleCode,
        isTemplate: true,
        checklistName: safeChecklistName,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const roleName = checklistRoleOptions.find((role) => role.code === normalizedRoleCode)?.name || normalizedRoleCode;
      void appendChecklistLog(
        'CREATE',
        'Checklist - Tao checklist',
        `Tao checklist "${safeChecklistName}" cho vai tro ${roleName} (nhom ${normalizedCategoryId}): ${safeTaskTitle}.`,
      );

      setAllChecklistItems((prev) => [...prev, createdTemplate]);

      if (normalizedRoleCode !== currentChecklistRoleCode) {
        return;
      }

      const todayKey = getTodayKey();
      const createdDailyItem = await checklistItemService.create({
        storeId: activeStoreId,
        categoryId: normalizedCategoryId,
        title: safeTaskTitle,
        isCompleted: false,
        roleCode: normalizedRoleCode,
        dateKey: todayKey,
        isTemplate: false,
        checklistName: safeChecklistName,
        templateId: createdTemplate.id,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      setAllChecklistItems((prev) => [...prev, createdDailyItem]);

      const updatedItems = sortChecklistItems(
        [...checklistItems, createdDailyItem],
        [...todayChecklistCategories, ...processChecklistCategories]
      );
      setChecklistItems(updatedItems);
      recalculateChecklistProgress(updatedItems, todayChecklistCategories);
      setChecklistErrorMessage(null);
    } catch (error) {
      console.error('Khong the tao checklist:', error);
      setChecklistErrorMessage('Khong the tao checklist moi. Vui long kiem tra quyen ghi du lieu.');
    }
  }, [activeStoreId, checklistItems, checklistRoleOptions, currentChecklistRoleCode, todayChecklistCategories, processChecklistCategories, recalculateChecklistProgress, appendChecklistLog]);

  const handleCreateRoleChecklistBatch = useCallback(async (
    roleCode: string,
    categoryId: string,
    checklistName: string,
    tasksList: Array<{ title: string; timeLimit?: string }>,
  ) => {
    const normalizedRoleCode = normalizeAccessCode(roleCode);
    const safeChecklistName = checklistName.trim();

    if (!normalizedRoleCode || !categoryId || !safeChecklistName || !tasksList || tasksList.length === 0) {
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const todayKey = getTodayKey();

      const createdTemplates = await Promise.all(
        tasksList.map((task) =>
          checklistProcessItemService.create({
            storeId: activeStoreId,
            categoryId,
            title: task.title.trim(),
            timeLimit: task.timeLimit,
            isCompleted: false,
            roleCode: normalizedRoleCode,
            isTemplate: true,
            checklistName: safeChecklistName,
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ),
      );

      const roleName = checklistRoleOptions.find((role) => role.code === normalizedRoleCode)?.name || normalizedRoleCode;
      void appendChecklistLog(
        'CREATE',
        'Checklist - Tao checklist',
        `Tao ${tasksList.length} cong viec checklist "${safeChecklistName}" cho vai tro ${roleName}.`,
      );

      setAllChecklistItems((prev) => [...prev, ...createdTemplates]);

      if (normalizedRoleCode === currentChecklistRoleCode) {
        const createdDailyItems = await Promise.all(
          createdTemplates.map((template) =>
            checklistItemService.create({
              storeId: activeStoreId,
              categoryId,
              title: template.title,
              timeLimit: template.timeLimit,
              isCompleted: false,
              roleCode: normalizedRoleCode,
              dateKey: todayKey,
              isTemplate: false,
              checklistName: safeChecklistName,
              templateId: template.id,
              createdAt: nowIso,
              updatedAt: nowIso,
            }),
          ),
        );

        setAllChecklistItems((prev) => [...prev, ...createdDailyItems]);

        const updatedItems = sortChecklistItems(
          [...checklistItems, ...createdDailyItems],
          [...todayChecklistCategories, ...processChecklistCategories]
        );
        setChecklistItems(updatedItems);
        recalculateChecklistProgress(updatedItems, todayChecklistCategories);
      }

      setChecklistErrorMessage(null);
    } catch (error) {
      console.error('Khong the tao checklist hang loat:', error);
      setChecklistErrorMessage('Khong the tao checklist moi. Vui long kiem tra quyen ghi du lieu.');
      throw error;
    }
  }, [activeStoreId, checklistItems, checklistRoleOptions, currentChecklistRoleCode, todayChecklistCategories, processChecklistCategories, recalculateChecklistProgress, appendChecklistLog]);

  const handleCreateTodayChecklistBatch = useCallback(async (
    roleCode: string,
    categoryId: string,
    checklistName: string,
    tasksList: Array<{ title: string; timeLimit?: string }>,
  ) => {
    const normalizedRoleCode = normalizeAccessCode(roleCode);
    const normalizedCategoryId = categoryId;
    const safeChecklistName = checklistName.trim();

    if (!normalizedRoleCode || !normalizedCategoryId || !safeChecklistName || !tasksList || tasksList.length === 0) {
      return;
    }

    const safeTasks = tasksList
      .map((task) => ({
        title: task.title.trim(),
        timeLimit: task.timeLimit,
      }))
      .filter((task) => task.title);

    if (safeTasks.length === 0) {
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const todayKey = getTodayKey();

      const createdDailyItems = await Promise.all(
        safeTasks.map((task) =>
          checklistItemService.create({
            storeId: activeStoreId,
            categoryId: normalizedCategoryId,
            title: task.title,
            timeLimit: task.timeLimit,
            isCompleted: false,
            roleCode: normalizedRoleCode,
            dateKey: todayKey,
            isTemplate: false,
            checklistName: safeChecklistName,
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ),
      );

      const roleName = checklistRoleOptions.find((role) => role.code === normalizedRoleCode)?.name || normalizedRoleCode;
      void appendChecklistLog(
        'CREATE',
        'Checklist - Tao checklist hom nay',
        `Tao ${createdDailyItems.length} cong viec checklist hom nay "${safeChecklistName}" cho vai tro ${roleName}.`,
      );

      setAllChecklistItems((prev) => [...prev, ...createdDailyItems]);

      if (normalizedRoleCode === currentChecklistRoleCode) {
        const updatedItems = sortChecklistItems(
          [...checklistItems, ...createdDailyItems],
          [...todayChecklistCategories, ...processChecklistCategories]
        );
        setChecklistItems(updatedItems);
        recalculateChecklistProgress(updatedItems, todayChecklistCategories);
      }

      setChecklistErrorMessage(null);
    } catch (error) {
      console.error('Khong the tao checklist hom nay:', error);
      setChecklistErrorMessage('Khong the tao checklist hom nay. Vui long kiem tra quyen ghi du lieu.');
      throw error;
    }
  }, [activeStoreId, checklistItems, checklistRoleOptions, currentChecklistRoleCode, todayChecklistCategories, processChecklistCategories, recalculateChecklistProgress, appendChecklistLog]);

  const handleDeleteChecklistItem = useCallback(async (itemId: string) => {
    try {
      const itemToDelete = allChecklistItems.find((it) => it.id === itemId);
      if (!itemToDelete) {
        return;
      }

      if (itemToDelete.isTemplate) {
        await checklistProcessItemService.delete(itemId);
      } else {
        await checklistItemService.delete(itemId);
      }

      if (itemToDelete.isTemplate) {
        const todayKey = getTodayKey();
        const childDailyItems = allChecklistItems.filter(
          (it) => !it.isTemplate && it.templateId === itemId && it.dateKey === todayKey,
        );
        await Promise.all(childDailyItems.map((it) => checklistItemService.delete(it.id)));

        setAllChecklistItems((prev) =>
          prev.filter((it) => it.id !== itemId && !(it.templateId === itemId && it.dateKey === todayKey)),
        );
        setChecklistItems((prev) =>
          prev.filter((it) => it.id !== itemId && !(it.templateId === itemId && it.dateKey === todayKey)),
        );
      } else {
        setAllChecklistItems((prev) => prev.filter((it) => it.id !== itemId));
        setChecklistItems((prev) => prev.filter((it) => it.id !== itemId));
      }

      void appendChecklistLog('DELETE', 'Checklist - Xoa cong viec', `Xoa cong viec checklist: "${itemToDelete.title}".`);

      recalculateChecklistProgress(
        checklistItems.filter((it) => it.id !== itemId),
        todayChecklistCategories,
      );
    } catch (error) {
      console.error('Khong the xoa checklist item:', error);
      setChecklistErrorMessage('Xoa cong viec that bai. Vui long thu lai.');
      throw error;
    }
  }, [allChecklistItems, checklistItems, todayChecklistCategories, recalculateChecklistProgress, appendChecklistLog]);

  const handleUpdateChecklistItem = useCallback(async (itemId: string, updates: Partial<ChecklistItem>) => {
    try {
      const itemToUpdate = allChecklistItems.find((it) => it.id === itemId);
      if (!itemToUpdate) {
        return;
      }

      const nowIso = new Date().toISOString();
      const dbUpdates = {
        ...updates,
        updatedAt: nowIso,
      };

      if (itemToUpdate.isTemplate) {
        await checklistProcessItemService.update(itemId, dbUpdates);
      } else {
        await checklistItemService.update(itemId, dbUpdates);
      }

      if (itemToUpdate.isTemplate && (updates.title || updates.timeLimit !== undefined)) {
        const todayKey = getTodayKey();
        const todayDailyItem = allChecklistItems.find(
          (it) => !it.isTemplate && it.templateId === itemId && it.dateKey === todayKey,
        );
        if (todayDailyItem) {
          await checklistItemService.update(todayDailyItem.id, {
            title: updates.title || todayDailyItem.title,
            timeLimit: updates.timeLimit !== undefined ? updates.timeLimit : todayDailyItem.timeLimit,
            updatedAt: nowIso,
          });
        }
      }

      setAllChecklistItems((prev) =>
        prev.map((it) => {
          if (it.id === itemId) {
            return { ...it, ...updates, updatedAt: nowIso };
          }
          if (itemToUpdate.isTemplate && !it.isTemplate && it.templateId === itemId && it.dateKey === getTodayKey()) {
            return { ...it, ...updates, updatedAt: nowIso };
          }
          return it;
        }),
      );

      setChecklistItems((prev) =>
        prev.map((it) => {
          if (it.id === itemId) {
            return { ...it, ...updates, updatedAt: nowIso };
          }
          if (itemToUpdate.isTemplate && !it.isTemplate && it.templateId === itemId && it.dateKey === getTodayKey()) {
            return { ...it, ...updates, updatedAt: nowIso };
          }
          return it;
        }),
      );

      void appendChecklistLog('UPDATE', 'Checklist - Cap nhat cong viec', `Cap nhat cong viec checklist "${itemToUpdate.title}".`);
    } catch (error) {
      console.error('Khong the cap nhat checklist item:', error);
      setChecklistErrorMessage('Cap nhat cong viec that bai. Vui long thu lai.');
      throw error;
    }
  }, [allChecklistItems, appendChecklistLog]);

  const handleCreateChecklistCategory = useCallback(async (title: string, categoryType: 'today' | 'process') => {
    const safeTitle = title.trim();
    if (!safeTitle) {
      return;
    }

    try {
      const categoryService = categoryType === 'process'
        ? checklistProcessCategoryService
        : checklistTodayCategoryService;
      const newCat = await categoryService.create({
        storeId: activeStoreId,
        title: safeTitle,
        countDone: 0,
        countTotal: 0,
        isCompleted: false,
        categoryType,
      });

      if (categoryType === 'process') {
        setProcessChecklistCategories((prev) => [...prev, { ...newCat, categoryType }]);
      } else {
        setTodayChecklistCategories((prev) => [...prev, { ...newCat, categoryType }]);
      }

      void appendChecklistLog('CREATE', 'Checklist - Tao nhom', `Tao nhom checklist dong moi: "${safeTitle}".`);
    } catch (error) {
      console.error('Khong the tao nhom checklist:', error);
      setChecklistErrorMessage('Khong the tao nhom moi. Vui long kiem tra ket noi.');
    }
  }, [activeStoreId, appendChecklistLog]);

  const handleUpdateChecklistCategory = useCallback(async (id: string, title: string, categoryType: 'today' | 'process') => {
    const safeTitle = title.trim();
    if (!safeTitle) {
      return;
    }

    try {
      const categoryService = categoryType === 'process'
        ? checklistProcessCategoryService
        : checklistTodayCategoryService;
      await categoryService.update(id, {
        title: safeTitle,
      });

      if (categoryType === 'process') {
        setProcessChecklistCategories((prev) =>
          prev.map((cat) => (cat.id === id ? { ...cat, title: safeTitle } : cat)),
        );
      } else {
        setTodayChecklistCategories((prev) =>
          prev.map((cat) => (cat.id === id ? { ...cat, title: safeTitle } : cat)),
        );
      }

      void appendChecklistLog('UPDATE', 'Checklist - Cap nhat nhom', `Cap nhat ten nhom checklist thanh: "${safeTitle}".`);
    } catch (error) {
      console.error('Khong the cap nhat nhom checklist:', error);
      setChecklistErrorMessage('Khong the doi ten nhom. Vui long thu lai.');
    }
  }, [appendChecklistLog]);

  const handleDeleteChecklistCategory = useCallback(async (id: string, categoryType: 'today' | 'process') => {
    try {
      const categoryService = categoryType === 'process'
        ? checklistProcessCategoryService
        : checklistTodayCategoryService;
      await categoryService.delete(id);

      if (categoryType === 'process') {
        setProcessChecklistCategories((prev) => prev.filter((cat) => cat.id !== id));
      } else {
        setTodayChecklistCategories((prev) => prev.filter((cat) => cat.id !== id));
      }

      if (categoryType === 'process') {
        const allProcessTemplates = await checklistProcessItemService.getAll();
        const processItemsToDelete = allProcessTemplates.filter((item) => item.categoryId === id);
        await Promise.all(processItemsToDelete.map((item) => checklistProcessItemService.delete(item.id)));
        setAllChecklistItems((prev) => prev.filter((item) => item.categoryId !== id));
      } else {
        const allDailyItems = await checklistItemService.getAll();
        const dailyItemsToDelete = allDailyItems.filter((item) => item.categoryId === id);
        await Promise.all(dailyItemsToDelete.map((item) => checklistItemService.delete(item.id)));
        setChecklistItems((prev) => prev.filter((item) => item.categoryId !== id));
        setAllChecklistItems((prev) => prev.filter((item) => item.categoryId !== id));
      }

      void appendChecklistLog('DELETE', 'Checklist - Xoa nhom', 'Xoa nhom quy trinh checklist va toan bo cong viec lien quan.');
    } catch (error) {
      console.error('Khong the xoa nhom checklist:', error);
      setChecklistErrorMessage('Xoa nhom that bai. Vui long thu lai.');
    }
  }, [allChecklistItems, appendChecklistLog]);

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
      errorMessage={checklistErrorMessage}
      onDismissError={handleDismissError}
    />
  );
}

