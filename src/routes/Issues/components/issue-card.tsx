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
  BookOpen,
  CornerDownRight,
  AlignLeft,
  Building,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import type { SOPIssue, SOPIssueStatus } from '../../../types/issues.types';
import { 
  Card, 
  Button, 
  Badge, 
  Avatar, 
  AvatarFallback,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '../../../../share/ui';
import { cn } from '../../../../share/lib/utils';

interface IssueCardProps {
  issue: SOPIssue;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (issue: SOPIssue) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: SOPIssueStatus) => void;
  onConfirmRead: (id: string) => void;
  isDropdownOpen: boolean;
  onToggleDropdown: (id: string | null) => void;
  isHighlighted?: boolean;
}

const formatReadConfirmedAt = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

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
        <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border-rose-100 bg-rose-50/70 text-rose-600 flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Cao
        </Badge>
      );
    case 'Medium':
      return (
        <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border-amber-100 bg-amber-50/70 text-amber-600 flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-550" />
          Trung bình
        </Badge>
      );
    case 'Low':
      return (
        <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border-slate-200 bg-slate-50/80 text-slate-500 flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Thấp
        </Badge>
      );
  }
};

const getBadgeStyles = (category: SOPIssue['category']) => {
  switch (category) {
    case 'exception':
      return {
        badgeLayoutColor: 'bg-amber-50 border-amber-100 text-amber-700',
        badgeEmblemText: '📋 Ngoại lệ',
        actionBtnStyle: 'border-amber-200 text-amber-700 bg-transparent hover:bg-amber-50/50',
        assigneeLabel: 'Người duyệt',
      };
    case 'risk':
      return {
        badgeLayoutColor: 'bg-purple-50 border-purple-100 text-purple-700',
        badgeEmblemText: '🛡️ Rủi ro',
        actionBtnStyle: 'border-purple-200 text-purple-750 bg-transparent hover:bg-purple-50/50',
        assigneeLabel: 'Người theo dõi',
      };
    case 'improvement':
      return {
        badgeLayoutColor: 'bg-emerald-50 border-emerald-100 text-emerald-700',
        badgeEmblemText: '📈 Cải tiến',
        actionBtnStyle: 'border-emerald-200 text-emerald-750 bg-transparent hover:bg-emerald-50/50',
        assigneeLabel: 'Người xử lý',
      };
    default: // 'sop_error'
      return {
        badgeLayoutColor: 'bg-rose-50 border-rose-100 text-[#C21A1A]',
        badgeEmblemText: '⚠️ Lỗi SOP',
        actionBtnStyle: 'border-red-200 text-[#C21A1A] bg-transparent hover:bg-red-50/50',
        assigneeLabel: 'Người xử lý',
      };
  }
};

const getCategoryDescLabel = (category: SOPIssue['category']) => {
  switch (category) {
    case 'exception':
      return '📋 Diễn biến & Điều kiện phê duyệt';
    case 'risk':
      return '🛡️ Đánh giá & Biện pháp phòng ngừa';
    case 'improvement':
      return '💡 Phương án triển khai chi tiết';
    default: // 'sop_error'
      return '📝 Diễn biến thực tế & Khắc phục';
  }
};

