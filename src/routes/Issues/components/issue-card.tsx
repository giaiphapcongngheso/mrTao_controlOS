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
  CornerDownRight
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
  const { badgeLayoutColor, badgeEmblemText, assigneeLabel } = React.useMemo(() => {
    return getBadgeStyles(issue.category);
  }, [issue.category]);

  const descLabel = React.useMemo(() => {
    return getCategoryDescLabel(issue.category);
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
        "bg-white rounded-xl border p-5 shadow-[0_5px_22px_-4px_rgba(148,163,184,0.14),0_2px_4px_-2px_rgba(148,163,184,0.06)] hover:shadow-[0_16px_36px_-8px_rgba(148,163,184,0.28),0_4px_12px_-4px_rgba(148,163,184,0.16)] hover:border-slate-350 hover:-translate-y-1 transition-all duration-300 ease-out relative flex flex-col justify-between text-left gap-0",
        isHighlighted ? 'border-[#C21A1A] ring-2 ring-[#C21A1A]/15' : 'border-slate-200/90'
      )}
    >
      <div>
        {/* Top Header Row: Assignee, Badges, Actions (Edit/Delete/Status) */}
        <div className="flex flex-col gap-2.5 pb-3 border-b border-slate-100/60 mb-3.5">
          {/* Row 1: Assignee Info (Left) & Actions (Right) */}
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Left: Assignee Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="size-8 border border-slate-200 shadow-2xs shrink-0">
                <AvatarFallback className="bg-gradient-to-tr from-slate-50 to-slate-100 text-slate-600 font-bold text-[11px]">
                  {issue.assignee ? issue.assignee.charAt(0).toUpperCase() : <User className="size-3.5 text-slate-400" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">{assigneeLabel}</span>
                <span className="text-xs font-bold text-slate-700 mt-1 leading-none truncate max-w-[120px] sm:max-w-[155px]" title={issue.assignee || 'Trọng tâm cửa hàng'}>
                  {issue.assignee || 'Trọng tâm cửa hàng'}
                </span>
              </div>
            </div>

            {/* Right: Operational actions (Edit/Delete/Desktop Status) */}
            <div className="relative shrink-0 flex items-center gap-1.5">
              {canUpdate && (
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={handleEdit}
                  className="rounded-lg text-slate-500 hover:text-slate-800 border-slate-200/80 hover:bg-slate-50"
                  title="Chỉnh sửa phiếu"
                >
                  <Pencil className="size-3.5" />
                </Button>
              )}

              {canDelete && (
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={handleDelete}
                  className="rounded-lg text-slate-500 hover:text-rose-600 border-slate-200/80 hover:bg-rose-50/50 hover:border-rose-200"
                  title="Xóa phiếu"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}

              {/* Status Dropdown on Desktop only */}
              <div className="hidden sm:block">
                <StatusDropdown
                  {...statusDropdownProps}
                  triggerClassName="px-2.5 h-8 text-[10px] sm:text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Badges aligned under name & Status Dropdown on Mobile */}
          <div className="flex items-center justify-between gap-1.5 w-full pl-[42px]">
            {/* Badges list */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border", badgeLayoutColor)}>
                {badgeEmblemText}
              </Badge>
              {getSeverityPill(issue.severity)}
            </div>

            {/* Status Dropdown on Mobile only */}
            <div className="sm:hidden shrink-0">
              <StatusDropdown
                {...statusDropdownProps}
                triggerClassName="px-2 h-7 text-[9px] sm:text-[10px]"
              />
            </div>
          </div>
        </div>

        {/* Title of the issue card */}
        <h4 className="font-bold text-[15px] md:text-base text-slate-800 tracking-tight leading-snug group-hover:text-[#C21A1A] transition-colors duration-150">
          <span className="text-slate-400 font-medium mr-1 select-none">Tên phiếu:</span>
          {issue.title}
        </h4>

        {/* Description flat block with clean vertical border design */}
        {issue.description && (
          <div className="mt-2.5 pl-3.5 border-l-2 border-slate-200/80 text-xs md:text-sm text-slate-550 leading-relaxed font-normal flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block select-none mb-1">
              {descLabel}
            </span>
            <p className="text-slate-600 font-medium flex-1">{issue.description}</p>
          </div>
        )}

        {/* Read confirmation */}
        {issue.readConfirmedAt && (
          <div className="mt-3 text-[10px] md:text-xs font-semibold text-emerald-700 bg-emerald-50/60 border border-emerald-100/50 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5 w-fit">
            <CheckCircle className="size-3.5 text-emerald-600" />
            <span>
              Đã đọc lúc {formatReadConfirmedAt(issue.readConfirmedAt)}
              {issue.readConfirmedBy ? ` bởi ${issue.readConfirmedBy}` : ''}
            </span>
          </div>
        )}

        {/* Sub Metadata Row: Clean line separation with explicit labels */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-dashed border-slate-200/60 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-medium">Bên liên quan:</span>
              <span className="font-bold text-slate-700">{issue.actor}</span>
            </div>
            
            <span className="text-slate-200 select-none">•</span>
            
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-medium">Quy trình:</span>
              <span className="font-bold text-slate-700 truncate max-w-[130px]" title={issue.process}>
                {issue.process || 'Chưa quy định'}
              </span>
            </div>

            <span className="text-slate-200 select-none">•</span>

            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-medium">Lần xảy ra:</span>
              <Badge variant="outline" className="font-bold font-sans text-[#C21A1A] bg-rose-50/70 border-rose-100 px-2 py-0.5 rounded text-[10px]">
                {issue.occurrence || 1}
              </Badge>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 font-medium tracking-wide flex items-center gap-1 select-none shrink-0">
            <Calendar className="size-3.5 opacity-60 text-slate-500" />
            {issue.date}
          </span>
        </div>
      </div>
    </Card>
  );
});

export default IssueCard;
