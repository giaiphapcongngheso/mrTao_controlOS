import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChecklistDocument, ChecklistTask } from '../../../types/checklist.types';
import type { StaffRole } from '../../../types/staff.types';
import type { UserSession } from '../../../stores/app-store';
import { roleService } from '../../../services/admin';
import {
  checklistService,
  checklistTemplateService,
  createChecklistSnapshotOnce,
  getChecklistsByDateRange,
  processService,
} from '../../../services/checklist-service';
import { toastError } from '../../../shared/lib/toast';
import { normalizeAccessCode } from '../../../shared/hooks/use-module-permissions';
import {
  buildDailySnapshot,
  generateDailySnapshotId,
  deriveChecklistState,
  EMPTY_CHECKLIST_DATA_STATE,
  type ChecklistDataState,
  type ChecklistRoleOption,
} from '../checklist-domain';
import { getTodayKey } from '../checklist-utils';
import { initBaseEntity } from '../../../types/base.types';

type UseChecklistDataParams = {
  currentUser: UserSession;
  activeStoreId: string;
  currentRoleCode: string;
  onMetricsChange?: (payload: {
    items: ReturnType<typeof deriveChecklistState>['todayItems'];
    checklistCompletion: number;
  }) => void;
};

export function useChecklistData({
  currentUser,
  activeStoreId,
  currentRoleCode,
  onMetricsChange,
}: UseChecklistDataParams) {
  const [dataState, setDataState] = useState<ChecklistDataState>(EMPTY_CHECKLIST_DATA_STATE);
  const [roleOptions, setRoleOptions] = useState<ChecklistRoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dataStateRef = useRef(dataState);

  // States for history tab
  const [historySnapshots, setHistorySnapshots] = useState<ChecklistDocument[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  // Phase 2: Background snapshot creation - does NOT block UI
  const ensureMissingSnapshotsInBackground = useCallback((
    filteredState: ChecklistDataState,
    todayKey: string,
  ) => {
    const currentRoleTemplates = filteredState.templates.filter(
      (template) => normalizeAccessCode(template.roleCode) === currentRoleCode,
    );
    const currentRoleSnapshots = filteredState.snapshots.filter(
      (snapshot) => normalizeAccessCode(snapshot.roleCode) === currentRoleCode,
    );

    if (currentRoleTemplates.length === 0) {
      return;
    }

    const dailySnapshotId = generateDailySnapshotId(todayKey, currentRoleCode);
    const existingSnapshot = currentRoleSnapshots.find(
      (snapshot) => snapshot.id === dailySnapshotId && snapshot.dateKey === todayKey && !snapshot.deletedAt
    );

    let updatedSnapshot: ChecklistDocument;

    if (!existingSnapshot) {
      // 1. Snapshot chưa tồn tại: Tạo mới snapshot doc chứa toàn bộ task của tất cả template
      updatedSnapshot = buildDailySnapshot(
        currentRoleTemplates,
        activeStoreId,
        currentRoleCode,
        todayKey
      );
    } else {
      // 2. Snapshot đã tồn tại: Check xem có template nào chưa có task nào trong snapshot
      const existingTemplateIdsInSnapshot = new Set(
        existingSnapshot.tasks
          .map((task) => task.templateId)
          .filter((id): id is string => Boolean(id))
      );

      const missingTemplates = currentRoleTemplates.filter(
        (template) => !existingTemplateIdsInSnapshot.has(template.id)
      );

      if (missingTemplates.length === 0) {
        return; // Đã đủ
      }

      // Tạo thêm tasks cho các templates bị thiếu và append vào existingSnapshot
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
        }))
      );

      updatedSnapshot = {
        ...existingSnapshot,
        tasks: [...existingSnapshot.tasks, ...newTasks],
        updatedAt: nowIso,
      };
    }

    // Ghi vào Firestore qua transaction (idempotent)
    void createChecklistSnapshotOnce(updatedSnapshot).then((ensuredSnapshot) => {
      if (!ensuredSnapshot || ensuredSnapshot.deletedAt) {
        return;
      }

      // Merge vào state local
      const currentState = dataStateRef.current;
      const snapshotsById = new Map(
        currentState.snapshots.map((snapshot) => [snapshot.id, snapshot] as const)
      );
      snapshotsById.set(ensuredSnapshot.id, ensuredSnapshot);

      replaceLocalState({
        ...currentState,
        snapshots: Array.from(snapshotsById.values()),
      });
    });
  }, [activeStoreId, currentRoleCode, replaceLocalState]);

  // Fetch history by date range
  const fetchHistoryByDateRange = useCallback(async (from: string, to: string, roleCode: string) => {
    setHistoryLoading(true);
    try {
      const normalizedRoleCode = normalizeAccessCode(roleCode || currentRoleCode);
      const snapshots = await getChecklistsByDateRange(activeStoreId, normalizedRoleCode, from, to);
      setHistorySnapshots(snapshots || []);
    } catch (error) {
      console.error('Khong the tai lich su checklist:', error);
      toastError('Khong the tai lich su checklist.');
    } finally {
      setHistoryLoading(false);
    }
  }, [activeStoreId, currentRoleCode]);

  // Phase 1: Fast path - fetch all data, show UI immediately
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

      // Show UI immediately with available data
      replaceLocalState(filteredState);
      setIsLoading(false);

      // Phase 2: Create missing snapshots in background (non-blocking)
      ensureMissingSnapshotsInBackground(filteredState, todayKey);
    } catch {
      setIsLoading(false);
    }
  }, [filterState, replaceLocalState, ensureMissingSnapshotsInBackground]);

  useEffect(() => {
    let cancelled = false;
    const fallbackRole: ChecklistRoleOption = {
      code: currentRoleCode || 'SALES',
      name: currentUser.role || currentRoleCode || 'Nhan su',
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
          console.error('Khong the tai danh sach vai tro checklist:', error);
          setRoleOptions([fallbackRole]);
          toastError('Khong the tai vai tro checklist. Vui long kiem tra quyen truy cap.');
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
          console.error('Khong the tai checklist:', error);
          toastError('Khong the tai checklist. Vui long kiem tra quyen truy cap hoac ket noi mang.');
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [refreshChecklistData]);

  return {
    dataState,
    dataStateRef,
    derivedState,
    roleOptions,
    isLoading,
    refreshChecklistData,
    updateLocalState,
    restoreLocalState,
    historySnapshots,
    historyLoading,
    fetchHistoryByDateRange,
  };
}
