/**
 * Business ID prefix registry.
 *
 * Maps each Firestore collection to a short uppercase prefix.
 * Used by generateBusinessId() to create readable, structured document IDs.
 *
 * Format: {PREFIX}{DDMMYY}{SEQ} → e.g. "CL300526001"
 */
export const ENTITY_PREFIX = {
  // ─── Core Business ──────────────────────────────────────────────────
  CHECKLIST: 'CL',
  CHECKLIST_TEMPLATE: 'CLT',
  PROCESS: 'PRC',
  CHECKLIST_CATEGORY: 'CLC',
  ISSUE: 'ISS',
  TASK: 'TSK',
  NOTIFICATION: 'NTF',
  REPORT: 'RPT',

  // ─── Admin / Config ────────────────────────────────────────────────
  STORE: 'STR',
  STAFF: 'STF',
  ROLE: 'ROL',
  PERMISSION: 'PRM',
  KPI: 'KPI',

  // ─── Handbook ──────────────────────────────────────────────────────
  HANDBOOK_DOC: 'HBD',
  HANDBOOK_CAT: 'HBC',

  // ─── Logs & Stats ─────────────────────────────────────────────────
  SYSTEM_LOG: 'LOG',
  TODAY_STATS: 'STS',
  TODAY_TIMELINE: 'TML',

  // ─── Embedded / Internal (client-side counter, no Firestore transaction) ──
  /** Embedded tasks inside a ChecklistDocument */
  TASK_EMBEDDED: 't',
  /** Embedded category (legacy) */
  CATEGORY_EMBEDDED: 'cat',
} as const;

export type EntityPrefix = (typeof ENTITY_PREFIX)[keyof typeof ENTITY_PREFIX];
