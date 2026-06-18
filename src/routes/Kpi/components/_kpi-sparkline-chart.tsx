import React from 'react';
import type { KPIConfig, KPIDailyValue } from '../../../types/kpi.types';

interface KpiSparklineChartProps {
  staffId: string;
  configs: KPIConfig[];
  activeChartKpiId: string;
  onActiveKpiChange: (id: string) => void;
  ranksMonth: string;
  daysInMonthCount: number;
  kpiDailyValues: KPIDailyValue[];
}

export const KpiSparklineChart = React.memo(function KpiSparklineChart({
  staffId,
  configs,
  activeChartKpiId,
  onActiveKpiChange,
  ranksMonth,
  daysInMonthCount,
  kpiDailyValues,
}: KpiSparklineChartProps) {
  const handleKpiSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onActiveKpiChange(e.target.value),
    [onActiveKpiChange]
  );

  const targetKpi = configs.find(c => c.id === activeChartKpiId) || configs[0];

  if (!targetKpi) return null;

  // Calculate daily values
  const dailyValues = Array.from({ length: daysInMonthCount }, (_, dayIdx) => {
    const day = dayIdx + 1;
    const dateStr = `${ranksMonth}-${day.toString().padStart(2, '0')}`;
    const record = kpiDailyValues.find(
      v => v.staffId === staffId && v.kpiConfigId === targetKpi.id && v.date === dateStr
    );
    return record ? record.value : 0;
  });

  const maxVal = Math.max(...dailyValues, targetKpi.dailyTarget * 1.5, 1);
  const points = dailyValues.map((val, idx) => {
    const x = (idx / (daysInMonthCount - 1)) * 300;
    const y = 80 - (val / maxVal) * 70;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;
  const fillData = `${pathData} L 300,80 L 0,80 Z`;
  const targetY = 80 - (targetKpi.dailyTarget / maxVal) * 70;
  const monthNum = parseInt(ranksMonth.split('-')[1]);

  return (
    <div className="space-y-3">
      {/* Header with KPI selector */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-left">
          BIỂU ĐỒ BIẾN ĐỘNG HẰNG NGÀY (THÁNG {monthNum})
        </h4>

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-slate-500 font-semibold">Chỉ số:</span>
          <select
            value={activeChartKpiId}
            onChange={handleKpiSelect}
            className="bg-slate-50 border border-slate-200 font-bold text-sm px-3 py-1.5 rounded-xl text-slate-700 focus:outline-none cursor-pointer"
          >
            {configs.map(c => (
              <option key={c.id} value={c.id}>{c.kpiName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart area */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-stretch h-40 justify-between relative overflow-hidden">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between py-6 pointer-events-none opacity-50">
          <div className="border-b border-slate-200/50 w-full" />
          <div className="border-b border-slate-200/50 w-full" />
          <div className="border-b border-slate-200/50 w-full" />
        </div>

        {/* SVG sparkline */}
        <div className="relative flex-1 w-full mt-2">
          <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C21A1A" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#C21A1A" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={fillData} fill="url(#chartGrad)" />
            <path d={pathData} fill="none" stroke="#C21A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="0" y1={targetY} x2="300" y2={targetY} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,3" />
          </svg>
        </div>

        {/* Legend */}
        <div className="flex justify-between items-center text-sm font-semibold text-slate-500 mt-2 z-10">
          <span>01/{ranksMonth.split('-')[1]}</span>
          <span className="text-[#3b82f6]">Vạch target ngày (mốc đứt)</span>
          <span>{daysInMonthCount.toString().padStart(2, '0')}/{ranksMonth.split('-')[1]}</span>
        </div>
      </div>
    </div>
  );
});
