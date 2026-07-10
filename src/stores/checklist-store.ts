import { create } from 'zustand';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFirestoreDb } from '../services/firebase-config';
import { checklistTemplateService, processService } from '../services/checklist-service';
import { roleService } from '../services/admin';
import { normalizeAccessCode } from '../shared/hooks/use-module-permissions';
import type { StaffRole } from '../types/staff.types';
import type { ChecklistDocument, ChecklistTemplateDocument, ProcessDocument } from '../types/checklist.types';
import type { ChecklistDataState, ChecklistRoleOption } from '../routes/Checklist/checklist-domain';
import { getTodayKey } from '../routes/Checklist/checklist-utils';

interface ChecklistStoreState {
  dataState: ChecklistDataState;
  roleOptions: ChecklistRoleOption[];
  isLoading: boolean;
  isInitialized: boolean;
  activeStoreId: string | null;
  unsubscribeListener: (() => void) | null;
  initChecklistStore: (storeId: string, currentRoleCode: string, currentUserRole: string) => Promise<void>;
  updateDataState: (updater: (state: ChecklistDataState) => ChecklistDataState) => void;
  cleanup: () => void;
}

const EMPTY_CHECKLIST_DATA_STATE: ChecklistDataState = {
  templates: [],
  snapshots: [],
  processes: [],
};

export const useChecklistStore = create<ChecklistStoreState>((set, get) => ({
  dataState: EMPTY_CHECKLIST_DATA_STATE,
  roleOptions: [],
  isLoading: true,
  isInitialized: false,
  activeStoreId: null,
  unsubscribeListener: null,

  updateDataState: (updater) => {
    set((state) => ({
      dataState: updater(state.dataState),
    }));
  },

  initChecklistStore: async (storeId, currentRoleCode, currentUserRole) => {
    const state = get();
    // If already initialized for this storeId, skip re-initialization
    if (state.isInitialized && state.activeStoreId === storeId) {
      return;
    }

    // Cleanup previous listener if storeId changed
    if (state.unsubscribeListener) {
      state.unsubscribeListener();
    }

    set({ isLoading: true, isInitialized: true, activeStoreId: storeId });

    const fallbackRole: ChecklistRoleOption = {
      code: currentRoleCode || 'SALES',
      name: currentUserRole || currentRoleCode || 'Nhân sự',
    };

    try {
      // 1. Fetch templates, processes, and roles filtered by storeId (server-side filtering)
      const [allTemplates, allProcesses, roles] = await Promise.all([
        checklistTemplateService.getAll({ storeId }),
        processService.getAll({ storeId }),
        roleService.getAll(),
      ]);

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

      set({
        roleOptions: Array.from(roleMap.values()),
        dataState: {
          templates: (allTemplates || []).filter((t) => t.storeId === storeId && !t.deletedAt),
          processes: (allProcesses || []).filter((p) => p.storeId === storeId && !p.deletedAt),
          snapshots: [], // Will be populated by onSnapshot listener
        },
      });

      // 2. Set up real-time listener for checklists collection
      const db = getFirestoreDb();
      const q = query(
        collection(db, 'checklists'),
        where('storeId', '==', storeId),
        where('deletedAt', '==', null)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const updatedSnapshots: ChecklistDocument[] = [];
        snapshot.forEach((docSnap) => {
          updatedSnapshots.push({
            ...docSnap.data(),
            id: docSnap.id,
          } as ChecklistDocument);
        });

        set((state) => ({
          dataState: {
            ...state.dataState,
            snapshots: updatedSnapshots,
          },
          isLoading: false,
        }));
      }, (error) => {
        console.error('Lỗi lắng nghe dữ liệu checklist thời gian thực:', error);
        set({ isLoading: false });
      });

      set({ unsubscribeListener: unsubscribe });
    } catch (error) {
      console.error('Không thể khởi tạo checklist store:', error);
      set({ isLoading: false, roleOptions: [fallbackRole] });
    }
  },

  cleanup: () => {
    const { unsubscribeListener } = get();
    if (unsubscribeListener) {
      unsubscribeListener();
    }
    set({
      dataState: EMPTY_CHECKLIST_DATA_STATE,
      roleOptions: [],
      isLoading: true,
      isInitialized: false,
      activeStoreId: null,
      unsubscribeListener: null,
    });
  },
}));
