import React from 'react';
import { SlidersHorizontal, Info, Plus, Calendar } from 'lucide-react';
import { Button } from '../../../../share/ui';

interface ChecklistConfigBarProps {
  subTab: 'today' | 'process' | 'completed';

  // Completed history log configurations
  completedViewMode: 'day' | 'week';
  setCompletedViewMode: (mode: 'day' | 'week') => void;
  selectedWeekDayKey: string;
  setSelectedWeekDayKey: (key: string) => void;
  weekDates: Array<{ dateStr: string; label: string; dateKey: string }>;
}

/**
 * Secondary configuration bar. Renders either role selection/category creation UI
 * or history view calendar triggers, depending on the active tab context.
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

  // Render completed view historical selector (subTab === 'completed')
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-sm font-black uppercase text-slate-500 tracking-wider">Xem lịch sử:</span>
        </div>

        <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-250 shrink-0">
          <Button
            onClick={() => setCompletedViewMode('day')}
            variant="ghost"
            className={`px-3 py-1 rounded-md text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${completedViewMode === 'day'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Theo Ngày
          </Button>
          <Button
            onClick={() => setCompletedViewMode('week')}
            variant="ghost"
            className={`px-3 py-1 rounded-md text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${completedViewMode === 'week'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Theo Tuần
          </Button>
        </div>
      </div>

      {completedViewMode === 'week' && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 w-full md:w-auto scrollbar-none">
          {weekDates.map((d) => {
            const isSelected = selectedWeekDayKey === d.dateKey;
            return (
              <button
                key={d.dateKey}
                onClick={() => setSelectedWeekDayKey(d.dateKey)}
                className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-all shrink-0 flex flex-col items-center justify-center leading-none select-none outline-none ${isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50'
                  }`}
                style={{ height: '42px', minWidth: '76px' }}
              >
                <span className="text-[10.5px] uppercase font-black opacity-80 leading-none mb-1">{d.label}</span>
                <span className="text-sm font-extrabold leading-none">{d.dateStr}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="text-right">
        <span className="text-sm font-bold text-slate-400">
          {completedViewMode === 'day' ? 'Hiển thị các công việc đã hoàn thành hôm nay' : `Lịch sử hoàn thành ngày ${selectedWeekDayKey}`}
        </span>
      </div>
    </div>
  );
});

export default ChecklistConfigBar;
