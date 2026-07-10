import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import type { HttpClient } from '../shared/services/create-base-service';
import { KNOWN_RESOURCE_PATHS } from '../constants/resource-paths';
import { getFirestoreDb } from './firebase-config';

const RESOURCE_PATHS_BY_SPECIFICITY = [...KNOWN_RESOURCE_PATHS].sort((a, b) => b.length - a.length);

function normalizePath(path: string): string {
  const withoutQuery = path.split('?')[0]?.split('#')[0] ?? '';
  const trimmed = withoutQuery.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '/';
}

function toCollectionName(resourcePath: string): string {
  return resourcePath
    .replace(/^\/+/, '')
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

function resolveResourceAndDocId(path: string): { resource: string; docId: string | null } {
  const normalizedPath = normalizePath(path);

  for (const resource of RESOURCE_PATHS_BY_SPECIFICITY) {
    if (normalizedPath === resource) {
      return { resource, docId: null };
    }

    const prefix = `${resource}/`;
    if (normalizedPath.startsWith(prefix)) {
      return { resource, docId: normalizedPath.slice(prefix.length) };
    }
  }

  const segments = normalizedPath.replace(/^\/+/, '').split('/').filter(Boolean);
  if (segments.length <= 1) {
    return { resource: normalizedPath, docId: null };
  }

  return {
    resource: `/${segments.slice(0, -1).join('/')}`,
    docId: segments[segments.length - 1],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanUndefined<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map((item) => cleanUndefined(item)) as unknown as T;
  }
  if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
    const res: Record<string, unknown> = {};
    for (const key of Object.keys(val as Record<string, unknown>)) {
      const v = (val as Record<string, unknown>)[key];
      if (v !== undefined) {
        res[key] = cleanUndefined(v);
      }
    }
    return res as unknown as T;
  }
  return val;
}

function withEntityId<T>(id: string, data: T): T {
  if (!isRecord(data)) {
    return data;
  }

  if ('id' in data && data.id != null) {
    return data as T;
  }

  return { ...data, id } as T;
}

// Helper function to prevent infinite pending promises due to Firestore's offline queue/retry behavior during quota limits (429) or network loss
function withTimeout<T>(promise: Promise<T>, timeoutMs = 12000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Firebase operation timeout. Please check your network or quota limit.'));
    }, timeoutMs);

    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export const firebaseClient: HttpClient = {
  async get<T>(url) {
    const db = getFirestoreDb();
    const { resource, docId } = resolveResourceAndDocId(url);
    const collectionName = toCollectionName(resource);

    if (docId) {
      const snapshot = await withTimeout(getDoc(doc(db, collectionName, docId)));
      if (!snapshot.exists()) {
        throw new Error(`Document not found for ${url}`);
      }

      return withEntityId(docId, snapshot.data() as T);
    }

    const queryIndex = url.indexOf('?');
    const hasQuery = queryIndex !== -1;
    let q = query(collection(db, collectionName));

    if (hasQuery) {
      const queryString = url.slice(queryIndex + 1);
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => {
        let typedValue: any = value;
        if (value === 'null') {
          typedValue = null;
        } else if (value === 'true') {
          typedValue = true;
        } else if (value === 'false') {
          typedValue = false;
        }

        if (key.endsWith('_gte')) {
          const field = key.slice(0, -4);
          q = query(q, where(field, '>=', typedValue));
        } else if (key.endsWith('_lte')) {
          const field = key.slice(0, -4);
          q = query(q, where(field, '<=', typedValue));
        } else {
          q = query(q, where(key, '==', typedValue));
        }
      });
    }

    const snapshot = await withTimeout(getDocs(q));
    return snapshot.docs.map((item) => withEntityId(item.id, item.data())) as T;
  },

  async post<T>(url, body) {
    const db = getFirestoreDb();
    const { resource, docId } = resolveResourceAndDocId(url);
    const collectionName = toCollectionName(resource);
    const cleanedBody = cleanUndefined(body);
    const payload = isRecord(cleanedBody) ? cleanedBody : {};

    // If URL already contains a docId (e.g. /checklists/CL300526001)
    if (docId) {
      await withTimeout(setDoc(doc(db, collectionName, docId), payload, { merge: true }));
      return withEntityId(docId, payload as T);
    }

    // If payload contains a business ID → use it as Document ID (setDoc)
    const entityId = payload.id as string | undefined;
    if (entityId) {
      const targetRef = doc(db, collectionName, entityId);
      const existingSnap = await withTimeout(getDoc(targetRef));
      if (existingSnap.exists()) {
        throw new Error(`Document ID "${entityId}" đã tồn tại trong collection "${collectionName}". Vui lòng thử lại.`);
      }
      await withTimeout(setDoc(targetRef, payload));
      return withEntityId(entityId, payload as T);
    }

    // Fallback: auto-generated Firestore ID (legacy compatibility)
    const created = await withTimeout(addDoc(collection(db, collectionName), payload));
    return withEntityId(created.id, payload as T);
  },

  async put<T>(url, body) {
    const db = getFirestoreDb();
    const { resource, docId } = resolveResourceAndDocId(url);
    if (!docId) {
      throw new Error(`Invalid firestore update path: ${url}`);
    }

    const collectionName = toCollectionName(resource);
    const cleanedBody = cleanUndefined(body);
    const payload = isRecord(cleanedBody) ? cleanedBody : {};

    await withTimeout(setDoc(doc(db, collectionName, docId), payload, { merge: true }));
    return withEntityId(docId, payload as T);
  },

  async delete<T>(url) {
    const db = getFirestoreDb();
    const { resource, docId } = resolveResourceAndDocId(url);
    if (!docId) {
      throw new Error(`Invalid firestore delete path: ${url}`);
    }

    const collectionName = toCollectionName(resource);
    await withTimeout(deleteDoc(doc(db, collectionName, docId)));
    return undefined as T;
  },
};
