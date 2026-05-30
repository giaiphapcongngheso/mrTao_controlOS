import type {
  ChecklistCategory,
  ChecklistDocument,
  ChecklistTemplateDocument,
  ProcessDocument,
} from '../types/checklist.types';
import {
  doc,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';
import { getFirestoreDb } from './firebase-config';

/**
 * Single unified service for the "checklists" collection.
 * Each document contains a category with embedded tasks array.
 */
export const checklistService = createBaseService<ChecklistDocument, Partial<ChecklistDocument>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLISTS,
});

export async function createChecklistSnapshotOnce(
  snapshot: ChecklistDocument,
): Promise<ChecklistDocument> {
  if (!snapshot.templateId) {
    return checklistService.create(snapshot);
  }

  const db = getFirestoreDb();
  const targetRef = doc(db, 'checklists', snapshot.id);
  const guardId = [
    snapshot.storeId,
    snapshot.roleCode,
    snapshot.dateKey,
    snapshot.templateId,
  ].join('__').replace(/[^a-zA-Z0-9_-]/g, '_');
  const guardRef = doc(db, '_checklist_snapshot_guards', guardId);

  return runTransaction(db, async (tx) => {
    const guardSnap = await tx.get(guardRef);
    const guardedSnapshotId = guardSnap.exists() ? guardSnap.data().snapshotId as string | undefined : undefined;
    if (guardedSnapshotId) {
      const guardedSnapshotRef = doc(db, 'checklists', guardedSnapshotId);
      const guardedSnapshot = await tx.get(guardedSnapshotRef);
      if (guardedSnapshot.exists()) {
        const data = guardedSnapshot.data() as ChecklistDocument;
        if (!data.deletedAt) {
          return {
            ...data,
            id: guardedSnapshot.id,
          };
        }
      }
    }

    const targetSnap = await tx.get(targetRef);
    if (targetSnap.exists()) {
      throw new Error(`Document ID "${snapshot.id}" đã tồn tại trong collection "checklists". Vui lòng thử lại.`);
    }

    tx.set(targetRef, snapshot);
    tx.set(guardRef, {
      snapshotId: snapshot.id,
      storeId: snapshot.storeId,
      roleCode: snapshot.roleCode,
      dateKey: snapshot.dateKey,
      templateId: snapshot.templateId,
      updatedAt: new Date().toISOString(),
    });
    return snapshot;
  });
}

export async function softDeleteChecklistTemplateCascade(
  templateId: string,
  snapshotIds: string[],
  payload: Partial<ChecklistDocument>,
): Promise<void> {
  const db = getFirestoreDb();
  const batch = writeBatch(db);

  batch.set(doc(db, 'checklist_templates', templateId), payload, { merge: true });
  snapshotIds.forEach((snapshotId) => {
    batch.set(doc(db, 'checklists', snapshotId), payload, { merge: true });
  });

  await batch.commit();
}

export const checklistTemplateService = createBaseService<ChecklistTemplateDocument, Partial<ChecklistTemplateDocument>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLIST_TEMPLATES,
  cacheTtlMs: 5 * 60 * 1000, // 5 min - templates are admin-managed, slow-changing
});

export const processService = createBaseService<ProcessDocument, Partial<ProcessDocument>>({
  client: dataClient,
  resource: RESOURCE_PATH.PROCESSES,
  cacheTtlMs: 5 * 60 * 1000, // 5 min - process templates are slow-changing
});

/**
 * Legacy category service — kept for potential admin use.
 */
export const checklistCategoryService = createBaseService<ChecklistCategory, Partial<ChecklistCategory>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLIST_CATEGORIES,
});
