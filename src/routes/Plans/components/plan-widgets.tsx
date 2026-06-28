import React, { useCallback, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Link2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '../../../../share/ui/card';
import { CustomTable } from '../../../../share/components/custom-table';
import type { PriorityStatus, PlanStatus, DaySlotStatus, PlanPriority } from '../../../types/plans.types';
import type { PlanAlert } from '../_hooks/use-plan-metrics';
import {
  PLAN_STATUS_CONFIG,
  PRIORITY_STATUS_CONFIG,
  DAY_SLOT_STATUS_CONFIG,
  formatDateVN
} from '../plan-utils';

// ============================================================================
// PlanProgressRing
// ============================================================================

interface PlanProgressRingProps {
  value: number;      // 0-100
  size?: number;       // px, default 80
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
  color?: string;      // stroke color (will auto-determine if not provided)
  trackColor?: string;
}

export const PlanProgressRing = React.memo(function PlanProgressRing({
  value,
  size = 64,
  strokeWidth = 5,
  label,
  subLabel,
  color,
  trackColor = '#f1f5f9',
}: PlanProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  const activeColor = color || (
    clampedValue >= 75 ? '#10b981' : 
    clampedValue >= 40 ? '#f59e0b' : 
    '#C21A1A'
  );

  return (
    <div className="flex items-center gap-3 text-left w-full min-w-0">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-black text-slate-800 leading-none">{clampedValue}%</span>
        </div>
      </div>
      {(label || subLabel) && (
        <div className="flex flex-col gap-0.5 justify-center min-w-0 flex-1">
          {label && <span className="text-sm font-bold text-slate-700 truncate block">{label}</span>}
          {subLabel && <span className="text-sm font-semibold text-slate-500 leading-tight block">{subLabel}</span>}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Status Badges
// ============================================================================

interface PlanStatusBadgeProps {
  status: PlanStatus;
  size?: 'sm' | 'md';
}

export const PlanStatusBadge = React.memo(function PlanStatusBadge({ status, size = 'sm' }: PlanStatusBadgeProps) {
  const config = PLAN_STATUS_CONFIG[status];
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center font-bold rounded-lg ${config.bgColor} ${config.color} ${sizeClasses}`}>
      {config.label}
    </span>
  );
});

interface PriorityStatusBadgeProps {
  status: PriorityStatus;
  size?: 'sm' | 'md';
}

export const PriorityStatusBadge = React.memo(function PriorityStatusBadge({ status, size = 'sm' }: PriorityStatusBadgeProps) {
  const config = PRIORITY_STATUS_CONFIG[status];
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-lg ${config.bgColor} ${config.color} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
});

interface DaySlotStatusBadgeProps {
  status: DaySlotStatus;
}

export const DaySlotStatusBadge = React.memo(function DaySlotStatusBadge({ status }: DaySlotStatusBadgeProps) {
  const config = DAY_SLOT_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
});

// ============================================================================
// PlanSummaryCard
// ============================================================================

interface PlanSummaryCardProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  label: string;
  value?: React.ReactNode;
  subValue?: string;
  children?: React.ReactNode;
}

export const PlanSummaryCard = React.memo(function PlanSummaryCard({
  icon: Icon,
  iconColor = 'text-[#C21A1A]',
  iconBg = 'bg-red-50',
  label,
  value,
  subValue,
  children,
}: PlanSummaryCardProps) {
  return (
    <Card className="border border-slate-200/50 shadow-2xs flex flex-col gap-2 min-w-0 p-0 overflow-hidden bg-white rounded-2xl py-4 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 cursor-default">
      <CardContent className="flex flex-col gap-2 p-0 px-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0 border border-slate-100/80 shadow-3xs`}>
            <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
          </div>
          <span className="text-sm font-bold text-slate-650 leading-tight truncate">{label}</span>
        </div>
        {value !== undefined && value !== null && (
          <div className="flex items-end gap-1.5 min-w-0">
            <span className="text-2xl font-black text-slate-850 leading-none tracking-tight">{value}</span>
            {subValue && (
              <span className="text-sm font-semibold text-slate-500 pb-0.5 truncate">{subValue}</span>
            )}
          </div>
        )}
        {children && <div className="mt-1">{children}</div>}
      </CardContent>
    </Card>
  );
});

// ============================================================================
// PlanAlertBanner
// ============================================================================

interface PlanAlertBannerProps {
  alerts: PlanAlert[];
}

export const PlanAlertBanner = React.memo(function PlanAlertBanner({ alerts }: PlanAlertBannerProps) {
  if (!alerts.length) return null;

  const hasCritical = useMemo(() => alerts.some((a) => a.severity === 'critical'), [alerts]);

  return (
    <Card className={`border shadow-2xs flex flex-col gap-2 min-w-0 p-0 overflow-hidden rounded-2xl py-4 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 ${
      hasCritical 
        ? 'border-red-100 bg-red-50/20' 
        : 'border-amber-100 bg-amber-50/20'
    }`}>
      <CardContent className="flex flex-col gap-2.5 p-0 px-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            hasCritical ? 'bg-red-50' : 'bg-amber-50'
          }`}>
            <AlertTriangle className={`w-4 h-4 ${
              hasCritical ? 'text-red-500 animate-pulse' : 'text-amber-500'
            }`} />
          </div>
          <h4 className="text-sm font-bold text-slate-700 leading-tight">Cảnh báo cần xử lý</h4>
        </div>
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex items-start gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                }`}
              />
              <span className={`text-sm font-semibold leading-snug ${
                alert.severity === 'critical' ? 'text-red-650' : 'text-amber-650'
              }`}>
                {alert.message}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// PriorityTable
// ============================================================================

interface PriorityTableProps {
  priorities: PlanPriority[];
  showLinkedTasks?: boolean;
  compact?: boolean;
  onPriorityClick?: (priority: PlanPriority) => void;
}

export const PriorityTable = React.memo(function PriorityTable({
  priorities,
  showLinkedTasks = false,
  compact = false,
  onPriorityClick,
}: PriorityTableProps) {
  const handleRowClick = useCallback((priority: PlanPriority) => {
    onPriorityClick?.(priority);
  }, [onPriorityClick]);

  const columns = useMemo<ColumnDef<PlanPriority>[]>(() => {
    const cols: ColumnDef<PlanPriority>[] = [
      {
        accessorKey: 'order',
        header: '#',
        meta: { width: 48 },
        cell: ({ row }) => (
          <span className="w-6 h-6 rounded-lg bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center">
            {row.original.order}
          </span>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Ưu tiên',
        meta: { width: '30%' },
        cell: ({ row }) => (
          <span className="text-sm font-bold text-slate-800 line-clamp-2">{row.original.title}</span>
        ),
      },
    ];

    if (!compact) {
      cols.push({
        accessorKey: 'expectedResult',
        header: 'Kết quả cần đạt',
        meta: { width: '35%' },
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 line-clamp-2">{row.original.expectedResult}</span>
        ),
      });
    }

    cols.push(
      {
        accessorKey: 'ownerName',
        header: 'Owner',
        meta: { width: 150 },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
              {row.original.ownerName?.charAt(0) || '?'}
            </div>
            <span className="text-sm font-semibold text-slate-600 truncate">
              {row.original.ownerName}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'deadline',
        header: 'Hạn chốt',
        meta: { width: 120 },
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-slate-500">
            {formatDateVN(row.original.deadline)}
          </span>
        ),
      }
    );

    if (showLinkedTasks) {
      cols.push({
        accessorKey: 'linkedTaskIds',
        header: 'Liên kết',
        meta: { width: 80 },
        cell: ({ row }) => {
          const count = row.original.linkedTaskIds?.length ?? 0;
          return count > 0 ? (
            <div className="flex justify-center w-full">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                <Link2 className="w-3.5 h-3.5" />
                {count}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-350">—</span>
          );
        },
      });
    }

    cols.push(
      {
        accessorKey: 'progress',
        header: 'Tiến độ',
        meta: { width: 140 },
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-[80px]">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${row.original.progress}%`,
                  backgroundColor:
                    row.original.progress >= 75 ? '#10b981' :
                    row.original.progress >= 40 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <span className="text-xs font-bold text-slate-500 w-8 text-right">
              {row.original.progress}%
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        meta: { width: 120 },
        cell: ({ row }) => (
          <PriorityStatusBadge status={row.original.status} />
        ),
      }
    );

    return cols;
  }, [compact, showLinkedTasks]);

  if (!priorities.length) {
    return (
      <div className="text-center py-8 text-sm text-slate-400 font-semibold">
        Chưa có ưu tiên nào. Hãy thêm ưu tiên cho kế hoạch.
      </div>
    );
  }

  return (
    <CustomTable<PlanPriority>
      columns={columns}
      data={priorities}
      enablePagination={false}
      enableFiltering={false}
      enableSorting={false}
      enableColumnVisibility={false}
      enableColumnResizing={false}
      showFilterRow={false}
      onRowClick={(row) => handleRowClick(row.original)}
      tableMinWidth={800}
    />
  );
});
