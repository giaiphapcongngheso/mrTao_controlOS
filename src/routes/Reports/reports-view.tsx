import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Search, Trash2, TrendingUp, Eye, AlertTriangle } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '../../../share/ui';
import { DailyReport } from '../../types/reports.types';
import { reportsDailyService, type ReportSubmission } from '../../services/reports-service';
import { notificationsService } from '../../services/notifications-service';
import { emailService } from '../../services/email-service';
import { MODULE_CODE } from '../../constants/staff-permissions.constants';
import { useModulePermissions, isOwnerUser } from '../../shared/hooks/use-module-permissions';
import ReportForm, { type ReportFormState, type ReportPeriod, type ReportStatus } from './components/report-form';
import { useDailyReportQuery, reportsQueryKeys } from './_hook/use-reports';
import { useReportMetrics } from './_hook/use-report-metrics';
import { useIsMobile } from '../../shared/hooks/use-is-mobile';
import { MobileCard } from '../../components/custom/mobile-card';

interface ReportsViewProps {
  dailyReport: DailyReport;
  currentUser?: { fullName: string; role: string; roleCode?: string; username?: string; avatar?: string } | null;
}

function formatDateVN(dateStr?: string, period?: 'day' | 'week' | 'month'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (period === 'month' && parts.length >= 2) {
    const [year, month] = parts;
    return `Tháng ${month}/${year}`;
  }
  if (parts.length >= 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

interface ToastState {
  show: boolean;
  msg: string;
  type: 'success' | 'info' | 'error';
}

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  day: 'Cuối ngày',
  week: 'Tuần',
  month: 'Tháng',
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  green: 'Ổn định',
  yellow: 'Cần chú ý',
  red: 'Khẩn cấp',
};

const APPROVAL_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  supplement_requested: 'Cần bổ sung',
};

const FALLBACK_PERIOD_METRICS: Record<ReportPeriod, { revenue: number; billCount: number }> = {
  day: { revenue: 28450000, billCount: 236 },
  week: { revenue: 198300000, billCount: 1450 },
  month: { revenue: 850400000, billCount: 6210 },
};

const DEFAULT_FORM_STATE: ReportFormState = {
  status: 'green',
  notes: '',
  saveStatus: 'idle',
  reportDate: new Date().toISOString().slice(0, 10),
  reporter: '',
  highlightIssues: [],
  promises: [],
  attachments: [],
  recipientEmails: [],
};

const ITEMS_PER_PAGE = 5;

function formatCurrency(amount?: number): string {
  const value = amount || 0;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(value)
    .replace('₫', 'đ');
}

