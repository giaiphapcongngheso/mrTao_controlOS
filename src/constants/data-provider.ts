/**
 * Data provider type — single source of truth.
 *
 * Determines whether the app uses HTTP REST or Firebase Firestore as the data layer.
 * Referenced by `data-client.ts` at runtime and `vite-env.d.ts` for env type declarations.
 */

export const DATA_PROVIDER = {
  HTTP: 'http',
  FIREBASE: 'firebase',
} as const;

export type DataProvider = (typeof DATA_PROVIDER)[keyof typeof DATA_PROVIDER];
