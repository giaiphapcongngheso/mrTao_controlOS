import React, { useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Bookmark,
  Clock,
  MessageSquare,
  Send,
  Users,
  X,
} from 'lucide-react';
import { Button, Textarea } from '../../../../share/ui';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../../../../share/ui/dialog';

export type ReportPeriod = 'day' | 'week' | 'month';
export type ReportStatus = 'green' | 'yellow' | 'red';

export interface ReportFormState {
  status: ReportStatus;
  notes: string;
  saveStatus: 'idle' | 'saving' | 'saved';
}

export interface ReportMetrics {
  revenue: number;
  billCount: number;
  checklistPercentage: number;
  checklistRatio: string;
  delayedCount: number;
  sopErrorsCount: number;
  complaintsCount: number;
  staffIssuesCount: number;
}

interface ReportFormProps {
  open: boolean;
  period: ReportPeriod;
  formState: ReportFormState;
  canSubmit: boolean;
  metrics: ReportMetrics;
  formatCurrency: (value: number) => string;
  onOpenChange: (open: boolean) => void;
  onUpdateForm: (updates: Partial<ReportFormState>) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
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

const STATUS_STYLES: Record<ReportStatus, string> = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  yellow: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-rose-200 bg-rose-50 text-rose-700',
};

const ReportForm = React.memo(function ReportForm({
  open,
  period,
  formState,
  canSubmit,
  metrics,
  formatCurrency,
  onOpenChange,
  onUpdateForm,
  onSaveDraft,
  onSubmit,
}: ReportFormProps) {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleNotesChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdateForm({ notes: event.target.value });
    },
    [onUpdateForm],
  );

  const handleStatusClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const nextStatus = event.currentTarget.dataset.status as ReportStatus | undefined;
      if (!nextStatus) {
        return;
      }
      onUpdateForm({ status: nextStatus });
    },
    [onUpdateForm],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      onSubmit();
    },
    [onSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0 font-sans text-sm text-slate-650">
        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <DialogTitle className="text-[16px] font-bold text-slate-800">
            Tạo báo cáo {PERIOD_LABEL[period]}
          </DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogClose>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5 overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Activity className="h-4 w-4 text-[#C21A1A]" />
              Chỉ số đồng bộ
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400 font-bold">Doanh thu</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{formatCurrency(metrics.revenue)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400 font-bold">Đơn hàng</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{metrics.billCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400 font-bold">Checklist</p>
                <p className="mt-1 text-sm font-bold text-emerald-700">{metrics.checklistPercentage}%</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-400 font-bold mb-2">
                Sự cố phát sinh
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  Việc trễ: {metrics.delayedCount}
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
                  Lỗi SOP: {metrics.sopErrorsCount}
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                  Khiếu nại: {metrics.complaintsCount}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  Nhân sự: {metrics.staffIssuesCount}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400 font-bold mb-2">
                Trạng thái vận hành
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['green', 'yellow', 'red'] as const).map((statusItem) => {
                  const isActive = formState.status === statusItem;
                  return (
                    <button
                      key={statusItem}
                      type="button"
                      data-status={statusItem}
                      onClick={handleStatusClick}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                        isActive
                          ? STATUS_STYLES[statusItem]
                          : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {STATUS_LABEL[statusItem]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <label htmlFor="report-form-notes" className="text-xs font-bold text-slate-500">
                Diễn biến vận hành
              </label>
              <span className="text-[10px] font-semibold text-slate-400">
                {formState.notes.length}/300
              </span>
            </div>

            <Textarea
              id="report-form-notes"
              maxLength={300}
              value={formState.notes}
              onChange={handleNotesChange}
              placeholder="Nêu rõ các phát sinh cần quản lý xử lý."
              className="min-h-[220px] text-sm leading-relaxed"
            />

            <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Tỷ lệ checklist: <strong>{metrics.checklistRatio}</strong> | Mức đánh giá:{' '}
              <strong>{STATUS_LABEL[formState.status]}</strong>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={!canSubmit}
                onClick={onSaveDraft}
                className="rounded-xl h-10 text-sm font-bold cursor-pointer"
              >
                <Bookmark className="h-4 w-4" />
                {formState.saveStatus === 'saving'
                  ? 'Đang lưu'
                  : formState.saveStatus === 'saved'
                    ? 'Đã lưu'
                    : 'Lưu nháp'}
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="rounded-xl h-10 text-sm font-bold bg-[#C21A1A] hover:bg-[#9d1515] cursor-pointer"
              >
                <Send className="h-4 w-4" />
                Gửi duyệt
              </Button>
            </div>

            {!canSubmit && (
              <div className="text-xs text-rose-600 font-semibold border border-rose-200 bg-rose-50 rounded-lg px-3 py-2">
                Bạn chưa có quyền tạo hoặc cập nhật báo cáo.
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default ReportForm;
