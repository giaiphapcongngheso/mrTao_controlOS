/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  // Source of truth for valid values is DataProvider type in src/constants/data-provider.ts
  readonly VITE_DATA_PROVIDER?: 'http' | 'firebase';
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_KIOT_SYNC_FUNCTION_URL?: string;
  readonly VITE_GAS_WEBAPP_URL?: string;
  readonly VITE_GAS_SYNC_TOKEN?: string;
  readonly VITE_GAS_STAFF_AUTH_URL?: string;
  readonly VITE_GAS_STAFF_AUTH_TOKEN?: string;
  // Legacy direct KiotViet client envs kept for unused integrations; warehouse sync now uses Firebase Functions.
  readonly VITE_KIOT_CLIENT_ID?: string;
  readonly VITE_KIOT_CLIENT_SECRET?: string;
  readonly VITE_KIOT_RETAILER?: string;
  readonly VITE_KIOT_SCOPE?: string;
  readonly VITE_KIOT_TOKEN_URL?: string;
  readonly VITE_KIOT_API_BASE_URL?: string;
  readonly VITE_KIOT_PAGE_SIZE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** App version injected by Vite `define` at build time */
declare const __APP_VERSION__: string;