export default function ReportsView({
  dailyReport,
  currentUser,
}: ReportsViewProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [reportTab, setReportTab] = useState<ReportPeriod>('day');
  const [searchTerm, setSearchTerm] = useState('');
  const [showToast, setShowToast] = useState<ToastState>({ show: false, msg: '', type: 'success' });
  const [submittedReports, setSubmittedReports] = useState<ReportSubmission[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isOwner = isOwnerUser(currentUser as any);
  const { permissions } = useModulePermissions(MODULE_CODE.BAO_CAO, currentUser as any, isOwner);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  const [reportForm, setReportForm] = useState<ReportFormState>(DEFAULT_FORM_STATE);
  const reportsQuery = useDailyReportQuery();

  const {
    metrics: liveReportMetrics,
    isLoading: isMetricsLoading,
    refetch: refetchMetrics,
  } = useReportMetrics({
    storeId: dailyReport.storeId,
    dateKey: reportForm.reportDate,
    period: reportTab,
    enabled: true,
  });

  const activePeriodMetrics = useMemo(() => {
    const fallback = FALLBACK_PERIOD_METRICS[reportTab];
    const liveRevenue = liveReportMetrics.revenue;
    const liveBillCount = liveReportMetrics.billCount;

    const revenue = (liveRevenue !== undefined && liveRevenue !== null)
      ? liveRevenue
      : ((reportTab === 'day' ? dailyReport.revenue : 0) || fallback.revenue);

    const billCount = (liveBillCount !== undefined && liveBillCount !== null)
      ? liveBillCount
      : ((reportTab === 'day' ? dailyReport.billCount : 0) || fallback.billCount);

    return { revenue, billCount };
  }, [dailyReport.billCount, dailyReport.revenue, liveReportMetrics.billCount, liveReportMetrics.revenue, reportTab]);

  const defaultStatus = useMemo<ReportStatus>(() => {
    if (
      liveReportMetrics.delayedCount > 3 ||
      liveReportMetrics.sopErrorsCount > 2 ||
      liveReportMetrics.complaintsCount > 1
    ) {
      return 'red';
    }
    if (
      liveReportMetrics.delayedCount > 0 ||
      liveReportMetrics.sopErrorsCount > 0 ||
      liveReportMetrics.complaintsCount > 0 ||
      liveReportMetrics.staffIssuesCount > 0
    ) {
      return 'yellow';
    }
    return 'green';
  }, [liveReportMetrics]);

  const defaultNotes = useMemo(() => {
    const issuesText: string[] = [];
    if (liveReportMetrics.delayedCount > 0) issuesText.push(`${liveReportMetrics.delayedCount} việc trễ`);
    if (liveReportMetrics.sopErrorsCount > 0) issuesText.push(`${liveReportMetrics.sopErrorsCount} lỗi SOP`);
    if (liveReportMetrics.complaintsCount > 0) issuesText.push(`${liveReportMetrics.complaintsCount} khiếu nại`);
    if (liveReportMetrics.staffIssuesCount > 0) issuesText.push(`${liveReportMetrics.staffIssuesCount} vấn đề nhân sự`);

    const revenueLabel = new Intl.NumberFormat('vi-VN').format(activePeriodMetrics.revenue);
    if (issuesText.length > 0) {
      return `Doanh thu đạt khoảng ${revenueLabel}đ, còn ${issuesText.join(', ')} cần xử lý.`;
    }
    return `Báo cáo ${PERIOD_LABEL[reportTab].toLowerCase()} ổn định. Doanh thu khoảng ${revenueLabel}đ, hoàn thành ${liveReportMetrics.checklistPercentage}% checklist.`;
  }, [activePeriodMetrics.revenue, liveReportMetrics, reportTab]);

  const canSubmitReport = useMemo(
    () => permissions.canCreate || permissions.canUpdate,
    [permissions.canCreate, permissions.canUpdate],
  );

  const triggerToast = useCallback((msg: string, type: ToastState['type'] = 'success') => {
    setShowToast({ show: true, msg, type });
    window.setTimeout(() => {
      setShowToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  }, []);

  useEffect(() => {
    if (!isReportFormOpen) {
      setReportForm((prev) => ({
        ...prev,
        status: defaultStatus,
        notes: defaultNotes,
        saveStatus: 'idle',
      }));
    }
  }, [defaultNotes, defaultStatus, reportTab, isReportFormOpen]);

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      try {
        const allReports = await reportsDailyService.getAll();
        if (cancelled) {
          return;
        }

        const nextReports = (allReports || [])
          .filter((item) => item.storeId === dailyReport.storeId && !item.isDeleted)
          .sort((a, b) => {
            const timeA = a.updatedAt || a.createdAt || a.timestamp || '';
            const timeB = b.updatedAt || b.createdAt || b.timestamp || '';
            return timeA < timeB ? 1 : -1;
          })
          .map((item) => ({
            ...item,
            timestamp: item.timestamp || new Date(item.createdAt || Date.now()).toLocaleString('vi-VN'),
          }));

        setSubmittedReports(nextReports);
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải danh sách báo cáo:', error);
          triggerToast('Không thể tải lịch sử báo cáo từ hệ thống.', 'error');
        }
      }
    };

    void loadReports();
    return () => {
      cancelled = true;
    };
  }, [dailyReport.storeId, triggerToast]);

  useEffect(() => {
    if (!reportsQuery.data?.length) {
      return;
    }

    const nextReports = reportsQuery.data
      .filter((item) => item.storeId === dailyReport.storeId && !item.isDeleted)
      .sort((a, b) => {
        const timeA = a.updatedAt || a.createdAt || a.timestamp || '';
        const timeB = b.updatedAt || b.createdAt || b.timestamp || '';
        return timeA < timeB ? 1 : -1;
      })
      .map((item) => ({
        ...item,
        timestamp: item.timestamp || new Date(item.createdAt || Date.now()).toLocaleString('vi-VN'),
      }));

    setSubmittedReports(nextReports);
  }, [dailyReport.storeId, reportsQuery.data]);

  useEffect(() => {
    setIsLoading(true);
    setCurrentPage(1);
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [reportTab]);

  const filteredReports = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return submittedReports.filter((report) => {
      if (report.period !== reportTab) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return (
        report.notes?.toLowerCase().includes(keyword) ||
        report.actor?.toLowerCase().includes(keyword) ||
        report.timestamp?.toLowerCase().includes(keyword)
      );
    });
  }, [reportTab, searchTerm, submittedReports]);

  const totalItems = filteredReports.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE)), [totalItems]);
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReports.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, filteredReports]);

  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, index) => index + 1), [totalPages]);

  const handleReportTabChange = useCallback((tab: ReportPeriod) => {
    setReportTab(tab);
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  const handleOpenReportForm = useCallback(() => {
    const todayDateKey = new Date().toISOString().slice(0, 10);
    setReportForm({
      status: defaultStatus,
      notes: defaultNotes,
      saveStatus: 'idle',
      reportDate: todayDateKey,
      reporter: currentUser?.fullName || 'Trần Tấn Phát',
      highlightIssues: [],
      promises: [],
      attachments: [],
      recipientEmails: [],
    });
    setIsReportFormOpen(true);
  }, [currentUser?.fullName, defaultStatus, defaultNotes]);

  const handleChangeFormOpen = useCallback((open: boolean) => {
    setIsReportFormOpen(open);
  }, []);

  const handleUpdateReportForm = useCallback((updates: Partial<ReportFormState>) => {
    setReportForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSaveDraft = useCallback(() => {
    if (!canSubmitReport) {
      return;
    }
    setReportForm((prev) => ({ ...prev, saveStatus: 'saving' }));
    window.setTimeout(() => {
      setReportForm((prev) => ({ ...prev, saveStatus: 'saved' }));
      triggerToast('Đã lưu nháp báo cáo.', 'info');
      window.setTimeout(() => {
        setReportForm((prev) => ({ ...prev, saveStatus: 'idle' }));
      }, 1000);
    }, 500);
  }, [canSubmitReport, triggerToast]);

  const handleSendReport = useCallback(async () => {
    if (!canSubmitReport) {
      triggerToast('Bạn không có quyền gửi báo cáo.', 'error');
      return;
    }

    const actorName = currentUser?.fullName || 'Nhân sự vận hành';
    const now = new Date();
    const nowIso = now.toISOString();
    const dateKey = nowIso.slice(0, 10);
    const daysVN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayLabel = `${daysVN[now.getDay()]} ${now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
    const timeLabel = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const reportId = `rep-${Date.now()}`;

    const reportPayload: ReportSubmission = {
      id: reportId,
      storeId: dailyReport.storeId,
      period: reportTab,
      dateKey,
      timestamp: `${dayLabel} lúc ${timeLabel}`,
      status: reportForm.status,
      revenue: activePeriodMetrics.revenue,
      billCount: activePeriodMetrics.billCount,
      checklistPct: liveReportMetrics.checklistPercentage,
      checklistRatio: liveReportMetrics.checklistRatio,
      delayedCount: liveReportMetrics.delayedCount,
      sopErrorsCount: liveReportMetrics.sopErrorsCount,
      complaintsCount: liveReportMetrics.complaintsCount,
      staffIssuesCount: liveReportMetrics.staffIssuesCount,
      notes: reportForm.notes || defaultNotes,
      actor: reportForm.reporter || actorName,
      approvalStatus: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,

      reportDate: reportForm.reportDate,
      reporter: reportForm.reporter,
      highlightIssues: reportForm.highlightIssues,
      promises: reportForm.promises,
      attachments: reportForm.attachments,
    };

    try {
      const created = await reportsDailyService.create(reportPayload);
      const savedReport: ReportSubmission = {
        ...reportPayload,
        ...created,
        timestamp: created.timestamp || reportPayload.timestamp,
      };

      setSubmittedReports((prev) => [savedReport, ...prev.filter((item) => item.id !== savedReport.id)]);
      setCurrentPage(1);
      setIsReportFormOpen(false);

      try {
        await notificationsService.create({
          storeId: dailyReport.storeId,
          title: `Báo cáo ${PERIOD_LABEL[reportTab].toLowerCase()} gửi duyệt`,
          type: 'can_duyet',
          typeLabel: 'CẦN DUYỆT',
          requester: actorName,
          role: currentUser?.role || 'Nhân sự vận hành',
          approver: 'Quản lý cửa hàng',
          status: 'pending',
          sourceModule: 'REPORTS',
          sourceId: savedReport.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      } catch (notifyError) {
        console.error('Không thể gửi thông báo báo cáo:', notifyError);
      }

      // Tự động gửi email thông báo cho các người nhận được chọn
      try {
        const selectedEmails = reportForm.recipientEmails || [];
        let recipientList = selectedEmails.join(',');

        if (!recipientList) {
          const emailConfig = await emailService.getConfig();
          if (emailConfig.notifyOnReportCreated) {
            recipientList = emailConfig.defaultRecipients || '';
          }
        }

        if (recipientList.trim()) {
          await emailService.sendEmail({
            to: recipientList,
            subject: `[Thông báo] Có báo cáo ${PERIOD_LABEL[reportTab].toLowerCase()} mới từ ${actorName}`,
            attachments: reportPayload.attachments,
            htmlBody: `
              <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <h2 style="color: #ea580c; margin-top: 0; margin-bottom: 4px; font-size: 20px; font-weight: 800;">
                  BÁO CÁO ĐIỀU HÀNH ${PERIOD_LABEL[reportTab].toUpperCase()}
                </h2>
                <p style="color: #64748b; font-size: 12px; margin-top: 0; margin-bottom: 20px;">
                  Gửi từ hệ thống điều hành Mr Táo lúc ${savedReport.timestamp}
                </p>
                
                <!-- 1. Thông tin chung -->
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #f1f5f9;">
                  <h3 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                    1. Thông tin chung
                  </h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569; width: 35%;">Người báo cáo:</td>
                      <td style="padding: 4px 0; color: #0f172a;">${savedReport.reporter || actorName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569;">Ngày báo cáo:</td>
                      <td style="padding: 4px 0; color: #0f172a;">${formatDateVN(savedReport.reportDate, reportTab)}</td>
                    </tr>
                  </table>
                </div>

                <!-- 2. Chỉ số vận hành -->
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #f1f5f9;">
                  <h3 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                    2. Chỉ số vận hành
                  </h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569; width: 35%;">Doanh thu:</td>
                      <td style="padding: 4px 0; color: #0f172a; font-weight: bold;">${savedReport.revenue.toLocaleString('vi-VN')} đ</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569;">Số đơn hàng:</td>
                      <td style="padding: 4px 0; color: #0f172a;">${savedReport.billCount} đơn</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569;">Tỷ lệ checklist:</td>
                      <td style="padding: 4px 0; color: #0f172a;">${savedReport.checklistRatio || (savedReport.checklistPct || 0) + '%'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-weight: bold; color: #475569;">Đánh giá ca:</td>
                      <td style="padding: 4px 0;">
                        <span style="padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; 
                          background-color: ${savedReport.status === 'green' ? '#dcfce7' : savedReport.status === 'yellow' ? '#fef9c3' : '#fee2e2'};
                          color: ${savedReport.status === 'green' ? '#166534' : savedReport.status === 'yellow' ? '#854d0e' : '#991b1b'};">
                          ${savedReport.status === 'green' ? 'Tốt (Xanh)' : savedReport.status === 'yellow' ? 'Bình thường (Vàng)' : 'Cảnh báo (Đỏ)'}
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- 3. Diễn biến vận hành -->
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #f1f5f9;">
                  <h3 style="margin-top: 0; margin-bottom: 10px; color: #1e293b; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                    3. Diễn biến vận hành
                  </h3>
                  <p style="color: #334155; font-size: 13px; line-height: 1.6; margin: 0; white-space: pre-wrap; font-style: italic;">
                    ${savedReport.notes || 'Không có ghi chú diễn biến.'}
                  </p>
                </div>

                <!-- 4. Vấn đề nổi bật -->
                ${savedReport.highlightIssues && savedReport.highlightIssues.length > 0 ? `
                <div style="background-color: #fff5f5; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #fed7d7;">
                  <h3 style="margin-top: 0; margin-bottom: 12px; color: #9b2c2c; font-size: 14px; border-bottom: 1px solid #feb2b2; padding-bottom: 6px;">
                    4. Vấn đề nổi bật
                  </h3>
                  <div>
                    ${(savedReport.highlightIssues || []).map((item, idx) => `
                      <div style="margin-bottom: 12px; font-size: 13px; border-bottom: ${idx < (savedReport.highlightIssues || []).length - 1 ? '1px dashed #fecaca' : 'none'}; padding-bottom: 8px;">
                        <p style="margin: 0 0 4px 0; font-weight: bold; color: #7f1d1d;">Vấn đề ${idx + 1}: ${item.issue}</p>
                        <p style="margin: 0 0 4px 0; color: #4a5568;"><strong>Mức độ:</strong> <span style="font-weight: bold; color: ${item.severity === 'high' ? '#e53e3e' : item.severity === 'medium' ? '#dd6b20' : '#3182ce'}">${item.severity === 'high' ? 'Nghiêm trọng' : item.severity === 'medium' ? 'Trung bình' : 'Thấp'}</span></p>
                        <p style="margin: 0 0 4px 0; color: #4a5568;"><strong>Nguyên nhân:</strong> ${item.rootCause}</p>
                        <p style="margin: 0; color: #4a5568;"><strong>Hành động khắc phục:</strong> ${item.action}</p>
                      </div>
                    `).join('')}
                  </div>
                </div>
                ` : ''}

                <!-- 5. Hứa hẹn ca sau -->
                ${savedReport.promises && savedReport.promises.length > 0 ? `
                <div style="background-color: #f0fdf4; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #bbf7d0;">
                  <h3 style="margin-top: 0; margin-bottom: 12px; color: #166534; font-size: 14px; border-bottom: 1px solid #86efac; padding-bottom: 6px;">
                    5. Hứa hẹn & Cam kết
                  </h3>
                  <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e293b; line-height: 1.6;">
                    ${(savedReport.promises || []).map((item) => `
                      <li style="margin-bottom: 4px;">
                        ${item.text} ${item.completed ? '<span style="color: #166534; font-weight: bold;">(Đã hoàn thành)</span>' : ''}
                      </li>
                    `).join('')}
                  </ul>
                </div>
                ` : ''}

                <!-- 6. Hình ảnh minh chứng -->
                ${savedReport.attachments && savedReport.attachments.length > 0 ? `
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                  <h3 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                    6. Hình ảnh minh chứng
                  </h3>
                  <div style="font-size: 13px;">
                    ${(savedReport.attachments || []).map((file) => {
                      const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) || (file.url && file.url.startsWith('data:image/'));
                      if (isImage) {
                        return `
                          <div style="margin-bottom: 8px; padding: 8px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <p style="margin: 0; color: #475569;">
                              📷 <strong>${file.name}</strong> (${Math.round(file.size / 1024)} KB) - <span style="color: #64748b; font-style: italic;">[Đã đính kèm ảnh ở cuối email]</span>
                            </p>
                          </div>
                        `;
                      } else {
                        return `
                          <div style="margin-bottom: 8px; padding: 8px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <p style="margin: 0; color: #475569;">
                              📄 <strong>${file.name}</strong> (${Math.round(file.size / 1024)} KB) 
                              ${file.url ? `<br/><a href="${file.url}" target="_blank" style="color: #ea580c; font-weight: bold; text-decoration: none; display: inline-block; margin-top: 4px;">Xem tài liệu đính kèm</a>` : ''}
                            </p>
                          </div>
                        `;
                      }
                    }).join('')}
                  </div>
                </div>
                ` : ''}

                <p style="text-align: center; margin-top: 25px;">
                  <a href="${window.location.origin}/reports/${savedReport.id}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(234, 88, 12, 0.2);">Xem chi tiết & Phê duyệt trên Web</a>
                </p>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Đây là email tự động gửi từ hệ thống quản lý điều hành Mr Táo OS.</p>
              </div>
            `
          });
        }
      } catch (emailErr) {
        console.error('Lỗi khi tự động gửi mail báo cáo:', emailErr);
      }

      triggerToast('Đã gửi báo cáo lên hệ thống phê duyệt.', 'success');
    } catch (error) {
      console.error('Không thể gửi báo cáo:', error);
      triggerToast('Không thể gửi báo cáo phê duyệt. Vui lòng thử lại.', 'error');
    }
  }, [
    activePeriodMetrics.billCount,
    activePeriodMetrics.revenue,
    canSubmitReport,
    currentUser?.fullName,
    currentUser?.role,
    dailyReport.storeId,
    defaultNotes,
    liveReportMetrics,
    permissions.canUpdate,
    reportForm,
    reportTab,
    submittedReports,
    triggerToast,
  ]);

  const handleDeleteReport = useCallback(
    (reportId: string) => {
      if (!permissions.canDelete) {
        triggerToast('Bạn không có quyền xóa báo cáo.', 'error');
        return;
      }
      setDeleteTargetId(reportId);
    },
    [permissions.canDelete, triggerToast],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      // Soft delete by updating isDeleted status to bypass database delete limits
      await reportsDailyService.update(deleteTargetId, { isDeleted: true } as any);
      // Force React Query cache to invalidate and refetch new list from Firestore
      await queryClient.invalidateQueries({ queryKey: reportsQueryKeys.daily });
      triggerToast('Đã xóa báo cáo.', 'info');
      setDeleteTargetId(null);
    } catch (error) {
      console.error('Không thể xóa báo cáo:', error);
      triggerToast('Không thể xóa báo cáo trên hệ thống.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTargetId, queryClient, triggerToast]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const handleGoToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return (
    <div className="space-y-4 text-left font-sans text-sm text-slate-650">
      {showToast.show && (
        <div
          className={`fixed left-5 bottom-5 z-50 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold shadow-lg ${showToast.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
        >
          {showToast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{showToast.msg}</span>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[16px] font-bold text-slate-800">
              <TrendingUp className="h-5 w-5 text-[#C21A1A]" />
              Ký duyệt báo cáo điều hành
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-400">
              Đồng bộ dữ liệu và gửi báo cáo định kỳ cho quản lý.
            </p>
          </div>
          {permissions.canCreate && (
            <Button
              type="button"
              onClick={handleOpenReportForm}
              className="rounded-xl h-9 text-sm font-bold bg-[#C21A1A] hover:bg-[#9d1515] cursor-pointer"
            >
              Tạo báo cáo
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="bg-slate-100/90 backdrop-blur-md p-1 rounded-full border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-1 w-fit transition-all duration-300">
            {(['day', 'week', 'month'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleReportTabChange(tab)}
                className={`flex items-center gap-2 px-5 py-1.5 rounded-full font-bold text-sm transition-all duration-300 ease-out active:scale-95 cursor-pointer border-0 ${reportTab === tab
                    ? 'bg-white text-[#C21A1A] border border-slate-200/50 shadow-xs'
                    : 'text-slate-500 hover:text-[#C21A1A] hover:bg-white/50'
                  }`}
              >
                {PERIOD_LABEL[tab]}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Tìm theo nội dung, người lập..."
              className="pl-9 pr-12 text-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Xóa
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#C21A1A]" />
            <h2 className="text-[16px] font-bold text-slate-800">
              Lịch sử báo cáo {PERIOD_LABEL[reportTab].toLowerCase()}
            </h2>
          </div>
          <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-sm font-bold text-[#C21A1A]">
            {totalItems} bản ghi
          </span>
        </div>
        {isMobile ? (
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="border border-slate-200 rounded-2xl p-4 space-y-3 animate-pulse bg-white">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28 rounded" />
                        <Skeleton className="h-3 w-20 rounded" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-10 rounded" />
                        <Skeleton className="h-4 w-20 rounded" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-10 rounded" />
                        <Skeleton className="h-4 w-16 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedReports.length > 0 ? (
              paginatedReports.map((report, index) => {
                const badgeVariant = report.status === 'green' ? 'success' as const : report.status === 'yellow' ? 'warning' as const : 'error' as const;
                const accent = report.status === 'green' ? 'green' as const : report.status === 'yellow' ? 'amber' as const : 'red' as const;
                return (
                  <MobileCard
                    key={report.id}
                    variant="bordered"
                    interactive={true}
                    delayIndex={index}
                    accentColor={accent}
                  >
                    <MobileCard.Header
                      title={
                        <span className="text-slate-800 font-extrabold text-xs tracking-tight leading-normal font-sans block">
                          {report.timestamp}
                        </span>
                      }
                      subtitle={
                        <div className="flex flex-col gap-1 text-left mt-1 font-sans">
                          <span className="text-[10px] text-slate-400 font-bold">
                            Người lập: {report.actor}
                          </span>
                          <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] font-black border ${report.approvalStatus === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : report.approvalStatus === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : report.approvalStatus === 'supplement_requested'
                                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                            Phê duyệt: {APPROVAL_STATUS_LABEL[report.approvalStatus || 'pending']}
                          </span>
                        </div>
                      }
                      badge={{ text: STATUS_LABEL[report.status], variant: badgeVariant }}
                    />

                    <MobileCard.Grid
                      items={[
                        { label: 'Doanh thu', value: formatCurrency(report.revenue) },
                        { label: 'Checklist', value: `${report.checklistPct}% (${report.checklistRatio})` },
                        {
                          label: 'Sự cố',
                          value: `Trễ ${report.delayedCount} | SOP ${report.sopErrorsCount} | KN ${report.complaintsCount}`,
                          fullWidth: true
                        }
                      ]}
                    />

                    {report.notes && (
                      <div className="px-4 pb-3 text-left">
                        <p className="text-[11px] font-bold text-slate-450 line-clamp-2 leading-relaxed">
                          {report.notes}
                        </p>
                      </div>
                    )}

                    <MobileCard.Footer>
                      <div className="flex items-center justify-between w-full pt-1 font-sans">
                        <Link
                          to="/reports/$reportId"
                          params={{ reportId: report.id }}
                          className="text-[11px] font-extrabold uppercase tracking-wider text-slate-650 bg-slate-100 hover:bg-slate-200 transition-colors px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem & Duyệt</span>
                        </Link>
                        {permissions.canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(report.id)}
                            className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer border-none"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>
                    </MobileCard.Footer>
                  </MobileCard>
                );
              })
            ) : (
              <div className="py-10 text-center text-sm italic text-slate-400">
                Chưa có báo cáo nào cho kỳ này.
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="!bg-slate-100 !text-slate-700 text-sm font-bold">Thời gian</TableHead>
                  <TableHead className="!bg-slate-100 !text-slate-700 text-sm font-bold">Người lập</TableHead>
                  <TableHead className="!bg-slate-100 !text-slate-700 text-sm font-bold">Trạng thái</TableHead>
                  <TableHead className="!bg-slate-100 !text-slate-700 text-sm font-bold">Phê duyệt</TableHead>
                  <TableHead className="!bg-slate-100 !text-slate-700 text-sm font-bold">Doanh thu</TableHead>
                  <TableHead className="!bg-slate-100 !text-slate-700 text-sm font-bold">Checklist</TableHead>
                  <TableHead className="!bg-slate-100 !text-slate-700 text-sm font-bold">Sự cố</TableHead>
                  <TableHead className="!bg-slate-100 !text-slate-700 text-sm font-bold">Ghi chú</TableHead>
                  <TableHead className="!bg-slate-100 !text-slate-700 text-sm font-bold text-right">Tác vụ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={`loading-${index}`}>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedReports.length > 0 ? (
                  paginatedReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="text-sm font-semibold text-slate-700">{report.timestamp}</TableCell>
                      <TableCell className="text-sm font-semibold text-slate-700">{report.actor}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-sm font-bold ${report.status === 'green'
                              ? 'bg-emerald-50 text-emerald-700'
                              : report.status === 'yellow'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                        >
                          {STATUS_LABEL[report.status]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-sm font-bold border ${report.approvalStatus === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : report.approvalStatus === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : report.approvalStatus === 'supplement_requested'
                                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                        >
                          {APPROVAL_STATUS_LABEL[report.approvalStatus || 'pending']}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-700">
                        {formatCurrency(report.revenue)}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-700">
                        {report.checklistPct}% ({report.checklistRatio})
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-700">
                        {`Trễ ${report.delayedCount} | SOP ${report.sopErrorsCount} | KN ${report.complaintsCount}`}
                      </TableCell>
                      <TableCell className="text-sm text-slate-650 max-w-[260px]">
                        <p className="line-clamp-2">{report.notes}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to="/reports/$reportId"
                            params={{ reportId: report.id }}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-450 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                            title="Xem chi tiết & duyệt"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {permissions.canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteReport(report.id)}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer border-none"
                              title="Xóa báo cáo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm italic text-slate-400">
                      Chưa có báo cáo nào cho kỳ này.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold text-slate-500">
              Bản ghi {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(totalItems, currentPage * ITEMS_PER_PAGE)} / {totalItems}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Trước
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => handleGoToPage(pageNumber)}
                  className={`h-8 w-8 rounded-md text-sm font-black cursor-pointer ${pageNumber === currentPage
                      ? 'bg-[#C21A1A] text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      <ReportForm
        open={isReportFormOpen}
        period={reportTab}
        formState={reportForm}
        canSubmit={canSubmitReport}
        metrics={{
          revenue: activePeriodMetrics.revenue,
          billCount: activePeriodMetrics.billCount,
          checklistPercentage: liveReportMetrics.checklistPercentage,
          checklistRatio: liveReportMetrics.checklistRatio,
          delayedCount: liveReportMetrics.delayedCount,
          sopErrorsCount: liveReportMetrics.sopErrorsCount,
          complaintsCount: liveReportMetrics.complaintsCount,
          staffIssuesCount: liveReportMetrics.staffIssuesCount,
        }}
        isMetricsLoading={isMetricsLoading}
        formatCurrency={formatCurrency}
        onOpenChange={handleChangeFormOpen}
        onUpdateForm={handleUpdateReportForm}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSendReport}
        onPeriodChange={handleReportTabChange}
        onRefreshMetrics={refetchMetrics}
        currentUser={currentUser}
      />

      {/* Custom Confirm Delete Modal */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && !isDeleting && setDeleteTargetId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md border-slate-100 p-6 bg-white shadow-xl">
          <AlertDialogHeader className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <AlertDialogTitle className="text-slate-800 font-extrabold text-lg">
                Xác nhận xóa báo cáo
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 font-medium text-xs max-w-xs mx-auto">
                Hành động này không thể hoàn tác. Báo cáo này sẽ bị ẩn khỏi hệ thống vận hành.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-2 gap-2 mt-4">
            <AlertDialogCancel 
              disabled={isDeleting}
              className="w-full rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 h-10 text-xs font-bold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="w-full rounded-xl bg-[#C21A1A] hover:bg-[#9d1515] text-white border-0 h-10 text-xs font-bold shadow-xs active:scale-98 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isDeleting ? (
                <div className="flex items-center gap-1.5 justify-center">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang xóa...</span>
                </div>
              ) : (
                'Xóa báo cáo'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
