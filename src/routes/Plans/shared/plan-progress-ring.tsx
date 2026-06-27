import React from 'react';

interface PlanProgressRingProps {
  value: number;      // 0-100
  size?: number;       // px, default 80
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
  color?: string;      // stroke color
  trackColor?: string;
}

/**
 * SVG circular progress ring.
 * Matches the "Tiến độ 12 tuần: 71%" mockup.
 */
const PlanProgressRing = React.memo(function PlanProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
  label,
  subLabel,
  color = '#C21A1A',
  trackColor = '#f1f5f9',
}: PlanProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-slate-800 leading-none">{clampedValue}%</span>
        </div>
      </div>
      {label && <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">{label}</span>}
      {subLabel && <span className="text-[10px] font-semibold text-slate-400 text-center">{subLabel}</span>}
    </div>
  );
});

export default PlanProgressRing;
