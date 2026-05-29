import React, { useEffect, useState } from 'react';
import IssuesView from './IssuesView';
import type { SOPIssue } from '../../types/issues.types';
import type { UserSession } from '../../stores/app-store';
import { issuesService } from '../../services/issues-service';
import { staffPermissionService } from '../../services/admin';
import { MODULE_CODE } from '../../constants/staff-permissions.constants';
import { notificationsService } from '../../services/notifications-service';

interface IssuesContainerProps {
  currentUser: UserSession;
  isOwner: boolean;
  activeStoreId: string;
  onMetricsChange?: (payload: { issues: SOPIssue[]; sopErrorsCount: number }) => void;
}

interface IssuesPermissions {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

function normalizeAccessCode(value?: string | null): string {
  return (value || '').trim().toUpperCase();
}

export default function IssuesContainer({
  currentUser,
  isOwner,
  activeStoreId,
  onMetricsChange,
}: IssuesContainerProps) {
  const [issues, setIssues] = useState<SOPIssue[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<IssuesPermissions>({
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  });

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

  useEffect(() => {
    let cancelled = false;

    const loadIssuesPermissions = async () => {
      try {
        const allPermissions = await staffPermissionService.getAll();
        if (cancelled) {
          return;
        }

        if (isOwner) {
          setPermissions({ canCreate: true, canUpdate: true, canDelete: true });
          return;
        }

        const roleCode = normalizeAccessCode(currentUser.roleCode);
        const issuesPermRow = allPermissions.find(
          (permission) =>
            normalizeAccessCode(permission.roleCode) === roleCode &&
            normalizeAccessCode(permission.module) === MODULE_CODE.LOI_SOP,
        );

        setPermissions({
          canCreate: !!issuesPermRow?.canCreate,
          canUpdate: !!issuesPermRow?.canUpdate,
          canDelete: !!issuesPermRow?.canDelete,
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải quyền xử lý lỗi SOP:', error);
          setPermissions({ canCreate: false, canUpdate: false, canDelete: false });
        }
      }
    };

    void loadIssuesPermissions();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.roleCode, isOwner]);

  useEffect(() => {
    let cancelled = false;

    const loadIssues = async () => {
      try {
        const allIssues = await issuesService.getAll();
        if (cancelled) {
          return;
        }

        const scopedIssues = (allIssues || [])
          .filter((issue) => issue.storeId === activeStoreId)
          .sort((a, b) => {
            const timeA = a.updatedAt || a.createdAt || a.date || '';
            const timeB = b.updatedAt || b.createdAt || b.date || '';
            return timeA < timeB ? 1 : -1;
          });

        setIssues(scopedIssues);
        onMetricsChange?.({
          issues: scopedIssues,
          sopErrorsCount: scopedIssues.filter((item) => item.category === 'sop_error').length,
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải danh sách lỗi SOP:', error);
          setErrorMessage('Không thể tải danh sách lỗi SOP. Vui lòng kiểm tra kết nối.');
          setIssues([]);
          onMetricsChange?.({ issues: [], sopErrorsCount: 0 });
        }
      }
    };

    void loadIssues();

    return () => {
      cancelled = true;
    };
  }, [activeStoreId]);

  const handleCreateIssue = async (issue: Omit<SOPIssue, 'id' | 'storeId'>) => {
    if (!permissions.canCreate) {
      setErrorMessage('Bạn không có quyền thêm phiếu phát sinh.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const createdIssue = await issuesService.create({
        ...issue,
        storeId: activeStoreId,
        approvalStatus: 'pending',
        submittedAt: now,
        submittedBy: currentUser.fullName || currentUser.username,
        createdAt: now,
        updatedAt: now,
      });

      const isUrgent = issue.severity === 'High' || issue.category === 'exception';
      try {
        await notificationsService.create({
          storeId: activeStoreId,
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
        console.error('Không thể bắn thông báo duyệt SOP realtime:', notifyError);
      }

      const nextIssues = [createdIssue, ...issues];
      setIssues(nextIssues);
      onMetricsChange?.({
        issues: nextIssues,
        sopErrorsCount: nextIssues.filter((item) => item.category === 'sop_error').length,
      });
      setSuccessMessage('Đã gửi phiếu SOP chờ duyệt thành công.');
      setErrorMessage(null);
    } catch (error) {
      console.error('Không thể thêm phiếu SOP:', error);
      setErrorMessage('Không thể thêm phiếu phát sinh. Vui lòng thử lại.');
    }
  };

  const handleUpdateIssue = async (issueId: string, updates: Partial<SOPIssue>) => {
    if (!permissions.canUpdate) {
      setErrorMessage('Bạn không có quyền chỉnh sửa phiếu phát sinh.');
      return;
    }

    try {
      const now = new Date().toISOString();
      await issuesService.update(issueId, {
        ...updates,
        updatedAt: now,
      });

      const nextIssues = issues.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              ...updates,
              updatedAt: now,
            }
          : issue,
      );

      setIssues(nextIssues);
      onMetricsChange?.({
        issues: nextIssues,
        sopErrorsCount: nextIssues.filter((item) => item.category === 'sop_error').length,
      });
      setSuccessMessage('Đã cập nhật phiếu phát sinh.');
      setErrorMessage(null);
    } catch (error) {
      console.error('Không thể cập nhật phiếu SOP:', error);
      setErrorMessage('Không thể cập nhật phiếu phát sinh. Vui lòng thử lại.');
    }
  };

  const handleUpdateIssueStatus = async (issueId: string, status: string) => {
    await handleUpdateIssue(issueId, {
      status,
      ...(status === 'Đã xử lý' ? {
        readConfirmedAt: new Date().toISOString(),
        readConfirmedBy: currentUser.fullName || currentUser.username,
      } : {}),
    });
  };

  const handleConfirmIssueRead = async (issueId: string) => {
    if (!permissions.canUpdate) {
      setErrorMessage('Bạn không có quyền xác nhận đã đọc.');
      return;
    }

    await handleUpdateIssue(issueId, {
      readConfirmedAt: new Date().toISOString(),
      readConfirmedBy: currentUser.fullName || currentUser.username,
    });
    setSuccessMessage('Đã xác nhận đã đọc.');
  };

  const handleDeleteIssue = async (issueId: string) => {
    if (!permissions.canDelete) {
      setErrorMessage('Bạn không có quyền xóa phiếu phát sinh.');
      return;
    }

    try {
      await issuesService.delete(issueId);

      const nextIssues = issues.filter((issue) => issue.id !== issueId);
      setIssues(nextIssues);
      onMetricsChange?.({
        issues: nextIssues,
        sopErrorsCount: nextIssues.filter((item) => item.category === 'sop_error').length,
      });
      setSuccessMessage('Đã xóa phiếu phát sinh.');
      setErrorMessage(null);
    } catch (error) {
      console.error('Không thể xóa phiếu SOP:', error);
      setErrorMessage('Không thể xóa phiếu phát sinh. Vui lòng thử lại.');
    }
  };

  return (
    <IssuesView
      issues={issues}
      permissions={permissions}
      onAddIssue={handleCreateIssue}
      onUpdateIssueStatus={handleUpdateIssueStatus}
      onUpdateIssue={handleUpdateIssue}
      onDeleteIssue={handleDeleteIssue}
      onConfirmIssueRead={handleConfirmIssueRead}
      errorMessage={errorMessage}
      successMessage={successMessage}
      onDismissError={() => setErrorMessage(null)}
      onDismissSuccess={() => setSuccessMessage(null)}
    />
  );
}
