import type { ChecklistDocument, ChecklistTask } from '../types/checklist.types';
import {
  buildDailySnapshot,
  generateDailySnapshotId,
} from '../routes/Checklist/checklist-domain';
import { getTodayKey } from '../routes/Checklist/checklist-utils';
import {
  checklistService,
  checklistTemplateService,
  createChecklistSnapshotOnce,
} from './checklist-service';
import { initBaseEntity } from '../types/base.types';
import { normalizeAccessCode } from '../shared/hooks/use-module-permissions';

/**
 * Ensure daily checklist snapshots exist for ALL roles that have active templates.
 *
 * Intended to run fire-and-forget after login so that every role's
 * snapshot is pre-created — eliminating the lazy-init gap where a role
 * only gets its snapshot when someone with that role opens the Checklist page.
 *
 * Safe to call multiple times (idempotent via Firestore transactions).
 */
export async function ensureAllRoleDailySnapshots(storeId: string): Promise<void> {
  const todayKey = getTodayKey();

  try {
    // 1. Fetch all templates + existing snapshots in parallel
    const [allTemplates, allSnapshots] = await Promise.all([
      checklistTemplateService.getAll(),
      checklistService.getAll(),
    ]);

    // 2. Filter active templates for this store
    const activeTemplates = (allTemplates || []).filter(
      (template) =>
        template.storeId === storeId && !template.deletedAt,
    );

    if (activeTemplates.length === 0) {
      return;
    }

    // 3. Group templates by normalized roleCode
    const templatesByRole = new Map<string, typeof activeTemplates>();
    for (const template of activeTemplates) {
      const roleCode = normalizeAccessCode(template.roleCode);
      if (!roleCode) continue;

      const group = templatesByRole.get(roleCode);
      if (group) {
        group.push(template);
      } else {
        templatesByRole.set(roleCode, [template]);
      }
    }

    // 4. Index existing today snapshots by ID for fast lookup
    const todaySnapshotsById = new Map<string, ChecklistDocument>();
    for (const snapshot of allSnapshots || []) {
      if (snapshot.dateKey === todayKey && !snapshot.deletedAt) {
        todaySnapshotsById.set(snapshot.id, snapshot);
      }
    }

    // 5. Build snapshot creation tasks for each role
    const tasks = Array.from(templatesByRole.entries()).map(
      ([roleCode, roleTemplates]) =>
        ensureSnapshotForRole(
          roleCode,
          roleTemplates,
          storeId,
          todayKey,
          todaySnapshotsById,
        ),
    );

    // 6. Run all roles in parallel — one failure won't block others
    const results = await Promise.allSettled(tasks);

    // 7. Log summary (no toast since this runs silently in background)
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn(
        `[ensureAllRoleDailySnapshots] ${failed.length}/${results.length} role(s) failed:`,
        failed.map((r) => (r as PromiseRejectedResult).reason),
      );
    }
  } catch (error) {
    // Top-level catch — don't let snapshot creation crash the app
    console.error('[ensureAllRoleDailySnapshots] Fatal error:', error);
  }
}

// ─── Internal helper ─────────────────────────────────────────────────────────

async function ensureSnapshotForRole(
  roleCode: string,
  roleTemplates: Parameters<typeof buildDailySnapshot>[0],
  storeId: string,
  todayKey: string,
  existingSnapshotsById: Map<string, ChecklistDocument>,
): Promise<void> {
  const dailySnapshotId = generateDailySnapshotId(todayKey, roleCode);
  const existingSnapshot = existingSnapshotsById.get(dailySnapshotId);

  let snapshotToWrite: ChecklistDocument;
  let shouldCreateSnapshot = false;

  if (!existingSnapshot) {
    // No snapshot yet — create fresh from all templates
    snapshotToWrite = buildDailySnapshot(roleTemplates, storeId, roleCode, todayKey);
    shouldCreateSnapshot = true;
  } else {
    // Snapshot exists — check for missing templates
    const existingTemplateIds = new Set(
      existingSnapshot.tasks
        .map((task) => task.templateId)
        .filter((id): id is string => Boolean(id)),
    );

    const missingTemplates = roleTemplates.filter(
      (template) => !existingTemplateIds.has(template.id),
    );

    if (missingTemplates.length === 0) {
      return; // Already complete
    }

    // Append tasks for missing templates
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
      })),
    );

    snapshotToWrite = {
      ...existingSnapshot,
      tasks: [...existingSnapshot.tasks, ...newTasks],
      updatedAt: nowIso,
    };
  }

  if (shouldCreateSnapshot) {
    await createChecklistSnapshotOnce(snapshotToWrite);
    return;
  }

  await checklistService.update(snapshotToWrite.id, {
    tasks: snapshotToWrite.tasks,
    updatedAt: snapshotToWrite.updatedAt,
  });
}
