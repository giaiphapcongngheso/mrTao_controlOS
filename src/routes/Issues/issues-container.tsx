import React, { useEffect, useState, useCallback } from 'react';
import IssuesView from './issues-view';
import type { SOPIssue, SOPIssueStatus } from '../../types/issues.types';
import { RESOLVED_SOP_ISSUE_STATUS, isOpenSopIssue } from '../../types/issues.types';
import type { UserSession } from '../../stores/app-store';
import {
  useIssuesInfiniteQuery,
  useIssuesPermissions,
  useCreateIssueMutation,
  useUpdateIssueMutation,
  useDeleteIssueMutation,
} from './_hook/use-issues';

interface IssuesContainerProps {
  currentUser: UserSession;
  isOwner: boolean;
  activeStoreId: string;
  onMetricsChange?: (payload: { issues: SOPIssue[]; sopErrorsCount: number }) => void;
}

export default function IssuesContainer({
  currentUser,
  isOwner,
  activeStoreId,
  onMetricsChange,
}: IssuesContainerProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Timeouts for messages
  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    const timer = window.setTimeout(() => {
      setErrorMessage(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [errorMessage]);

  // Load permissions
  const { permissions } = useIssuesPermissions(currentUser, isOwner);

  // Load issues with pagination
  const {
    items: issues,
    error: issuesQueryError,
  } = useIssuesInfiniteQuery(activeStoreId);

  const issuesQueryErrorMessage = issuesQueryError
    ? 'Không thể tải danh sách lỗi SOP. Vui lòng thử lại.'
    : null;

  // Notify parent component when issues change
  useEffect(() => {
    onMetricsChange?.({
      issues,
      sopErrorsCount: issues.filter(isOpenSopIssue).length,
    });
  }, [issues, onMetricsChange]);

  // Mutations
  const createMutation = useCreateIssueMutation(activeStoreId, currentUser);
  const updateMutation = useUpdateIssueMutation(activeStoreId);
  const deleteMutation = useDeleteIssueMutation(activeStoreId);

  const { mutateAsync: createIssue } = createMutation;
  const { mutateAsync: updateIssue } = updateMutation;
  const { mutateAsync: deleteIssue } = deleteMutation;

  // Handlers wrapped in useCallback for performance
  const handleCreateIssue = useCallback(
    async (issue: Omit<SOPIssue, 'id' | 'storeId'>) => {
      if (!permissions.canCreate) {
        setErrorMessage('Bạn không có quyền thêm phiếu phát sinh.');
        return;
      }

      try {
        await createIssue(issue);
        setSuccessMessage('Đã gửi phiếu SOP chờ duyệt thành công.');
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to create SOP issue:', error);
        setErrorMessage('Không thể thêm phiếu phát sinh. Vui lòng thử lại.');
      }
    },
    [permissions.canCreate, createIssue]
  );

  const handleUpdateIssue = useCallback(
    async (issueId: string, updates: Partial<SOPIssue>) => {
      if (!permissions.canUpdate) {
        setErrorMessage('Bạn không có quyền chỉnh sửa phiếu phát sinh.');
        return;
      }

      try {
        await updateIssue({ issueId, updates });
        setSuccessMessage('Đã cập nhật phiếu phát sinh.');
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to update SOP issue:', error);
        setErrorMessage('Không thể cập nhật phiếu phát sinh. Vui lòng thử lại.');
      }
    },
    [permissions.canUpdate, updateIssue]
  );

  const handleUpdateIssueStatus = useCallback(
    async (issueId: string, status: SOPIssueStatus) => {
      const now = new Date().toISOString();
      const updates: Partial<SOPIssue> = {
        status,
        ...(status === RESOLVED_SOP_ISSUE_STATUS
          ? {
              readConfirmedAt: now,
              readConfirmedBy: currentUser.fullName || currentUser.username,
            }
          : {}),
      };
      await handleUpdateIssue(issueId, updates);
    },
    [handleUpdateIssue, currentUser.fullName, currentUser.username]
  );

  const handleConfirmIssueRead = useCallback(
    async (issueId: string) => {
      if (!permissions.canUpdate) {
        setErrorMessage('Bạn không có quyền xác nhận đã đọc.');
        return;
      }

      const now = new Date().toISOString();
      await handleUpdateIssue(issueId, {
        readConfirmedAt: now,
        readConfirmedBy: currentUser.fullName || currentUser.username,
      });
      setSuccessMessage('Đã xác nhận đã đọc.');
    },
    [permissions.canUpdate, handleUpdateIssue, currentUser.fullName, currentUser.username]
  );

  const handleDeleteIssue = useCallback(
    async (issueId: string) => {
      if (!permissions.canDelete) {
        setErrorMessage('Bạn không có quyền xóa phiếu phát sinh.');
        return;
      }

      try {
        await deleteIssue(issueId);
        setSuccessMessage('Đã xóa phiếu phát sinh.');
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to delete SOP issue:', error);
        setErrorMessage('Không thể xóa phiếu phát sinh. Vui lòng thử lại.');
      }
    },
    [permissions.canDelete, deleteIssue]
  );

  const handleDismissError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const handleDismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return (
    <IssuesView
      issues={issues}
      permissions={permissions}
      onAddIssue={handleCreateIssue}
      onUpdateIssueStatus={handleUpdateIssueStatus}
      onUpdateIssue={handleUpdateIssue}
      onDeleteIssue={handleDeleteIssue}
      onConfirmIssueRead={handleConfirmIssueRead}
      errorMessage={errorMessage || issuesQueryErrorMessage}
      successMessage={successMessage}
      onDismissError={handleDismissError}
      onDismissSuccess={handleDismissSuccess}
    />
  );
}
