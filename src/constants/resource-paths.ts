/**
 * Centralized resource path constants.
 *
 * Single source of truth for Firestore collection mapping and service resource URLs.
 * Both `firebase-client.ts` (KNOWN_RESOURCE_PATHS) and individual service files
 * import from here to eliminate duplication and prevent mapping drift.
 */

export const RESOURCE_PATH = {
  STORES: '/stores',
  STAFF: '/staff',
  ROLES: '/roles',
  STAFF_PERMISSIONS: '/staff/permissions',
  REPORTS_DAILY: '/reports/daily',
  KPI_STAFF_RANKS: '/kpi/staff-ranks',
  CHECKLIST_CATEGORIES: '/checklist/categories',
  CHECKLISTS: '/checklists',
  CHECKLIST_TEMPLATES: '/checklist_templates',
  PROCESSES: '/processes',
  SYSTEM_LOGS: '/systems_log',
  TODAY_TIMELINE: '/today/timeline',
  TODAY_STATS: '/today/stats',
  ISSUES: '/issues',
  NOTIFICATIONS: '/notifications',
  TASKS: '/tasks',
  PRODUCTS: '/products',
  HANDBOOK_DOCUMENTS: '/handbook/documents',
  HANDBOOK_CATEGORIES: '/handbook/categories',
  WAREHOUSE_BRANCHES: '/warehouse_branches',
  WAREHOUSE_PRODUCTS: '/warehouse_products',
  WAREHOUSE_SYNC_LOGS: '/warehouse_sync_logs',
} as const;

export type ResourcePath = (typeof RESOURCE_PATH)[keyof typeof RESOURCE_PATH];

/** Ordered list used by firebase-client to resolve URL → collection name. */
export const KNOWN_RESOURCE_PATHS: ResourcePath[] = Object.values(RESOURCE_PATH);
