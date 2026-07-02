const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};
const processEnv = typeof process !== 'undefined' && process.env ? process.env : {};

export const env = {
  VITE_FIREBASE_API_KEY: (metaEnv.VITE_FIREBASE_API_KEY || processEnv.VITE_FIREBASE_API_KEY || '') as string,
  VITE_FIREBASE_AUTH_DOMAIN: (metaEnv.VITE_FIREBASE_AUTH_DOMAIN || processEnv.VITE_FIREBASE_AUTH_DOMAIN || '') as string,
  VITE_FIREBASE_PROJECT_ID: (metaEnv.VITE_FIREBASE_PROJECT_ID || processEnv.VITE_FIREBASE_PROJECT_ID || '') as string,
  VITE_FIREBASE_STORAGE_BUCKET: (metaEnv.VITE_FIREBASE_STORAGE_BUCKET || processEnv.VITE_FIREBASE_STORAGE_BUCKET || '') as string,
  VITE_FIREBASE_MESSAGING_SENDER_ID: (metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || processEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '') as string,
  VITE_FIREBASE_APP_ID: (metaEnv.VITE_FIREBASE_APP_ID || processEnv.VITE_FIREBASE_APP_ID || '') as string,
  VITE_FIREBASE_MEASUREMENT_ID: (metaEnv.VITE_FIREBASE_MEASUREMENT_ID || processEnv.VITE_FIREBASE_MEASUREMENT_ID || '') as string,
  VITE_DATA_PROVIDER: (metaEnv.VITE_DATA_PROVIDER || processEnv.VITE_DATA_PROVIDER || '') as string,
  VITE_API_BASE_URL: (metaEnv.VITE_API_BASE_URL || processEnv.VITE_API_BASE_URL || '') as string,
};
