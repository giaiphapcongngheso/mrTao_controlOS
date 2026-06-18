import React from 'react';
import { History, Calendar } from 'lucide-react';
import DateRangeInput from '../../../../share/components/custom/date-range-input';
import type { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

interface ChecklistConfigBarProps {
  subTab: 'today' | 'checklist_template' | 'process' | 'history';
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange) => void;
}

/**
 * Secondary configuration bar for history tab.
 * Uses DateRangeInput for date range selection.
 */
const ChecklistConfigBar = React.memo(function ChecklistConfigBar({
  subTab,
  dateRange,
  onDateRangeChange,
}: ChecklistConfigBarProps) {
  if (subTab !== 'history') {
    return null;
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <History className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-sm font-black uppercase text-slate-500 tracking-wider">Lịch sử checklist</span>
        </div>

        <div className="w-full sm:w-72">
          <DateRangeInput
            value={dateRange}
            onChange={(range) => {
              onDateRangeChange(range);
            }}
            inputProps={{
              className: 'h-9 text-sm font-bold rounded-xl border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white shadow-2xs',
            }}
          />
        </div>
      </div>
    </div>
  );
});

export default ChecklistConfigBar;
