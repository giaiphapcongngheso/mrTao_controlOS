import React, { useCallback, useState } from 'react';
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
  ArrowLeft,
  Calendar,
  Mail,
  Eye,
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
  Table,
  TableHeader,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../../share/ui';
import { HighlightIssue, PromiseItem, AttachmentItem } from '../../../services/reports-service';
import { staffService } from '../../../services/admin/staff-service';
import type { StaffMember } from '../../../types/staff.types';
import { useIsMobile } from '../../../shared/hooks/use-is-mobile';
import { NoteTemplatePicker } from './note-template-picker';

export type ReportPeriod = 'day' | 'week' | 'month';
export type ReportStatus = 'green' | 'yellow' | 'red';

export interface ReportFormState {
  status: ReportStatus;
  notes: string;
  saveStatus: 'idle' | 'saving' | 'saved';
  reportDate: string;
  reporter: string;
  highlightIssues: HighlightIssue[];
  promises: PromiseItem[];
  attachments: AttachmentItem[];
  recipientEmails?: string[];
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

function formatDateVN(dateStr?: string, period?: 'day' | 'week' | 'month'): string {
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
    return `${month}/${year}`;
  }
  return dateStr;
}

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
  const isMobile = useIsMobile();
  const [newPromiseText, setNewPromiseText] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  React.useEffect(() => {
    if (open) {
      const fetchStaff = async () => {
        setIsStaffLoading(true);
        try {
          const data = await staffService.getAll();
          const activeWithEmail = data.filter(
            (s) => s.status === 'active' && (s.email || s.authEmail)
          );
          setStaffList(activeWithEmail);
        } catch (err) {
          console.error('Error fetching staff list:', err);
        } finally {
          setIsStaffLoading(false);
        }
      };
      void fetchStaff();
    }
  }, [open]);

  const generateEmailHtml = useCallback(() => {
    const actorName = formState.reporter || currentUser?.fullName || 'Nhân sự vận hành';
    const now = new Date();
    const daysVN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayLabel = `${daysVN[now.getDay()]} ${now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
    const timeLabel = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const timestamp = `${dayLabel} lúc ${timeLabel}`;

    const formattedRevenue = (metrics?.revenue || 0).toLocaleString('vi-VN');
    const checklistRatio = metrics?.checklistRatio || `${metrics?.checklistPercentage || 0}%`;

    const periodLabels: Record<string, string> = {
      day: 'Cuối ngày',
      week: 'Tuần',
      month: 'Tháng',
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; text-align: left;">
        <h2 style="color: #ea580c; margin-top: 0; margin-bottom: 4px; font-size: 20px; font-weight: 800;">
          BÁO CÁO ĐIỀU HÀNH ${periodLabels[period]?.toUpperCase() || 'BÁO CÁO'}
        </h2>
        <p style="color: #64748b; font-size: 12px; margin-top: 0; margin-bottom: 20px;">
          Gửi từ hệ thống điều hành Mr Táo lúc ${timestamp}
        </p>
        
        <!-- 1. Thông tin chung -->
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #f1f5f9;">
          <h3 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            1. Thông tin chung
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #475569; width: 35%;">Người báo cáo:</td>
              <td style="padding: 4px 0; color: #0f172a;">${actorName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #475569;">Ngày báo cáo:</td>
              <td style="padding: 4px 0; color: #0f172a;">${formatDateVN(formState.reportDate, period)}</td>
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
              <td style="padding: 4px 0; color: #0f172a; font-weight: bold;">${formattedRevenue} đ</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #475569;">Số đơn hàng:</td>
              <td style="padding: 4px 0; color: #0f172a;">${metrics?.billCount || 0} đơn</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #475569;">Tỷ lệ checklist:</td>
              <td style="padding: 4px 0; color: #0f172a;">${checklistRatio}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #475569;">Lỗi vi phạm SOP:</td>
              <td style="padding: 4px 0; color: #b45309; font-weight: bold;">${metrics?.sopErrorsCount || 0} lỗi</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #475569;">Đánh giá ca:</td>
              <td style="padding: 4px 0;">
                <span style="padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; 
                  background-color: ${formState.status === 'green' ? '#dcfce7' : formState.status === 'yellow' ? '#fef9c3' : '#fee2e2'};
                  color: ${formState.status === 'green' ? '#166534' : formState.status === 'yellow' ? '#854d0e' : '#991b1b'};">
                  ${formState.status === 'green' ? 'Tốt (Xanh)' : formState.status === 'yellow' ? 'Bình thường (Vàng)' : 'Cảnh báo (Đỏ)'}
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
          <p style="color: #334155; font-size: 13px; line-height: 1.6; margin: 0; white-space: pre-wrap; font-style: italic;">${(formState.notes || 'Không có ghi chú diễn biến.').trim()}</p>
        </div>

        <!-- 4. Vấn đề nổi bật -->
        ${formState.highlightIssues && formState.highlightIssues.length > 0 ? `
        <div style="background-color: #fff5f5; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #fed7d7;">
          <h3 style="margin-top: 0; margin-bottom: 12px; color: #9b2c2c; font-size: 14px; border-bottom: 1px solid #feb2b2; padding-bottom: 6px;">
            4. Vấn đề nổi bật
          </h3>
          <div>
            ${formState.highlightIssues.map((item, idx) => `
              <div style="margin-bottom: 12px; font-size: 13px; border-bottom: ${idx < formState.highlightIssues.length - 1 ? '1px dashed #fecaca' : 'none'}; padding-bottom: 8px;">
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
        ${formState.promises && formState.promises.length > 0 ? `
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #bbf7d0;">
          <h3 style="margin-top: 0; margin-bottom: 12px; color: #166534; font-size: 14px; border-bottom: 1px solid #86efac; padding-bottom: 6px;">
            5. Hứa hẹn & Cam kết
          </h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e293b; line-height: 1.6;">
            ${formState.promises.map((item) => `
              <li style="margin-bottom: 4px;">
                ${item.text} ${item.completed ? '<span style="color: #166534; font-weight: bold;">(Đã hoàn thành)</span>' : ''}
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}

        <!-- 6. Tài liệu & Hình ảnh đính kèm -->
        ${formState.attachments && formState.attachments.length > 0 ? `
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            6. Hình ảnh & Tài liệu đính kèm
          </h3>
          <div style="font-size: 13px;">
            ${formState.attachments.map((file) => {
              const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) || (file.url && file.url.startsWith('data:image/'));
              if (isImage) {
                return `
                  <div style="margin-bottom: 15px;">
                    <p style="margin: 0 0 6px 0; color: #475569; font-weight: bold;">📷 ${file.name} (${Math.round(file.size / 1024)} KB)</p>
                    <img src="${file.url}" style="max-width: 100%; border-radius: 8px; display: block; border: 1px solid #cbd5e1;" alt="${file.name}" />
                  </div>
                `;
              } else {
                return `
                  <div style="margin-bottom: 8px; padding: 8px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <p style="margin: 0; color: #475569;">
                      📄 <strong>${file.name}</strong> (${Math.round(file.size / 1024)} KB) 
                      ${file.url ? `<br/><span style="color: #ea580c; font-weight: bold;">[Đã tải lên tệp]</span>` : ''}
                    </p>
                  </div>
                `;
              }
            }).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }, [formState, metrics, period, currentUser]);

  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const handleDateContainerClick = useCallback(() => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch (err) {
        console.warn('showPicker not supported, falling back to direct click', err);
      }
    }
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  // Basic Info Handlers
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (period === 'month' && value.length === 7) {
      value = `${value}-01`;
    }
    onUpdateForm({ reportDate: value });
  }, [onUpdateForm, period]);

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
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const { uploadTaskAttachment } = await import('../../../services/firebase-storage-service');
    const filesList = Array.from(e.target.files);
    const newAttachments: AttachmentItem[] = [];

    for (const file of filesList) {
      if (!file.type.startsWith('image/')) {
        alert(`Tệp "${file.name}" không phải là ảnh. Chỉ chấp nhận các tệp hình ảnh (.jpg, .jpeg, .png).`);
        continue;
      }

      try {
        const fileUrl = await uploadTaskAttachment(file);
        newAttachments.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          url: fileUrl,
        });
      } catch (err) {
        console.error('Lỗi tải file:', err);
        alert(err instanceof Error ? err.message : 'Không thể tải file này.');
      }
    }

    onUpdateForm({
      attachments: [...(formState.attachments || []), ...newAttachments],
    });
  }, [formState.attachments, onUpdateForm]);

  const handleRemoveFile = useCallback(async (id: string) => {
    const fileToRemove = (formState.attachments || []).find((item) => item.id === id);
    if (fileToRemove && fileToRemove.url) {
      try {
        const { deleteImageFromStorage } = await import('../../../services/firebase-storage-service');
        await deleteImageFromStorage(fileToRemove.url);
      } catch (err) {
        console.error("Lỗi khi xóa file đính kèm báo cáo:", err);
      }
    }
    onUpdateForm({
      attachments: (formState.attachments || []).filter((item) => item.id !== id),
    });
  }, [formState.attachments, onUpdateForm]);



  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full lg:w-[85vw] xl:w-[75vw] h-full sm:max-w-none max-h-screen overflow-hidden p-0 gap-0 flex flex-col font-sans text-sm text-slate-650 bg-slate-50 border-0 lg:border-l"
      >
        {/* Header Cố định phía trên */}
        <div className="border-b border-slate-200 bg-white px-4 sm:px-6 py-4 flex items-center gap-3 shrink-0 shadow-xs z-10">
          {/* Back button */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => handleOpenChange(false)}
            className="rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 text-left min-w-0">
            <SheetTitle className="text-base sm:text-xl font-black text-slate-800 flex items-center gap-2 truncate leading-none">
              Tạo báo cáo điều hành
            </SheetTitle>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-0.5 truncate">
              Nắm bắt tình hình vận hành nhanh chóng - Chính xác - Kịp thời
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={!canSubmit || formState.saveStatus === 'saving'}
              onClick={onSaveDraft}
              className="rounded-xl h-9 px-3 text-[11px] sm:text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs gap-1"
            >
              <Bookmark className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">
                {formState.saveStatus === 'saving'
                  ? 'Đang lưu...'
                  : formState.saveStatus === 'saved'
                    ? 'Đã lưu nháp'
                    : 'Lưu nháp'}
              </span>
              <span className="inline sm:hidden">Lưu nháp</span>
            </Button>
            
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={onSubmit}
              className="rounded-xl h-9 px-3 text-[11px] sm:text-xs font-bold bg-[#C21A1A] hover:bg-[#a61616] text-white cursor-pointer shadow-md shadow-red-100 gap-1"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Gửi</span>
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

              {/* 1. Chỉ số tự đồng bộ */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Cột 1: Tiêu đề */}
                  <div className="text-sm font-black text-slate-800 flex items-center gap-2 shrink-0">
                    <span className="text-[#C21A1A]">1.</span> Chỉ số tự đồng bộ
                  </div>
                  
                  {/* Cột 2, 3, 4: Thời gian, Người lập, Lấy số liệu */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    {/* Cột 2: Chọn ngày */}
                    <div
                      onClick={handleDateContainerClick}
                      className="relative w-full sm:w-44 h-9 group shrink-0 cursor-pointer"
                    >
                      {/* Hidden native input overlay that receives user clicks/taps */}
                      <input
                        ref={dateInputRef}
                        type={period === 'month' ? 'month' : 'date'}
                        value={
                          period === 'month' && formState.reportDate.length === 10
                            ? formState.reportDate.slice(0, 7)
                            : formState.reportDate
                        }
                        onChange={handleDateChange}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                      />
                      {/* Beautiful styled visual representation formatted strictly as dd/mm/yyyy or Tháng mm/yyyy */}
                      <div className="absolute inset-0 flex items-center justify-between px-3 border border-slate-200 bg-white rounded-xl text-xs font-extrabold text-slate-700 shadow-3xs group-hover:border-slate-350 transition-all select-none z-0">
                        <span>{formatDateVN(formState.reportDate, period)}</span>
                        <Calendar className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    {/* Cột 3: Tên nhân viên lập */}
                    <div className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl h-9 flex items-center justify-between sm:justify-start gap-1 select-none w-full sm:w-auto shrink-0">
                      <span className="text-slate-455">Người lập:</span>
                      <span className="text-slate-700 font-extrabold">
                        {formState.reporter || currentUser?.fullName || 'Trần Tấn Phát'}
                      </span>
                    </div>

                    {/* Cột 4: Nút lấy số liệu */}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onRefreshMetrics}
                      disabled={isMetricsLoading}
                      className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-xl px-3.5 h-9 gap-1 cursor-pointer border border-slate-200 shadow-3xs bg-white active:scale-95 transition-all w-full sm:w-auto shrink-0 justify-center flex items-center"
                    >
                      <Clock className={`h-3.5 w-3.5 ${isMetricsLoading ? 'animate-spin' : ''}`} />
                      {isMetricsLoading ? 'Đang tải...' : 'Lấy số liệu'}
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

                  {/* Card Khiếu nại (Tạm ẩn)
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-3 flex flex-col justify-between space-y-1 shadow-3xs transition-transform duration-200 hover:-translate-y-0.5">
                    <p className="text-[11px] font-bold text-indigo-500 tracking-wide uppercase">Khiếu nại</p>
                    <p className="text-sm font-black text-slate-800 leading-none py-1">
                      {metrics.complaintsCount}
                    </p>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5 mt-auto">
                      Khách hàng phản hồi
                    </span>
                  </div>
                  */}
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
                  <div className="flex items-center gap-2.5">
                    <NoteTemplatePicker
                      currentContent={formState.notes}
                      onApply={(newContent) => onUpdateForm({ notes: newContent })}
                      currentUserName={currentUser?.fullName}
                    />
                    <span className="text-xs font-bold text-slate-450">
                      {formState.notes.length}/1500 ký tự
                    </span>
                  </div>
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

                {isMobile ? (
                  <div className="space-y-4">
                    {formState.highlightIssues && formState.highlightIssues.length > 0 ? (
                      formState.highlightIssues.map((item, index) => (
                        <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 relative shadow-3xs text-left">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-extrabold text-xs text-slate-500">Vấn đề #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveIssue(item.id)}
                              className="text-slate-400 hover:text-rose-600 rounded-lg p-1.5 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Xóa dòng"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Vấn đề *</label>
                              <Input
                                value={item.issue}
                                onChange={(e) => handleUpdateIssue(item.id, { issue: e.target.value })}
                                placeholder="Mô tả vấn đề..."
                                className="text-xs h-9 border border-slate-200 focus:border-[#C21A1A] focus:ring-0 focus-visible:ring-0 px-2.5 rounded-lg bg-white shadow-3xs w-full"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Mức độ *</label>
                              <Select
                                value={item.severity}
                                onValueChange={(val) => handleUpdateIssue(item.id, { severity: val as any })}
                              >
                                <SelectTrigger className="w-full text-xs rounded-lg border border-slate-200 bg-white h-9 focus:border-[#C21A1A] focus:ring-0 focus-visible:ring-0 shadow-3xs">
                                  <SelectValue placeholder="Chọn mức độ" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Thấp</SelectItem>
                                  <SelectItem value="medium">Trung bình</SelectItem>
                                  <SelectItem value="high">Cao</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Nguyên nhân *</label>
                              <Input
                                value={item.rootCause}
                                onChange={(e) => handleUpdateIssue(item.id, { rootCause: e.target.value })}
                                placeholder="Nguyên nhân vấn đề..."
                                className="text-xs h-9 border border-slate-200 focus:border-[#C21A1A] focus:ring-0 focus-visible:ring-0 px-2.5 rounded-lg bg-white shadow-3xs w-full"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Hành động xử lý *</label>
                              <Input
                                value={item.action}
                                onChange={(e) => handleUpdateIssue(item.id, { action: e.target.value })}
                                placeholder="Cam kết hành động xử lý..."
                                className="text-xs h-9 border border-slate-200 focus:border-[#C21A1A] focus:ring-0 focus-visible:ring-0 px-2.5 rounded-lg bg-white shadow-3xs w-full"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs italic text-slate-400 font-medium bg-slate-50/20 border border-slate-100 rounded-xl">
                        Chưa ghi nhận vấn đề nổi bật nào trong ca làm.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <Table className="text-xs min-w-[700px]">
                      <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                        <TableRow>
                          <TableHead className="w-12 text-center font-bold text-slate-500 py-3">#</TableHead>
                          <TableHead className="font-bold text-slate-500 py-3">Vấn đề *</TableHead>
                          <TableHead className="w-36 font-bold text-slate-500 py-3">Mức độ *</TableHead>
                          <TableHead className="font-bold text-slate-500 py-3">Nguyên nhân *</TableHead>
                          <TableHead className="font-bold text-slate-500 py-3">Hành động xử lý *</TableHead>
                          <TableHead className="w-12 text-center py-3"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formState.highlightIssues && formState.highlightIssues.length > 0 ? (
                          formState.highlightIssues.map((item, index) => (
                            <TableRow key={item.id} className="hover:bg-slate-50/30 transition-colors border-b last:border-0 border-slate-100">
                              <TableCell className="text-center font-bold text-slate-400 py-2">
                                {index + 1}
                              </TableCell>
                              <TableCell className="py-2">
                                <Input
                                  value={item.issue}
                                  onChange={(e) => handleUpdateIssue(item.id, { issue: e.target.value })}
                                  placeholder="Mô tả vấn đề..."
                                  className="text-xs h-8 border border-slate-200 focus:border-[#C21A1A] focus:ring-0 focus-visible:ring-0 px-2 rounded-lg bg-white shadow-3xs"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <Select
                                  value={item.severity}
                                  onValueChange={(val) => handleUpdateIssue(item.id, { severity: val as any })}
                                >
                                  <SelectTrigger className="w-full text-xs rounded-lg border border-slate-200 bg-white h-8 focus:border-[#C21A1A] focus:ring-0 focus-visible:ring-0 shadow-3xs">
                                    <SelectValue placeholder="Chọn mức độ" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Thấp</SelectItem>
                                    <SelectItem value="medium">Trung bình</SelectItem>
                                    <SelectItem value="high">Cao</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="py-2">
                                <Input
                                  value={item.rootCause}
                                  onChange={(e) => handleUpdateIssue(item.id, { rootCause: e.target.value })}
                                  placeholder="Nguyên nhân vấn đề..."
                                  className="text-xs h-8 border border-slate-200 focus:border-[#C21A1A] focus:ring-0 focus-visible:ring-0 px-2 rounded-lg bg-white shadow-3xs"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <Input
                                  value={item.action}
                                  onChange={(e) => handleUpdateIssue(item.id, { action: e.target.value })}
                                  placeholder="Cam kết hành động xử lý..."
                                  className="text-xs h-8 border border-slate-200 focus:border-[#C21A1A] focus:ring-0 focus-visible:ring-0 px-2 rounded-lg bg-white shadow-3xs"
                                />
                              </TableCell>
                              <TableCell className="text-center py-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIssue(item.id)}
                                  className="text-slate-400 hover:text-rose-600 rounded-lg p-1.5 hover:bg-rose-50 cursor-pointer transition-colors"
                                  title="Xóa dòng"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8 text-center text-xs italic text-slate-400 font-medium">
                              Chưa ghi nhận vấn đề nổi bật nào trong ca làm.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
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
                  <span className="text-[#C21A1A]">6.</span> Hình ảnh minh chứng
                </div>
                
                {/* Drag and drop zone */}
                <div className="relative border-2 border-dashed border-slate-250 hover:border-slate-400 bg-slate-50/50 rounded-2xl p-6 transition-colors flex flex-col items-center justify-center text-center cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="h-9 w-9 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Kéo thả hình ảnh vào đây hoặc <span className="text-[#C21A1A] hover:underline">Chọn ảnh</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Hỗ trợ định dạng: .jpg, .jpeg, .png (tối đa 10MB/ảnh)
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

              {/* Khối Chọn người nhận email */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs text-left">
                <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-[#C21A1A]" />
                  Gửi báo cáo đến (Email)
                </div>

                {isStaffLoading ? (
                  <p className="text-xs text-slate-400 font-semibold animate-pulse">Đang tải danh sách nhân sự...</p>
                ) : staffList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic font-semibold">Không tìm thấy nhân sự có email</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none pr-1">
                    {staffList.map((staff) => {
                      const emailAddress = staff.email || staff.authEmail;
                      if (!emailAddress) return null;
                      const isChecked = (formState.recipientEmails || []).includes(emailAddress);

                      const handleToggle = () => {
                        const current = formState.recipientEmails || [];
                        const next = isChecked 
                          ? current.filter(e => e !== emailAddress)
                          : [...current, emailAddress];
                        onUpdateForm({ recipientEmails: next });
                      };

                      return (
                        <label 
                          key={staff.id} 
                          className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 rounded-xl cursor-pointer border border-slate-100 transition shadow-4xs w-full select-none"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={handleToggle}
                          />
                          <div className="min-w-0 text-left flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate leading-none">{staff.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{emailAddress}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                <p className="text-[10px] text-slate-450 leading-normal font-semibold italic">
                  * Báo cáo này sẽ được tự động gửi qua email đăng ký của các nhân sự được chọn sau khi bạn nộp.
                </p>
              </div>

              {/* Khối Xem trước Email */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs text-left">
                <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Mail className="h-4.5 w-4.5 text-[#C21A1A]" />
                  Xem trước Email
                </div>
                <p className="text-xs text-slate-400 font-semibold leading-normal">
                  Xem trước giao diện thư sẽ gửi tới nhân sự được chọn qua email.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPreviewOpen(true)}
                  className="w-full justify-center gap-2 hover:bg-slate-50 cursor-pointer rounded-xl font-bold text-xs py-2 border-slate-200 text-slate-700"
                >
                  <Eye className="h-4 w-4" />
                  Xem trước nội dung
                </Button>
              </div>

              {/* Khối Nguyên tắc điền báo cáo - Tạm đóng
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
              */}

              {/* Khối Nguồn tự động lấy số liệu - Tạm đóng
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
              */}

            </div>

          </div>
        </div>

        {/* Xem trước email Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-800 text-left">
                Xem trước nội dung Email gửi đi
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 p-4 border border-slate-100 rounded-2xl bg-white shadow-3xs overflow-x-auto min-h-[300px]">
              <div dangerouslySetInnerHTML={{ __html: generateEmailHtml() }} />
            </div>
          </DialogContent>
        </Dialog>

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
