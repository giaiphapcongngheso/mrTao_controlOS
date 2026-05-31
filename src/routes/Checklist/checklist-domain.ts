import type {
  ChecklistCategory,
  ChecklistDocument,
  ChecklistItem,
  ChecklistTask,
  ChecklistTemplateDocument,
  ChecklistTemplateTask,
  ProcessDocument,
} from '../../types/checklist.types';
import { ENTITY_PREFIX } from '../../constants/entity-id.constants';
import { initBaseEntity, initBusinessEntity } from '../../types/base.types';
import { getTodayKey } from './checklist-utils';

export type ChecklistCategoryType = 'today' | 'process';

export type SaveCategoryTaskInput = {
  id?: string;
  title: string;
  timeLimit?: string;
};

export type ChecklistRoleOption = {
  code: string;
  name: string;
};

export type ChecklistDataState = {
  templates: ChecklistTemplateDocument[];
  snapshots: ChecklistDocument[];
  processes: ProcessDocument[];
};

export type ChecklistDerivedState = {
  todayItems: ChecklistItem[];
  allItems: ChecklistItem[];
  todayCategories: ChecklistCategory[];
  processCategories: ChecklistCategory[];
  completion: number;
};

export type PendingTemplateSyncState = {
  templateId: string;
  snapshotId: string;
  templateTitle: string;
  snapshotTitle: string;
  previousTemplateTaskIds: string[];
  updatedTemplateTasks: ChecklistTemplateTask[];
};

export const EMPTY_CHECKLIST_DATA_STATE: ChecklistDataState = {
  templates: [],
  snapshots: [],
  processes: [],
};

export function normalizeTaskInputs(tasks: SaveCategoryTaskInput[]): SaveCategoryTaskInput[] {
  return (tasks || [])
    .map((task) => ({
      id: task.id,
      title: task.title.trim(),
      timeLimit: task.timeLimit?.trim() || undefined,
    }))
    .filter((task) => task.title.length > 0);
}

export function toTemplateTasks(tasks: SaveCategoryTaskInput[]): ChecklistTemplateTask[] {
  return normalizeTaskInputs(tasks).map((task) => ({
    id: task.id || initBaseEntity('t').id,
    title: task.title,
    timeLimit: task.timeLimit,
  }));
}

export function toSnapshotTasks(tasks: SaveCategoryTaskInput[], todayKey = getTodayKey()): ChecklistTask[] {
  return normalizeTaskInputs(tasks).map((task) => ({
    ...initBaseEntity('t', task.id),
    title: task.title,
    timeLimit: task.timeLimit,
    isCompleted: false,
    dateKey: todayKey,
    checkedAt: null,
    checkedByName: null,
    checkedByUsername: null,
  }));
}

export async function buildTodaySnapshotFromTemplate(
  template: ChecklistTemplateDocument,
  storeId: string,
  todayKey: string,
): Promise<ChecklistDocument> {
  const snapshotEntity = await initBusinessEntity(ENTITY_PREFIX.CHECKLIST);

  return {
    ...snapshotEntity,
    storeId,
    roleCode: template.roleCode,
    title: template.title,
    dateKey: todayKey,
    templateId: template.id,
    tasks: template.tasks.map((task) => ({
      ...initBaseEntity('t', task.id),
      title: task.title,
      timeLimit: task.timeLimit,
      isCompleted: false,
      dateKey: todayKey,
      checkedAt: null,
      checkedByName: null,
      checkedByUsername: null,
    })),
  };
}

export function flattenSnapshotTask(doc: ChecklistDocument, task: ChecklistTask): ChecklistItem {
  return {
    id: task.id,
    storeId: doc.storeId,
    categoryId: doc.templateId || doc.id,
    title: task.title,
    isCompleted: task.isCompleted,
    timeLimit: task.timeLimit,
    roleCode: doc.roleCode,
    dateKey: task.dateKey || doc.dateKey,
    checklistName: doc.title,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    checkedAt: task.checkedAt,
    checkedByName: task.checkedByName,
    checkedByUsername: task.checkedByUsername,
    deletedAt: task.deletedAt,
    deletedByName: task.deletedByName,
    deletedByUsername: task.deletedByUsername,
  };
}

export function flattenProcessTask(doc: ProcessDocument, task: ChecklistTemplateTask): ChecklistItem {
  return {
    id: task.id,
    storeId: doc.storeId,
    categoryId: doc.id,
    title: task.title,
    isCompleted: false,
    timeLimit: task.timeLimit,
    roleCode: doc.roleCode,
    checklistName: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    deletedAt: doc.deletedAt,
    deletedByName: doc.deletedByName,
    deletedByUsername: doc.deletedByUsername,
  };
}

export function findSnapshotTaskById(
  docs: ChecklistDocument[],
  itemId: string,
): { doc: ChecklistDocument; task: ChecklistTask } | null {
  for (const doc of docs) {
    const task = (doc.tasks || []).find((entry) => entry.id === itemId);
    if (task) {
      return { doc, task };
    }
  }
  return null;
}

export function findProcessTaskById(
  docs: ProcessDocument[],
  itemId: string,
): { doc: ProcessDocument; task: ChecklistTemplateTask } | null {
  for (const doc of docs) {
    const task = (doc.tasks || []).find((entry) => entry.id === itemId);
    if (task) {
      return { doc, task };
    }
  }
  return null;
}

