import React, { useState, useCallback, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine, LabelList } from 'recharts';
import type { StaffRank } from '../../../types/kpi.types';
import type { StaffRole } from '../../../types/staff.types';
import { Card, CardContent } from '../../../../share/ui/card';
import { translateClassification, formatValue } from '../kpi-utils';
import { cn } from '@shared/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@shared/ui/chart';
import type { ChartConfig } from '@shared/ui/chart';

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
  readonly storeDailyChartData?: any[];
  readonly storeDailyIndicators?: { id: string; name: string; unit: string }[];
  readonly onSelectStaff: (id: string) => void;
  readonly onViewModeChange: (mode: 'overview' | 'detail') => void;
}

// Bảng màu chuẩn hóa cho từng chỉ số
const INDICATOR_COLORS = [
  { stroke: '#3b82f6', legendBg: 'bg-blue-500', text: 'text-blue-500' },    // Xanh dương
  { stroke: '#10b981', legendBg: 'bg-emerald-500', text: 'text-emerald-500' }, // Xanh lá
  { stroke: '#f97316', legendBg: 'bg-orange-500', text: 'text-orange-500' },// Cam
  { stroke: '#06b6d4', legendBg: 'bg-cyan-500', text: 'text-cyan-500' },    // Cyan
  { stroke: '#ec4899', legendBg: 'bg-pink-500', text: 'text-pink-500' },    // Hồng
  { stroke: '#8b5cf6', legendBg: 'bg-violet-500', text: 'text-violet-500' },// Tím
  { stroke: '#eab308', legendBg: 'bg-yellow-500', text: 'text-yellow-500' },// Vàng
  { stroke: '#f43f5e', legendBg: 'bg-rose-500', text: 'text-rose-500' },    // Rose
  { stroke: '#14b8a6', legendBg: 'bg-teal-500', text: 'text-teal-500' },    // Teal
];

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
  storeDailyChartData = [],
  storeDailyIndicators = [],
  onSelectStaff,
  onViewModeChange,
}: KpiOverviewChartProps) {
  const [activeChart, setActiveChart] = useState<'score' | 'payout' | 'revenue'>('revenue');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  // Quản lý bật/tắt hiển thị từng chỉ số trên biểu đồ
  const [visibleIndicatorIds, setVisibleIndicatorIds] = useState<Set<string>>(() => new Set(storeDailyIndicators.map(i => i.id)));

  // Đồng bộ lại chỉ số hiển thị khi indicators thay đổi
  React.useEffect(() => {
    setVisibleIndicatorIds(new Set(storeDailyIndicators.map(i => i.id)));
  }, [storeDailyIndicators]);

  const toggleIndicatorVisibility = useCallback((id: string) => {
    setVisibleIndicatorIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) {
          next.delete(id);
        }
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBarClick = useCallback((staffId: string) => {
    onSelectStaff(staffId);
    onViewModeChange('detail');
  }, [onSelectStaff, onViewModeChange]);

  const handleChartChange = useCallback((chartType: 'score' | 'payout' | 'revenue') => {
    setActiveChart(chartType);
    setHoveredIndex(null);
  }, []);

  if (ranks.length === 0) return null;

  // Chart settings for SVG Column Chart
  const paddingLeft = 40;
  const paddingRight = 15;
  const paddingTop = 25;
  const paddingBottom = 35;
  
  const chartWidth = 600 - paddingLeft - paddingRight;
  const chartHeight = 240 - paddingTop - paddingBottom;

  // Tính tỷ lệ % hoàn thành trung bình của toàn cửa hàng
  const avgKpiPct = useMemo(() => {
    if (storeDailyChartData.length === 0 || storeDailyIndicators.length === 0) return 0;
    let sum = 0;
    let count = 0;
    storeDailyChartData.forEach(row => {
      storeDailyIndicators.forEach(ind => {
        const val = row[ind.id];
        if (val !== undefined) {
          sum += val;
          count++;
        }
      });
    });
    return count > 0 ? Math.round(sum / count) : 0;
  }, [storeDailyChartData, storeDailyIndicators]);

  // Compute scale maximum dynamically for SVG Column Chart
  const maxVal = useMemo(() => {
    if (activeChart === 'score') return 100;
    const maxPayout = Math.max(...ranks.map(r => r.calculatedPayout ?? 0), 500000);
    return Math.ceil(maxPayout / 500000) * 500000;
  }, [activeChart, ranks]);

  // Calculate bar positions for SVG Column Chart
  const count = ranks.length;
  const barWidth = 36;
  const gap = 28;

  const contentWidth = count * barWidth + (count - 1) * gap;
  const useCenteredLayout = contentWidth < chartWidth;

  const getBarX = useCallback((idx: number) => {
    if (useCenteredLayout) {
      const startX = paddingLeft + (chartWidth - contentWidth) / 2;
      return startX + idx * (barWidth + gap);
    } else {
      const step = chartWidth / count;
      return paddingLeft + idx * step + (step - barWidth) / 2;
    }
  }, [count, useCenteredLayout, contentWidth, chartWidth, paddingLeft]);

  const dynamicMinWidth = useMemo(() => {
    if (count <= 6) return '100%';
    return `${count * 75}px`;
  }, [count]);

  const yTicks = useMemo(() => {
    return [maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0];
  }, [maxVal]);

  const benchmarkY = useMemo(() => {
    const targetVal = activeChart === 'score'
      ? avgScore
      : totalPayoutSum / count;
    return paddingTop + chartHeight - (targetVal / maxVal) * chartHeight;
  }, [activeChart, avgScore, totalPayoutSum, count, maxVal]);

  const getBarColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 80) return '#06b6d4';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#f43f5e';
  };

  const getBarGradientId = (rank: StaffRank) => {
    if (activeChart === 'payout') return 'barGradEmerald';
    const score = rank.score;
    if (score >= 90) return 'barGradEmerald';
    if (score >= 80) return 'barGradCyan';
    if (score >= 70) return 'barGradBlue';
    if (score >= 50) return 'barGradAmber';
    return 'barGradRose';
  };

  // Recharts configurations for tab % Hoàn thành
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    storeDailyIndicators.forEach((ind, idx) => {
      const colorScheme = INDICATOR_COLORS[idx % INDICATOR_COLORS.length];
      config[ind.id] = {
        label: ind.name,
        color: colorScheme.stroke,
      };
    });
    return config;
  }, [storeDailyIndicators]);

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
        <div className="flex border-t sm:border-t-0 sm:border-l border-slate-100 select-none overflow-x-auto scrollbar-none w-full sm:w-auto">
          {/* Button 1: Indicator Pct (% Hoàn thành) */}
          <button
            type="button"
            className={cn(
              'flex-1 sm:flex-initial flex flex-col justify-center gap-1 px-4 py-3 sm:px-5 sm:py-4 text-left transition duration-150 cursor-pointer min-w-[110px] sm:min-w-[140px]',
              activeChart === 'revenue' ? 'bg-slate-50' : 'hover:bg-slate-50/40'
            )}
            onClick={() => handleChartChange('revenue')}
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              % Hoàn thành
            </span>
            <span className="text-sm sm:text-base font-black text-blue-600 leading-none mt-1.5">
              {avgKpiPct}% chỉ tiêu
            </span>
          </button>

          {/* Button 2: Score (KPI trung bình) */}
          <button
            type="button"
            className={cn(
              'flex-1 sm:flex-initial flex flex-col justify-center gap-1 px-4 py-3 sm:px-5 sm:py-4 text-left border-l border-slate-100 transition duration-150 cursor-pointer min-w-[110px] sm:min-w-[130px]',
              activeChart === 'score' ? 'bg-slate-50' : 'hover:bg-slate-50/40'
            )}
            onClick={() => handleChartChange('score')}
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              KPI trung bình
            </span>
            <span className="text-sm sm:text-base font-black text-slate-800 leading-none mt-1.5">
              {avgScore} điểm
            </span>
          </button>

          {/* Button 3: Payout (Tổng thưởng KPI) */}
          <button
            type="button"
            className={cn(
              'flex-1 sm:flex-initial flex flex-col justify-center gap-1 px-4 py-3 sm:px-5 sm:py-4 text-left border-l border-slate-100 transition duration-150 cursor-pointer min-w-[110px] sm:min-w-[140px]',
              activeChart === 'payout' ? 'bg-slate-50' : 'hover:bg-slate-50/40'
            )}
            onClick={() => handleChartChange('payout')}
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              Tổng thưởng KPI
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-600 leading-none mt-1.5">
              {CURRENCY_FORMATTER.format(totalPayoutSum)}
            </span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <CardContent className="p-4 md:p-5">
        {activeChart === 'revenue' ? (
          /* Render Grouped Bar Chart for store KPI Performance */
          <div className="space-y-4 w-full">
            <div className="h-[310px] w-full relative">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart
                  data={storeDailyChartData}
                  margin={{ top: 18, right: 10, left: -20, bottom: 0 }}
                  barGap={3}
                  barCategoryGap="18%"
                >
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.5} />
                  
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    className="text-[10px] font-bold text-slate-500"
                  />

                  <YAxis
                    domain={[0, 120]}
                    ticks={[0, 30, 60, 90, 120]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${value}%`}
                    className="text-[9.5px] font-bold text-slate-400"
                  />

                  <ReferenceLine
                    y={100}
                    stroke="#ef4444"
                    strokeWidth={1.2}
                    strokeDasharray="4 4"
                    strokeOpacity={0.75}
                    label={{ 
                      value: '100%', 
                      position: 'right', 
                      fill: '#ef4444', 
                      fontSize: 9, 
                      fontWeight: 'bold' 
                    }}
                  />

                  <ChartTooltip
                    cursor={{ fill: 'rgba(226, 232, 240, 0.2)' }}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        className="w-[240px]"
                        formatter={(value, name, item) => {
                          const indicatorId = String(item.dataKey);
                          const val = item.payload[`${indicatorId}_val`];
                          const target = item.payload[`${indicatorId}_target`];
                          const unit = item.payload[`${indicatorId}_unit`];
                          return `${formatValue(val, unit)} / ${formatValue(target, unit)} (${Math.round(Number(value))}%)`;
                        }}
                      />
                    }
                  />

                  {storeDailyIndicators.map((ind, index) => {
                    const isVisible = visibleIndicatorIds.has(ind.id);
                    if (!isVisible) return null;

                    const colorScheme = INDICATOR_COLORS[index % INDICATOR_COLORS.length];
                    
                    return (
                      <Bar 
                        key={ind.id}
                        dataKey={ind.id} 
                        fill={colorScheme.stroke} 
                        radius={[3, 3, 0, 0]}
                        barSize={16}
                      >
                        <LabelList 
                          dataKey={ind.id} 
                          position="top" 
                          offset={6} 
                          style={{ fontSize: '8.2px', fill: '#475569', fontWeight: 'bold' }} 
                          formatter={(v) => v ? `${v}%` : ''} 
                        />
                      </Bar>
                    );
                  })}
                </BarChart>
              </ChartContainer>
            </div>

            {/* Toggle Legend Button */}
            <div className="flex justify-center pb-1">
              <button
                type="button"
                onClick={() => setShowLegend(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all duration-150 cursor-pointer select-none active:scale-95 shadow-3xs"
              >
                <span>{showLegend ? 'Ẩn chú thích' : 'Hiện chú thích'}</span>
                <span className="text-[9px]">{showLegend ? '▲' : '▼'}</span>
              </button>
            </div>

            {/* Interactive Legend for Indicators below */}
            {showLegend && (
              <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-slate-100 select-none font-sans text-xs animate-fade-in">
                {storeDailyIndicators.map((ind, index) => {
                  const colorScheme = INDICATOR_COLORS[index % INDICATOR_COLORS.length];
                  const isVisible = visibleIndicatorIds.has(ind.id);
                  
                  return (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => toggleIndicatorVisibility(ind.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer hover:bg-slate-50',
                        isVisible 
                          ? 'border-slate-200 bg-white font-bold text-slate-700 shadow-3xs' 
                          : 'border-slate-100 bg-slate-50/50 text-slate-400 border-dashed'
                      )}
                    >
                      <span 
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0 transition-transform duration-250', 
                          isVisible ? colorScheme.legendBg : 'bg-slate-300 scale-75'
                        )} 
                      />
                      <span>{ind.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Render SVG Column Chart for Staff performance (score or payout) */
          <div className="relative overflow-x-auto min-w-0 w-full scrollbar-thin">
            <div 
              className="w-full h-[280px] relative"
              style={{ minWidth: dynamicMinWidth }}
            >
              {/* Interactive Tooltip for Staff Column Chart */}
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

              <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
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
        )}
      </CardContent>
    </Card>
  );
});
