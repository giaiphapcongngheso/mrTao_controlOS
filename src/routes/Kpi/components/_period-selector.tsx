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
  isCompact?: boolean;
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
  isCompact = false,
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

  // Generate dynamic years starting from 2025 to the current year + 1 (ensuring at least up to 2027)
  const years = React.useMemo(() => {
    const startYear = 2025;
    const currentYear = new Date().getFullYear();
    const maxYear = Math.max(currentYear + 1, 2027);
    const list: number[] = [];
    for (let y = startYear; y <= maxYear; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const pillClass = (active: boolean) =>
    isCompact
      ? `px-3 py-1 rounded-md text-xs font-bold transition-all duration-300 ease-out active:scale-95 cursor-pointer border-0 ${
          active
            ? 'bg-white text-slate-800 border border-slate-200/50 shadow-xs'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
        }`
      : `px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ease-out active:scale-95 cursor-pointer border-0 ${
          active
            ? 'bg-white text-slate-800 border border-slate-200/50 shadow-xs'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
        }`;

  return (
    <div className={isCompact ? "flex items-center gap-2" : "flex flex-col md:flex-row md:items-center justify-between gap-4"}>
      {/* Timeframe pills */}
      <div className={`flex items-center bg-slate-100/80 rounded-lg w-fit border border-slate-200 shadow-xs ${isCompact ? 'p-0.5 gap-0.5' : 'p-1 gap-1 rounded-full'}`}>
        <button onClick={handleTimeframeMonth} className={pillClass(timeframe === 'month')}>
          {isCompact ? 'Tháng' : 'Theo Tháng'}
        </button>
        <button onClick={handleTimeframeQuarter} className={pillClass(timeframe === 'quarter')}>
          {isCompact ? 'Quý' : 'Theo Quý'}
        </button>
        <button onClick={handleTimeframeYear} className={pillClass(timeframe === 'year')}>
          {isCompact ? 'Năm' : 'Theo Năm'}
        </button>
      </div>

      {/* Period value selectors */}
      {timeframe !== 'month' && (
        <div className="flex items-center gap-1.5">
          {!isCompact && <span className="text-sm font-bold text-slate-500 uppercase">Giai đoạn:</span>}

          {timeframe === 'quarter' && (
            <div className="flex items-center gap-1">
              <select
                value={ranksQuarter}
                onChange={handleQuarterChange}
                className={isCompact 
                  ? "px-1.5 py-0.5 h-7 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-md transition-all cursor-pointer focus:outline-none"
                  : "px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer focus:outline-none"
                }
              >
                <option value={1}>{isCompact ? 'Q1' : 'Quý 1 (T01 - T03)'}</option>
                <option value={2}>{isCompact ? 'Q2' : 'Quý 2 (T04 - T06)'}</option>
                <option value={3}>{isCompact ? 'Q3' : 'Quý 3 (T07 - T09)'}</option>
                <option value={4}>{isCompact ? 'Q4' : 'Quý 4 (T10 - T12)'}</option>
              </select>
              <select
                value={ranksYear}
                onChange={handleYearChange}
                className={isCompact 
                  ? "px-1.5 py-0.5 h-7 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-md transition-all cursor-pointer focus:outline-none"
                  : "px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer focus:outline-none"
                }
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {timeframe === 'year' && (
            <select
              value={ranksYear}
              onChange={handleYearChange}
              className={isCompact 
                ? "px-1.5 py-0.5 h-7 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-md transition-all cursor-pointer focus:outline-none"
                : "px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer focus:outline-none"
              }
            >
              {years.map(y => (
                <option key={y} value={y}>
                  {isCompact ? y : `Năm ${y}`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
});
