import { useMemo } from 'react';
import { useStaffPermissionsQuery } from '../../routes/StaffPermissions/_hook/use-staff-permissions';
import type { UserSession } from '../../stores/app-store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalizes a role/module code string for case-insensitive comparison.
 * Centralized here to eliminate duplication across components.
 */
export function normalizeAccessCode(value?: string | null): string {
  return (value || '').trim().toUpperCase();
}

// ─── Owner Detection ─────────────────────────────────────────────────────────

const OWNER_ROLE_CODES = new Set(['CHU_CUA_HANG', 'QUAN_TRI_VIEN']);

/**
 * Determines whether a user has owner-level access (bypass all permission checks).
 */
export function isOwnerUser(user: UserSession | null): boolean {
  if (!user) {
    return false;
  }
  return user.username === 'admin' || OWNER_ROLE_CODES.has(normalizeAccessCode(user.roleCode));
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ModulePermissions {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

const DEFAULT_PERMISSIONS: ModulePermissions = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canApprove: false,
};

const FULL_PERMISSIONS: ModulePermissions = {
  canView: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  canApprove: true,
};

// ─── Hook: Single Module Permissions ─────────────────────────────────────────

/**
 * Fetches CRUD permissions for a specific module based on the current user's role.
 *
 * @param moduleCode - The module code to check (e.g., MODULE_CODE.CHECKLIST)
 * @param currentUser - The currently logged-in user session
 * @param isOwner - Whether the user has owner-level access (bypasses checks)
 *
 * @example
 * ```tsx
 * const { permissions, isLoading } = useModulePermissions(MODULE_CODE.CHECKLIST, currentUser, isOwner);
 * if (permissions.canCreate) { ... }
 * ```
 */
export function useModulePermissions(
  moduleCode: string,
  currentUser: UserSession | null,
  isOwner: boolean,
): { permissions: ModulePermissions; isLoading: boolean } {
  const shouldLoadPermissions = Boolean(currentUser) && !isOwner;
  const permissionsQuery = useStaffPermissionsQuery({ enabled: shouldLoadPermissions });

  const permissions = useMemo(() => {
    if (!currentUser) {
      return DEFAULT_PERMISSIONS;
    }

    if (isOwner) {
      return FULL_PERMISSIONS;
    }

    const allPermissions = permissionsQuery.data ?? [];
    const roleCode = normalizeAccessCode(currentUser.roleCode);
    const normalizedModule = normalizeAccessCode(moduleCode);
    const permRow = allPermissions.find(
      (row) =>
        normalizeAccessCode(row.roleCode) === roleCode &&
        normalizeAccessCode(row.module) === normalizedModule,
    );

    return {
      canView: !!permRow?.canView,
      canCreate: !!permRow?.canCreate,
      canUpdate: !!permRow?.canUpdate,
      canDelete: !!permRow?.canDelete,
      canApprove: !!permRow?.canApprove,
    };
  }, [currentUser, isOwner, moduleCode, permissionsQuery.data]);

  return {
    permissions,
    isLoading: shouldLoadPermissions ? permissionsQuery.isLoading : false,
  };
}

// ─── Hook: Allowed Module List (for sidebar visibility) ──────────────────────

/**
 * Fetches all modules that the current user has `canView` permission for.
 * Used primarily in AppShell to determine which sidebar tabs to show.
 *
 * @example
 * ```tsx
 * const { allowedModules, isLoading } = useAllowedModules(currentUser, isOwner);
 * const canSeeChecklist = allowedModules.includes('CHECKLIST');
 * ```
 */
export function useAllowedModules(
  currentUser: UserSession | null,
  isOwner: boolean,
): { allowedModules: string[]; isLoading: boolean } {
  const shouldLoadPermissions = Boolean(currentUser) && !isOwner;
  const permissionsQuery = useStaffPermissionsQuery({ enabled: shouldLoadPermissions });

  const allowedModules = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    if (isOwner) {
      return [];
    }

    const roleCode = normalizeAccessCode(currentUser.roleCode);
    const modules = (permissionsQuery.data ?? [])
      .filter(
        (permission) =>
          permission?.canView &&
          normalizeAccessCode(permission.roleCode) === roleCode,
      )
      .map((permission) => normalizeAccessCode(permission.module))
      .filter(Boolean);

    return Array.from(new Set(modules));
  }, [currentUser, isOwner, permissionsQuery.data]);

  return {
    allowedModules,
    isLoading: shouldLoadPermissions ? permissionsQuery.isLoading : false,
  };
}
