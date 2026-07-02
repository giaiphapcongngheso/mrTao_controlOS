import type { HttpClient } from '../shared/services/create-base-service';
import type { DataProvider } from '../constants/data-provider';
import { firebaseClient } from './firebase-client';
import { isFirebaseConfigured } from './firebase-config';
import { httpClient } from './http-client';
import { env } from './env';

const dataProvider = (env.VITE_DATA_PROVIDER as DataProvider | undefined) ?? undefined;

const useFirebase = dataProvider === 'firebase' || (!dataProvider && isFirebaseConfigured);

export const dataClient: HttpClient = useFirebase ? firebaseClient : httpClient;
