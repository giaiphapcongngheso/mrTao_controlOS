import React, { useCallback } from 'react';
import { Link2 } from 'lucide-react';
import type { PlanPriority } from '../../../types/plans.types';
import { PriorityStatusBadge } from './plan-status-badge';
import { formatDateVN } from '../constants/plan-utils';

interface PriorityTableProps {
  priorities: PlanPriority[];
  showLinkedTasks?: boolean;
  compact?: boolean;
  onPriorityClick?: (priority: PlanPriority) => void;
}

/**
 * Reusable priority table used in Month, Week, and Dashboard views.
 * Displays: #, Title, Expected Result, Owner, Deadline, Progress, Status.
 * Custom font sizes to be text-sm (normal text) and text-xs (headers).
 * Incorporates table-fixed layout and fixed column widths.
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

  if (!priorities.length) {
    return (
      <div className="text-center py-8 text-sm text-slate-400 font-semibold">
        Chưa có ưu tiên nào. Hãy thêm ưu tiên cho kế hoạch.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left table-fixed min-w-[800px]">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-2.5 px-3 w-12">#</th>
            <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-2.5 px-3 w-[30%]">Ưu tiên</th>
            {!compact && (
              <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-2.5 px-3 w-[35%]">Kết quả cần đạt</th>
            )}
            <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-2.5 px-3 w-[150px]">Owner</th>
            <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-2.5 px-3 w-[120px]">Hạn chốt</th>
            {showLinkedTasks && (
              <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-2.5 px-3 w-[80px] text-center">
                Liên kết
              </th>
            )}
            <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-2.5 px-3 w-[140px]">Tiến độ</th>
            <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-2.5 px-3 w-[120px]">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {priorities.map((priority) => (
            <tr
              key={priority.id}
              className="border-b border-slate-50 hover:bg-slate-50/20 transition-colors cursor-pointer"
              onClick={() => handleRowClick(priority)}
            >
              <td className="py-3 px-3 align-middle">
                <span className="w-6 h-6 rounded-lg bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center">
                  {priority.order}
                </span>
              </td>
              <td className="py-3 px-3 align-middle">
                <span className="text-sm font-bold text-slate-800 line-clamp-2">{priority.title}</span>
              </td>
              {!compact && (
                <td className="py-3 px-3 align-middle">
                  <span className="text-sm text-slate-500 line-clamp-2">{priority.expectedResult}</span>
                </td>
              )}
              <td className="py-3 px-3 align-middle">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {priority.ownerName?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm font-semibold text-slate-600 truncate">
                    {priority.ownerName}
                  </span>
                </div>
              </td>
              <td className="py-3 px-3 align-middle">
                <span className="text-sm font-semibold text-slate-500">
                  {formatDateVN(priority.deadline)}
                </span>
              </td>
              {showLinkedTasks && (
                <td className="py-3 px-3 text-center align-middle">
                  {(priority.linkedTaskIds?.length ?? 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                      <Link2 className="w-3.5 h-3.5" />
                      {priority.linkedTaskIds!.length}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
              )}
              <td className="py-3 px-3 align-middle">
                <div className="flex items-center gap-2 min-w-[80px]">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${priority.progress}%`,
                        backgroundColor:
                          priority.progress >= 75 ? '#10b981' :
                          priority.progress >= 40 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-500 w-8 text-right">
                    {priority.progress}%
                  </span>
                </div>
              </td>
              <td className="py-3 px-3 align-middle">
                <PriorityStatusBadge status={priority.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default PriorityTable;
