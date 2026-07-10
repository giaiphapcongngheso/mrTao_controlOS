import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { issuesService } from '../../../services/issues-service';
import { notificationsService } from '../../../services/notifications-service';
import { MODULE_CODE } from '../../../constants/staff-permissions.constants';
import { useModulePermissions } from '../../../shared/hooks/use-module-permissions';
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

// normalizeAccessCode is now centralized in shared/hooks/use-module-permissions

// ─── Infinite Query Hook ─────────────────────────────────────────────────────

/**
 * Hook to fetch and page issues through the configured data provider.
 */
function getIssueSortTime(issue: SOPIssue): number {
  const rawDate = issue.updatedAt || issue.createdAt || issue.date;
  const timestamp = rawDate ? new Date(rawDate).getTime() : Number.NaN;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function useIssuesInfiniteQuery(storeId: string) {
  const queryResult = useQuery({
    queryKey: issuesQueryKeys.list(storeId),
    queryFn: () => issuesService.getAll({ storeId }),
    enabled: !!storeId,
  });

  const items = useMemo(() => {
    return (queryResult.data ?? [])
      .filter((issue) => issue.storeId === storeId)
      .sort((a, b) => {
        const timeDiff = getIssueSortTime(b) - getIssueSortTime(a);
        if (timeDiff !== 0) {
          return timeDiff;
        }
        return b.id.localeCompare(a.id);
      });
  }, [queryResult.data, storeId]);

  return {
    items,
    fetchNextPage: queryResult.refetch,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error,
    isError: queryResult.isError,
    refetch: queryResult.refetch,
  };
}

// ─── Permissions Hook ────────────────────────────────────────────────────────

/**
 * Hook to fetch staff permissions for the SOP Issues module.
 * Delegates to the shared useModulePermissions hook.
 */
export function useIssuesPermissions(currentUser: UserSession | null, isOwner: boolean) {
  const { permissions, isLoading } = useModulePermissions(MODULE_CODE.LOI_SOP, currentUser, isOwner);

  const issuesPermissions = useMemo(() => ({
    canCreate: permissions.canCreate,
    canUpdate: permissions.canUpdate,
    canDelete: permissions.canDelete,
  }), [permissions.canCreate, permissions.canUpdate, permissions.canDelete]);

  return {
    permissions: issuesPermissions,
    isLoading,
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
