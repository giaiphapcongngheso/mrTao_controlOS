/**
 * Centralized localStorage key registry.
 *
 * All localStorage keys used across the app are declared here to prevent typos
 * and make it easy to audit stored data or rename keys in one place.
 */

export const LOCAL_STORAGE_KEYS = {
  SYSTEM_LOGS: 'mr_tao_system_logs',
  PERMISSIONS: 'mr_tao_permissions',
  STAFF_MEMBERS: 'mr_tao_staff_members',
  LOCALE: 'mr_tao_locale',
} as const;

export type LocalStorageKey = (typeof LOCAL_STORAGE_KEYS)[keyof typeof LOCAL_STORAGE_KEYS];
