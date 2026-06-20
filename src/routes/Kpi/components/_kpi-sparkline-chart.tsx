import React from 'react';
import { formatValue } from '../kpi-utils';
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
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const handleKpiSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onActiveKpiChange(e.target.value),
    [onActiveKpiChange]
  );

  const targetKpi = configs.find(c => c.id === activeChartKpiId) || configs[0];

  if (!targetKpi) return null;

  // Calculate daily values array
  const dailyValues = Array.from({ length: daysInMonthCount }, (_, dayIdx) => {
    const day = dayIdx + 1;
    const dateStr = `${ranksMonth}-${day.toString().padStart(2, '0')}`;
    const record = kpiDailyValues.find(
      v => v.staffId === staffId && v.kpiConfigId === targetKpi.id && v.date === dateStr
    );
    return record ? record.value : 0;
  });

  // Summary Metrics calculations
  const totalActual = dailyValues.reduce((sum, v) => sum + v, 0);
  const avgActual = totalActual / daysInMonthCount;
  const peakValue = Math.max(...dailyValues, 0);
  
  const monthlyTarget = targetKpi.monthlyTarget;
  const completionPct = monthlyTarget > 0 ? (totalActual / monthlyTarget) * 100 : 0;

  // Demand Analysis calculations
  const peakDayIdx = dailyValues.indexOf(peakValue);
  const peakDay = peakDayIdx !== -1 ? peakDayIdx + 1 : 1;
  const peakDayStr = `Ngày ${String(peakDay).padStart(2, '0')}`;

  const lowValue = Math.min(...dailyValues);
  const lowDayIdx = dailyValues.indexOf(lowValue);
  const lowDay = lowDayIdx !== -1 ? lowDayIdx + 1 : 1;
  const lowDayStr = `Ngày ${String(lowDay).padStart(2, '0')}`;

  const variance = peakValue - lowValue;
  const variancePct = lowValue > 0 ? (variance / lowValue) * 100 : (peakValue > 0 ? 100 : 0);

  // SVG Chart dimensions & coordinates
  const paddingLeft = 65;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 30;
  
  const chartWidth = 600 - paddingLeft - paddingRight;
  const chartHeight = 180 - paddingTop - paddingBottom;
  
  const maxVal = Math.max(...dailyValues, targetKpi.dailyTarget * 1.5, 1);

  // Calculate X, Y coordinate points
  const points: [number, number][] = dailyValues.map((val, idx) => {
    const x = paddingLeft + (idx / (daysInMonthCount - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
    return [x, y];
  });

  // Bezier curve interpolation algorithm for uốn cong spline
  const smoothing = 0.15;
  
  const line = (pointA: [number, number], pointB: [number, number]) => {
    const lengthX = pointB[0] - pointA[0];
    const lengthY = pointB[1] - pointA[1];
    return {
      length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
      angle: Math.atan2(lengthY, lengthX)
    };
  };

  const controlPoint = (current: [number, number], previous: [number, number], next: [number, number], isEnd: boolean) => {
    const p = previous || current;
    const n = next || current;
    const o = line(p, n);
    const angle = o.angle + (isEnd ? Math.PI : 0);
    const length = o.length * smoothing;
    const x = current[0] + Math.cos(angle) * length;
    const y = current[1] + Math.sin(angle) * length;
    return [x, y];
  };

  const svgPath = (pts: [number, number][]) => {
    return pts.reduce((acc, point, i, a) => {
      if (i === 0) {
        return `M ${point[0]} ${point[1]}`;
      }
      const cp1 = controlPoint(a[i - 1], a[i - 2], point, false);
      const cp2 = controlPoint(point, a[i - 1], a[i + 1], true);
      // Clamp control points to chart boundaries
      const cp1Y = Math.max(paddingTop, Math.min(paddingTop + chartHeight, cp1[1]));
      const cp2Y = Math.max(paddingTop, Math.min(paddingTop + chartHeight, cp2[1]));
      return `${acc} C ${cp1[0]} ${cp1Y}, ${cp2[0]} ${cp2Y}, ${point[0]} ${point[1]}`;
    }, '');
  };

  const pathData = svgPath(points);
  const fillData = `${pathData} L ${paddingLeft + chartWidth} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`;
  
  const targetY = paddingTop + chartHeight - (targetKpi.dailyTarget / maxVal) * chartHeight;
  const monthNum = parseInt(ranksMonth.split('-')[1]);

  // Generate Y-axis grid values
  const yTicks = [
    maxVal,
    maxVal * 0.66,
    maxVal * 0.33,
    0
  ];

  // Generate X-axis tick indices (e.g. Day 1, 5, 10, 15, 20, 25, 30)
  const xTicksIndices = [0, 4, 9, 14, 19, 24, daysInMonthCount - 1].filter(idx => idx < daysInMonthCount);

  return (
    <div className="space-y-4">
      {/* Header Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider text-left">
          Biểu đồ biến động hằng ngày (Tháng {monthNum})
        </h4>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">Chỉ số:</span>
          <select
            value={activeChartKpiId}
            onChange={handleKpiSelect}
            className="bg-white border border-slate-200 font-bold text-xs px-3 py-1.5 rounded-xl text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
          >
            {configs.map(c => (
              <option key={c.id} value={c.id}>{c.kpiName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid containing Summary Stats, Main Chart and Analysis Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left/Middle Column: Sparkline Chart with Summary Stats */}
        <div className="lg:col-span-2 space-y-3">
          {/* Summary Stats Headers */}
          <div className="grid grid-cols-3 gap-3 bg-white border border-slate-200 shadow-2xs rounded-xl p-3.5">
            <div className="text-left space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thực đạt TB ngày</span>
              <span className="text-sm font-extrabold text-slate-800">{formatValue(avgActual, targetKpi.unit)}</span>
            </div>
            <div className="text-left space-y-0.5 border-l border-slate-100 pl-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Đạt cao nhất (Đỉnh)</span>
              <span className="text-sm font-extrabold text-[#C21A1A]">{formatValue(peakValue, targetKpi.unit)}</span>
            </div>
            <div className="text-left space-y-0.5 border-l border-slate-100 pl-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hiệu suất tháng</span>
              <span className="text-sm font-extrabold text-blue-600">{completionPct.toFixed(1)}%</span>
            </div>
          </div>

          {/* SVG Line Chart Box */}
          <div className="bg-white border border-slate-200 shadow-2xs rounded-xl p-4 flex flex-col justify-between relative overflow-hidden h-[240px]">
            {/* Interactive HTML Tooltip */}
            {hoveredIndex !== null && (
              <div 
                className="absolute bg-slate-900/90 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg shadow-md border border-slate-700 pointer-events-none z-30 transition-all duration-150 text-left"
                style={{ 
                  left: `${(points[hoveredIndex][0] / 600) * 100}%`,
                  top: `${(points[hoveredIndex][1] / 180) * 100}%`,
                  transform: 'translate(-50%, -125%)'
                }}
              >
                <p className="border-b border-slate-700/50 pb-0.5 mb-0.5">Ngày {String(hoveredIndex + 1).padStart(2, '0')}/{monthNum}</p>
                <p className="text-emerald-400">{formatValue(dailyValues[hoveredIndex], targetKpi.unit)}</p>
                <p className="text-[10px] text-slate-400 font-semibold">Mục tiêu ngày: {formatValue(targetKpi.dailyTarget, targetKpi.unit)}</p>
              </div>
            )}

            {/* SVG Draw Area */}
            <div className="relative flex-1 w-full">
              <svg className="w-full h-full" viewBox="0 0 600 180" preserveAspectRatio="none">
                <defs>
                  {/* Spline Area Gradient */}
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines & Y-axis ticks */}
                {yTicks.map((val, idx) => {
                  const y = paddingTop + (idx / 3) * chartHeight;
                  return (
                    <g key={idx}>
                      <line 
                        x1={paddingLeft} 
                        y1={y} 
                        x2={paddingLeft + chartWidth} 
                        y2={y} 
                        stroke="#e2e8f0" 
                        strokeWidth="1" 
                        strokeOpacity="0.5" 
                      />
                      <text 
                        x={paddingLeft - 8} 
                        y={y + 4} 
                        fill="#94a3b8" 
                        fontSize="9" 
                        fontWeight="bold" 
                        textAnchor="end"
                      >
                        {formatValue(val, targetKpi.unit)}
                      </text>
                    </g>
                  );
                })}

                {/* Target Benchmark Line (Red dashed line) */}
                <line 
                  x1={paddingLeft} 
                  y1={targetY} 
                  x2={paddingLeft + chartWidth} 
                  y2={targetY} 
                  stroke="#f43f5e" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,4" 
                />

                {/* Spline Area Fill */}
                <path d={fillData} fill="url(#chartGrad)" />

                {/* Spline Stroke Line (Green spline curve) */}
                <path 
                  d={pathData} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Interactive Points (Markers) & Hover Anchors */}
                {points.map((pt, idx) => {
                  const isHovered = hoveredIndex === idx;
                  return (
                    <g key={idx}>
                      {/* Visual Marker Circle */}
                      <circle 
                        cx={pt[0]} 
                        cy={pt[1]} 
                        r={isHovered ? 5.5 : 3.5} 
                        fill={isHovered ? '#10b981' : '#ffffff'} 
                        stroke="#10b981" 
                        strokeWidth={isHovered ? 2.5 : 2} 
                        className="transition-all duration-150 cursor-pointer"
                      />
                      {/* Larger Invisible Trigger Circle for easy hover targeting */}
                      <circle 
                        cx={pt[0]} 
                        cy={pt[1]} 
                        r={12} 
                        fill="transparent" 
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                    </g>
                  );
                })}

                {/* X-axis Ticks & Labels */}
                {xTicksIndices.map((dayIdx) => {
                  const x = paddingLeft + (dayIdx / (daysInMonthCount - 1)) * chartWidth;
                  return (
                    <g key={dayIdx}>
                      <line 
                        x1={x} 
                        y1={paddingTop + chartHeight} 
                        x2={x} 
                        y2={paddingTop + chartHeight + 4} 
                        stroke="#cbd5e1" 
                        strokeWidth="1.2" 
                      />
                      <text 
                        x={x} 
                        y={paddingTop + chartHeight + 15} 
                        fill="#94a3b8" 
                        fontSize="9.5" 
                        fontWeight="bold" 
                        textAnchor="middle"
                      >
                        Ngày {String(dayIdx + 1).padStart(2, '0')}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend block under SVG */}
            <div className="flex justify-center items-center gap-6 text-xs font-bold text-slate-500 mt-2 z-10 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 border-t-2 border-dashed border-[#f43f5e] inline-block" />
                <span>Mục tiêu ngày ({formatValue(targetKpi.dailyTarget, targetKpi.unit)})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-1 bg-[#10b981] rounded-full inline-block" />
                <span>Thực đạt hàng ngày</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Demand Analysis Panel */}
        <div className="bg-white border border-slate-200 shadow-2xs rounded-xl overflow-hidden h-full flex flex-col justify-between">
          <div className="border-b border-slate-100 px-4 py-3.5 bg-slate-50/20">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider text-left">Phân tích biến động</h5>
          </div>
          <div className="p-4 text-xs font-semibold text-slate-500 space-y-4 text-left flex-1 flex flex-col justify-around py-5">
            <div className="space-y-1">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Ngày đạt cao nhất (Đỉnh)</span>
              <p className="text-sm font-extrabold text-slate-800">{peakDayStr}</p>
              <p className="text-xs font-bold text-[#C21A1A]">{formatValue(peakValue, targetKpi.unit)}</p>
            </div>
            <div className="space-y-1 border-t border-slate-100 pt-3.5">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Ngày đạt thấp nhất (Đáy)</span>
              <p className="text-sm font-extrabold text-slate-800">{lowDayStr}</p>
              <p className="text-xs font-bold text-amber-600">{formatValue(lowValue, targetKpi.unit)}</p>
            </div>
            <div className="space-y-1 border-t border-slate-100 pt-3.5">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Biên độ dao động (Variance)</span>
              <p className="text-sm font-extrabold text-slate-800">
                {formatValue(variance, targetKpi.unit)}
              </p>
              <p className="text-xs font-bold text-blue-600">+{variancePct.toFixed(1)}% chênh lệch</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
