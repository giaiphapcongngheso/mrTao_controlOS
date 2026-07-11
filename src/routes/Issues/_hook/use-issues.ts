import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { issuesService } from '../../../services/issues-service';
import { notificationsService } from '../../../services/notifications-service';
import { emailService } from '../../../services/email-service';
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

      // Send email notification if configured
      try {
        const emailConfig = await emailService.getConfig();
        if (emailConfig.notifyOnIssueCreated && emailConfig.defaultRecipients) {
          const categoryLabels: Record<string, string> = {
            sop_error: 'Lỗi SOP / Quy trình',
            exception: 'Ngoại lệ',
            risk: 'Rủi ro',
            improvement: 'Sáng kiến / Cải tiến',
          };
          const catLabel = categoryLabels[createdIssue.category] || createdIssue.category;
          const severityLabel = createdIssue.severity === 'High' ? 'Cao' : createdIssue.severity === 'Medium' ? 'Trung bình' : 'Thấp';
          const formattedDate = new Date(now).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

          const emailAttachments = (createdIssue.attachments || []).map((url, idx) => ({
            name: `anh_minh_chung_${idx + 1}.jpg`,
            url: url,
            size: 0
          }));

          await emailService.sendEmail({
            to: emailConfig.defaultRecipients,
            subject: `[${isUrgent ? 'Khẩn' : 'Thông báo'}] Phiếu phát sinh / Cải tiến mới từ ${currentUser.fullName || currentUser.username}`,
            attachments: emailAttachments,
            htmlBody: `
              <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <h2 style="color: ${isUrgent ? '#dc2626' : '#ea580c'}; margin-top: 0; margin-bottom: 4px; font-size: 20px; font-weight: 800;">
                  PHIẾU GHI NHẬN SỰ CỐ / CẢI TIẾN MỚI
                </h2>
                <p style="color: #64748b; font-size: 12px; margin-top: 0; margin-bottom: 20px;">
                  Gửi từ hệ thống điều hành Mr Táo lúc ${formattedDate}
                </p>
                
                <!-- 1. Thông tin chung -->
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #f1f5f9;">
                  <h3 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                    1. Thông tin chung
                  </h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569; width: 35%;">Tiêu đề:</td>
                      <td style="padding: 4px 0; color: #0f172a; font-weight: bold;">${createdIssue.title}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569;">Phân loại:</td>
                      <td style="padding: 4px 0; color: #0f172a;">${catLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569;">Mức độ nghiêm trọng:</td>
                      <td style="padding: 4px 0; color: ${isUrgent ? '#dc2626' : '#0f172a'}; font-weight: bold;">${severityLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569;">Người ghi nhận:</td>
                      <td style="padding: 4px 0; color: #0f172a;">${createdIssue.submittedBy}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569;">Quy trình bị ảnh hưởng:</td>
                      <td style="padding: 4px 0; color: #0f172a;">${createdIssue.process || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569;">Người chịu trách nhiệm:</td>
                      <td style="padding: 4px 0; color: #0f172a;">${createdIssue.assignee || 'Quản lý cửa hàng'}</td>
                    </tr>
                  </table>
                </div>

                <!-- 2. Chi tiết sự cố / cải tiến -->
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #f1f5f9;">
                  <h3 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                    2. Nội dung chi tiết
                  </h3>
                  <p style="font-size: 13px; color: #334155; line-height: 1.6; margin: 0; white-space: pre-line;">
                    ${createdIssue.description || 'Không có mô tả chi tiết.'}
                  </p>
                </div>

                <!-- 3. Nguyên nhân & Giải pháp đề xuất -->
                ${createdIssue.rootCause || createdIssue.proposedSolution ? `
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #f1f5f9;">
                  <h3 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                    3. Phân tích & Giải pháp
                  </h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
                    ${createdIssue.rootCause ? `
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569; width: 35%; valign: top;">Nguyên nhân gốc rễ:</td>
                      <td style="padding: 4px 0; color: #334155; white-space: pre-line;">${createdIssue.rootCause}</td>
                    </tr>
                    ` : ''}
                    ${createdIssue.proposedSolution ? `
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569; valign: top;">Giải pháp đề xuất:</td>
                      <td style="padding: 4px 0; color: #334155; white-space: pre-line;">${createdIssue.proposedSolution}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                ` : ''}

                <!-- 4. Minh chứng đính kèm -->
                ${emailAttachments.length > 0 ? `
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                  <h3 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                    4. Hình ảnh minh chứng
                  </h3>
                  <div style="font-size: 13px;">
                    ${emailAttachments.map((file) => `
                      <div style="margin-bottom: 8px; padding: 8px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <p style="margin: 0; color: #475569;">
                          📷 <strong>${file.name}</strong> - <span style="color: #64748b; font-style: italic;">[Đã đính kèm ảnh ở cuối email]</span>
                        </p>
                      </div>
                    `).join('')}
                  </div>
                </div>
                ` : ''}

                <p style="text-align: center; margin-top: 25px;">
                  <a href="${window.location.origin}/issues" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(234, 88, 12, 0.2);">Xem chi tiết & Phê duyệt trên Web</a>
                </p>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Đây là email tự động gửi từ hệ thống quản lý điều hành Mr Táo OS.</p>
              </div>
            `
          });
        }
      } catch (emailError) {
        console.error('Failed to send email notification for SOP Issue:', emailError);
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