export function deriveChecklistState(state: ChecklistDataState, todayKey = getTodayKey()): ChecklistDerivedState {
  const safeTemplates = state.templates.filter((template) => !template.deletedAt);
  const safeSnapshots = state.snapshots.filter((snapshot) => !snapshot.deletedAt);
  const safeProcesses = state.processes.filter((process) => !process.deletedAt);

  const todaySnapshots = safeSnapshots.filter((snapshot) => snapshot.dateKey === todayKey);
  const todayItems = todaySnapshots.flatMap((doc) =>
    (doc.tasks || [])
      .filter((task) => !task.deletedAt)
      .map((task) => flattenSnapshotTask(doc, task)),
  );

  const snapshotItems = safeSnapshots.flatMap((doc) =>
    (doc.tasks || [])
      .filter((task) => !task.deletedAt)
      .map((task) => flattenSnapshotTask(doc, task)),
  );
  const processItems = safeProcesses.flatMap((doc) =>
    (doc.tasks || []).map((task) => flattenProcessTask(doc, task)),
  );

  // Pre-group todayItems by categoryId for O(1) lookups (avoids O(n²) filter-per-category)
  const todayItemsByCategoryId = new Map<string, ChecklistItem[]>();
  let totalDone = 0;
  for (const item of todayItems) {
    const group = todayItemsByCategoryId.get(item.categoryId);
    if (group) {
      group.push(item);
    } else {
      todayItemsByCategoryId.set(item.categoryId, [item]);
    }
    if (item.isCompleted) {
      totalDone++;
    }
  }

  const todayCategoriesFromTemplates: ChecklistCategory[] = safeTemplates.map((template) => {
    const catItems = todayItemsByCategoryId.get(template.id) || [];
    const doneCount = catItems.filter((item) => item.isCompleted).length;

    return {
      id: template.id,
      storeId: template.storeId,
      title: template.title,
      countDone: doneCount,
      countTotal: catItems.length,
      isCompleted: catItems.length > 0 && doneCount === catItems.length,
    };
  });

  const templateIds = new Set(safeTemplates.map((template) => template.id));
  const orphanTodayCategories: ChecklistCategory[] = todaySnapshots
    .filter((snapshot) => !snapshot.templateId || !templateIds.has(snapshot.templateId))
    .map((snapshot) => {
      const categoryId = snapshot.templateId || snapshot.id;
      const catItems = todayItemsByCategoryId.get(categoryId) || [];
      const doneCount = catItems.filter((item) => item.isCompleted).length;
      return {
        id: categoryId,
        storeId: snapshot.storeId,
        title: snapshot.title,
        countDone: doneCount,
        countTotal: catItems.length,
        isCompleted: catItems.length > 0 && doneCount === catItems.length,
      };
    });

  const processCategories: ChecklistCategory[] = safeProcesses.map((processDoc) => ({
    id: processDoc.id,
    storeId: processDoc.storeId,
    title: processDoc.title,
    countDone: 0,
    countTotal: (processDoc.tasks || []).length,
    isCompleted: false,
  }));

  const totalCount = todayItems.length;
  const completion = totalCount > 0 ? Math.round((totalDone / totalCount) * 100) : 0;

  return {
    todayItems,
    allItems: [...snapshotItems, ...processItems],
    todayCategories: [...todayCategoriesFromTemplates, ...orphanTodayCategories],
    processCategories,
    completion: Math.min(completion, 100),
  };
}

export function mergeTemplateTasksIntoSnapshot(params: {
  snapshot: ChecklistDocument;
  pendingSync: PendingTemplateSyncState;
  nowIso: string;
  todayKey: string;
}): ChecklistTask[] {
  const { snapshot, pendingSync, nowIso, todayKey } = params;
  const previousTaskIdSet = new Set(pendingSync.previousTemplateTaskIds);
  const nextTemplateTaskMap = new Map(pendingSync.updatedTemplateTasks.map((task) => [task.id, task] as const));

  const mergedTasks: ChecklistTask[] = [];
  for (const snapshotTask of snapshot.tasks || []) {
    if (snapshotTask.deletedAt) {
      continue;
    }

    if (!previousTaskIdSet.has(snapshotTask.id)) {
      mergedTasks.push(snapshotTask);
      continue;
    }

    const nextTemplateTask = nextTemplateTaskMap.get(snapshotTask.id);
    if (!nextTemplateTask) {
      if (snapshotTask.isCompleted) {
        mergedTasks.push(snapshotTask);
      }
      continue;
    }

    mergedTasks.push({
      ...snapshotTask,
      title: nextTemplateTask.title,
      timeLimit: nextTemplateTask.timeLimit,
      updatedAt: nowIso,
    });
  }

  const existingSnapshotTaskIds = new Set((snapshot.tasks || []).map((task) => task.id));
  for (const templateTask of pendingSync.updatedTemplateTasks) {
    if (existingSnapshotTaskIds.has(templateTask.id)) {
      continue;
    }
    mergedTasks.push({
      ...initBaseEntity('t', templateTask.id),
      title: templateTask.title,
      timeLimit: templateTask.timeLimit,
      isCompleted: false,
      dateKey: todayKey,
      checkedAt: null,
      checkedByName: null,
      checkedByUsername: null,
    });
  }

  return mergedTasks;
}
