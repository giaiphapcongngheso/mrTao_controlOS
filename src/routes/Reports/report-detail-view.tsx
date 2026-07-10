// Report detail and approval view component
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Building, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  X, 
  ChevronRight, 
  MoreVertical, 
  AlertCircle,
  ThumbsUp,
  RotateCcw,
  ShieldCheck,
  HelpCircle,
  Check,
  TrendingDown,
  CornerDownRight,
  MessageSquare
} from 'lucide-react';
import { Link, useRouter } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { CustomTable } from '../../../share/components/custom-table';
import { cn } from '../../../share/lib/utils';
import {
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '../../../share/ui';
import { reportsDailyService, type ReportSubmission, type HighlightIssue, type PromiseItem, type AttachmentItem } from '../../services/reports-service';
import { notificationsService } from '../../services/notifications-service';
import { useReportDetailQuery, useDailyReportQuery } from './_hook/use-reports';
import { useIsMobile } from '../../shared/hooks/use-is-mobile';
import { MobileCard } from '../../components/custom/mobile-card';
import { useModulePermissions, isOwnerUser } from '../../shared/hooks/use-module-permissions';
import { MODULE_CODE } from '../../constants/staff-permissions.constants';

interface ReportDetailViewProps {
  reportId: string;
  dailyReport: any;
  currentUser?: { fullName: string; role: string; roleCode?: string; username?: string; avatar?: string } | null;
}

interface ToastState {
  show: boolean;
  msg: string;
  type: 'success' | 'info' | 'error';
}

const PERIOD_LABEL: Record<string, string> = {
  day: 'Cuối ngày',
  week: 'Tuần',
  month: 'Tháng',
};

const STATUS_LABEL: Record<string, string> = {
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

const APPROVAL_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-255',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  supplement_requested: 'bg-orange-50 text-orange-700 border-orange-200',
};

function formatCurrency(amount?: number): string {
  const value = amount || 0;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(value)
    .replace('₫', 'đ');
}

function formatDateVN(dateStr?: string, period?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (period === 'month' && parts.length >= 2) {
    const [year, month] = parts;
    return `Tháng ${month}/${year}`;
  }
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  if (parts.length === 2) {
    const [year, month] = parts;
    return `Tháng ${month}/${year}`;
  }
  return dateStr;
}

// Sub-component: Breadcrumb & Header Title
const ReportDetailHeader = React.memo(function ReportDetailHeader({
  period,
  onBack,
  onApprove,
  onSupplement,
  onReject,
  showActions,
  isSubmitting,
}: {
  period?: string;
  onBack: () => void;
  onApprove: () => void;
  onSupplement: () => void;
  onReject: () => void;
  showActions: boolean;
  isSubmitting: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onBack}
            className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 cursor-pointer transition-all shrink-0 bg-transparent shadow-3xs"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-left">
            <h1 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2 leading-none">
              <TrendingUp className="h-5.5 w-5.5 text-[#C21A1A]" />
              Chi tiết báo cáo {period ? PERIOD_LABEL[period].toLowerCase() : ''}
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Xem chi tiết nội dung và duyệt báo cáo của nhân viên.
            </p>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onSupplement}
              className="rounded-xl h-9 text-xs font-black border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-50 cursor-pointer shadow-3xs transition-all"
            >
              Yêu cầu bổ sung
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={onApprove}
              className="rounded-xl h-9 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-100 transition-all"
            >
              Duyệt báo cáo
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onReject}
              className="rounded-xl h-9 text-xs font-black border-rose-250 text-rose-600 bg-white hover:bg-rose-50 cursor-pointer shadow-3xs transition-all"
            >
              Từ chối
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

// Sub-component: Basic Info Box
const InfoSection = React.memo(function InfoSection({
  actor,
  department,
  reportDate,
  shift,
  status,
  approvalStatus,
  period,
}: {
  actor?: string;
  department?: string;
  reportDate?: string;
  shift?: string;
  status?: string;
  approvalStatus?: string;
  period?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
        <FileText className="h-4.5 w-4.5 text-[#C21A1A]" />
        Thông tin báo cáo
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-50 border border-slate-100 shrink-0">
            <User className="h-5 w-5 text-slate-500" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Người lập</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{actor || 'Chưa xác định'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-50 border border-slate-100 shrink-0">
            <Calendar className="h-5 w-5 text-slate-500" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Thời gian báo cáo</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{formatDateVN(reportDate, period) || 'Chưa xác định'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-50 border border-slate-100 shrink-0">
            <Clock className="h-5 w-5 text-slate-500" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Trạng thái vận hành / duyệt</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${
                status === 'green' ? 'bg-emerald-50 text-emerald-700' : status === 'yellow' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {STATUS_LABEL[status || 'green']}
              </span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black border ${
                APPROVAL_STATUS_STYLES[approvalStatus || 'pending']
              }`}>
                {APPROVAL_STATUS_LABEL[approvalStatus || 'pending']}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

interface MetricComparison {
  text: string;
  isPositive: boolean;
  hasPrev: boolean;
}

interface ReportComparison {
  revenue: MetricComparison;
  billCount: MetricComparison;
  checklist: MetricComparison;
  issues: MetricComparison;
}

const MetricsSection = React.memo(function MetricsSection({
  revenue,
  billCount,
  checklistPct,
  checklistRatio,
  delayedCount,
  sopErrorsCount,
  complaintsCount,
  staffIssuesCount,
  comparison,
}: {
  revenue: number;
  billCount: number;
  checklistPct: number;
  checklistRatio: string;
  delayedCount: number;
  sopErrorsCount: number;
  complaintsCount: number;
  staffIssuesCount: number;
  comparison: ReportComparison;
}) {
  const currentIssues = (delayedCount || 0) + (sopErrorsCount || 0) + (complaintsCount || 0) + (staffIssuesCount || 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Revenue Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left flex flex-col justify-between space-y-2 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Doanh thu (VND)</span>
          <div className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
        <div>
          <p className="text-base sm:text-lg font-black text-slate-800">{formatCurrency(revenue)}</p>
          <span className={`text-[10px] font-bold flex items-center gap-0.5 mt-1 ${
            !comparison.revenue.hasPrev ? 'text-slate-400' : comparison.revenue.isPositive ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {comparison.revenue.text}
          </span>
        </div>
      </div>

      {/* Bill Count Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left flex flex-col justify-between space-y-2 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Số đơn hàng</span>
          <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        <div>
          <p className="text-base sm:text-lg font-black text-slate-800">{billCount} đơn</p>
          <span className={`text-[10px] font-bold flex items-center gap-0.5 mt-1 ${
            !comparison.billCount.hasPrev ? 'text-slate-400' : comparison.billCount.isPositive ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {comparison.billCount.text}
          </span>
        </div>
      </div>

      {/* Checklist Completed Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left flex flex-col justify-between space-y-2 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Checklist hoàn thành</span>
          <div className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
        <div>
          <p className="text-base sm:text-lg font-black text-slate-800">{checklistPct}%</p>
          <span className={`text-[10px] font-bold flex items-center gap-0.5 mt-1 ${
            !comparison.checklist.hasPrev ? 'text-slate-400' : comparison.checklist.isPositive ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {comparison.checklist.text} {comparison.checklist.hasPrev && `(Tỉ lệ: ${checklistRatio})`}
          </span>
        </div>
      </div>

      {/* Issues Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left flex flex-col justify-between space-y-2 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Sự cố phát sinh</span>
          <div className="h-7 w-7 rounded-full bg-rose-50 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
        </div>
        <div>
          <p className="text-base sm:text-lg font-black text-slate-800">
            {currentIssues} sự cố
          </p>
          <span className={`text-[10px] font-bold flex items-center gap-0.5 mt-1 ${
            !comparison.issues.hasPrev ? 'text-slate-400' : comparison.issues.isPositive ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {comparison.issues.text}
          </span>
        </div>
      </div>
    </div>
  );
});

// Sub-component: Narrative Operational Text
const NarrativeSection = React.memo(function NarrativeSection({ notes }: { notes?: string }) {
  return (
    <div className="space-y-3 text-left">
      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
        <FileText className="h-4.5 w-4.5 text-[#C21A1A]" />
        Diễn biến vận hành
      </h3>
      <div className="rounded-xl bg-slate-50/50 p-4 border border-slate-100 text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap">
        {notes || 'Không có ghi nhận diễn biến đặc biệt nào trong kỳ báo cáo.'}
      </div>
    </div>
  );
});

const IssuesTable = React.memo(function IssuesTable({ issues }: { issues?: HighlightIssue[] }) {
  const isMobile = useIsMobile();
  const columns = React.useMemo<ColumnDef<HighlightIssue>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        cell: ({ row }) => (
          <span className="font-bold text-slate-400 flex items-center justify-center h-full">
            {row.index + 1}
          </span>
        ),
        meta: { width: 50 },
      },
      {
        accessorKey: 'issue',
        header: 'Vấn đề',
        cell: ({ row }) => <span className="font-bold text-slate-800">{row.original.issue}</span>,
        meta: {
          sticky: 'left',
        },
      },
      {
        accessorKey: 'severity',
        header: 'Mức độ',
        cell: ({ row }) => {
          const val = row.original.severity;
          if (val === 'high') {
            return <span className="rounded-md bg-rose-50 text-rose-700 px-2 py-0.5 text-[10px] font-black border border-rose-200">Cao</span>;
          }
          if (val === 'medium') {
            return <span className="rounded-md bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-black border border-amber-200">T.Bình</span>;
          }
          return <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-black border border-slate-200">Thấp</span>;
        },
        meta: { width: 90 },
      },
      {
        accessorKey: 'rootCause',
        header: 'Nguyên nhân',
        cell: ({ row }) => <span className="text-slate-500 font-semibold">{row.original.rootCause || 'N/A'}</span>,
      },
      {
        accessorKey: 'action',
        header: 'Hành động khắc phục',
        cell: ({ row }) => <span className="text-slate-600 font-semibold">{row.original.action || 'N/A'}</span>,
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
            row.original.severity === 'high' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            {row.original.severity === 'high' ? 'Đang theo dõi' : 'Đã xử lý'}
          </span>
        ),
        meta: { width: 100 },
      }
    ],
    []
  );

  return (
    <div className="space-y-3 text-left font-sans">
      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
        <AlertTriangle className="h-4.5 w-4.5 text-[#C21A1A]" />
        Vấn đề & hành động
      </h3>
      {isMobile ? (
        <div className="space-y-3">
          {!issues || issues.length === 0 ? (
            <div className="bg-white p-6 text-center rounded-xl border border-slate-200 text-xs italic text-slate-400">
              Không ghi nhận vấn đề nổi bật nào trong ca/tuần làm việc.
            </div>
          ) : (
            issues.map((item, index) => {
              const severityLabel = item.severity === 'high' ? 'Cao' : item.severity === 'medium' ? 'T.Bình' : 'Thấp';
              const accent = item.severity === 'high' ? 'red' as const : item.severity === 'medium' ? 'amber' as const : 'slate' as const;
              const badgeVariant = item.severity === 'high' ? 'warning' as const : 'success' as const;
              const badgeText = item.severity === 'high' ? 'Đang theo dõi' : 'Đã xử lý';
              
              return (
                <MobileCard
                  key={index}
                  variant="bordered"
                  delayIndex={index}
                  accentColor={accent}
                >
                  <MobileCard.Header
                    title={
                      <span className="text-slate-800 font-extrabold text-xs tracking-tight leading-normal font-sans block">
                        {item.issue}
                      </span>
                    }
                    subtitle={
                      <span className="text-[10px] text-slate-400 font-bold font-sans block">
                        Mức độ: {severityLabel}
                      </span>
                    }
                    badge={{ text: badgeText, variant: badgeVariant }}
                  />

                  <MobileCard.Grid
                    items={[
                      { label: 'Nguyên nhân', value: item.rootCause || 'N/A', fullWidth: true },
                      { label: 'Khắc phục', value: item.action || 'N/A', fullWidth: true }
                    ]}
                  />
                </MobileCard>
              );
            })
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <CustomTable
            columns={columns}
            data={issues || []}
            enableFiltering={false}
            enableColumnVisibility={false}
            enableSorting={false}
            enablePagination={false}
            emptyMessage="Không ghi nhận vấn đề nổi bật nào trong ca/tuần làm việc."
            tableMinWidth={750}
            className="text-xs"
          />
        </div>
      )}
    </div>
  );
});


// Sub-component: Followup Checklist Promises
const FollowupSection = React.memo(function FollowupSection({ promises }: { promises?: PromiseItem[] }) {
  return (
    <div className="space-y-3 text-left">
      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
        <CheckCircle2 className="h-4.5 w-4.5 text-[#C21A1A]" />
        Việc cần follow-up
      </h3>
      <div className="space-y-2">
        {promises && promises.length > 0 ? (
          promises.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 border border-slate-100 rounded-xl p-3 bg-slate-50/30 hover:bg-slate-50/60 transition-colors"
            >
              <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 ${
                item.completed ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-slate-300 bg-white'
              }`}>
                {item.completed && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <span className={`text-xs font-semibold text-slate-700 ${
                item.completed ? 'line-through text-slate-400 font-normal' : ''
              }`}>
                {item.text}
              </span>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-xs italic text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Chưa thiết lập đầu việc cần cam kết tiếp theo.
          </div>
        )}
      </div>
    </div>
  );
});

// Sub-component: File Attachments Grid
const AttachmentsSection = React.memo(function AttachmentsSection({ attachments }: { attachments?: AttachmentItem[] }) {
  return (
    <div className="space-y-3 text-left">
      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
        <FileText className="h-4.5 w-4.5 text-[#C21A1A]" />
        Tệp đính kèm
      </h3>
      {attachments && attachments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between border border-slate-200 rounded-xl p-2.5 bg-white shadow-3xs hover:border-slate-350 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-5.5 w-5.5 text-rose-500 shrink-0" />
                <div className="truncate text-left">
                  <p className="text-xs font-bold text-slate-700 truncate leading-tight">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold leading-tight mt-0.5">
                    {Math.round(file.size / 1024)} KB
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="ghost"
                className="text-xs font-black text-slate-400 hover:text-slate-600 px-2 py-1 h-auto rounded-lg cursor-pointer"
              >
                <a href={file.url || '#'} target="_blank" rel="noopener noreferrer" download={file.name}>
                  Tải
                </a>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center text-xs italic text-slate-400 border border-dashed border-slate-200 rounded-xl">
          Không có tệp đính kèm nào được gửi lên.
        </div>
      )}
    </div>
  );
});

const QuickCommentButton = React.memo(function QuickCommentButton({
  label,
  text,
  className,
  onClick,
}: {
  label: string;
  text: string;
  className: string;
  onClick: (val: string) => void;
}) {
  const handleClick = useCallback(() => {
    onClick(text);
  }, [onClick, text]);

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleClick}
      className={cn(
        "rounded-full px-3 py-1 h-auto text-[10px] font-black cursor-pointer border transition-colors",
        className
      )}
    >
      {label}
    </Button>
  );
});

// Sub-component: Approval Panel (Right Column)
const ApprovalPanel = React.memo(function ApprovalPanel({
  comment,
  onCommentChange,
  onQuickComment,
  approvalStatus,
  history,
  currentUser,
  canApprove,
}: {
  comment: string;
  onCommentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onQuickComment: (val: string) => void;
  approvalStatus: string;
  history: Array<{ action: string; timestamp: string; actor: string; note?: string }>;
  currentUser?: any;
  canApprove: boolean;
}) {

  return (
    <div className="space-y-6">
      {/* 1. Nhận xét của quản lý */}
      {canApprove && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs text-left">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <MessageSquareIcon className="h-4.5 w-4.5 text-slate-600" />
            Nhận xét của quản lý
          </h3>
          <Textarea
            value={comment}
            onChange={onCommentChange}
            placeholder="Nhập nhận xét, góp ý hoặc yêu cầu bổ sung..."
            className="min-h-[100px] text-xs leading-relaxed border-slate-250 focus:border-[#C21A1A] rounded-xl placeholder:text-slate-350"
          />
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-black text-slate-400 block mb-1.5">GỢI Ý NHANH:</span>
            <div className="flex flex-wrap gap-1.5">
              <QuickCommentButton
                label="👍 Làm tốt"
                text="Báo cáo hoàn thành tốt, đầy đủ số liệu."
                className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50"
                onClick={onQuickComment}
              />
              <QuickCommentButton
                label="⚠️ Cần cải thiện"
                text="Cần khắc phục nhanh vấn đề trễ đơn hàng vận chuyển."
                className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100/50"
                onClick={onQuickComment}
              />
              <QuickCommentButton
                label="🔄 Cần bổ sung thông tin"
                text="Bổ sung thêm hình ảnh biên bản sự cố kiểm kho."
                className="bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100/50"
                onClick={onQuickComment}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Lịch sử duyệt */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs text-left">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 text-slate-600" />
          Lịch sử duyệt
        </h3>
        <div className="relative border-l border-slate-150 pl-4.5 ml-2 space-y-5">
          {history.map((step, idx) => (
            <div key={idx} className="relative text-xs">
              {/* Dot decoration */}
              <div className={`absolute -left-[24.5px] top-1 h-3 w-3 rounded-full border-2 bg-white flex items-center justify-center ${
                step.action === 'approved' 
                  ? 'border-emerald-500' 
                  : step.action === 'supplement_requested' 
                    ? 'border-orange-500' 
                    : step.action === 'rejected' 
                      ? 'border-rose-500' 
                      : 'border-slate-400'
              }`}>
                {step.action === 'approved' && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
              </div>

              <div className="font-bold text-slate-800 flex justify-between gap-2">
                <span>
                  {step.action === 'created' && '✏️ Tạo báo cáo'}
                  {step.action === 'submitted' && '🚀 Đã gửi báo cáo'}
                  {step.action === 'supplement_requested' && '🔄 Yêu cầu bổ sung'}
                  {step.action === 'approved' && '✅ Đã duyệt báo cáo'}
                  {step.action === 'rejected' && '❌ Từ chối báo cáo'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{step.timestamp}</span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">{step.actor}</p>
              {step.note && (
                <div className="mt-1 bg-slate-50 rounded-lg p-2 border border-slate-100 text-slate-600 font-semibold italic flex gap-1 items-start">
                  <CornerDownRight className="h-3 w-3 mt-0.5 shrink-0 text-slate-400" />
                  <span>{step.note}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Ghi chú dữ liệu */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs text-left">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-slate-600" />
          Ghi chú dữ liệu
        </h3>
        <p className="text-[11px] text-slate-400 font-black tracking-wide uppercase mb-1">Tự động đồng bộ</p>
        <ul className="space-y-2 text-xs font-semibold text-slate-500">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Doanh thu: từ hệ thống bán hàng</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Số đơn hàng: từ POS/OMS</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Checklist: từ nhiệm vụ hệ thống</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Sự cố: từ biểu mẫu sự cố</span>
          </li>
        </ul>
      </div>

      {/* 4. Trạng thái báo cáo */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs text-left">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <HelpCircle className="h-4.5 w-4.5 text-slate-600" />
          Trạng thái báo cáo
        </h3>
        <ul className="space-y-2.5 text-xs font-semibold text-slate-600">
          <li className="flex items-start gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1" />
            <div className="text-left leading-none">
              <p className="font-bold text-slate-800 text-xs">Chờ duyệt</p>
              <p className="text-[10px] text-slate-400 mt-1">Đang chờ quản lý xem và duyệt</p>
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 mt-1" />
            <div className="text-left leading-none">
              <p className="font-bold text-slate-800 text-xs">Cần bổ sung</p>
              <p className="text-[10px] text-slate-400 mt-1">Quản lý yêu cầu sửa đổi, bổ sung</p>
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
            <div className="text-left leading-none">
              <p className="font-bold text-slate-800 text-xs">Đã duyệt</p>
              <p className="text-[10px] text-slate-400 mt-1">Báo cáo đã được duyệt chính thức</p>
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1" />
            <div className="text-left leading-none">
              <p className="font-bold text-slate-800 text-xs">Từ chối</p>
              <p className="text-[10px] text-slate-400 mt-1">Báo cáo không đạt yêu cầu</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
});

// Wrapper to prevent Lucide warning
function MessageSquareIcon(props: React.ComponentProps<typeof MessageSquare>) {
  return <MessageSquare {...props} />;
}

export default function ReportDetailView({
  reportId,
  dailyReport,
  currentUser,
}: ReportDetailViewProps) {
  const isOwner = useMemo(() => isOwnerUser(currentUser as any), [currentUser]);
  const { permissions } = useModulePermissions(MODULE_CODE.BAO_CAO, currentUser as any, isOwner);

  const router = useRouter();
  const [toast, setToast] = useState<ToastState>({ show: false, msg: '', type: 'success' });
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch report detail using base query hook
  const { data: report, isLoading, refetch, error } = useReportDetailQuery(reportId);
  const { data: allReports } = useDailyReportQuery();

  const comparisonStats = useMemo<ReportComparison>(() => {
    const fallback: ReportComparison = {
      revenue: { text: '-- so với kỳ trước', isPositive: true, hasPrev: false },
      billCount: { text: '-- so với kỳ trước', isPositive: true, hasPrev: false },
      checklist: { text: '-- so với kỳ trước', isPositive: true, hasPrev: false },
      issues: { text: '-- so với kỳ trước', isPositive: false, hasPrev: false },
    };

    if (!report || !allReports || allReports.length === 0) {
      return fallback;
    }

    // 1. Filter reports of same store and same period
    const filtered = allReports
      .filter((r) => r.storeId === report.storeId && r.period === report.period)
      .sort((a, b) => (a.dateKey || '').localeCompare(b.dateKey || ''));

    // 2. Find index of current report
    const currentIndex = filtered.findIndex((r) => r.id === report.id);
    if (currentIndex <= 0) {
      // First report or not found, no previous data
      return fallback;
    }

    const prev = filtered[currentIndex - 1];
    const label = report.period === 'day' ? 'ngày' : report.period === 'week' ? 'tuần' : 'tháng';

    // Revenue compare
    const prevRev = prev.revenue || 0;
    const curRev = report.revenue || 0;
    let revText = `Không thay đổi so với ${label} trước`;
    let revPositive = true;
    if (prevRev > 0) {
      const pct = ((curRev - prevRev) / prevRev) * 100;
      revPositive = pct >= 0;
      revText = `${revPositive ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}% so với ${label} trước`;
    }

    // Bill count compare
    const prevBills = prev.billCount || 0;
    const curBills = report.billCount || 0;
    const diffBills = curBills - prevBills;
    const billPositive = diffBills >= 0;
    const billText = diffBills === 0 
      ? `Không thay đổi` 
      : `${billPositive ? '▲' : '▼'} ${Math.abs(diffBills)} đơn so với ${label} trước`;

    // Checklist compare
    const prevCheck = prev.checklistPct || 0;
    const curCheck = report.checklistPct || 0;
    const diffCheck = curCheck - prevCheck;
    const checkPositive = diffCheck >= 0;
    const checkText = diffCheck === 0 
      ? `Không thay đổi` 
      : `${checkPositive ? '▲' : '▼'} ${Math.abs(diffCheck)}% so với ${label} trước`;

    // Issues compare
    const prevIssues = (prev.delayedCount || 0) + (prev.sopErrorsCount || 0) + (prev.complaintsCount || 0) + (prev.staffIssuesCount || 0);
    const curIssues = (report.delayedCount || 0) + (report.sopErrorsCount || 0) + (report.complaintsCount || 0) + (report.staffIssuesCount || 0);
    const diffIssues = curIssues - prevIssues;
    // For issues, negative diff is positive growth (fewer errors is good)
    const issuesPositive = diffIssues <= 0;
    const issuesText = diffIssues === 0 
      ? `Không thay đổi` 
      : `${diffIssues > 0 ? '▲' : '▼'} ${Math.abs(diffIssues)} sự cố so với ${label} trước`;

    return {
      revenue: { text: revText, isPositive: revPositive, hasPrev: true },
      billCount: { text: billText, isPositive: billPositive, hasPrev: true },
      checklist: { text: checkText, isPositive: checkPositive, hasPrev: true },
      issues: { text: issuesText, isPositive: issuesPositive, hasPrev: true },
    };
  }, [report, allReports]);

  const triggerToast = useCallback((msg: string, type: ToastState['type'] = 'success') => {
    setToast({ show: true, msg, type });
    window.setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  }, []);

  const handleBack = useCallback(() => {
    router.navigate({ to: '/reports' });
  }, [router]);

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  }, []);

  const handleQuickComment = useCallback((val: string) => {
    setComment(val);
  }, []);

  // Update status mutation
  const handleUpdateStatus = useCallback(async (nextStatus: 'approved' | 'rejected' | 'supplement_requested') => {
    if (!report) return;
    setIsSubmitting(true);

    const now = new Date();
    const nowIso = now.toISOString();
    const actorName = currentUser?.fullName || 'Chủ cửa hàng';
    const currentRole = currentUser?.role || 'Chủ cửa hàng';

    const payload: Partial<ReportSubmission> = {
      approvalStatus: nextStatus,
      updatedAt: nowIso,
      managerComment: comment.trim() || undefined,
    };

    if (nextStatus === 'approved') {
      payload.approvedAt = nowIso;
      payload.approvedBy = actorName;
    }

    try {
      // 1. Update Firestore record
      await reportsDailyService.update(report.id, payload);

      // 2. Add history entry to notification
      await notificationsService.create({
        storeId: report.storeId,
        title: `Báo cáo ${PERIOD_LABEL[report.period].toLowerCase()} đã ${APPROVAL_STATUS_LABEL[nextStatus].toLowerCase()}`,
        type: 'can_duyet',
        typeLabel: APPROVAL_STATUS_LABEL[nextStatus].toUpperCase(),
        requester: report.actor,
        role: currentRole,
        approver: actorName,
        status: nextStatus === 'approved' ? 'approved' : nextStatus === 'rejected' ? 'rejected' : 'pending',
        sourceModule: 'REPORTS',
        sourceId: report.id,
        createdAt: nowIso,
        updatedAt: nowIso,
        comments: comment.trim() || undefined,
      });

      triggerToast(`Đã cập nhật trạng thái báo cáo thành: ${APPROVAL_STATUS_LABEL[nextStatus]}`, 'success');
      setComment('');
      refetch();
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái duyệt:', err);
      triggerToast('Không thể cập nhật trạng thái. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [report, currentUser, comment, triggerToast, refetch]);

  const handleApprove = useCallback(() => {
    void handleUpdateStatus('approved');
  }, [handleUpdateStatus]);

  const handleSupplement = useCallback(() => {
    void handleUpdateStatus('supplement_requested');
  }, [handleUpdateStatus]);

  const handleReject = useCallback(() => {
    void handleUpdateStatus('rejected');
  }, [handleUpdateStatus]);

  // Compute timeline history based on report timestamps
  const approvalHistory = useMemo(() => {
    if (!report) return [];
    
    const items: Array<{ action: string; timestamp: string; actor: string; note?: string }> = [
      {
        action: 'created',
        timestamp: new Date(report.createdAt || Date.now()).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' } as any),
        actor: report.actor || 'Nhân viên',
      },
      {
        action: 'submitted',
        timestamp: new Date(report.createdAt || Date.now()).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' } as any),
        actor: report.actor || 'Nhân viên',
      }
    ];

    if (report.approvalStatus !== 'pending') {
      items.push({
        action: report.approvalStatus,
        timestamp: new Date(report.updatedAt || Date.now()).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' } as any),
        actor: report.approvedBy || 'Quản lý cửa hàng',
        note: report.managerComment || undefined,
      });
    }

    return items;
  }, [report]);

  // Check role to render admin tools
  const canApprove = permissions.canApprove;

  if (isLoading) {
    return (
      <div className="space-y-4 text-left p-1 select-none animate-pulse">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isQuotaExceeded = errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('exhausted') || errorMsg.includes('429');

    return (
      <div className="space-y-4 text-center py-20">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto animate-bounce" />
        <h2 className="text-base font-black text-slate-800">
          {isQuotaExceeded ? 'Hệ thống quá tải giới hạn (Firebase Quota Exceeded)' : 'Lỗi khi tải báo cáo'}
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto px-4 leading-normal mt-2">
          {isQuotaExceeded 
            ? 'Cơ sở dữ liệu Firebase của hệ thống hiện tại đã vượt quá giới hạn lượt đọc/ghi miễn phí trong ngày (Spark Plan Limit). Vui lòng nâng cấp gói hoặc thử lại vào ngày mai.' 
            : `Đã xảy ra lỗi khi tải dữ liệu: ${errorMsg}`}
        </p>
        <div className="flex justify-center gap-3 mt-4">
          <Button onClick={() => refetch()} variant="outline" className="rounded-xl h-9 text-xs border-slate-200 cursor-pointer">
            Tải lại
          </Button>
          <Button onClick={handleBack} className="rounded-xl h-9 text-xs bg-[#C21A1A] hover:bg-[#a61616] cursor-pointer">
            Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-4 text-center py-20">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-base font-black text-slate-800">Không tìm thấy báo cáo</h2>
        <p className="text-xs text-slate-400">Báo cáo có mã {reportId} không tồn tại trên hệ thống.</p>
        <Button onClick={handleBack} className="rounded-xl h-9 text-xs bg-[#C21A1A] hover:bg-[#a61616] cursor-pointer">
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left font-sans text-sm text-slate-650">
      {toast.show && (
        <div
          className={`fixed left-5 bottom-5 z-50 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold shadow-lg ${
            toast.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header breadcrumb & actions */}
      <ReportDetailHeader
        period={report.period}
        onBack={handleBack}
        onApprove={handleApprove}
        onSupplement={handleSupplement}
        onReject={handleReject}
        showActions={canApprove}
        isSubmitting={isSubmitting}
      />

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* Cột trái (7/10) - Nội dung báo cáo */}
        <div className="lg:col-span-7 space-y-6">
          <InfoSection
            actor={report.actor}
            department={report.department}
            reportDate={report.reportDate}
            shift={report.shift}
            status={report.status}
            approvalStatus={report.approvalStatus}
            period={report.period}
          />

          <MetricsSection
            revenue={report.revenue}
            billCount={report.billCount}
            checklistPct={report.checklistPct}
            checklistRatio={report.checklistRatio}
            delayedCount={report.delayedCount}
            sopErrorsCount={report.sopErrorsCount}
            complaintsCount={report.complaintsCount}
            staffIssuesCount={report.staffIssuesCount}
            comparison={comparisonStats}
          />

          {/* Gộp chung tất cả các phần vào 1 Card lớn, dùng divider ngăn cách */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6 shadow-2xs">
            <NarrativeSection notes={report.notes} />
            <div className="border-t border-slate-100" />
            <IssuesTable issues={report.highlightIssues} />
            <div className="border-t border-slate-100" />
            <FollowupSection promises={report.promises} />
            <div className="border-t border-slate-100" />
            <AttachmentsSection attachments={report.attachments} />
          </div>
        </div>

        {/* Cột phải (3/10) - Panel duyệt */}
        <div className="lg:col-span-3">
          <ApprovalPanel
            comment={comment}
            onCommentChange={handleCommentChange}
            onQuickComment={handleQuickComment}
            approvalStatus={report.approvalStatus}
            history={approvalHistory}
            currentUser={currentUser}
            canApprove={canApprove}
          />
        </div>

      </div>
    </div>
  );
}
