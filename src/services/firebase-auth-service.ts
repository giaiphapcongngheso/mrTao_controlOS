import {
  browserSessionPersistence,
  getAuth,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type AuthError,
} from 'firebase/auth';
import { getFirebaseApp } from './firebase-config';

let authInstance: Auth | null = null;
let persistenceReady: Promise<void> | null = null;
const identityToolkitBaseUrl = 'https://identitytoolkit.googleapis.com/v1';

type IdentityToolkitAuthResponse = {
  localId: string;
};

export class FirebaseIdentityToolkitError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'FirebaseIdentityToolkitError';
    this.code = code;
  }
}

function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }

  return authInstance;
}

async function ensureSessionPersistence(auth: Auth): Promise<void> {
  if (!persistenceReady) {
    persistenceReady = setPersistence(auth, browserSessionPersistence);
  }

  await persistenceReady;
}

export async function signInWithFirebaseEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  await ensureSessionPersistence(auth);
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutFirebaseSession(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export async function getCurrentFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  return user.getIdToken(forceRefresh);
}
import { env } from './env.js';

async function postToIdentityToolkit<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const apiKey = env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new FirebaseIdentityToolkitError(
      'MISSING_API_KEY',
      'Missing VITE_FIREBASE_API_KEY for Identity Toolkit requests.',
    );
  }

  const response = await fetch(`${identityToolkitBaseUrl}/${path}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as {
    error?: {
      message?: string;
    };
  };

  if (!response.ok) {
    const errorCode = json.error?.message ?? `HTTP_${response.status}`;
    throw new FirebaseIdentityToolkitError(
      errorCode,
      `Identity Toolkit request "${path}" failed with code ${errorCode}.`,
    );
  }

  return json as T;
}

export async function ensureFirebasePasswordUser(email: string, password: string): Promise<{
  uid: string;
  status: 'created' | 'verified';
}> {
  try {
    const created = await postToIdentityToolkit<IdentityToolkitAuthResponse>('accounts:signUp', {
      email,
      password,
      returnSecureToken: true,
    });

    return { uid: created.localId, status: 'created' };
  } catch (error) {
    if (!(error instanceof FirebaseIdentityToolkitError)) {
      throw error;
    }

    if (error.code !== 'EMAIL_EXISTS') {
      throw error;
    }

    const verified = await postToIdentityToolkit<IdentityToolkitAuthResponse>(
      'accounts:signInWithPassword',
      {
        email,
        password,
        returnSecureToken: true,
      },
    );

    return { uid: verified.localId, status: 'verified' };
  }
}

export function getFirebaseAuthErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return null;
  }

  return (error as AuthError).code ?? null;
}
