import React, { useCallback, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Activity,
  AlertTriangle,
  Bookmark,
  Clock,
  Send,
  Users,
  X,
  Plus,
  Trash2,
  UploadCloud,
  FileText,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import {
  Button,
  Textarea,
  Input,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetTitle,
  ScrollArea,
} from '../../../../share/ui';
import { CustomTable } from '../../../../share/components/custom-table';
import { HighlightIssue, PromiseItem, AttachmentItem } from '../../../services/reports-service';

export type ReportPeriod = 'day' | 'week' | 'month';
export type ReportStatus = 'green' | 'yellow' | 'red';

export interface ReportFormState {
  status: ReportStatus;
  notes: string;
  saveStatus: 'idle' | 'saving' | 'saved';
  reportDate: string;
  shift: string;
  department: string;
  reporter: string;
  highlightIssues: HighlightIssue[];
  promises: PromiseItem[];
  attachments: AttachmentItem[];
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
  isMetricsLoading?: boolean;
  formatCurrency: (value: number) => string;
  onOpenChange: (open: boolean) => void;
  onUpdateForm: (updates: Partial<ReportFormState>) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onPeriodChange?: (period: ReportPeriod) => void;
  onRefreshMetrics?: () => void;
  currentUser?: { fullName: string; role: string } | null;
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
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/50',
  yellow: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100/50',
  red: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100/50',
};

const ReportForm = React.memo(function ReportForm({
  open,
  period,
  formState,
  canSubmit,
  metrics,
  isMetricsLoading,
  formatCurrency,
  onOpenChange,
  onUpdateForm,
  onSaveDraft,
  onSubmit,
  onPeriodChange,
  onRefreshMetrics,
  currentUser,
}: ReportFormProps) {
  const [newPromiseText, setNewPromiseText] = useState('');

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  // Basic Info Handlers
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateForm({ reportDate: e.target.value });
  }, [onUpdateForm]);

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

  // Issues handlers
  const handleAddIssue = useCallback(() => {
    const newIssueItem: HighlightIssue = {
      id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      issue: '',
      severity: 'medium',
      rootCause: '',
      action: '',
    };
    onUpdateForm({
      highlightIssues: [...(formState.highlightIssues || []), newIssueItem],
    });
  }, [formState.highlightIssues, onUpdateForm]);

  const handleRemoveIssue = useCallback((id: string) => {
    onUpdateForm({
      highlightIssues: (formState.highlightIssues || []).filter((item) => item.id !== id),
    });
  }, [formState.highlightIssues, onUpdateForm]);

  const handleUpdateIssue = useCallback((id: string, fields: Partial<HighlightIssue>) => {
    onUpdateForm({
      highlightIssues: (formState.highlightIssues || []).map((item) =>
        item.id === id ? { ...item, ...fields } : item
      ),
    });
  }, [formState.highlightIssues, onUpdateForm]);

  // Promises handlers
  const handleAddPromise = useCallback(() => {
    if (!newPromiseText.trim()) return;
    const newPromiseItem: PromiseItem = {
      id: `promise-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: newPromiseText.trim(),
      completed: false,
    };
    onUpdateForm({
      promises: [...(formState.promises || []), newPromiseItem],
    });
    setNewPromiseText('');
  }, [formState.promises, newPromiseText, onUpdateForm]);

  const handleTogglePromise = useCallback((id: string) => {
    onUpdateForm({
      promises: (formState.promises || []).map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    });
  }, [formState.promises, onUpdateForm]);

  const handleRemovePromise = useCallback((id: string) => {
    onUpdateForm({
      promises: (formState.promises || []).filter((item) => item.id !== id),
    });
  }, [formState.promises, onUpdateForm]);

  // Attachments handlers
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray: AttachmentItem[] = Array.from(e.target.files).map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
    }));
    onUpdateForm({
      attachments: [...(formState.attachments || []), ...filesArray],
    });
  }, [formState.attachments, onUpdateForm]);

  const handleRemoveFile = useCallback((id: string) => {
    onUpdateForm({
      attachments: (formState.attachments || []).filter((item) => item.id !== id),
    });
  }, [formState.attachments, onUpdateForm]);

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
        header: 'Vấn đề *',
        cell: ({ row }) => (
          <Input
            value={row.original.issue}
            onChange={(e) => handleUpdateIssue(row.original.id, { issue: e.target.value })}
            placeholder="Mô tả vấn đề..."
            className="text-xs h-8 border-transparent hover:border-slate-200 focus:border-[#C21A1A] px-2 rounded-lg"
          />
        ),
      },
      {
        accessorKey: 'severity',
        header: 'Mức độ *',
        cell: ({ row }) => (
          <Select
            value={row.original.severity}
            onValueChange={(val) => handleUpdateIssue(row.original.id, { severity: val as any })}
          >
            <SelectTrigger className="w-full text-xs rounded-lg border-slate-200 bg-white h-8">
              <SelectValue placeholder="Chọn mức độ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Thấp</SelectItem>
              <SelectItem value="medium">Trung bình</SelectItem>
              <SelectItem value="high">Cao</SelectItem>
            </SelectContent>
          </Select>
        ),
        meta: { width: 120 },
      },
      {
        accessorKey: 'rootCause',
        header: 'Nguyên nhân *',
        cell: ({ row }) => (
          <Input
            value={row.original.rootCause}
            onChange={(e) => handleUpdateIssue(row.original.id, { rootCause: e.target.value })}
            placeholder="Nguyên nhân vấn đề..."
            className="text-xs h-8 border-transparent hover:border-slate-200 focus:border-[#C21A1A] px-2 rounded-lg"
          />
        ),
      },
      {
        accessorKey: 'action',
        header: 'Hành động xử lý *',
        cell: ({ row }) => (
          <Input
            value={row.original.action}
            onChange={(e) => handleUpdateIssue(row.original.id, { action: e.target.value })}
            placeholder="Cam kết hành động xử lý..."
            className="text-xs h-8 border-transparent hover:border-slate-200 focus:border-[#C21A1A] px-2 rounded-lg"
          />
        ),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => handleRemoveIssue(row.original.id)}
              className="text-slate-400 hover:text-rose-600 rounded-lg p-1.5 hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
        meta: { width: 60 },
      },
    ],
    [handleUpdateIssue, handleRemoveIssue],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-[95vw] lg:w-[85vw] xl:w-[75vw] sm:max-w-none max-h-screen overflow-hidden p-0 gap-0 flex flex-col font-sans text-sm text-slate-650 bg-slate-50 border-l"
      >
        {/* Header Cố định phía trên */}
        <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div>
            <SheetTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              Tạo báo cáo điều hành
            </SheetTitle>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Nắm bắt tình hình vận hành nhanh chóng - Chính xác - Kịp thời
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!canSubmit || formState.saveStatus === 'saving'}
              onClick={onSaveDraft}
              className="rounded-xl h-9 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs gap-1.5"
            >
              <Bookmark className="h-4.5 w-4.5 text-slate-500" />
              {formState.saveStatus === 'saving'
                ? 'Đang lưu...'
                : formState.saveStatus === 'saved'
                  ? 'Đã lưu nháp'
                  : 'Lưu nháp'}
            </Button>
            
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={onSubmit}
              className="rounded-xl h-9 text-xs font-bold bg-[#C21A1A] hover:bg-[#a61616] text-white cursor-pointer shadow-md shadow-red-100 gap-1.5"
            >
              <Send className="h-4 w-4" />
              Gửi báo cáo
            </Button>
          </div>
        </div>

        {/* Thân biểu mẫu cuộn được */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            
            {/* Cột trái - 7 phần 10 */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Tab chọn chu kỳ báo cáo */}
              {onPeriodChange && (
                <div className="bg-slate-200/60 p-1 rounded-full border border-slate-300/40 flex items-center gap-1 w-fit">
                  {(['day', 'week', 'month'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => onPeriodChange(tab)}
                      className={`flex items-center gap-2 px-5 py-1.5 rounded-full font-bold text-xs transition-all duration-200 ease-out active:scale-95 cursor-pointer border-0 ${
                        period === tab
                          ? 'bg-white text-[#C21A1A] shadow-xs'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                      }`}
                    >
                      {PERIOD_LABEL[tab]}
                    </button>
                  ))}
                </div>
              )}

              {/* 1. Thông tin báo cáo */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span className="text-[#C21A1A]">1.</span> Thông tin báo cáo
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-bold text-slate-500">Ngày báo cáo *</label>
                    <Input
                      type="date"
                      value={formState.reportDate}
                      onChange={handleDateChange}
                      className="text-xs rounded-xl border-slate-200 focus:border-[#C21A1A]"
                    />
                  </div>
                  <div className="space-y-1 text-left flex flex-col justify-end">
                    <label className="text-xs font-bold text-slate-500 mb-1">Ca làm *</label>
                    <Select
                      value={formState.shift}
                      onValueChange={(val) => onUpdateForm({ shift: val })}
                    >
                      <SelectTrigger className="w-full text-xs rounded-xl border-slate-250 h-9 bg-white">
                        <SelectValue placeholder="Chọn ca làm" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ca sáng (06:00 - 14:00)">Ca sáng (06:00 - 14:00)</SelectItem>
                        <SelectItem value="Ca chiều (14:00 - 22:00)">Ca chiều (14:00 - 22:00)</SelectItem>
                        <SelectItem value="Ca tối (22:00 - 06:00)">Ca tối (22:00 - 06:00)</SelectItem>
                        <SelectItem value="Cả ngày">Cả ngày</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 text-left flex flex-col justify-end">
                    <label className="text-xs font-bold text-slate-500 mb-1">Bộ phận *</label>
                    <Select
                      value={formState.department}
                      onValueChange={(val) => onUpdateForm({ department: val })}
                    >
                      <SelectTrigger className="w-full text-xs rounded-xl border-slate-250 h-9 bg-white">
                        <SelectValue placeholder="Chọn bộ phận" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cửa hàng Bình Thạnh">Cửa hàng Bình Thạnh</SelectItem>
                        <SelectItem value="Cửa hàng Quận 1">Cửa hàng Quận 1</SelectItem>
                        <SelectItem value="Cửa hàng Quận 3">Cửa hàng Quận 3</SelectItem>
                        <SelectItem value="Văn phòng chính">Văn phòng chính</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 text-left flex flex-col justify-end">
                    <label className="text-xs font-bold text-slate-500 mb-1">Người lập *</label>
                    <Select
                      value={formState.reporter}
                      onValueChange={(val) => onUpdateForm({ reporter: val })}
                    >
                      <SelectTrigger className="w-full text-xs rounded-xl border-slate-250 h-9 bg-white">
                        <SelectValue placeholder="Chọn người lập" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={currentUser?.fullName || 'Trần Tấn Phát'}>
                          {currentUser?.fullName || 'Trần Tấn Phát'}
                        </SelectItem>
                        <SelectItem value="Nguyễn Văn A">Nguyễn Văn A</SelectItem>
                        <SelectItem value="Lê Thị B">Lê Thị B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 2. Chỉ số tự đồng bộ */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <span className="text-[#C21A1A]">2.</span> Chỉ số tự đồng bộ
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onRefreshMetrics}
                    disabled={isMetricsLoading}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg p-1.5 h-auto gap-1 cursor-pointer"
                  >
                    <Clock className={`h-3.5 w-3.5 ${isMetricsLoading ? 'animate-spin' : ''}`} />
                    {isMetricsLoading ? 'Đang tải...' : 'Tự lấy từ hệ thống'}
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {/* Card Doanh thu */}
                  <div className="rounded-xl border border-rose-100 bg-rose-50/20 p-3 flex flex-col justify-between space-y-1 shadow-3xs transition-transform duration-200 hover:-translate-y-0.5">
                    <p className="text-[11px] font-bold text-rose-500 tracking-wide uppercase">Doanh thu</p>
                    <p className="text-sm font-black text-slate-800 leading-none py-1">
                      {formatCurrency(metrics.revenue)}
                    </p>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5 mt-auto">
                      Đồng bộ Live
                    </span>
                  </div>

                  {/* Card Số đơn */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-3 flex flex-col justify-between space-y-1 shadow-3xs transition-transform duration-200 hover:-translate-y-0.5">
                    <p className="text-[11px] font-bold text-blue-500 tracking-wide uppercase">Số đơn</p>
                    <p className="text-sm font-black text-slate-800 leading-none py-1">
                      {metrics.billCount} đơn
                    </p>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5 mt-auto">
                      Đồng bộ Live
                    </span>
                  </div>

                  {/* Card Checklist */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-3 flex flex-col justify-between space-y-1 shadow-3xs transition-transform duration-200 hover:-translate-y-0.5">
                    <p className="text-[11px] font-bold text-emerald-500 tracking-wide uppercase">Checklist</p>
                    <p className="text-sm font-black text-emerald-700 leading-none py-1">
                      {metrics.checklistPercentage}%
                    </p>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5 mt-auto">
                      Tỉ lệ: {metrics.checklistRatio}
                    </span>
                  </div>

                  {/* Card Vi phạm SOP */}
                  <div className="rounded-xl border border-amber-100 bg-amber-50/20 p-3 flex flex-col justify-between space-y-1 shadow-3xs transition-transform duration-200 hover:-translate-y-0.5">
                    <p className="text-[11px] font-bold text-amber-600 tracking-wide uppercase">Vi phạm / SOP</p>
                    <p className="text-sm font-black text-amber-700 leading-none py-1">
                      {metrics.sopErrorsCount}
                    </p>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5 mt-auto">
                      Cần rà soát lại
                    </span>
                  </div>

                  {/* Card Khiếu nại */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-3 flex flex-col justify-between space-y-1 shadow-3xs transition-transform duration-200 hover:-translate-y-0.5">
                    <p className="text-[11px] font-bold text-indigo-500 tracking-wide uppercase">Khiếu nại</p>
                    <p className="text-sm font-black text-slate-800 leading-none py-1">
                      {metrics.complaintsCount}
                    </p>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5 mt-auto">
                      Khách hàng phản hồi
                    </span>
                  </div>
                </div>
                
                <p className="text-[11px] text-slate-400 font-semibold italic">
                  * Các chỉ số được tự động lấy từ hệ thống, không thể chỉnh sửa trực tiếp.
                </p>
              </div>

              {/* 3. Diễn biến vận hành */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <span className="text-[#C21A1A]">3.</span> Diễn biến vận hành
                  </div>
                  <span className="text-xs font-bold text-slate-450">
                    {formState.notes.length}/1500 ký tự
                  </span>
                </div>
                
                <Textarea
                  maxLength={1500}
                  value={formState.notes}
                  onChange={handleNotesChange}
                  placeholder="Mô tả ngắn gọn tình hình vận hành trong ca/ngày: điểm tốt, khó khăn, biến động, nguyên nhân chính..."
                  className="min-h-[140px] text-xs leading-relaxed border-slate-200 focus:border-[#C21A1A] rounded-xl placeholder:text-slate-350"
                />

                {/* Chọn Đánh giá tình trạng nhanh */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-slate-500">Đánh giá nhanh trạng thái hôm nay:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['green', 'yellow', 'red'] as const).map((statusItem) => {
                      const isActive = formState.status === statusItem;
                      return (
                        <button
                          key={statusItem}
                          type="button"
                          data-status={statusItem}
                          onClick={handleStatusClick}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            isActive
                              ? STATUS_STYLES[statusItem] + ' border-2 shadow-2xs'
                              : 'border-slate-250 bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            statusItem === 'green' ? 'bg-emerald-500' : statusItem === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          {STATUS_LABEL[statusItem]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. Vấn đề nổi bật */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <span className="text-[#C21A1A]">4.</span> Vấn đề nổi bật
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddIssue}
                    className="text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg p-2 h-8 gap-1 shadow-3xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm vấn đề
                  </Button>
                </div>
                
                <p className="text-xs text-slate-400 font-semibold">
                  Liệt kê các vấn đề quan trọng cần lưu ý trong ca và hướng xử lý tương ứng.
                </p>

                <div className="overflow-x-auto rounded-xl border border-slate-250 bg-white">
                  <CustomTable
                    columns={columns}
                    data={formState.highlightIssues || []}
                    enableFiltering={false}
                    enableColumnVisibility={false}
                    enableSorting={false}
                    enablePagination={false}
                    emptyMessage="Chưa ghi nhận vấn đề nổi bật nào trong ca làm."
                    className="text-xs"
                  />
                </div>
              </div>

              {/* 5. Cam kết / việc cần làm tiếp theo */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span className="text-[#C21A1A]">5.</span> Cam kết / việc cần làm tiếp theo
                </div>
                
                <p className="text-xs text-slate-400 font-semibold">
                  Liệt kê các đầu việc, kế hoạch cam kết sẽ thực hiện hoặc chuyển giao cho ca tiếp theo.
                </p>

                {/* Form thêm việc mới */}
                <div className="flex gap-2">
                  <Input
                    value={newPromiseText}
                    onChange={(e) => setNewPromiseText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPromise())}
                    placeholder="Thêm đầu việc mới cần cam kết thực hiện..."
                    className="text-xs h-9 border-slate-200 focus:border-[#C21A1A] rounded-xl flex-1 px-3"
                  />
                  <Button
                    type="button"
                    onClick={handleAddPromise}
                    className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl h-9 text-xs font-bold px-4 shadow-3xs cursor-pointer gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm việc
                  </Button>
                </div>

                {/* Danh sách việc */}
                <ScrollArea className="h-[220px] pr-1">
                  <div className="space-y-2">
                    {formState.promises?.length > 0 ? (
                      formState.promises.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between border border-slate-100 rounded-xl p-2.5 hover:bg-slate-50/50 bg-slate-50/20"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={() => handleTogglePromise(item.id)}
                              className="cursor-pointer border-slate-350 rounded-[4px]"
                            />
                            <span
                              className={`text-xs font-semibold text-slate-700 truncate ${
                                item.completed ? 'line-through text-slate-400 font-normal' : ''
                              }`}
                            >
                              {item.text}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePromise(item.id)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg h-7 w-7 shrink-0 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center text-slate-400 italic font-semibold border border-dashed border-slate-250 rounded-xl">
                        Chưa thêm cam kết việc cần làm nào cho ca tiếp theo.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* 6. Tệp đính kèm */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span className="text-[#C21A1A]">6.</span> Tệp đính kèm / hình ảnh minh chứng
                </div>
                
                {/* Drag and drop zone */}
                <div className="relative border-2 border-dashed border-slate-250 hover:border-slate-400 bg-slate-50/50 rounded-2xl p-6 transition-colors flex flex-col items-center justify-center text-center cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="h-9 w-9 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Kéo thả file vào đây hoặc <span className="text-[#C21A1A] hover:underline">Chọn file</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Hỗ trợ định dạng: .jpg, .jpeg, .png, .pdf, .docx, .xlsx (tối đa 10MB/file)
                  </p>
                </div>

                {/* List files */}
                {formState.attachments?.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {formState.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between border border-slate-200 rounded-xl p-2 bg-white shadow-3xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-5 w-5 text-rose-500 shrink-0" />
                          <div className="truncate text-left">
                            <p className="text-xs font-bold text-slate-700 truncate leading-tight">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold leading-tight">
                              {Math.round(file.size / 1024)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFile(file.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg h-7 w-7 shrink-0 cursor-pointer ml-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Cột phải - 3 phần 10 */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Khối Nguyên tắc điền báo cáo */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs text-left">
                <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-[#C21A1A]" />
                  Nguyên tắc điền báo cáo
                </div>
                
                <ol className="space-y-4 text-xs">
                  <li className="flex gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#C21A1A] text-white font-bold shrink-0">1</span>
                    <div className="text-slate-650">
                      <p className="font-bold text-slate-800">Trung thực, ngắn gọn, đúng sự thật</p>
                      <p className="text-slate-400 mt-0.5 font-semibold">Ghi nhận đúng tình hình thực tế, không tô hồng.</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#C21A1A] text-white font-bold shrink-0">2</span>
                    <div className="text-slate-650">
                      <p className="font-bold text-slate-800">Cụ thể, có số liệu</p>
                      <p className="text-slate-400 mt-0.5 font-semibold">Ưu tiên số liệu, ví dụ cụ thể và minh chứng rõ ràng.</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#C21A1A] text-white font-bold shrink-0">3</span>
                    <div className="text-slate-650">
                      <p className="font-bold text-slate-800">Nêu rõ vấn đề & nguyên nhân</p>
                      <p className="text-slate-400 mt-0.5 font-semibold">Phân tích nguyên nhân gốc rễ để có hướng xử lý đúng.</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#C21A1A] text-white font-bold shrink-0">4</span>
                    <div className="text-slate-650">
                      <p className="font-bold text-slate-800">Hành động rõ ràng, đo lường được</p>
                      <p className="text-slate-400 mt-0.5 font-semibold">Đề xuất hành động cụ thể và cam kết theo dõi kết quả.</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#C21A1A] text-white font-bold shrink-0">5</span>
                    <div className="text-slate-650">
                      <p className="font-bold text-slate-800">Nộp đúng hạn</p>
                      <p className="text-slate-400 mt-0.5 font-semibold">Báo cáo đúng thời gian quy định để đảm bảo vận hành liên tục.</p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Khối Nguồn tự động lấy số liệu */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs text-left">
                <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <HelpCircle className="h-4.5 w-4.5 text-slate-500" />
                  Tự động lấy số liệu từ đâu?
                </div>
                
                <div className="space-y-3.5 text-xs font-semibold">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1 rounded-lg bg-rose-50 text-rose-600 mt-0.5 shrink-0">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">KPI</p>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Doanh thu, đơn hàng, checklist, vi phạm SOP</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="p-1 rounded-lg bg-blue-50 text-blue-600 mt-0.5 shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Công việc</p>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Tiến độ, số công việc hoàn thành trong ca</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600 mt-0.5 shrink-0">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Khách hàng</p>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Khiếu nại, phản hồi, chất lượng CSKH</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5 shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Kho hàng</p>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Tồn kho, tình hình xuất nhập, hư hỏng</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="p-1 rounded-lg bg-amber-50 text-amber-600 mt-0.5 shrink-0">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Marketing</p>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Chiến dịch, chi phí quảng cáo và hiệu quả thực tế</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Thông báo quyền nếu không được submit */}
        {!canSubmit && (
          <div className="p-4 bg-rose-50 border-t border-rose-200 text-rose-600 font-bold text-xs text-center shrink-0">
            Bạn không có quyền gửi báo cáo hoặc cập nhật dữ liệu.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
});

export default ReportForm;
