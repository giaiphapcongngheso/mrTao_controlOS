import React from 'react';
import { Info, Calendar } from 'lucide-react';
import { Button } from '../../../../share/ui';

interface ChecklistConfigBarProps {
  subTab: 'today' | 'process' | 'completed';
  completedViewMode: 'day' | 'week';
  setCompletedViewMode: (mode: 'day' | 'week') => void;
  selectedWeekDayKey: string;
  setSelectedWeekDayKey: (key: string) => void;
  weekDates: Array<{ dateStr: string; label: string; dateKey: string }>;
}

/**
 * Secondary configuration bar for completed checklist view.
 * This tab is read-only, but supports day/week history filters.
 */
const ChecklistConfigBar = React.memo(function ChecklistConfigBar({
  subTab,
  completedViewMode,
  setCompletedViewMode,
  selectedWeekDayKey,
  setSelectedWeekDayKey,
  weekDates,
}: ChecklistConfigBarProps) {
  if (subTab !== 'completed') {
    return null;
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-sm font-black uppercase text-slate-500 tracking-wider">Lich su hoan thanh</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={completedViewMode === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCompletedViewMode('day')}
            className="h-7 px-3 text-xs font-bold"
          >
            Ngay
          </Button>
          <Button
            type="button"
            variant={completedViewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCompletedViewMode('week')}
            className="h-7 px-3 text-xs font-bold"
          >
            Tuan
          </Button>
        </div>
      </div>

      {completedViewMode === 'week' && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {weekDates.map((day) => {
            const active = selectedWeekDayKey === day.dateKey;
            return (
              <Button
                key={day.dateKey}
                type="button"
                variant={active ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedWeekDayKey(day.dateKey)}
                className="h-8 px-2.5 shrink-0"
              >
                <span className="text-[11px] font-bold">{day.label}</span>
                <span className="text-[11px] ml-1 opacity-80">{day.dateStr}</span>
              </Button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>Tab nay chi xem lich su, khong chinh sua du lieu checklist.</span>
      </div>
    </div>
  );
});

export default ChecklistConfigBar;
