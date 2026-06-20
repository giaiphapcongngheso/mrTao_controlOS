export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  deletedByName?: string | null;
  deletedByUsername?: string | null;
}

// Internal auto-increment counter for embedded entities (sync, no Firestore call)
let _embeddedCounter = 0;

/**
 * Get date key in DDMMYY format (6 digits).
 * Example: 30/05/2026 → "300526"
 */
function getDateKey6(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

/**
 * Generates a locally-unique ID for **embedded** entities (tasks inside a doc).
 * Format: `{prefix}{DDMMYY}{counter}{random}`
 *
 * NOT suitable for Firestore Document IDs — use generateBusinessId() instead.
 *
 * @example generateEntityId('t') → "t300526001x7k"
 */
export function generateEntityId(prefix: string = 't'): string {
  _embeddedCounter += 1;
  const dateKey = getDateKey6();
  const seq = String(_embeddedCounter).padStart(3, '0');
  const rand = Math.random().toString(36).slice(2, 5);
  return `${prefix}${dateKey}${seq}${rand}`;
}

/**
 * Sync initializer for **embedded** entities (e.g. tasks inside ChecklistDocument).
 * Uses client-side counter — fast, no network call.
 *
 * For top-level Firestore documents, use `initBusinessEntity()` instead.
 */
export function initBaseEntity(prefix: string = 't', customId?: string): BaseEntity {
  const nowIso = new Date().toISOString();
  return {
    id: customId || generateEntityId(prefix),
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
    deletedByName: null,
    deletedByUsername: null,
  };
}

/**
 * Async initializer for **top-level Firestore documents**.
 * Uses Firestore counter transaction for guaranteed-unique sequential IDs.
 *
 * ID format: `{PREFIX}{DDMMYY}{SEQ}` → e.g. "CL300526001"
 *
 * @example
 * ```ts
 * const entity = await initBusinessEntity('CL');
 * // entity.id === "CL300526001"
 * ```
 */
export async function initBusinessEntity(prefix: string): Promise<BaseEntity> {
  // Dynamic import to avoid circular dependency
  const { generateBusinessId } = await import('../services/counter-service');
  const id = await generateBusinessId(prefix);
  const nowIso = new Date().toISOString();
  return {
    id,
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
    deletedByName: null,
    deletedByUsername: null,
  };
}

/**
 * Updates the BaseEntity metadata fields for a soft delete operation.
 */
export function softDeleteEntity(
  user?: { fullName: string; username: string } | null
): Partial<BaseEntity> {
  const nowIso = new Date().toISOString();
  return {
    deletedAt: nowIso,
    deletedByName: user?.fullName || 'Hệ thống',
    deletedByUsername: user?.username || 'system',
    updatedAt: nowIso,
  };
}

/**
 * Guard: throws if entity has been soft-deleted.
 * Use before any update/toggle operation.
 */
export function assertNotDeleted(entity: { deletedAt?: string | null; id?: string }, label?: string): void {
  if (entity.deletedAt) {
    const name = label || 'Bản ghi';
    throw new Error(`${name} đã bị xóa trước đó. Không thể thao tác.`);
  }
}

// ─── Permission Action Types ─────────────────────────────────────────────────

export type PermissionAction = 'canView' | 'canCreate' | 'canUpdate' | 'canDelete' | 'canApprove' | 'canExport';

/**
 * Unified guard function: checks permission + soft-delete status in ONE call.
 *
 * @returns error message string if blocked, `null` if action is allowed.
 *
 * @example
 * ```ts
 * const err = guardAction(permissions, 'canUpdate', task, 'Công việc');
 * if (err) { toastError(err); return; }
 * // proceed with update...
 * ```
 */
export function guardAction(
  permissions: Partial<Record<PermissionAction, boolean>>,
  action: PermissionAction,
  entity?: { deletedAt?: string | null } | null,
  label?: string,
): string | null {
  // 1. Check permission
  if (!permissions[action]) {
    const actionLabels: Record<PermissionAction, string> = {
      canView: 'xem',
      canCreate: 'tạo mới',
      canUpdate: 'chỉnh sửa',
      canDelete: 'xóa',
      canApprove: 'phê duyệt',
      canExport: 'xuất file',
    };
    return `Bạn không có quyền ${actionLabels[action]} ${label || 'dữ liệu này'}.`;
  }

  // 2. Check soft-delete (if entity provided)
  if (entity?.deletedAt) {
    return `${label || 'Bản ghi'} đã bị xóa trước đó. Không thể thao tác.`;
  }

  return null;
}
