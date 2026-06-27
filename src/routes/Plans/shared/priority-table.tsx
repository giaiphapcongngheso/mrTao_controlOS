import React, { useCallback, useMemo } from 'react';
import { Link2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { PlanPriority } from '../../../types/plans.types';
import { PriorityStatusBadge } from './plan-status-badge';
import { formatDateVN } from '../constants/plan-utils';
import { CustomTable } from '../../../../share/components/custom-table';

interface PriorityTableProps {
  priorities: PlanPriority[];
  showLinkedTasks?: boolean;
  compact?: boolean;
  onPriorityClick?: (priority: PlanPriority) => void;
}

/**
 * Reusable priority table used in Month, Week, and Dashboard views.
 * Migrated to use the shared CustomTable component for standardized look & feel.
 */
const PriorityTable = React.memo(function PriorityTable({
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

export default PriorityTable;
