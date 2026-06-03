import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';
import { getFirestoreDb, isFirebaseConfigured } from './firebase-config';
import type { AppNotification } from '../types/notification.types';

const NOTIFICATIONS_COLLECTION_NAME = 'notifications';

export const notificationsService = createBaseService<AppNotification, Partial<AppNotification>>({
  client: dataClient,
  resource: RESOURCE_PATH.NOTIFICATIONS,
});

export function subscribeNotificationsRealtime(
  onData: (items: AppNotification[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!isFirebaseConfigured) {
    let active = true;

    const load = async () => {
      try {
        const items = await notificationsService.getAll();
        if (!active) {
          return;
        }
        onData(items || []);
      } catch (error) {
        if (active) {
          onError?.(error);
        }
      }
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 4000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }

  const db = getFirestoreDb();
  const collectionRef = collection(db, NOTIFICATIONS_COLLECTION_NAME);
  const q = query(collectionRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<AppNotification, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      onError?.(error);
    },
  );

  return unsubscribe;
}

export function subscribePendingNotificationsCount(
  onData: (count: number) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!isFirebaseConfigured) {
    let active = true;

    const load = async () => {
      try {
        const items = await notificationsService.getAll();
        if (!active) {
          return;
        }
        onData((items || []).filter((item) => item.status === 'pending').length);
      } catch (error) {
        if (active) {
          onError?.(error);
        }
      }
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 4000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }

  const db = getFirestoreDb();
  const collectionRef = collection(db, NOTIFICATIONS_COLLECTION_NAME);
  const q = query(collectionRef, where('status', '==', 'pending'));

  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.size);
    },
    (error) => {
      onError?.(error);
    },
  );
}
