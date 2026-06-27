import React from 'react';

interface PlanProgressRingProps {
  value: number;      // 0-100
  size?: number;       // px, default 80
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
  color?: string;      // stroke color (will auto-determine if not provided)
  trackColor?: string;
}

/**
 * SVG circular progress ring.
 * Upgraded to horizontal layout (flex-row) with dynamic coloring based on value.
 */
const PlanProgressRing = React.memo(function PlanProgressRing({
  value,
  size = 64,
  strokeWidth = 5,
  label,
  subLabel,
  color,
  trackColor = '#f1f5f9',
}: PlanProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  // Auto-determine color based on progress if not explicitly provided
  const activeColor = color || (
    clampedValue >= 75 ? '#10b981' : 
    clampedValue >= 40 ? '#f59e0b' : 
    '#C21A1A'
  );

  return (
    <div className="flex items-center gap-3 text-left w-full min-w-0">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
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
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-black text-slate-800 leading-none">{clampedValue}%</span>
        </div>
      </div>
      {(label || subLabel) && (
        <div className="flex flex-col gap-0.5 justify-center min-w-0 flex-1">
          {label && <span className="text-sm font-bold text-slate-700 truncate block">{label}</span>}
          {subLabel && <span className="text-sm font-semibold text-slate-500 leading-tight block">{subLabel}</span>}
        </div>
      )}
    </div>
  );
});

export default PlanProgressRing;
