import type {
  ChecklistCategory,
  ChecklistDocument,
  ChecklistTemplateDocument,
  ProcessDocument,
} from '../types/checklist.types';
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';
import { getFirestoreDb } from './firebase-config';
import { generateSnapshotGuardId } from '../routes/Checklist/checklist-domain';

/**
 * Single unified service for the "checklists" collection.
 * Each document represents ONE day + ONE role, with all tasks embedded.
 */
export const checklistService = createBaseService<ChecklistDocument, Partial<ChecklistDocument>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLISTS,
  autoLog: { target: 'Checklist' },
});

/**
 * Create or return existing daily snapshot (1 per day per role).
 * Uses Firestore transaction with guard document for idempotency.
 *
 * ID format: CL_{dateKey}_{roleCode} (deterministic, human-readable)
 */
export async function createChecklistSnapshotOnce(
  snapshot: ChecklistDocument,
): Promise<ChecklistDocument> {
  const db = getFirestoreDb();
  const targetRef = doc(db, 'checklists', snapshot.id);
  const guardId = generateSnapshotGuardId(snapshot.storeId, snapshot.dateKey, snapshot.roleCode);
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

    // Check if target doc already exists (deterministic ID can collide with existing)
    const targetSnap = await tx.get(targetRef);
    if (targetSnap.exists()) {
      const existingData = targetSnap.data() as ChecklistDocument;
      if (!existingData.deletedAt && existingData.dateKey === snapshot.dateKey) {
        // Update guard to point to existing doc
        tx.set(guardRef, {
          snapshotId: snapshot.id,
          storeId: snapshot.storeId,
          roleCode: snapshot.roleCode,
          dateKey: snapshot.dateKey,
          updatedAt: new Date().toISOString(),
        });
        return { ...existingData, id: snapshot.id };
      }
    }

    tx.set(targetRef, snapshot);
    tx.set(guardRef, {
      snapshotId: snapshot.id,
      storeId: snapshot.storeId,
      roleCode: snapshot.roleCode,
      dateKey: snapshot.dateKey,
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

/**
 * Query checklist snapshots by date range for history tab.
 * Uses Firestore composite index: storeId + roleCode + deletedAt + dateKey
 */
export async function getChecklistsByDateRange(
  storeId: string,
  roleCode: string,
  fromDateKey: string,
  toDateKey: string,
): Promise<ChecklistDocument[]> {
  const db = getFirestoreDb();
  const colRef = collection(db, 'checklists');
  const isAll = (roleCode || '').toLowerCase() === 'all';

  const conditions = [
    where('storeId', '==', storeId),
    where('deletedAt', '==', null),
    where('dateKey', '>=', fromDateKey),
    where('dateKey', '<=', toDateKey),
  ];

  if (!isAll) {
    conditions.push(where('roleCode', '==', roleCode));
  }

  const q = query(
    colRef,
    ...conditions,
    orderBy('dateKey', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as ChecklistDocument);
}

export const checklistTemplateService = createBaseService<ChecklistTemplateDocument, Partial<ChecklistTemplateDocument>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLIST_TEMPLATES,
  cacheTtlMs: 5 * 60 * 1000, // 5 min - templates are admin-managed, slow-changing
  autoLog: { target: 'Checklist mẫu' },
});

export const processService = createBaseService<ProcessDocument, Partial<ProcessDocument>>({
  client: dataClient,
  resource: RESOURCE_PATH.PROCESSES,
  cacheTtlMs: 5 * 60 * 1000, // 5 min - process templates are slow-changing
  autoLog: { target: 'Quy trình checklist' },
});

/**
 * Legacy category service — kept for potential admin use.
 */
export const checklistCategoryService = createBaseService<ChecklistCategory, Partial<ChecklistCategory>>({
  client: dataClient,
  resource: RESOURCE_PATH.CHECKLIST_CATEGORIES,
  autoLog: { target: 'Danh mục checklist' },
});
