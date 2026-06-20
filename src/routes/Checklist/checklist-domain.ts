import type {
  ChecklistCategory,
  ChecklistDocument,
  ChecklistItem,
  ChecklistTask,
  ChecklistTemplateDocument,
  ChecklistTemplateTask,
  ProcessDocument,
} from '../../types/checklist.types';
import { initBaseEntity } from '../../types/base.types';
import { getTodayKey } from './checklist-utils';
import {
  DEFAULT_CHECKLIST_COLOR_KEY,
  DEFAULT_CHECKLIST_ICON_NAME,
} from './checklist-meta';

export type ChecklistCategoryType = 'today' | 'process';

export type SaveCategoryTaskInput = {
  id?: string;
  title: string;
  timeLimit?: string;
  isRequired?: boolean;
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
  processes: ProcessDocument[];
  completion: number;
};

export type PendingTemplateSyncState = {
  templateId: string;
  snapshotId: string;
  templateTitle: string;
  snapshotTitle: string;
  previousTemplateTaskIds: string[];
  updatedTemplateTasks: ChecklistTemplateTask[];
  evidenceRequired?: string;
};

export const EMPTY_CHECKLIST_DATA_STATE: ChecklistDataState = {
  templates: [],
  snapshots: [],
  processes: [],
};

/**
 * Generate deterministic snapshot ID: CL_{dateKey}_{roleCode}
 * e.g. "CL_2026-06-05_SALES"
 */
export function generateDailySnapshotId(dateKey: string, roleCode: string): string {
  return `CL_${dateKey}_${roleCode}`;
}

/**
 * Generate deterministic guard ID for preventing duplicate snapshots.
 * Format: {storeId}__{dateKey}__{roleCode}
 */
