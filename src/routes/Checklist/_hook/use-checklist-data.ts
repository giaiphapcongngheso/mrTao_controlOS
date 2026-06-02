import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChecklistDocument } from '../../../types/checklist.types';
import type { StaffRole } from '../../../types/staff.types';
import type { UserSession } from '../../../stores/app-store';
import { roleService } from '../../../services/admin';
import {
  checklistService,
  checklistTemplateService,
  createChecklistSnapshotOnce,
  processService,
} from '../../../services/checklist-service';
import { toastError } from '../../../shared/lib/toast';
import { normalizeAccessCode } from '../../../shared/hooks/use-module-permissions';
import {
  buildTodaySnapshotFromTemplate,
  deriveChecklistState,
  EMPTY_CHECKLIST_DATA_STATE,
  type ChecklistDataState,
  type ChecklistRoleOption,
} from '../checklist-domain';
import { getTodayKey } from '../checklist-utils';

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

  useEffect(() => {
    dataStateRef.current = dataState;
  }, [dataState]);

  const filterState = useCallback((state: ChecklistDataState): ChecklistDataState => ({
    templates: state.templates.filter((template) =>
      template.storeId === activeStoreId &&
      normalizeAccessCode(template.roleCode) === currentRoleCode &&
      !template.deletedAt,
    ),
    snapshots: state.snapshots.filter((snapshot) =>
      snapshot.storeId === activeStoreId &&
      normalizeAccessCode(snapshot.roleCode) === currentRoleCode &&
      !snapshot.deletedAt,
    ),
    processes: state.processes.filter((processDoc) =>
      processDoc.storeId === activeStoreId &&
      !processDoc.deletedAt,
    ),
  }), [activeStoreId, currentRoleCode]);

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
    onMetricsChange?.({
      items: derivedState.todayItems,
      checklistCompletion: derivedState.completion,
    });
  }, [derivedState.completion, derivedState.todayItems, onMetricsChange]);

  // Phase 2: Background snapshot creation - does NOT block UI
  const ensureMissingSnapshotsInBackground = useCallback((
    filteredState: ChecklistDataState,
    todayKey: string,
  ) => {
    const existingTodayTemplateIds = new Set(
      filteredState.snapshots
        .filter((snapshot) => snapshot.dateKey === todayKey)
        .map((snapshot) => snapshot.templateId)
        .filter((templateId): templateId is string => Boolean(templateId)),
    );

    const missingTemplates = filteredState.templates.filter(
      (template) => !existingTodayTemplateIds.has(template.id),
    );
    if (missingTemplates.length === 0) {
      return;
    }

    // Fire-and-forget: create missing snapshots in background
    void Promise.allSettled(
      missingTemplates.map(async (template) => {
        const snapshotPayload = await buildTodaySnapshotFromTemplate(template, activeStoreId, todayKey);
        return createChecklistSnapshotOnce(snapshotPayload);
      }),
    ).then((results) => {
      const ensuredSnapshots = results
        .filter((result): result is PromiseFulfilledResult<ChecklistDocument> => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter((snapshot) => !snapshot.deletedAt);

      if (ensuredSnapshots.length === 0) {
        return;
      }

      // Merge into current state without blocking
      const currentState = dataStateRef.current;
      const snapshotsById = new Map(currentState.snapshots.map((snapshot) => [snapshot.id, snapshot] as const));
      ensuredSnapshots.forEach((snapshot) => {
        snapshotsById.set(snapshot.id, snapshot);
      });

      replaceLocalState({
        ...currentState,
        snapshots: Array.from(snapshotsById.values()),
      });
    });
  }, [activeStoreId, replaceLocalState]);

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
  };
}
