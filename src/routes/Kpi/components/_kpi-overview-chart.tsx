import React, { useState, useCallback, useMemo } from 'react';
import type { StaffRank } from '../../../types/kpi.types';
import type { StaffRole } from '../../../types/staff.types';
import { Card, CardContent } from '../../../../share/ui/card';
import { translateClassification } from '../kpi-utils';
import { cn } from '@shared/lib/utils';

const CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

interface KpiOverviewChartProps {
  readonly ranks: StaffRank[];
  readonly roles: StaffRole[];
  readonly avgScore: number;
  readonly totalPayoutSum: number;
  readonly onSelectStaff: (id: string) => void;
  readonly onViewModeChange: (mode: 'overview' | 'detail') => void;
}

const formatYLabel = (val: number, activeChart: 'score' | 'payout') => {
  if (activeChart === 'score') {
    return `${val}`;
  }
  if (val === 0) return '0đ';
  if (val >= 1000000) return `${(val / 1000000).toFixed(1).replace('.0', '')}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return `${val}đ`;
};

export const KpiOverviewChart = React.memo(function KpiOverviewChart({
  ranks,
  roles,
  avgScore,
  totalPayoutSum,
  onSelectStaff,
  onViewModeChange,
}: KpiOverviewChartProps) {
  const [activeChart, setActiveChart] = useState<'score' | 'payout'>('score');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleBarClick = useCallback((staffId: string) => {
    onSelectStaff(staffId);
    onViewModeChange('detail');
  }, [onSelectStaff, onViewModeChange]);

  const handleChartChange = useCallback((chartType: 'score' | 'payout') => {
    setActiveChart(chartType);
  }, []);

  if (ranks.length === 0) return null;

  // Chart settings
  const paddingLeft = 40;
  const paddingRight = 15;
  const paddingTop = 25;
  const paddingBottom = 35;
  
  const chartWidth = 600 - paddingLeft - paddingRight;
  const chartHeight = 180 - paddingTop - paddingBottom;

  // Compute scale maximum dynamically
  const maxVal = useMemo(() => {
    if (activeChart === 'score') return 100;
    const maxPayout = Math.max(...ranks.map(r => r.calculatedPayout ?? 0), 500000);
    // Round to a clean number (e.g. next multiple of 500k)
    return Math.ceil(maxPayout / 500000) * 500000;
  }, [activeChart, ranks]);

  // Calculate bar positions
  const count = ranks.length;
  
  // Bar width and spacing configuration
  const barWidth = 24;
  const gap = 36; // gap between bars

  const contentWidth = count * barWidth + (count - 1) * gap;
  const useCenteredLayout = contentWidth < chartWidth;

  const getBarX = useCallback((idx: number) => {
    if (useCenteredLayout) {
      const startX = paddingLeft + (chartWidth - contentWidth) / 2;
      return startX + idx * (barWidth + gap);
    } else {
      // Dynamic spread layout when columns exceed available chart width
      const step = chartWidth / count;
      return paddingLeft + idx * step + (step - barWidth) / 2;
    }
  }, [count, useCenteredLayout, contentWidth, chartWidth, paddingLeft]);

  // Calculate dynamic min-width based on staff count to prevent scroll on small lists
  const dynamicMinWidth = useMemo(() => {
    if (count <= 6) return '100%';
    return `${count * 75}px`;
  }, [count]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    return [maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0];
  }, [maxVal]);

  // Average benchmark line
  const benchmarkY = useMemo(() => {
    const targetVal = activeChart === 'score'
      ? avgScore
      : totalPayoutSum / count;
    return paddingTop + chartHeight - (targetVal / maxVal) * chartHeight;
  }, [activeChart, avgScore, totalPayoutSum, count, maxVal]);

  // Colors mapping
  const getBarColor = (score: number) => {
    if (score >= 90) return '#10b981'; // Emerald
    if (score >= 80) return '#06b6d4'; // Cyan
    if (score >= 70) return '#3b82f6'; // Blue
    if (score >= 50) return '#f59e0b'; // Amber
    return '#f43f5e'; // Rose
  };

  const getBarGradientId = (rank: StaffRank) => {
    if (activeChart === 'payout') return 'barGradEmerald'; // green for money
    const score = rank.score;
    if (score >= 90) return 'barGradEmerald';
    if (score >= 80) return 'barGradCyan';
    if (score >= 70) return 'barGradBlue';
    if (score >= 50) return 'barGradAmber';
    return 'barGradRose';
  };

  return (
    <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl text-left relative overflow-hidden font-sans flex flex-col p-0">
      {/* 🛠️ Interactive Header (Shadcn style) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-100 p-0">
        <div className="flex-1 flex flex-col justify-center gap-1 px-5 py-4">
          <h4 className="text-sm font-black text-slate-850 uppercase tracking-wider leading-none">
            Hiệu suất cửa hàng
          </h4>
          <span className="text-[10px] text-slate-400 font-bold block mt-1">
            Hiển thị tổng thể kết quả làm việc của toàn bộ đội ngũ
          </span>
        </div>

        {/* Aggregate Tabs / Buttons */}
        <div className="flex border-t sm:border-t-0 sm:border-l border-slate-100 select-none">
          {/* Button 1: Score */}
          <button
            type="button"
            className={cn(
              'flex-1 sm:flex-initial flex flex-col justify-center gap-1 px-5 py-3 sm:px-6 sm:py-4 text-left transition duration-150 cursor-pointer min-w-[120px] sm:min-w-[140px]',
              activeChart === 'score' ? 'bg-slate-50' : 'hover:bg-slate-50/40'
            )}
            onClick={() => handleChartChange('score')}
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              KPI trung bình
            </span>
            <span className="text-base sm:text-lg font-black text-slate-800 leading-none mt-1">
              {avgScore} điểm
            </span>
          </button>

          {/* Button 2: Payout */}
          <button
            type="button"
            className={cn(
              'flex-1 sm:flex-initial flex flex-col justify-center gap-1 px-5 py-3 sm:px-6 sm:py-4 text-left border-l border-slate-100 transition duration-150 cursor-pointer min-w-[120px] sm:min-w-[150px]',
              activeChart === 'payout' ? 'bg-slate-50' : 'hover:bg-slate-50/40'
            )}
            onClick={() => handleChartChange('payout')}
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              Tổng thưởng KPI
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-600 leading-none mt-1">
              {CURRENCY_FORMATTER.format(totalPayoutSum)}
            </span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <CardContent className="p-4 md:p-5">
        <div className="relative overflow-x-auto min-w-0 w-full scrollbar-thin">
          <div 
            className="w-full h-[200px] relative"
            style={{ minWidth: dynamicMinWidth }}
          >
            {/* Interactive Tooltip */}
            {(() => {
              if (hoveredIndex === null) return null;
              const hRank = ranks[hoveredIndex];
              if (!hRank) return null;

              const val = activeChart === 'score' ? hRank.score : (hRank.calculatedPayout ?? 0);

              return (
                <div 
                  className="absolute bg-slate-900/95 text-white text-[11px] font-bold py-2 px-3 rounded-xl shadow-lg border border-slate-700 pointer-events-none z-30 transition-all duration-150 text-left w-[180px]"
                  style={{ 
                    left: `${(getBarX(hoveredIndex) + barWidth / 2) / 600 * 100}%`,
                    top: `${(paddingTop + chartHeight - (val / maxVal) * chartHeight) / 180 * 100}%`,
                    transform: 'translate(-50%, -115%)'
                  }}
                >
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-1.5 mb-1.5">
                    <img 
                      src={hRank.avatar} 
                      alt={hRank.name} 
                      className="w-6 h-6 rounded-full border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-slate-100">{hRank.name}</p>
                      <p className="text-[9px] text-slate-400 truncate leading-none mt-0.5">
                        {roles.find(r => r.code === hRank.role)?.name || hRank.role}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 font-semibold text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Điểm số:</span>
                      <span className="text-blue-400 font-extrabold">{hRank.score} điểm</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Xếp loại:</span>
                      <span className="text-slate-200">{translateClassification(hRank.classification)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-850/60 mt-1">
                      <span className="text-slate-450">Thưởng KPI:</span>
                      <span className="text-emerald-400 font-extrabold">{CURRENCY_FORMATTER.format(hRank.calculatedPayout ?? 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* SVG Draw Area */}
            <svg className="w-full h-full" viewBox="0 0 600 180" preserveAspectRatio="none">
              <defs>
                {/* Gradients */}
                <linearGradient id="barGradEmerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="barGradCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0891b2" />
                </linearGradient>
                <linearGradient id="barGradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="barGradAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="barGradRose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
              </defs>

              {/* Grid lines & Y-axis labels */}
              {yTicks.map((tickVal, idx) => {
                const y = paddingTop + (idx / 4) * chartHeight;
                return (
                  <g key={idx}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={600 - paddingRight}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      {formatYLabel(tickVal, activeChart)}
                    </text>
                  </g>
                );
              })}

              {/* Average benchmark line (Dashed red/emerald line) */}
              {ranks.length > 1 && (
                <line
                  x1={paddingLeft}
                  y1={benchmarkY}
                  x2={600 - paddingRight}
                  y2={benchmarkY}
                  stroke={activeChart === 'payout' ? '#10b981' : '#c21a1a'}
                  strokeWidth="1.2"
                  strokeDasharray="4,4"
                  strokeOpacity="0.75"
                />
              )}

              {/* Columns (Bars) */}
              {ranks.map((rank, idx) => {
                const x = getBarX(idx);
                const val = activeChart === 'score' ? rank.score : (rank.calculatedPayout ?? 0);
                const barHeight = (val / maxVal) * chartHeight;
                const y = paddingTop + chartHeight - barHeight;
                const isHovered = hoveredIndex === idx;

                // Format name: Nguyen Van A -> Van A
                const nameParts = rank.name.trim().split(' ');
                const shortName = nameParts.length > 1
                  ? `${nameParts[nameParts.length - 2][0]}. ${nameParts[nameParts.length - 1]}`
                  : rank.name;

                return (
                  <g key={rank.staffId}>
                    {/* Visual Bar with rounded top */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(2, barHeight)}
                      rx={3}
                      ry={3}
                      fill={`url(#${getBarGradientId(rank)})`}
                      opacity={isHovered ? 0.95 : 0.8}
                      className="transition-all duration-150 cursor-pointer"
                      onClick={() => handleBarClick(rank.staffId)}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {/* Value text on top of the bar */}
                    {val > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 5}
                        fill={isHovered ? (activeChart === 'score' ? getBarColor(rank.score) : '#10b981') : '#64748b'}
                        fontSize="9.2"
                        fontWeight="black"
                        textAnchor="middle"
                      >
                        {activeChart === 'score' ? val : formatYLabel(val, 'payout')}
                      </text>
                    )}

                    {/* Shortened Name text below */}
                    <text
                      x={x + barWidth / 2}
                      y={paddingTop + chartHeight + 16}
                      fill={isHovered ? '#334155' : '#94a3b8'}
                      fontSize="9.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {shortName}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