export function generateSnapshotGuardId(storeId: string, dateKey: string, roleCode: string): string {
  return [storeId, dateKey, roleCode].join('__').replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function normalizeTaskInputs(tasks: SaveCategoryTaskInput[]): SaveCategoryTaskInput[] {
  return (tasks || [])
    .map((task) => ({
      id: task.id,
      title: task.title.trim(),
      timeLimit: task.timeLimit?.trim() || undefined,
      isRequired: task.isRequired,
    }))
    .filter((task) => task.title.length > 0);
}

export function toTemplateTasks(tasks: SaveCategoryTaskInput[]): ChecklistTemplateTask[] {
  return normalizeTaskInputs(tasks).map((task) => ({
    id: task.id || initBaseEntity('t').id,
    title: task.title,
    timeLimit: task.timeLimit,
    isRequired: task.isRequired,
  }));
}

export function toSnapshotTasks(
  tasks: SaveCategoryTaskInput[],
  templateId: string,
  todayKey = getTodayKey(),
  evidenceRequired?: string,
): ChecklistTask[] {
  return normalizeTaskInputs(tasks).map((task) => ({
    ...initBaseEntity('t', task.id),
    title: task.title,
    timeLimit: task.timeLimit,
    isCompleted: false,
    dateKey: todayKey,
    templateId,
    checkedAt: null,
    checkedByName: null,
    checkedByUsername: null,
    isRequired: task.isRequired,
    evidenceRequired,
  }));
}

/**
 * Build a single daily snapshot from ALL templates for a given role.
 * One doc per day per role — tasks carry templateId for grouping.
 */
export function buildDailySnapshot(
  templates: ChecklistTemplateDocument[],
  storeId: string,
  roleCode: string,
  todayKey: string,
): ChecklistDocument {
  const nowIso = new Date().toISOString();
  const allTasks: ChecklistTask[] = templates.flatMap((template) =>
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

  return {
    id: generateDailySnapshotId(todayKey, roleCode),
    storeId,
    roleCode,
    dateKey: todayKey,
    tasks: allTasks,
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
    deletedByName: null,
    deletedByUsername: null,
  };
}

/**
 * Flatten a task from a snapshot doc into a flat ChecklistItem for UI display.
 * categoryId is derived from task.templateId (for grouping by template).
 */
export function flattenSnapshotTask(
  doc: ChecklistDocument,
  task: ChecklistTask,
  templateLookup?: Map<string, ChecklistTemplateDocument>,
): ChecklistItem {
  const template = task.templateId && templateLookup
    ? templateLookup.get(task.templateId)
    : undefined;
  const templateTitle = template?.title || template?.roleCode;

  return {
    id: task.id,
    storeId: doc.storeId,
    categoryId: task.templateId || doc.id,
    templateId: task.templateId,
    title: task.title,
    isCompleted: task.isCompleted,
    timeLimit: task.timeLimit,
    roleCode: doc.roleCode,
    dateKey: task.dateKey || doc.dateKey,
    checklistName: templateTitle,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    checkedAt: task.checkedAt,
    checkedByName: task.checkedByName,
    checkedByUsername: task.checkedByUsername,
    deletedAt: task.deletedAt,
    deletedByName: task.deletedByName,
    deletedByUsername: task.deletedByUsername,
    imageUrls: task.imageUrls || [],
    isRequired: task.isRequired !== undefined ? task.isRequired : template?.tasks?.find(t => t.id === task.id)?.isRequired,
    evidenceRequired: task.evidenceRequired || template?.evidenceRequired,
  };
}

export function findSnapshotTaskById(
  docs: ChecklistDocument[],
  itemId: string,
  dateKey?: string,
): { doc: ChecklistDocument; task: ChecklistTask } | null {
  for (const doc of docs) {
    if (dateKey && doc.dateKey !== dateKey) {
      continue;
    }
    const task = (doc.tasks || []).find((entry) => entry.id === itemId);
    if (task) {
      return { doc, task };
    }
  }
  return null;
}

/**
 * Derive UI state from raw data.
 * Now each day+role has at most 1 snapshot doc.
 * Categories are built from templates; tasks are grouped by task.templateId.
 */
export function deriveChecklistState(
  state: ChecklistDataState,
  todayKey = getTodayKey(),
): ChecklistDerivedState {
  const safeTemplates = state.templates.filter((template) => !template.deletedAt);
  const safeSnapshots = state.snapshots.filter((snapshot) => !snapshot.deletedAt);
  const safeProcesses = state.processes.filter((process) => !process.deletedAt);

  // Build template lookup for title resolution
  const templateLookup = new Map(safeTemplates.map((t) => [t.id, t] as const));

  // Today snapshot: at most 1 doc per role (already filtered by role in use-checklist-data)
  const todaySnapshots = safeSnapshots.filter((snapshot) => snapshot.dateKey === todayKey);
  const todayItems = todaySnapshots.flatMap((doc) =>
    (doc.tasks || [])
      .filter((task) => !task.deletedAt)
      .map((task) => flattenSnapshotTask(doc, task, templateLookup)),
  );

  // All items from all snapshots
  const snapshotItems = safeSnapshots.flatMap((doc) =>
    (doc.tasks || [])
      .filter((task) => !task.deletedAt)
      .map((task) => flattenSnapshotTask(doc, task, templateLookup)),
  );

  // Pre-group todayItems by categoryId (templateId) for O(1) lookups
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

  // Build categories from templates (each template = 1 category)
  const todayCategoriesFromTemplates: ChecklistCategory[] = safeTemplates.map((template) => {
    const catItems = todayItemsByCategoryId.get(template.id) || [];
    const doneCount = catItems.filter((item) => item.isCompleted).length;

    return {
      id: template.id,
      storeId: template.storeId,
      title: template.title || template.roleCode,
      countDone: doneCount,
      countTotal: catItems.length,
      isCompleted: catItems.length > 0 && doneCount === catItems.length,
      roleCode: template.roleCode,
      iconName: template.iconName || DEFAULT_CHECKLIST_ICON_NAME,
      colorKey: template.colorKey || DEFAULT_CHECKLIST_COLOR_KEY,
    };
  });

  // Orphan tasks: tasks in today snapshots whose templateId doesn't match any template
  const templateIds = new Set(safeTemplates.map((template) => template.id));
  const orphanCategoryIds = new Set<string>();
  for (const [catId] of todayItemsByCategoryId) {
    if (!templateIds.has(catId)) {
      orphanCategoryIds.add(catId);
    }
  }

  const orphanTodayCategories: ChecklistCategory[] = [];
  for (const catId of orphanCategoryIds) {
    const catItems = todayItemsByCategoryId.get(catId) || [];
    if (catItems.length === 0) continue;
    const doneCount = catItems.filter((item) => item.isCompleted).length;
    const firstItem = catItems[0];
    orphanTodayCategories.push({
      id: catId,
      storeId: firstItem.storeId,
      title: firstItem.checklistName || 'Khac',
      countDone: doneCount,
      countTotal: catItems.length,
      isCompleted: catItems.length > 0 && doneCount === catItems.length,
      roleCode: firstItem.roleCode,
      iconName: DEFAULT_CHECKLIST_ICON_NAME,
      colorKey: DEFAULT_CHECKLIST_COLOR_KEY,
    });
  }

  const totalCount = todayItems.length;
  const completion = totalCount > 0 ? Math.round((totalDone / totalCount) * 100) : 0;

  return {
    todayItems,
    allItems: snapshotItems,
    todayCategories: [...todayCategoriesFromTemplates, ...orphanTodayCategories],
    processes: safeProcesses,
    completion: Math.min(completion, 100),
  };
}

/**
 * Merge template task changes into the daily snapshot.
 * Handles task additions, removals, and title/timeLimit updates.
 */
export function mergeTemplateTasksIntoSnapshot(params: {
  snapshot: ChecklistDocument;
  pendingSync: PendingTemplateSyncState;
  nowIso: string;
  todayKey: string;
  evidenceRequired?: string;
}): ChecklistTask[] {
  const { snapshot, pendingSync, nowIso, todayKey, evidenceRequired } = params;
  const previousTaskIdSet = new Set(pendingSync.previousTemplateTaskIds);
  const nextTemplateTaskMap = new Map(pendingSync.updatedTemplateTasks.map((task) => [task.id, task] as const));

  const mergedTasks: ChecklistTask[] = [];
  for (const snapshotTask of snapshot.tasks || []) {
    if (snapshotTask.deletedAt) {
      continue;
    }

    // Tasks not from the synced template — keep as-is
    if (snapshotTask.templateId !== pendingSync.templateId) {
      mergedTasks.push(snapshotTask);
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
      isRequired: nextTemplateTask.isRequired,
      evidenceRequired: evidenceRequired || snapshotTask.evidenceRequired,
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
      templateId: pendingSync.templateId,
      checkedAt: null,
      checkedByName: null,
      checkedByUsername: null,
      isRequired: templateTask.isRequired,
      evidenceRequired,
    });
  }

  return mergedTasks;
}
