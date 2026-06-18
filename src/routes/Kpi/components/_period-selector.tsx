import React, { useCallback } from 'react';
import type { RanksTimeframe } from '../kpi-utils';

interface PeriodSelectorProps {
  timeframe: RanksTimeframe;
  onTimeframeChange: (tf: RanksTimeframe) => void;
  ranksMonth: string;
  onRanksMonthChange: (m: string) => void;
  ranksQuarter: number;
  onRanksQuarterChange: (q: number) => void;
  ranksYear: number;
  onRanksYearChange: (y: number) => void;
}

export const PeriodSelector = React.memo(function PeriodSelector({
  timeframe,
  onTimeframeChange,
  ranksMonth,
  onRanksMonthChange,
  ranksQuarter,
  onRanksQuarterChange,
  ranksYear,
  onRanksYearChange,
}: PeriodSelectorProps) {
  const handleTimeframeMonth = useCallback(() => onTimeframeChange('month'), [onTimeframeChange]);
  const handleTimeframeQuarter = useCallback(() => onTimeframeChange('quarter'), [onTimeframeChange]);
  const handleTimeframeYear = useCallback(() => onTimeframeChange('year'), [onTimeframeChange]);

  const handleMonthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onRanksMonthChange(e.target.value);
  }, [onRanksMonthChange]);

  const handleQuarterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onRanksQuarterChange(Number(e.target.value));
  }, [onRanksQuarterChange]);

  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onRanksYearChange(Number(e.target.value));
  }, [onRanksYearChange]);

  const pillClass = (active: boolean) =>
    `px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ease-out active:scale-95 cursor-pointer border-0 ${
      active
        ? 'bg-white text-slate-800 border border-slate-200/50 shadow-xs'
        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
    }`;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Timeframe pills */}
      <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-full w-fit border border-slate-200 shadow-xs">
        <button onClick={handleTimeframeMonth} className={pillClass(timeframe === 'month')}>
          Theo Tháng
        </button>
        <button onClick={handleTimeframeQuarter} className={pillClass(timeframe === 'quarter')}>
          Theo Quý
        </button>
        <button onClick={handleTimeframeYear} className={pillClass(timeframe === 'year')}>
          Theo Năm
        </button>
      </div>

      {/* Period value selectors */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-500 uppercase">Giai đoạn:</span>

        {timeframe === 'month' && (
          <select
            value={ranksMonth}
            onChange={handleMonthChange}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const m = (i + 1).toString().padStart(2, '0');
              return <option key={m} value={`2026-${m}`}>Tháng {m}/2026</option>;
            })}
          </select>
        )}

        {timeframe === 'quarter' && (
          <div className="flex items-center gap-2">
            <select
              value={ranksQuarter}
              onChange={handleQuarterChange}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer focus:outline-none"
            >
              <option value={1}>Quý 1 (T01 - T03)</option>
              <option value={2}>Quý 2 (T04 - T06)</option>
              <option value={3}>Quý 3 (T07 - T09)</option>
              <option value={4}>Quý 4 (T10 - T12)</option>
            </select>
            <select
              value={ranksYear}
              onChange={handleYearChange}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer focus:outline-none"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        )}

        {timeframe === 'year' && (
          <select
            value={ranksYear}
            onChange={handleYearChange}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer focus:outline-none"
          >
            <option value={2025}>Năm 2025</option>
            <option value={2026}>Năm 2026</option>
            <option value={2027}>Năm 2027</option>
          </select>
        )}
      </div>
    </div>
  );
});