interface StatusConfig {
  status: SOPIssueStatus;
  label: string;
  colorClass: string;
  hoverClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_CONFIGS: StatusConfig[] = [
  {
    status: 'Xử lý ngay',
    label: 'Xử lý ngay',
    colorClass: 'text-[#C21A1A]',
    hoverClass: 'hover:bg-red-50/60',
    icon: AlertCircle,
  },
  {
    status: 'Chờ duyệt',
    label: 'Chờ duyệt',
    colorClass: 'text-amber-600',
    hoverClass: 'hover:bg-amber-50/50',
    icon: HelpCircle,
  },
  {
    status: 'Đang triển khai',
    label: 'Đang triển khai',
    colorClass: 'text-emerald-600',
    hoverClass: 'hover:bg-emerald-50/40',
    icon: Clock,
  },
  {
    status: 'Đã xử lý',
    label: 'Đã xử lý (Bộ lưu)',
    colorClass: 'text-slate-600',
    hoverClass: 'hover:bg-slate-50',
    icon: CheckCircle,
  },
];

interface StatusDropdownItemProps {
  cfg: StatusConfig;
  isSelected: boolean;
  onClick: (status: SOPIssueStatus) => void;
}

const StatusDropdownItem = React.memo(function StatusDropdownItem({
  cfg,
  isSelected,
  onClick,
}: StatusDropdownItemProps) {
  const Icon = cfg.icon;
  
  const handleClick = React.useCallback(() => {
    onClick(cfg.status);
  }, [onClick, cfg.status]);

  return (
    <DropdownMenuItem
      onClick={handleClick}
      className={cn(
        "px-2.5 py-1.5 rounded-md flex items-center justify-between font-bold text-xs cursor-pointer",
        cfg.colorClass,
        cfg.hoverClass
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5" />
        <span>{cfg.label}</span>
      </div>
      {isSelected && <Check className="size-3.5 stroke-[2.5]" />}
    </DropdownMenuItem>
  );
});

interface StatusDropdownProps {
  issue: Pick<SOPIssue, 'id' | 'status' | 'readConfirmedAt' | 'category'>;
  canUpdate: boolean;
  isDropdownOpen: boolean;
  onToggleDropdown: (id: string | null) => void;
  onUpdateStatus: (id: string, status: SOPIssueStatus) => void;
  onConfirmRead: (id: string) => void;
  triggerClassName?: string;
}

const StatusDropdown = React.memo(function StatusDropdown({
  issue,
  canUpdate,
  isDropdownOpen,
  onToggleDropdown,
  onUpdateStatus,
  onConfirmRead,
  triggerClassName,
}: StatusDropdownProps) {
  const { actionBtnStyle } = React.useMemo(() => {
    return getBadgeStyles(issue.category);
  }, [issue.category]);
  const handleOpenChange = React.useCallback((open: boolean) => {
    onToggleDropdown(open ? issue.id : null);
  }, [onToggleDropdown, issue.id]);

  const handleStatusClick = React.useCallback((status: SOPIssueStatus) => {
    onUpdateStatus(issue.id, status);
    onToggleDropdown(null);
  }, [onUpdateStatus, issue.id, onToggleDropdown]);

  const handleConfirmRead = React.useCallback(() => {
    onConfirmRead(issue.id);
    onToggleDropdown(null);
  }, [onConfirmRead, issue.id, onToggleDropdown]);

  return (
    <DropdownMenu open={canUpdate && isDropdownOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={!canUpdate}
          variant="ghost"
          size="sm"
          className={cn(
            "font-bold uppercase tracking-wider rounded-lg border shadow-none",
            canUpdate 
              ? cn("hover:shadow-xs border-solid", actionBtnStyle) 
              : 'opacity-50 border border-slate-200 text-slate-400 bg-slate-50 border-solid',
            triggerClassName
          )}
        >
          <span>{issue.status}</span>
          <ChevronRight className="size-2.5 rotate-90 stroke-[3] opacity-80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="w-48 bg-white border border-slate-200/80 rounded-xl shadow-lg p-1.5 z-40">
        <DropdownMenuLabel className="px-2.5 py-1.5 font-bold text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-50 mb-1">
          Cập nhật xử lý
        </DropdownMenuLabel>
        
        {STATUS_CONFIGS.map((cfg) => {
          const isSelected = issue.status === cfg.status;
          return (
            <StatusDropdownItem
              key={cfg.status}
              cfg={cfg}
              isSelected={isSelected}
              onClick={handleStatusClick}
            />
          );
        })}

        <DropdownMenuSeparator className="bg-slate-100 my-1" />

        <DropdownMenuItem
          onClick={handleConfirmRead}
          className="px-2.5 py-1.5 hover:bg-emerald-50/50 rounded-md flex items-center justify-between text-emerald-600 font-bold text-xs cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <BookOpen className="size-3.5" />
            <span>Xác nhận đã đọc</span>
          </div>
          {issue.readConfirmedAt && <Check className="size-3.5 text-emerald-600 stroke-[2.5]" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

const stripHtmlAndTruncate = (html: string = '', maxLength: number = 100) => {
  const cleanText = html.replace(/<\/?[^>]+(>|$)/g, "");
  if (cleanText.length <= maxLength) return cleanText;
  return cleanText.substring(0, maxLength) + '...';
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
  const { badgeLayoutColor, badgeEmblemText } = React.useMemo(() => {
    return getBadgeStyles(issue.category);
  }, [issue.category]);

  const handleEdit = React.useCallback(() => {
    onEdit(issue);
  }, [onEdit, issue]);

  const handleDelete = React.useCallback(() => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phiếu "${issue.title}"?`)) {
      onDelete(issue.id);
    }
  }, [onDelete, issue.id, issue.title]);

  const statusDropdownProps = React.useMemo(() => ({
    issue,
    canUpdate,
    isDropdownOpen,
    onToggleDropdown,
    onUpdateStatus,
    onConfirmRead,
  }), [issue, canUpdate, isDropdownOpen, onToggleDropdown, onUpdateStatus, onConfirmRead]);

  return (
    <Card
      id={`issue-card-${issue.id}`}
      className={cn(
        "bg-white rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-3.5 transition-all duration-300 relative hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)] hover:border-slate-200/80 hover:-translate-y-[2px] w-full max-w-[420px] mx-auto md:mx-0 cursor-pointer",
        isHighlighted ? 'border-[#C21A1A] ring-2 ring-[#C21A1A]/15' : 'border-slate-100'
      )}
      onClick={handleEdit}
    >
      <div>
        {/* Top Header Row: Category Badge & Status Dropdown */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap pr-2">
            {/* Category icon with soft bg */}
            <div className={cn("p-1 rounded-lg shrink-0", 
              issue.category === 'sop_error' ? 'bg-rose-50 text-[#C21A1A]' :
              issue.category === 'exception' ? 'bg-amber-50 text-amber-600' :
              issue.category === 'risk' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
            )}>
              {issue.category === 'sop_error' ? <AlertOctagon className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </div>

            {/* Category Pill */}
            <span className={cn("inline-flex items-center gap-1 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full border tracking-wide shrink-0", 
              issue.category === 'sop_error' ? 'bg-rose-50 border-rose-100 text-[#C21A1A]' :
              issue.category === 'exception' ? 'bg-amber-50 border-amber-100 text-amber-700' :
              issue.category === 'risk' ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            )}>
              {badgeEmblemText}
            </span>

            {/* Priority Badge */}
            {getSeverityPill(issue.severity)}
          </div>

          {/* Quick status dropdown on right */}
          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <StatusDropdown
              {...statusDropdownProps}
              triggerClassName="px-2 h-7.5 text-[9px] sm:text-[10px]"
            />
          </div>
        </div>

        {/* Title of the issue card */}
        <div className="space-y-1 mt-2 text-left">
          <h4 className="font-extrabold text-slate-900 text-[15px] sm:text-[16px] leading-snug tracking-tight hover:text-slate-950 transition-colors break-words">
            <span className="text-slate-400 font-medium mr-1 select-none">Tên phiếu:</span>
            {issue.title}
          </h4>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100/80 my-1.5" />

        {/* Card Details (Grid key-value list with icons) */}
        <div className="flex-1 flex flex-col gap-2.5 text-sm text-left">
          {/* Description */}
          <div className="grid grid-cols-[105px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)] gap-2 items-start py-0.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
              <AlignLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Diễn biến / Mô tả
            </span>
            <span className="text-slate-700 font-medium whitespace-pre-line leading-relaxed break-words line-clamp-3 overflow-hidden font-sans">
              {stripHtmlAndTruncate(issue.description, 100) || <span className="text-slate-350 italic">Không có mô tả...</span>}
              {issue.description && issue.description.includes('<img') && (
                <span className="inline-flex items-center gap-1 ml-1 text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 shrink-0">
                  🖼️ Có ảnh đính kèm
                </span>
              )}
            </span>
          </div>

          {/* Actor */}
          <div className="grid grid-cols-[105px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)] gap-2 items-center py-0.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Bên liên quan
            </span>
            <span className="text-slate-700 font-bold truncate">{issue.actor || 'Hệ thống ca trực'}</span>
          </div>

          {/* Process */}
          <div className="grid grid-cols-[105px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)] gap-2 items-center py-0.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
              <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Quy trình
            </span>
            <span className="text-slate-700 font-bold truncate">{issue.process || 'Vận hành chung'}</span>
          </div>

          {/* Assignee */}
          <div className="grid grid-cols-[105px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)] gap-2 items-center py-0.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Người xử lý
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full bg-slate-100 text-[9px] flex items-center justify-center font-black text-slate-600 border border-slate-200/50 uppercase shadow-3xs shrink-0">
                {issue.assignee?.charAt(0) || 'U'}
              </div>
              <span className="text-slate-700 font-bold truncate">{issue.assignee || 'Quản lý cửa hàng'}</span>
            </div>
          </div>

          {/* Occurrence & Date */}
          <div className="grid grid-cols-[105px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)] gap-2 items-center py-0.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Lần xảy ra / Ngày
            </span>
            <div className="flex items-center gap-2 flex-wrap text-slate-700 font-bold text-xs">
              <Badge variant="outline" className="font-bold text-[#C21A1A] bg-rose-50/70 border-rose-100 px-1.5 py-0.2 rounded text-[10px] shrink-0">
                {issue.occurrence || 1} lần
              </Badge>
              <span className="text-slate-300 font-normal">|</span>
              <span className="text-slate-500 font-medium text-[11px] shrink-0">{issue.date}</span>
            </div>
          </div>
        </div>

        {/* Read confirmation */}
        {issue.readConfirmedAt && (
          <div className="mt-3 text-[10px] md:text-xs font-semibold text-emerald-700 bg-emerald-50/60 border border-emerald-100/50 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5 w-fit select-none">
            <CheckCircle className="size-3.5 text-emerald-600" />
            <span>
              Đã đọc lúc {formatReadConfirmedAt(issue.readConfirmedAt)}
              {issue.readConfirmedBy ? ` bởi ${issue.readConfirmedBy}` : ''}
            </span>
          </div>
        )}

        {/* Action Buttons (Edit/Delete) */}
        {(canUpdate || canDelete) && (
          <>
            <div className="border-t border-slate-100 my-2" />
            <div className="flex items-center justify-end gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
              {canUpdate && (
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="h-7 text-[10px] px-2 rounded-lg font-bold hover:bg-slate-50 border-slate-200 transition-all active:scale-97 cursor-pointer flex items-center gap-1"
                  onClick={handleEdit}
                >
                  <Pencil className="w-3 h-3 text-slate-500" />
                  Sửa
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  className="h-7 text-[10px] px-2 rounded-lg font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all active:scale-97 cursor-pointer flex items-center gap-1"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
});

export default IssueCard;
