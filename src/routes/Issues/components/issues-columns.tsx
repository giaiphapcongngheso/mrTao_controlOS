import {
  Check,
  Pencil,
  Trash2,
  AlertOctagon,
  HelpCircle,
  Clock,
  CheckCircle,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { SOPIssue, SOPIssueStatus } from '../../../types/issues.types';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Checkbox,
} from '../../../../share/ui';
import { cn } from '../../../../share/lib/utils';
import { CustomSelect } from '../../../../share/components/custom/custom-select';

// ============================================================================
// Types
// ============================================================================

export interface IssueColumnsConfig {
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
  onUpdateIssueStatus: (issueId: string, status: SOPIssueStatus) => void;
  onConfirmIssueRead: (issueId: string) => void;
  onEditIssue: (issue: SOPIssue) => void;
  onDeleteIssue: (issueId: string) => void;
}

// ============================================================================
// Shared filter input class for DRY
// ============================================================================

const FILTER_INPUT_CLASS =
  'w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium';

// ============================================================================
// Column Definitions Factory
// ============================================================================

export function getIssueColumns(config: IssueColumnsConfig): ColumnDef<SOPIssue>[] {
  const { permissions, onUpdateIssueStatus, onConfirmIssueRead, onEditIssue, onDeleteIssue } = config;

  return [
    // ── Select checkbox ──
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
      meta: {
        sticky: 'left',
      },
    },

    // ── Category ──
    {
      accessorKey: 'category',
      header: 'Phân loại',
      size: 150,
      cell: ({ row }) => {
        const category = row.original.category;
        const badgeStyles = {
          exception: 'bg-amber-50 border-amber-100 text-amber-700',
          risk: 'bg-purple-50 border-purple-100 text-purple-700',
          improvement: 'bg-emerald-50 border-emerald-100 text-emerald-700',
          sop_error: 'bg-rose-50 border-rose-100 text-[#C21A1A]',
        };
        const badgeTexts = {
          exception: '📋 Ngoại lệ',
          risk: '🛡️ Rủi ro',
          improvement: '📈 Cải tiến',
          sop_error: '⚠️ Lỗi SOP',
        };
        return (
          <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-0.5 rounded-md border tracking-normal w-fit whitespace-nowrap", badgeStyles[category] || badgeStyles.sop_error)}>
            {badgeTexts[category] || '⚠️ Lỗi SOP'}
          </span>
        );
      },
      meta: {
        filterElement: (column) => {
          const val = (column.getFilterValue() as string) ?? 'all';
          const options = [
            { label: 'Tất cả', value: 'all' },
            { label: 'Lỗi SOP', value: 'sop_error' },
            { label: 'Ngoại lệ', value: 'exception' },
            { label: 'Rủi ro', value: 'risk' },
            { label: 'Sáng kiến', value: 'improvement' },
          ];
          return (
            <CustomSelect
              value={val}
              onChangeValue={(value) => column.setFilterValue(value === 'all' ? undefined : value)}
              options={options}
              clearable={false}
              className="w-full h-8 text-xs font-bold rounded-lg border border-slate-200 hover:border-slate-300 bg-white"
            />
          );
        },
      },
    },

    // ── Severity ──
    {
      accessorKey: 'severity',
      header: 'Độ nghiêm trọng',
      size: 150,
      cell: ({ row }) => {
        const sev = row.original.severity;
        switch (sev) {
          case 'High':
            return (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-md border border-rose-100 bg-rose-50/70 text-rose-600 px-2.5 py-0.5 shrink-0 w-fit whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                Cao
              </span>
            );
          case 'Medium':
            return (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-md border border-amber-100 bg-amber-50/70 text-amber-600 px-2.5 py-0.5 shrink-0 w-fit whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                Trung bình
              </span>
            );
          case 'Low':
            return (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-md border border-slate-200 bg-slate-50/80 text-slate-500 px-2.5 py-0.5 shrink-0 w-fit whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                Thấp
              </span>
            );
          default:
            return null;
        }
      },
      meta: {
        filterElement: (column) => {
          const val = (column.getFilterValue() as string) ?? 'all';
          const options = [
            { label: 'Tất cả', value: 'all' },
            { label: 'Cao', value: 'High' },
            { label: 'Trung bình', value: 'Medium' },
            { label: 'Thấp', value: 'Low' },
          ];
          return (
            <CustomSelect
              value={val}
              onChangeValue={(value) => column.setFilterValue(value === 'all' ? undefined : value)}
              options={options}
              clearable={false}
              className="w-full h-8 text-xs font-bold rounded-lg border border-slate-200 hover:border-slate-300 bg-white"
            />
          );
        },
      },
    },

    // ── Title ──
    {
      accessorKey: 'title',
      header: 'Tên phiếu',
      size: 250,
      cell: ({ row }) => (
        <div id={`issue-card-${row.original.id}`} className="font-medium text-slate-950 text-left text-sm leading-snug break-words">
          {row.original.title}
        </div>
      ),
      meta: {
        filterElement: (column) => (
          <input
            type="text"
            placeholder="Lọc tên..."
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            className={FILTER_INPUT_CLASS}
          />
        ),
      },
    },

    // ── Description ──
    {
      accessorKey: 'description',
      header: 'Diễn biến / Mô tả',
      size: 285,
      cell: ({ row }) => {
        const desc = row.original.description;
        const cleanText = desc ? desc.replace(/<\/?[^>]+(>|$)/g, "") : '';
        const isImg = desc && desc.includes('<img');
        return (
          <div className="text-slate-800 font-normal text-sm text-left line-clamp-2 break-words max-w-sm whitespace-pre-line leading-relaxed font-sans">
            {cleanText || <span className="text-slate-400 italic">Không có mô tả...</span>}
            {isImg && (
              <span className="inline-flex items-center gap-1 ml-1 text-sm font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 shrink-0">
                🖼️ Ảnh
              </span>
            )}
          </div>
        );
      },
      meta: {
        filterElement: (column) => (
          <input
            type="text"
            placeholder="Lọc mô tả..."
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            className={FILTER_INPUT_CLASS}
          />
        ),
      },
    },

    // ── Actor ──
    {
      accessorKey: 'actor',
      header: 'Bên liên quan',
      size: 180,
      cell: ({ row }) => (
        <div className="text-slate-900 font-normal text-sm truncate text-left">
          {row.original.actor || 'Hệ thống ca trực'}
        </div>
      ),
      meta: {
        filterElement: (column) => (
          <input
            type="text"
            placeholder="Lọc bên liên quan..."
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            className={FILTER_INPUT_CLASS}
          />
        ),
      },
    },

    // ── Process ──
    {
      accessorKey: 'process',
      header: 'Quy trình',
      size: 180,
      cell: ({ row }) => (
        <div className="text-slate-900 font-normal text-sm truncate text-left">
          {row.original.process || 'Quy trình vận hành'}
        </div>
      ),
      meta: {
        filterElement: (column) => (
          <input
            type="text"
            placeholder="Lọc quy trình..."
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            className={FILTER_INPUT_CLASS}
          />
        ),
      },
    },

    // ── Assignee ──
    {
      accessorKey: 'assignee',
      header: 'Người xử lý',
      size: 190,
      cell: ({ row }) => {
        const assignee = row.original.assignee;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full bg-slate-100 text-sm flex items-center justify-center font-medium text-slate-600 border border-slate-200/50 uppercase shadow-3xs shrink-0">
              {assignee?.charAt(0) || 'U'}
            </div>
            <span className="text-slate-900 font-normal truncate text-sm">{assignee || 'Quản lý cửa hàng'}</span>
          </div>
        );
      },
      meta: {
        filterElement: (column) => (
          <input
            type="text"
            placeholder="Lọc người xử lý..."
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            className={FILTER_INPUT_CLASS}
          />
        ),
      },
    },

    // ── Date ──
    {
      accessorKey: 'date',
      header: 'Lần xảy ra / Ngày',
      size: 150,
      cell: ({ row }) => {
        const issue = row.original;
        return (
          <div className="flex flex-col gap-1.5 text-left py-0.5">
            <span className="text-slate-900 font-normal text-sm shrink-0 leading-none">{issue.date}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C21A1A] bg-rose-50/70 border border-rose-100 px-1.5 py-0.5 rounded-md shrink-0 w-fit leading-none">
              {issue.occurrence || 1} lần
            </span>
          </div>
        );
      },
      meta: {
        filterElement: (column) => (
          <input
            type="text"
            placeholder="Lọc ngày..."
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            className={FILTER_INPUT_CLASS}
          />
        ),
      },
    },

    // ── Status (Dropdown) ──
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      size: 180,
      cell: ({ row }) => {
        const issue = row.original;
        const canUpdate = permissions.canUpdate;

        const badgeStyles = {
          'Xử lý ngay': 'text-[#C21A1A] bg-rose-50 border-rose-200 hover:bg-rose-100/70 active:bg-rose-100',
          'Chờ duyệt': 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100/60 active:bg-amber-100',
          'Đang triển khai': 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100/60 active:bg-emerald-100',
          'Đã xử lý': 'text-slate-650 bg-slate-50 border-slate-200 hover:bg-slate-100 active:bg-slate-150',
        };
        const badgeStyle = badgeStyles[issue.status] || badgeStyles['Chờ duyệt'];

        const statusConfigs = [
          { status: 'Xử lý ngay', label: 'Xử lý ngay', colorClass: 'text-[#C21A1A] hover:bg-rose-50/50', icon: AlertOctagon },
          { status: 'Chờ duyệt', label: 'Chờ duyệt', colorClass: 'text-amber-750 hover:bg-amber-50/40', icon: HelpCircle },
          { status: 'Đang triển khai', label: 'Đang triển khai', colorClass: 'text-emerald-700 hover:bg-emerald-50/40', icon: Clock },
          { status: 'Đã xử lý', label: 'Đã xử lý', colorClass: 'text-slate-600 hover:bg-slate-50', icon: CheckCircle },
        ] as const;

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={!canUpdate}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "font-bold rounded-lg border shadow-none px-2.5 py-0.5 h-7 text-xs flex items-center gap-1.5 w-fit whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer",
                    canUpdate
                      ? badgeStyle
                      : 'opacity-50 border border-slate-200 text-slate-400 bg-slate-50'
                  )}
                >
                  <span>{issue.status}</span>
                  <ChevronDown className="size-3 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 p-1.5 z-40 text-slate-800 animate-in fade-in-50 zoom-in-95 duration-100">
                <DropdownMenuLabel className="px-2.5 py-1.5 font-black text-slate-450 text-[10px] uppercase tracking-wider border-b border-slate-100/60 mb-1">
                  Cập nhật xử lý
                </DropdownMenuLabel>
                {statusConfigs.map((cfg) => {
                  const Icon = cfg.icon;
                  return (
                    <DropdownMenuItem
                      key={cfg.status}
                      onClick={() => onUpdateIssueStatus(issue.id, cfg.status)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl flex items-center justify-between font-bold text-xs cursor-pointer transition-colors duration-150",
                        cfg.colorClass
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 shrink-0" />
                        <span>{cfg.label}</span>
                      </div>
                      {issue.status === cfg.status && <Check className="size-3.5 stroke-[2.5]" />}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator className="bg-slate-100/80 my-1" />
                <DropdownMenuItem
                  onClick={() => onConfirmIssueRead(issue.id)}
                  className="px-2.5 py-1.5 hover:bg-emerald-50/70 active:bg-emerald-100 rounded-xl flex items-center justify-between text-emerald-600 font-bold text-xs cursor-pointer transition-colors duration-150"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4 shrink-0" />
                    <span>Xác nhận đã đọc</span>
                  </div>
                  {issue.readConfirmedAt && <Check className="size-3.5 text-emerald-600 stroke-[2.5]" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      meta: {
        filterElement: (column) => {
          const val = (column.getFilterValue() as string) ?? 'all';
          const options = [
            { label: 'Tất cả', value: 'all' },
            { label: 'Xử lý ngay', value: 'Xử lý ngay' },
            { label: 'Chờ duyệt', value: 'Chờ duyệt' },
            { label: 'Đang triển khai', value: 'Đang triển khai' },
            { label: 'Đã xử lý', value: 'Đã xử lý' },
          ];
          return (
            <CustomSelect
              value={val}
              onChangeValue={(value) => column.setFilterValue(value === 'all' ? undefined : value)}
              options={options}
              clearable={false}
              className="w-full h-8 text-xs font-bold rounded-lg border border-slate-200 hover:border-slate-300 bg-white"
            />
          );
        },
      },
    },

    // ── Actions ──
    {
      id: 'actions',
      header: 'Thao tác',
      size: 150,
      cell: ({ row }) => {
        const issue = row.original;
        return (
          <div className="flex items-center gap-1.5 justify-center" onClick={(e) => e.stopPropagation()}>
            {permissions.canUpdate && (
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="h-7 text-sm px-2 rounded-lg font-medium hover:bg-slate-50 border-slate-200 transition-all active:scale-97 cursor-pointer flex items-center gap-1"
                onClick={() => onEditIssue(issue)}
              >
                <Pencil className="w-3 h-3 text-slate-500" />
                Sửa
              </Button>
            )}
            {permissions.canDelete && (
              <Button
                size="sm"
                type="button"
                variant="ghost"
                className="h-7 text-sm px-2 rounded-lg font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all active:scale-97 cursor-pointer flex items-center gap-1"
                onClick={() => {
                  if (window.confirm(`Bạn có chắc chắn muốn xóa phiếu "${issue.title}"?`)) {
                    onDeleteIssue(issue.id);
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa
              </Button>
            )}
          </div>
        );
      },
      meta: {
        sticky: 'right',
      },
    },
  ];
}
