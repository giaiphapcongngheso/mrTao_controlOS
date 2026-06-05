import React, { useCallback, useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../../share/lib/utils';
import type { HistoryDateGroup } from './checklist-view.types';

interface HistoryDateGroupCardProps {
  group: HistoryDateGroup;
  /** Whether the date group is expanded to show its children */
  isExpanded: boolean;
  /** Toggle expand/collapse for this date group */
  onToggle: (dateKey: string) => void;
  /** Render children (category cards) */
  children: React.ReactNode;
}

/**
 * A collapsible date header card that groups checklist categories by date.
 * Displays: day label, total task summary, completion progress, and expand/collapse toggle.
 */
const HistoryDateGroupCard = React.memo(function HistoryDateGroupCard({
  group,
  isExpanded,
  onToggle,
  children,
}: HistoryDateGroupCardProps) {
  const { dateKey, dayLabel, isToday, totalTasks, completedTasks, categories } = group;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isFullyDone = totalTasks > 0 && completedTasks === totalTasks;

  const handleToggle = useCallback(() => {
    onToggle(dateKey);
  }, [onToggle, dateKey]);

  return (
    <div className="space-y-2">
      {/* Date Header */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 cursor-pointer select-none group/date text-left",
          isToday
            ? "bg-blue-50/70 border-blue-200/80 hover:bg-blue-50"
            : "bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/60",
          isExpanded && "shadow-sm"
        )}
      >
        {/* Calendar icon with left accent */}
        <span
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/date:scale-105",
            isToday
              ? "bg-blue-100 text-blue-600"
              : "bg-slate-100 text-slate-500"
          )}
        >
          <Calendar className="w-4 h-4" />
        </span>

        {/* Day label + stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3
              className={cn(
                "text-sm font-extrabold tracking-tight truncate",
                isToday ? "text-blue-800" : "text-slate-700"
              )}
            >
              {dayLabel}
            </h3>
            {isFullyDone && (
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-px rounded uppercase tracking-wider shrink-0 flex items-center gap-0.5 animate-in zoom-in-75">
                <CheckCircle2 className="w-3 h-3" />
                <span>Xong</span>
              </span>
            )}
          </div>

          {/* Summary stats row */}
          <div className="flex items-center gap-2 sm:gap-3 mt-1">
            <span className="text-[11px] sm:text-xs font-bold text-slate-400">
              {categories.length} nhóm · {totalTasks} việc
            </span>
            <div className="hidden sm:block w-20 bg-slate-200/60 h-1.5 rounded-full overflow-hidden shrink-0">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  isFullyDone ? "bg-emerald-500" : "bg-blue-500"
                )}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span
              className={cn(
                "text-[11px] sm:text-xs font-bold shrink-0 tabular-nums",
                isFullyDone ? "text-emerald-600" : "text-slate-500"
              )}
            >
              {completionPercent}%
            </span>
          </div>
        </div>

        {/* Expand/Collapse icon */}
        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/80 border border-slate-200/60 text-slate-400 flex items-center justify-center transition-all select-none shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
        </span>
      </button>

      {/* Children (category cards) - with animation */}
      {isExpanded && (
        <div className="space-y-2 pl-0 sm:pl-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
});

export default HistoryDateGroupCard;
