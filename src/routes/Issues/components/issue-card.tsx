import React from 'react';
import {
  CheckCircle,
  User,
  Pencil,
  Trash2,
  ChevronRight,
  Check,
  Calendar,
  AlertCircle,
  HelpCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import { SOPIssue } from '../../../types/issues.types';

interface IssueCardProps {
  issue: SOPIssue;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (issue: SOPIssue) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onConfirmRead: (id: string) => void;
  isDropdownOpen: boolean;
  onToggleDropdown: (id: string | null) => void;
  isHighlighted?: boolean;
}

const formatReadConfirmedAt = (value?: string) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('vi-VN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

const getSeverityPill = (sev: 'High' | 'Medium' | 'Low') => {
  switch (sev) {
    case 'High':
      return (
        <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md border border-rose-100 bg-rose-50 text-rose-600 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Cao
        </span>
      );
    case 'Medium':
      return (
        <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md border border-amber-100 bg-amber-50 text-amber-600 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Trung bình
        </span>
      );
    case 'Low':
      return (
        <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md border border-slate-150 bg-slate-50 text-slate-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Thấp
        </span>
      );
  }
};

const getBadgeStyles = (category: SOPIssue['category']) => {
  switch (category) {
    case 'exception':
      return {
        badgeLayoutColor: 'bg-amber-50 border border-amber-100 text-amber-600',
        badgeEmblemText: '📋 Ngoại lệ',
        actionBtnStyle: 'border border-amber-200 text-amber-700 bg-transparent hover:bg-amber-50/50',
        assigneeLabel: 'Người duyệt',
      };
    case 'risk':
      return {
        badgeLayoutColor: 'bg-purple-50 border border-purple-100 text-purple-600',
        badgeEmblemText: '🛡️ Rủi ro',
        actionBtnStyle: 'border border-purple-200 text-purple-750 bg-transparent hover:bg-purple-50/50',
        assigneeLabel: 'Người theo dõi',
      };
    case 'improvement':
      return {
        badgeLayoutColor: 'bg-emerald-50 border border-emerald-100 text-emerald-600',
        badgeEmblemText: '📈 Cải tiến',
        actionBtnStyle: 'border border-emerald-200 text-emerald-750 bg-transparent hover:bg-emerald-50/50',
        assigneeLabel: 'Người xử lý',
      };
    default: // 'sop_error'
      return {
        badgeLayoutColor: 'bg-rose-50 border border-rose-100 text-[#C21A1A]',
        badgeEmblemText: '⚠️ Lỗi SOP',
        actionBtnStyle: 'border border-red-200 text-[#C21A1A] bg-transparent hover:bg-red-50/50',
        assigneeLabel: 'Người xử lý',
      };
  }
};

const getCategoryUXLabels = (category: SOPIssue['category']) => {
  switch (category) {
    case 'exception':
      return {
        titleLabel: 'Nội dung ngoại lệ phát sinh',
        descLabel: '📋 Diễn biến & Điều kiện phê duyệt',
      };
    case 'risk':
      return {
        titleLabel: 'Vấn đề nguy cơ rủi ro',
        descLabel: '🛡️ Đánh giá & Biện pháp phòng ngừa',
      };
    case 'improvement':
      return {
        titleLabel: 'Ý tưởng cải tiến đề xuất',
        descLabel: '💡 Phương án triển khai chi tiết',
      };
    default: // 'sop_error'
      return {
        titleLabel: 'Chi tiết lỗi SOP ghi nhận',
        descLabel: '📝 Diễn biến thực tế & Khắc phục',
      };
  }
};

const IssueCard = React.memo(function IssueCard({
  issue,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onUpdateStatus,
  onConfirmRead,
  isDropdownOpen,
  onToggleDropdown,
  isHighlighted = false,
}: IssueCardProps) {
  const { badgeLayoutColor, badgeEmblemText, actionBtnStyle, assigneeLabel } = React.useMemo(() => {
    return getBadgeStyles(issue.category);
  }, [issue.category]);

  const { titleLabel, descLabel } = React.useMemo(() => {
    return getCategoryUXLabels(issue.category);
  }, [issue.category]);

  const handleEdit = React.useCallback(() => {
    onEdit(issue);
  }, [onEdit, issue]);

  const handleDelete = React.useCallback(() => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phiếu "${issue.title}"?`)) {
      onDelete(issue.id);
    }
  }, [onDelete, issue.id, issue.title]);

  const handleToggleDropdown = React.useCallback(() => {
    onToggleDropdown(isDropdownOpen ? null : issue.id);
  }, [onToggleDropdown, isDropdownOpen, issue.id]);

  const handleUpdateStatusImmediate = React.useCallback(() => {
    onUpdateStatus(issue.id, 'Xử lý ngay');
    onToggleDropdown(null);
  }, [onUpdateStatus, issue.id, onToggleDropdown]);

  const handleUpdateStatusPending = React.useCallback(() => {
    onUpdateStatus(issue.id, 'Chờ duyệt');
    onToggleDropdown(null);
  }, [onUpdateStatus, issue.id, onToggleDropdown]);

  const handleUpdateStatusInProgress = React.useCallback(() => {
    onUpdateStatus(issue.id, 'Đang triển khai');
    onToggleDropdown(null);
  }, [onUpdateStatus, issue.id, onToggleDropdown]);

  const handleUpdateStatusResolved = React.useCallback(() => {
    onUpdateStatus(issue.id, 'Đã xử lý');
    onToggleDropdown(null);
  }, [onUpdateStatus, issue.id, onToggleDropdown]);

  const handleConfirmRead = React.useCallback(() => {
    onConfirmRead(issue.id);
    onToggleDropdown(null);
  }, [onConfirmRead, issue.id, onToggleDropdown]);

  return (
    <div
      id={`issue-card-${issue.id}`}
      className={`group bg-white rounded-2xl border p-5 shadow-[0_4px_20px_-4px_rgba(148,163,184,0.12)] hover:shadow-[0_12px_30px_-6px_rgba(148,163,184,0.22)] hover:border-slate-350 hover:-translate-y-1 transition-all duration-300 ease-out relative flex flex-col justify-between text-left ${
        isHighlighted ? 'border-[#C21A1A] ring-2 ring-[#C21A1A]/25' : 'border-slate-200/80'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2.5 mb-3.5">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${badgeLayoutColor}`}>
              {badgeEmblemText}
            </span>
            {getSeverityPill(issue.severity)}
          </div>
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1 select-none">
            <Calendar className="w-3.5 h-3.5 opacity-60" />
            {issue.date}
          </span>
        </div>

        {/* Title Section with tiny label descriptor */}
        <div className="space-y-1">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block select-none">
            {titleLabel}
          </span>
          <h4 className="font-extrabold text-[15.5px] text-slate-800 tracking-tight leading-snug group-hover:text-[#C21A1A] transition-colors duration-200">
            {issue.title}
          </h4>
        </div>

        {/* Description of the ticket issue */}
        {issue.description && (
          <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 mt-2.5 hover:bg-slate-50 transition-colors duration-200 flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block select-none">
              {descLabel}
            </span>
            <p className="text-xs text-slate-650 leading-relaxed font-semibold">
              {issue.description}
            </p>
          </div>
        )}

        {issue.readConfirmedAt && (
          <div className="mt-2.5 text-[10px] font-bold text-emerald-700 bg-emerald-50/80 border border-emerald-100 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>
              Đã xác nhận đọc lúc {formatReadConfirmedAt(issue.readConfirmedAt)}
              {issue.readConfirmedBy ? ` bởi ${issue.readConfirmedBy}` : ''}
            </span>
          </div>
        )}

        {/* Sub Grid Panel (Exact Three columns translation from phone design) */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50/40 border border-slate-100 rounded-xl p-3.5 my-4 text-xs">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Người liên quan</span>
            <p className="font-extrabold text-slate-700 truncate">{issue.actor}</p>
          </div>
          <div className="space-y-1 border-x border-slate-100 px-3">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Quy trình</span>
            <p className="font-extrabold text-slate-700 truncate">{issue.process || 'Chưa định nghĩa'}</p>
          </div>
          <div className="space-y-1 pl-3">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Lần xảy ra</span>
            <p className="font-black font-mono text-[#C21A1A] bg-rose-50 border border-rose-100 rounded-lg px-2 py-0.5 inline-block text-[11px] scale-95 origin-left">
              {issue.occurrence || 1}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Human Avatar Assigned and Interactive Action Button */}
      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-4">
        {/* Human User info avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-500 font-black text-xs shrink-0 select-none shadow-inner">
            {issue.assignee ? issue.assignee.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold leading-tight uppercase font-sans">{assigneeLabel}</span>
            <span className="text-xs font-black text-slate-800 leading-none block mt-0.5">{issue.assignee || 'Trọng tâm cửa hàng'}</span>
          </div>
        </div>

        {/* Operational status toggle conforming to beautiful system layout state popup */}
        <div className="relative shrink-0 text-right flex items-center gap-1.5">
          {canUpdate && (
            <button
              onClick={handleEdit}
              className="p-2 rounded-xl border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-500 hover:text-slate-800 cursor-pointer active:scale-95 transition-all duration-150"
              title="Chỉnh sửa phiếu"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-xl border border-slate-200 hover:border-rose-350 hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer active:scale-95 transition-all duration-150"
              title="Xóa phiếu"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            disabled={!canUpdate}
            onClick={handleToggleDropdown}
            className={`px-4 py-2 font-black text-xs uppercase tracking-wider rounded-xl duration-150 inline-flex items-center gap-1.5 shadow-2xs border ${canUpdate ? `cursor-pointer hover:shadow-xs active:scale-95 transition-all duration-150 ${actionBtnStyle}` : 'cursor-not-allowed opacity-50 border border-slate-200 text-slate-400 bg-slate-50'}`}
          >
            <span>{issue.status}</span>
            <ChevronRight className="w-3.5 h-3.5 rotate-90 stroke-[3.5] opacity-80" />
          </button>

          {canUpdate && isDropdownOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] z-30 py-2.5 text-xs text-left animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden">
              <p className="px-3 py-1 font-black text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-50 mb-1.5">Cập nhật xử lý</p>

              <button
                onClick={handleUpdateStatusImmediate}
                className="w-full px-3 py-2.5 text-left hover:bg-red-50 flex items-center justify-between text-[#C21A1A] font-extrabold transition-colors duration-100"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Xử lý ngay</span>
                </div>
                {issue.status === 'Xử lý ngay' && <Check className="w-4 h-4 text-[#C21A1A] stroke-[3]" />}
              </button>

              <button
                onClick={handleUpdateStatusPending}
                className="w-full px-3 py-2.5 text-left hover:bg-amber-50/80 flex items-center justify-between text-amber-600 font-extrabold transition-colors duration-100"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Chờ duyệt</span>
                </div>
                {issue.status === 'Chờ duyệt' && <Check className="w-4 h-4 text-amber-600 stroke-[3]" />}
              </button>

              <button
                onClick={handleUpdateStatusInProgress}
                className="w-full px-3 py-2.5 text-left hover:bg-emerald-50/60 flex items-center justify-between text-emerald-600 font-extrabold transition-colors duration-100"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Đang triển khai</span>
                </div>
                {issue.status === 'Đang triển khai' && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
              </button>

              <button
                onClick={handleUpdateStatusResolved}
                className="w-full px-3 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between text-slate-600 font-extrabold transition-colors duration-100"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Đã xử lý (Bộ lưu)</span>
                </div>
                {issue.status === 'Đã xử lý' && <Check className="w-4 h-4 text-slate-600 stroke-[3]" />}
              </button>

              <div className="border-t border-slate-100 mt-1.5 pt-1.5">
                <button
                  onClick={handleConfirmRead}
                  className="w-full px-3 py-2.5 text-left hover:bg-emerald-50/80 flex items-center justify-between text-emerald-600 font-extrabold transition-colors duration-100"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Xác nhận đã đọc</span>
                  </div>
                  {issue.readConfirmedAt && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default IssueCard;
