import React, { useState, useMemo, useCallback } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from 'recharts';
import { formatValue } from '../kpi-utils';
import type { KPIConfig, KPIDailyValue } from '../../../types/kpi.types';
import { cn } from '@shared/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@shared/ui/chart';
import type { ChartConfig } from '@shared/ui/chart';

interface KpiMultiIndicatorChartProps {
  readonly staffId: string;
  readonly configs: KPIConfig[];
  readonly ranksMonth: string;
  readonly daysInMonthCount: number;
  readonly kpiDailyValues: KPIDailyValue[];
}

// Bảng màu chuẩn hóa cho từng chỉ số (Tránh màu tím theo quy chuẩn hệ thống)
const INDICATOR_COLORS = [
  { stroke: '#10b981', legendBg: 'bg-emerald-500', text: 'text-emerald-500' }, // Xanh lá - Doanh thu
  { stroke: '#3b82f6', legendBg: 'bg-blue-500', text: 'text-blue-500' },    // Xanh dương - Đơn hàng
  { stroke: '#f97316', legendBg: 'bg-orange-500', text: 'text-orange-500' },// Cam - Checklist
  { stroke: '#06b6d4', legendBg: 'bg-cyan-500', text: 'text-cyan-500' },    // Cyan
  { stroke: '#eab308', legendBg: 'bg-yellow-500', text: 'text-yellow-500' },// Vàng
  { stroke: '#f43f5e', legendBg: 'bg-rose-500', text: 'text-rose-500' },    // Hồng/Đỏ
];

export const KpiMultiIndicatorChart = React.memo(function KpiMultiIndicatorChart({
  staffId,
  configs,
  ranksMonth,
  daysInMonthCount,
  kpiDailyValues,
}: KpiMultiIndicatorChartProps) {
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

  // Quy đổi dữ liệu hằng ngày của từng KPI sang dạng mảng của Recharts
  const chartData = useMemo(() => {
    return Array.from({ length: daysInMonthCount }, (_, dayIdx) => {
      const day = dayIdx + 1;
      const dateStr = `${ranksMonth}-${day.toString().padStart(2, '0')}`;
      const row: any = {
        day: day,
      };

      configs.forEach((config) => {
        const record = kpiDailyValues.find(
          v => v.staffId === staffId && v.kpiConfigId === config.id && v.date === dateStr
        );
        const val = record ? record.value : 0;
        const target = config.dailyTarget > 0
          ? config.dailyTarget
          : (config.monthlyTarget > 0 ? config.monthlyTarget / daysInMonthCount : 0);

        const pct = target <= 0 ? (val > 0 ? 100 : 0) : (val / target) * 100;
        
        // Lưu trữ cả phần trăm (để vẽ đồ thị), giá trị thực tế, mục tiêu ngày và đơn vị để dùng trong CustomTooltip
        row[`${config.id}_pct`] = Math.min(Math.round(pct), 150); // Giới hạn 150% giống biểu đồ cũ
        row[`${config.id}_val`] = val;
        row[`${config.id}_target`] = target;
        row[`${config.id}_unit`] = config.unit;
        row[`${config.id}_name`] = config.kpiName;
      });

      return row;
    });
  }, [configs, staffId, ranksMonth, daysInMonthCount, kpiDailyValues]);

  // Thiết lập cấu hình chart config cho ChartContainer
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    configs.forEach((cfg, idx) => {
      const colorScheme = INDICATOR_COLORS[idx % INDICATOR_COLORS.length];
      config[`${cfg.id}_pct`] = {
        label: cfg.kpiName,
        color: colorScheme.stroke,
      };
    });
    return config;
  }, [configs]);

  // Các mốc hiển thị cố định trên trục X để tránh chật chội
  const xTicks = useMemo(() => {
    return [1, 5, 10, 15, 20, 25, daysInMonthCount].filter(day => day <= daysInMonthCount);
  }, [daysInMonthCount]);

  // Custom Tooltip hiển thị chi tiết phần trăm và số thực đạt của từng chỉ số KPI đang được bật
  // Removed CustomTooltip in favor of ChartTooltipContent from share/ui/chart

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
      <div className="h-[220px] w-full relative">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              {configs.map((config, index) => {
                const colorScheme = INDICATOR_COLORS[index % INDICATOR_COLORS.length];
                return (
                  <linearGradient
                    key={config.id}
                    id={`fill-${config.id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={colorScheme.stroke} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={colorScheme.stroke} stopOpacity={0.0} />
                  </linearGradient>
                );
              })}
            </defs>

            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.5} />
            
            <XAxis
              dataKey="day"
              ticks={xTicks}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(value) => `Ngày ${String(value).padStart(2, '0')}`}
              className="text-[9.5px] font-bold text-slate-400"
            />

            <YAxis
              domain={[0, 150]}
              ticks={[0, 50, 100, 150]}
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
            />

             <ChartTooltip
              cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  className="w-[210px]"
                  formatter={(value, name, item) => {
                    const kpiId = String(item.dataKey).replace('_pct', '');
                    const val = item.payload[`${kpiId}_val`];
                    const target = item.payload[`${kpiId}_target`];
                    const unit = item.payload[`${kpiId}_unit`];
                    return `${formatValue(val, unit)} / ${formatValue(target, unit)} (${Math.round(Number(value))}%)`;
                  }}
                />
              }
            />

            {configs.map((config, index) => {
              const isVisible = visibleKpiIds.has(config.id);
              if (!isVisible) return null;

              const colorScheme = INDICATOR_COLORS[index % INDICATOR_COLORS.length];
              
              return (
                <Area
                  key={config.id}
                  type="monotone"
                  dataKey={`${config.id}_pct`}
                  name={config.kpiName}
                  stroke={colorScheme.stroke}
                  fill={`url(#fill-${config.id})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4.5,
                    strokeWidth: 2.5,
                    fill: '#ffffff',
                    stroke: colorScheme.stroke,
                  }}
                />
              );
            })}
          </AreaChart>
        </ChartContainer>
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
                  'w-2 h-2 rounded-full shrink-0 transition-transform duration-250', 
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
