import { useMemo, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFirestoreInfiniteQuery } from '../../../shared/hooks/use-firestore-paged';
import { issuesService } from '../../../services/issues-service';
import { staffPermissionService } from '../../../services/admin';
import { notificationsService } from '../../../services/notifications-service';
import { MODULE_CODE } from '../../../constants/staff-permissions.constants';
import type { SOPIssue } from '../../../types/issues.types';
import type { UserSession } from '../../../stores/app-store';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const issuesQueryKeys = {
  all: ['issues'] as const,
  lists: () => [...issuesQueryKeys.all, 'list'] as const,
  list: (storeId: string) => [...issuesQueryKeys.lists(), storeId] as const,
  permissions: (userId?: string, roleCode?: string, isOwner?: boolean) =>
    [...issuesQueryKeys.all, 'permissions', userId, roleCode, isOwner] as const,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeAccessCode(value?: string | null): string {
  return (value || '').trim().toUpperCase();
}

// ─── Infinite Query Hook ─────────────────────────────────────────────────────

/**
 * Hook to fetch paginated issues using the generic useFirestoreInfiniteQuery.
 * Just 1 call — all Firestore cursor logic is handled by the shared hook.
 */
export function useIssuesInfiniteQuery(storeId: string) {
  return useFirestoreInfiniteQuery<SOPIssue>({
    queryKey: issuesQueryKeys.list(storeId),
    collectionName: 'issues',
    filters: [{ field: 'storeId', op: '==', value: storeId }],
    orderByField: 'updatedAt',
    orderDirection: 'desc',
    pageSize: 20,
    enabled: !!storeId,
  });
}

// ─── Permissions Hook ────────────────────────────────────────────────────────

/**
 * Hook to fetch staff permissions for the SOP Issues module.
 */
export function useIssuesPermissions(currentUser: UserSession | null, isOwner: boolean) {
  const queryResult = useQuery({
    queryKey: issuesQueryKeys.permissions(currentUser?.id, currentUser?.roleCode, isOwner),
    queryFn: async () => {
      if (isOwner) {
        return { canCreate: true, canUpdate: true, canDelete: true };
      }

      if (!currentUser) {
        return { canCreate: false, canUpdate: false, canDelete: false };
      }

      try {
        const allPermissions = await staffPermissionService.getAll();
        const roleCode = normalizeAccessCode(currentUser.roleCode);
        const issuesPermRow = allPermissions.find(
          (permission) =>
            normalizeAccessCode(permission.roleCode) === roleCode &&
            normalizeAccessCode(permission.module) === MODULE_CODE.LOI_SOP,
        );

        return {
          canCreate: !!issuesPermRow?.canCreate,
          canUpdate: !!issuesPermRow?.canUpdate,
          canDelete: !!issuesPermRow?.canDelete,
        };
      } catch (error) {
        console.error('Failed to load SOP issues permissions:', error);
        return { canCreate: false, canUpdate: false, canDelete: false };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !!currentUser?.id || isOwner,
  });

  const permissions = useMemo(() => {
    return queryResult.data ?? { canCreate: false, canUpdate: false, canDelete: false };
  }, [queryResult.data]);

  return {
    ...queryResult,
    permissions,
  };
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

/**
 * Hook to create a new SOP Issue and send a notification.
 */
export function useCreateIssueMutation(storeId: string, currentUser: UserSession) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issue: Omit<SOPIssue, 'id' | 'storeId'>) => {
      const now = new Date().toISOString();
      const createdIssue = await issuesService.create({
        ...issue,
        storeId,
        approvalStatus: 'pending',
        submittedAt: now,
        submittedBy: currentUser.fullName || currentUser.username,
        createdAt: now,
        updatedAt: now,
      });

      // Fire-and-forget notification creation
      const isUrgent = issue.severity === 'High' || issue.category === 'exception';
      try {
        await notificationsService.create({
          storeId,
          title: `SOP gửi duyệt: ${issue.title}`,
          type: isUrgent ? 'khan' : 'can_duyet',
          typeLabel: isUrgent ? 'KHẨN' : 'CẦN DUYỆT',
          requester: currentUser.fullName || currentUser.username,
          role: currentUser.role,
          approver: 'Quản lý cửa hàng',
          status: 'pending',
          sourceModule: 'SOP',
          sourceId: createdIssue.id,
          createdAt: now,
          updatedAt: now,
        });
      } catch (notifyError) {
        console.error('Failed to create realtime SOP approval notification:', notifyError);
      }

      return createdIssue;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: issuesQueryKeys.list(storeId) });
    },
  });
}

/**
 * Hook to update an existing SOP Issue.
 */
export function useUpdateIssueMutation(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ issueId, updates }: { issueId: string; updates: Partial<SOPIssue> }) => {
      const now = new Date().toISOString();
      return await issuesService.update(issueId, {
        ...updates,
        updatedAt: now,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: issuesQueryKeys.list(storeId) });
    },
  });
}

/**
 * Hook to delete an SOP Issue.
 */
export function useDeleteIssueMutation(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issueId: string) => {
      return await issuesService.delete(issueId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: issuesQueryKeys.list(storeId) });
    },
  });
}
