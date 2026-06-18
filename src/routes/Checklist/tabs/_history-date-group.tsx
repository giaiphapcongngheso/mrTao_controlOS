import React, { useCallback } from 'react';
import { Calendar, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../../share/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from '../../../../share/ui';
import type { HistoryDateGroup } from '../checklist-view.types';

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
    <Card
      className={cn(
        "font-sans w-full overflow-hidden bg-white border border-slate-200/90 rounded-2xl transition-all duration-200 shadow-none",
        isExpanded ? "border-slate-200 shadow-2xs" : ""
      )}
    >
      {/* Collapsible Date Header */}
      <CardHeader
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        className={cn(
          "cursor-pointer select-none px-4 py-3 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 gap-0",
          isToday
            ? "bg-blue-50/50 hover:bg-blue-50/80"
            : "bg-slate-50/50 hover:bg-slate-100/40"
        )}
      >
        {/* Left Side: Icon + Title + Progress */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Calendar icon with left accent */}
          <span
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200",
              isToday ? "bg-blue-100 text-blue-600" : "bg-slate-100/80 text-slate-500"
            )}
          >
            <Calendar className="w-4 h-4" />
          </span>

          {/* Day label + stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <CardTitle
                className={cn(
                  "text-sm font-extrabold tracking-tight truncate",
                  isToday ? "text-blue-800" : "text-slate-700"
                )}
              >
                {dayLabel}
              </CardTitle>
              {isFullyDone && (
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-px rounded uppercase tracking-wider shrink-0 flex items-center gap-0.5 animate-in zoom-in-75">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Xong</span>
                </span>
              )}
            </div>

            {/* Summary stats row */}
            <CardDescription className="flex items-center gap-2 sm:gap-3 mt-1 font-bold text-slate-400">
              <span>
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
            </CardDescription>
          </div>
        </div>

        {/* Right Side Action: Chevron Trigger */}
        <CardAction className="self-center">
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-slate-200/60 text-slate-400 flex items-center justify-center transition-all select-none shrink-0 shadow-3xs">
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </span>
        </CardAction>
      </CardHeader>

      {/* Children (category cards) - wrapped inside CardContent with animation */}
      {isExpanded && (
        <CardContent className="p-3 border-t border-slate-100 bg-slate-50/20 space-y-3 pl-3 animate-in fade-in duration-200">
          {children}
        </CardContent>
      )}
    </Card>
  );
});

export default HistoryDateGroupCard;
