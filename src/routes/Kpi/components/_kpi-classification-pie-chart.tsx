import React, { useState, useMemo } from 'react';
import type { StaffRank } from '../../../types/kpi.types';
import { Card } from '../../../../share/ui/card';
import { translateClassification } from '../kpi-utils';
import { PieChart as PieIcon, ChevronDown } from 'lucide-react';
import { cn } from '@shared/lib/utils';

interface KpiClassificationPieChartProps {
  readonly ranks: StaffRank[];
}

interface GroupItem {
  key: string;
  name: string;
  count: number;
  pct: number;
  color: string;
  hoverColor: string;
}

export const KpiClassificationPieChart = React.memo(function KpiClassificationPieChart({
  ranks,
}: KpiClassificationPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);

  // Group computations
  const total = ranks.length;

  const data = useMemo((): GroupItem[] => {
    if (total === 0) return [];

    const groups = {
      excellent: 0,
      good: 0,
      pass: 0,
      needs_improvement: 0,
    };

    ranks.forEach(r => {
      groups[r.classification] = (groups[r.classification] || 0) + 1;
    });

    return [
      { key: 'excellent', name: 'Xuất sắc', count: groups.excellent, pct: Math.round((groups.excellent / total) * 100), color: '#10b981', hoverColor: '#34d399' },
      { key: 'good', name: 'Tốt', count: groups.good, pct: Math.round((groups.good / total) * 100), color: '#06b6d4', hoverColor: '#22d3ee' },
      { key: 'pass', name: 'Khá', count: groups.pass, pct: Math.round((groups.pass / total) * 100), color: '#3b82f6', hoverColor: '#60a5fa' },
      { key: 'needs_improvement', name: 'Chưa đạt', count: groups.needs_improvement, pct: Math.round((groups.needs_improvement / total) * 100), color: '#f43f5e', hoverColor: '#f87171' },
    ].filter(item => item.count > 0); // Only show segments with data
  }, [ranks, total]);

  // Donut geometry calculations
  const R = 40; // radius
  const C = 2 * Math.PI * R; // circumference = ~251.327
  const strokeWidthNormal = 12;
  const strokeWidthActive = 17;

  // Compute segments with cumulative offsets
  const segments = useMemo(() => {
    let currentOffset = 0;
    return data.map(item => {
      const length = (item.pct / 100) * C;
      const offset = currentOffset;
      currentOffset -= length; // subtract length for next segment offset (moves clockwise)
      return {
        ...item,
        length,
        offset,
      };
    });
  }, [data, C]);

  if (total === 0 || data.length === 0) return null;

  // Active item info
  const activeItem = activeIndex !== null ? data[activeIndex] : null;

  return (
    <Card className="p-4 md:p-5 border border-slate-200 bg-white shadow-xs rounded-2xl text-left relative overflow-hidden font-sans flex flex-col h-full">
      {/* Header Selector */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-50 text-[#C21A1A]">
            <PieIcon className="w-4 h-4 shrink-0" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-850 uppercase tracking-wider leading-none">
              Tỷ lệ xếp loại KPI
            </h4>
            <span className="text-[10px] text-slate-400 font-bold block mt-1">
              Interactive Donut Chart
            </span>
          </div>
        </div>

        {/* Shadcn style interactive Select dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSelectOpen(!selectOpen)}
            className="flex items-center justify-between gap-1.5 h-7 w-[120px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <span className="truncate">
              {activeIndex === null ? 'Tất cả' : data[activeIndex].name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {selectOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setSelectOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-[120px] rounded-xl border border-slate-100 bg-white p-1 shadow-md z-50 animate-fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setActiveIndex(null);
                    setSelectOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-slate-50 transition cursor-pointer',
                    activeIndex === null ? 'bg-slate-50 text-[#C21A1A]' : 'text-slate-600'
                  )}
                >
                  Tất cả
                </button>
                {data.map((item, idx) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveIndex(idx);
                      setSelectOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer',
                      activeIndex === idx ? 'bg-slate-50 text-[#C21A1A]' : 'text-slate-600'
                    )}
                  >
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    {item.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Chart Body */}
      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 py-2 min-h-0">
        {/* SVG Donut Circle */}
        <div className="w-[140px] h-[140px] relative shrink-0">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {/* Background base circle */}
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidthNormal}
            />

            {/* Render segments */}
            {segments.map((seg, idx) => {
              const isActive = activeIndex === idx;
              return (
                <circle
                  key={seg.key}
                  cx="50"
                  cy="50"
                  r={R}
                  fill="transparent"
                  stroke={isActive ? seg.hoverColor : seg.color}
                  strokeWidth={isActive ? strokeWidthActive : strokeWidthNormal}
                  strokeDasharray={`${seg.length} ${C - seg.length}`}
                  strokeDashoffset={seg.offset}
                  transform="rotate(-90 50 50)" // Start at 12 o'clock
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer origin-center"
                  style={{
                    transformOrigin: '50px 50px',
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}
                />
              );
            })}
          </svg>

          {/* Central Label Box */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center select-none font-sans">
            <span className="text-xl font-black text-slate-800 leading-none">
              {activeItem ? activeItem.count : total}
            </span>
            <span className="text-[9.5px] font-bold text-slate-400 mt-1 uppercase tracking-wider leading-none">
              {activeItem ? `${activeItem.name} (${activeItem.pct}%)` : 'Nhân sự'}
            </span>
          </div>
        </div>

        {/* Legend listing on the right */}
        <div className="flex-1 space-y-2 w-full sm:w-auto text-left font-sans">
          {data.map((item, idx) => {
            const isActive = activeIndex === idx;
            return (
              <div
                key={item.key}
                className={cn(
                  'flex items-center justify-between p-1.5 px-2.5 rounded-xl transition cursor-pointer',
                  isActive ? 'bg-slate-50 shadow-3xs' : 'hover:bg-slate-50/50'
                )}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-bold text-slate-700 truncate leading-none">
                    Xếp loại {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-bold text-xs text-slate-500">
                  <span className="text-slate-800">{item.count} người</span>
                  <span className="text-[10px] text-slate-400 font-semibold">• {item.pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
});
