import React, { useState, useMemo, useCallback } from 'react';
import { formatValue } from '../kpi-utils';
import type { KPIConfig, KPIDailyValue } from '../../../types/kpi.types';
import { cn } from '@shared/lib/utils';

interface KpiMultiIndicatorChartProps {
  readonly staffId: string;
  readonly configs: KPIConfig[];
  readonly ranksMonth: string;
  readonly daysInMonthCount: number;
  readonly kpiDailyValues: KPIDailyValue[];
}

// Bảng màu chuẩn hóa cho từng chỉ số (Tránh màu tím theo quy chuẩn hệ thống)
const INDICATOR_COLORS = [
  { stroke: '#10b981', fill: 'url(#grad-green)', legendBg: 'bg-emerald-500', text: 'text-emerald-500' }, // Xanh lá - Doanh thu
  { stroke: '#3b82f6', fill: 'url(#grad-blue)', legendBg: 'bg-blue-500', text: 'text-blue-500' },    // Xanh dương - Đơn hàng
  { stroke: '#f97316', fill: 'url(#grad-orange)', legendBg: 'bg-orange-500', text: 'text-orange-500' },// Cam - Checklist
  { stroke: '#06b6d4', fill: 'url(#grad-cyan)', legendBg: 'bg-cyan-500', text: 'text-cyan-500' },    // Cyan
  { stroke: '#eab308', fill: 'url(#grad-yellow)', legendBg: 'bg-yellow-500', text: 'text-yellow-500' },// Vàng
  { stroke: '#f43f5e', fill: 'url(#grad-rose)', legendBg: 'bg-rose-500', text: 'text-rose-500' },    // Hồng/Đỏ
];

