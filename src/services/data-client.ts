import type { HttpClient } from '../shared/services/create-base-service';
import type { DataProvider } from '../constants/data-provider';
import { firebaseClient } from './firebase-client';
import { isFirebaseConfigured } from './firebase-config';
import { httpClient } from './http-client';

const dataProvider = (import.meta.env.VITE_DATA_PROVIDER as DataProvider | undefined) ?? undefined;

const useFirebase = dataProvider === 'firebase' || (!dataProvider && isFirebaseConfigured);

export const dataClient: HttpClient = useFirebase ? firebaseClient : httpClient;
