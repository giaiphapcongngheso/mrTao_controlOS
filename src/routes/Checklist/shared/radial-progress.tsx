import React from 'react';

// SVG Radial Progress component matching template color style
const RadialProgress = React.memo(function RadialProgress({ percentage }: { percentage: number }) {
  const radius = 35;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-22 h-22 shrink-0 select-none">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="44"
          cy="44"
          r={radius}
          className="text-slate-100"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          className="text-blue-600 transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
        />
      </svg>
      <span className="absolute text-sm font-black text-slate-700">{percentage}%</span>
    </div>
  );
});

export default RadialProgress;