export const KpiMultiIndicatorChart = React.memo(function KpiMultiIndicatorChart({
  staffId,
  configs,
  ranksMonth,
  daysInMonthCount,
  kpiDailyValues,
}: KpiMultiIndicatorChartProps) {
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);
  const [visibleKpiIds, setVisibleKpiIds] = useState<Set<string>>(() => new Set(configs.map(c => c.id)));

  // Đồng bộ lại chỉ số hiển thị khi configs thay đổi
  React.useEffect(() => {
    setVisibleKpiIds(new Set(configs.map(c => c.id)));
  }, [configs]);

  const toggleKpiVisibility = useCallback((kpiId: string) => {
    setVisibleKpiIds(prev => {
      const next = new Set(prev);
      if (next.has(kpiId)) {
        // Luôn giữ lại ít nhất 1 chỉ số để tránh biểu đồ trống rỗng
        if (next.size > 1) {
          next.delete(kpiId);
        }
      } else {
        next.add(kpiId);
      }
      return next;
    });
  }, []);

  const monthNum = parseInt(ranksMonth.split('-')[1]);

  // Kích thước biểu đồ SVG
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 25;
  const chartWidth = 600 - paddingLeft - paddingRight;
  const chartHeight = 180 - paddingTop - paddingBottom;

  // Giới hạn trần tỷ lệ hiển thị trên biểu đồ là 150%
  const maxVisiblePct = 150;

  // Lấy dữ liệu hằng ngày và quy đổi sang tỷ lệ %
  const indicatorsData = useMemo(() => {
    return configs.map((config, index) => {
      const colorScheme = INDICATOR_COLORS[index % INDICATOR_COLORS.length];
      
      const dailyValues = Array.from({ length: daysInMonthCount }, (_, dayIdx) => {
        const day = dayIdx + 1;
        const dateStr = `${ranksMonth}-${day.toString().padStart(2, '0')}`;
        const record = kpiDailyValues.find(
          v => v.staffId === staffId && v.kpiConfigId === config.id && v.date === dateStr
        );
        return record ? record.value : 0;
      });

      // Xác định mục tiêu ngày để quy đổi sang %
      const target = config.dailyTarget > 0
        ? config.dailyTarget
        : (config.monthlyTarget > 0 ? config.monthlyTarget / daysInMonthCount : 0);

      // Quy đổi sang mảng phần trăm phần trăm đạt được hằng ngày
      const pctValues = dailyValues.map(val => {
        if (target <= 0) return val > 0 ? 100 : 0;
        return (val / target) * 100;
      });

      // Tọa độ X, Y của các điểm trên biểu đồ SVG
      const points: [number, number][] = pctValues.map((pct, idx) => {
        const x = paddingLeft + (idx / (daysInMonthCount - 1)) * chartWidth;
        // Giới hạn giá trị vẽ tối đa ở mức 150% để tránh gãy biểu đồ do đột biến
        const clampedPct = Math.min(pct, maxVisiblePct);
        const y = paddingTop + chartHeight - (clampedPct / maxVisiblePct) * chartHeight;
        return [x, y];
      });

      return {
        config,
        colorScheme,
        dailyValues,
        pctValues,
        points,
        target,
      };
    });
  }, [configs, staffId, ranksMonth, daysInMonthCount, kpiDailyValues, chartWidth, chartHeight]);

  // Thuật toán nội suy đường spline Bezier để vẽ các nét cong mềm mại
  const smoothing = 0.12;
  const line = (pointA: [number, number], pointB: [number, number]) => {
    const lengthX = pointB[0] - pointA[0];
    const lengthY = pointB[1] - pointA[1];
    return {
      length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
      angle: Math.atan2(lengthY, lengthX),
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
      if (i === 0) return `M ${point[0]} ${point[1]}`;
      const cp1 = controlPoint(a[i - 1], a[i - 2], point, false);
      const cp2 = controlPoint(point, a[i - 1], a[i + 1], true);
      // Giới hạn các điểm điều khiển nằm trong vùng vẽ
      const cp1Y = Math.max(paddingTop, Math.min(paddingTop + chartHeight, cp1[1]));
      const cp2Y = Math.max(paddingTop, Math.min(paddingTop + chartHeight, cp2[1]));
      return `${acc} C ${cp1[0]} ${cp1Y}, ${cp2[0]} ${cp2Y}, ${point[0]} ${point[1]}`;
    }, '');
  };

  // Trục Y hiển thị các mốc cố định: 150%, 100% (mục tiêu), 50%, 0%
  const yTicks = [150, 100, 50, 0];
  const targetY = paddingTop + chartHeight - (100 / maxVisiblePct) * chartHeight; // Mốc 100% mục tiêu ngày

  // Các mốc trục X
  const xTicksIndices = [0, 4, 9, 14, 19, 24, daysInMonthCount - 1].filter(idx => idx < daysInMonthCount);

  // Lấy danh sách dữ liệu hiển thị cho Tooltip tại ngày đang hover
  const tooltipData = useMemo(() => {
    if (hoveredDayIdx === null) return null;
    return indicatorsData
      .filter(item => visibleKpiIds.has(item.config.id))
      .map(item => {
        const val = item.dailyValues[hoveredDayIdx];
        const pct = item.pctValues[hoveredDayIdx];
        return {
          name: item.config.kpiName,
          value: formatValue(val, item.config.unit),
          target: formatValue(item.target, item.config.unit),
          pct: Math.round(pct),
          color: item.colorScheme.stroke,
          textClass: item.colorScheme.text,
        };
      });
  }, [hoveredDayIdx, indicatorsData, visibleKpiIds]);

  return (
    <div className="space-y-4">
      {/* Header Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-4 text-left">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            BIỂU ĐỒ KPI TỔNG HỢP HẰNG NGÀY
          </h4>
          <span className="text-[10px] text-slate-400 font-bold">
            Hiển thị tỷ lệ hoàn thành mục tiêu ngày (%)
          </span>
        </div>
      </div>

      {/* Main Chart Box */}
      <div className="relative overflow-hidden h-[230px] w-full">
        {/* HTML Tooltip tích hợp */}
        {hoveredDayIdx !== null && tooltipData && (
          <div 
            className="absolute bg-slate-900/95 text-white text-[11px] font-bold py-2.5 px-3 rounded-xl shadow-lg border border-slate-700 pointer-events-none z-30 transition-all duration-150 text-left w-[200px]"
            style={{ 
              left: `${( (paddingLeft + (hoveredDayIdx / (daysInMonthCount - 1)) * chartWidth) / 600 ) * 100}%`,
              top: '15px',
              transform: hoveredDayIdx > daysInMonthCount / 2 ? 'translateX(-105%)' : 'translateX(5%)',
            }}
          >
            <p className="border-b border-slate-800 pb-1.5 mb-1.5 text-slate-300">
              Ngày {String(hoveredDayIdx + 1).padStart(2, '0')}/{monthNum}
            </p>
            <div className="space-y-1.5">
              {tooltipData.map((item, idx) => (
                <div key={idx} className="flex flex-col border-b border-slate-800/40 pb-1 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-400 truncate text-[10px]">{item.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className={cn('font-black text-xs', item.textClass)}>{item.value}</span>
                    <span className="text-[9.5px] text-slate-400 font-medium">Mục tiêu: {item.target} ({item.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SVG Drawing Canvas */}
        <svg className="w-full h-full" viewBox="0 0 600 180" preserveAspectRatio="none">
          <defs>
            {/* Gradients cho từng màu */}
            <linearGradient id="grad-green" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="grad-blue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="grad-orange" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="grad-cyan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="grad-yellow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eab308" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="grad-rose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Đường lưới ngang & nhãn trục Y */}
          {yTicks.map((val, idx) => {
            const y = paddingTop + (idx / (yTicks.length - 1)) * chartHeight;
            return (
              <g key={idx}>
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={600 - paddingRight} 
                  y2={y} 
                  stroke="#e2e8f0" 
                  strokeWidth="1" 
                  strokeOpacity="0.5" 
                />
                <text 
                  x={paddingLeft - 8} 
                  y={y + 3} 
                  fill="#94a3b8" 
                  fontSize="9.2" 
                  fontWeight="bold" 
                  textAnchor="end"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Đường Target chuẩn mực 100% (Đỏ đứt nét) */}
          <line 
            x1={paddingLeft} 
            y1={targetY} 
            x2={600 - paddingRight} 
            y2={targetY} 
            stroke="#ef4444" 
            strokeWidth="1.2" 
            strokeDasharray="4,4" 
            strokeOpacity="0.75"
          />

          {/* Đường vẽ dọc chỉ định (Vertical Guide Line) khi hover */}
          {hoveredDayIdx !== null && (
            <line
              x1={paddingLeft + (hoveredDayIdx / (daysInMonthCount - 1)) * chartWidth}
              y1={paddingTop}
              x2={paddingLeft + (hoveredDayIdx / (daysInMonthCount - 1)) * chartWidth}
              y2={paddingTop + chartHeight}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          )}

          {/* Vẽ từng chỉ số */}
          {indicatorsData.map((item) => {
            const isVisible = visibleKpiIds.has(item.config.id);
            if (!isVisible) return null;

            const pathData = svgPath(item.points);
            const fillData = `${pathData} L ${paddingLeft + chartWidth} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`;

            return (
              <g key={item.config.id} className="transition-all duration-300">
                {/* Vùng đổ màu Gradient phía dưới */}
                <path d={fillData} fill={item.colorScheme.fill} />
                
                {/* Đường vẽ Spline chính */}
                <path 
                  d={pathData} 
                  fill="none" 
                  stroke={item.colorScheme.stroke} 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Điểm nhấn (Chấm tròn) tại ngày đang hover */}
                {hoveredDayIdx !== null && item.points[hoveredDayIdx] && (
                  <circle 
                    cx={item.points[hoveredDayIdx][0]} 
                    cy={item.points[hoveredDayIdx][1]} 
                    r="4.5" 
                    fill="#ffffff" 
                    stroke={item.colorScheme.stroke} 
                    strokeWidth="2.5" 
                  />
                )}
              </g>
            );
          })}

          {/* Nhãn trục X */}
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
                  strokeWidth="1" 
                />
                <text 
                  x={x} 
                  y={paddingTop + chartHeight + 14} 
                  fill="#94a3b8" 
                  fontSize="9.2" 
                  fontWeight="bold" 
                  textAnchor="middle"
                >
                  Ngày {String(dayIdx + 1).padStart(2, '0')}
                </text>
              </g>
            );
          })}

          {/* Vùng cột dọc tàng hình (Invisible bars) để hover bắt sự kiện ngày */}
          {Array.from({ length: daysInMonthCount }).map((_, idx) => {
            const step = chartWidth / (daysInMonthCount - 1);
            const x = paddingLeft + idx * step;
            return (
              <rect
                key={idx}
                x={x - step / 2}
                y={paddingTop}
                width={step}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredDayIdx(idx)}
                onMouseLeave={() => setHoveredDayIdx(null)}
              />
            );
          })}
        </svg>
      </div>

      {/* Legend Tương tác ở dưới cùng */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-1 select-none font-sans text-xs">
        {configs.map((config, index) => {
          const colorScheme = INDICATOR_COLORS[index % INDICATOR_COLORS.length];
          const isVisible = visibleKpiIds.has(config.id);
          
          return (
            <button
              key={config.id}
              type="button"
              onClick={() => toggleKpiVisibility(config.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer hover:bg-slate-50',
                isVisible 
                  ? 'border-slate-200 bg-white font-bold text-slate-700 shadow-3xs' 
                  : 'border-slate-100 bg-slate-50/50 text-slate-400 border-dashed'
              )}
            >
              <span 
                className={cn(
                  'w-2 h-2 rounded-full shrink-0 transition-transform duration-205', 
                  isVisible ? colorScheme.legendBg : 'bg-slate-300 scale-75'
                )} 
              />
              <span>{config.kpiName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
