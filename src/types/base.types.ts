export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  deletedByName?: string | null;
  deletedByUsername?: string | null;
}

/**
 * Generates a short unique ID for entities if not provided.
 */
export function generateEntityId(prefix: string = 't'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Initializes the BaseEntity metadata fields when creating a new record.
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
