import React from 'react';

interface LogoProps {
  className?: string; // Additional wrapper classes
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // Size preset
  iconOnly?: boolean; // Render only the striped M icon
  variant?: 'light' | 'dark'; // Color scheme
}

export default function Logo({
  className = '',
  size = 'md',
  iconOnly = false,
  variant = 'dark',
}: LogoProps) {
  // Size configuration map
  const sizeMap = {
    xs: {
      icon: 'w-6 h-6',
      title: 'text-sm',
      subtitle: 'text-[7px]',
      gap: 'gap-1.5',
      tBarHeight: 'h-[1.5px]',
      tBarOffset: '-top-[2px]',
    },
    sm: {
      icon: 'w-8 h-8',
      title: 'text-base',
      subtitle: 'text-[9px]',
      gap: 'gap-2',
      tBarHeight: 'h-[2px]',
      tBarOffset: '-top-[3px]',
    },
    md: {
      icon: 'w-12 h-12',
      title: 'text-2xl',
      subtitle: 'text-[11px]',
      gap: 'gap-3.5',
      tBarHeight: 'h-[3px]',
      tBarOffset: '-top-[4px]',
    },
    lg: {
      icon: 'w-18 h-18',
      title: 'text-4xl',
      subtitle: 'text-sm',
      gap: 'gap-4',
      tBarHeight: 'h-[4px]',
      tBarOffset: '-top-[5px]',
    },
    xl: {
      icon: 'w-24 h-24',
      title: 'text-5xl',
      subtitle: 'text-base',
      gap: 'gap-5',
      tBarHeight: 'h-[5px]',
      tBarOffset: '-top-[6px]',
    },
  };

  const currentSize = sizeMap[size];

  // Colors
  const textColorClass = variant === 'light' ? 'text-white' : 'text-slate-900';
  const sloganColorClass = variant === 'light' ? 'text-red-100' : 'text-slate-650';

  return (
    <div className={`flex items-center text-left ${currentSize.gap} ${className}`}>
      {/* 1. GEOMETRIC STRIPED "M" LOGO ICON */}
      <div className={`${currentSize.icon} shrink-0 transition-transform hover:scale-105 duration-300`} id="mr-tao-logo-icon">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Weave of Red Stripes */}
          {/* Left Vertical Pillars */}
          <rect x="8" y="10" width="5.5" height="80" rx="1.5" fill="#C21A1A" />
          <rect x="18" y="10" width="5.5" height="80" rx="1.5" fill="#C21A1A" />
          <rect x="28" y="10" width="5.5" height="80" rx="1.5" fill="#C21A1A" />

          {/* Right Vertical Pillars */}
          <rect x="66" y="10" width="5.5" height="80" rx="1.5" fill="#C21A1A" />
          <rect x="76" y="10" width="5.5" height="80" rx="1.5" fill="#C21A1A" />
          <rect x="86" y="10" width="5.5" height="80" rx="1.5" fill="#C21A1A" />

          {/* Diagonal Stripes (Left-to-Center down-right) */}
          {/* We use rotated rects or precise polygons to match the original herringbone slash */}
          <path
            d="M 11 11 L 52 52 L 48 56 L 7 15 Z"
            fill="#C21A1A"
          />
          <path
            d="M 21 11 L 52 42 L 48 46 L 17 15 Z"
            fill="#C21A1A"
          />
          <path
            d="M 31 11 L 52 32 L 48 36 L 27 15 Z"
            fill="#C21A1A"
          />

          {/* Diagonal Stripes (Right-to-Center down-left) */}
          <path
            d="M 89 11 L 48 52 L 52 56 L 93 15 Z"
            fill="#C21A1A"
          />
          <path
            d="M 79 11 L 48 42 L 52 46 L 83 15 Z"
            fill="#C21A1A"
          />
          <path
            d="M 69 11 L 48 32 L 52 36 L 73 15 Z"
            fill="#C21A1A"
          />

          {/* Symmetrical Intersection Ribs */}
          <path
            d="M 13.5 10 L 86.5 83 L 82.5 87 L 9.5 14 Z"
            fill="#C21A1A"
            opacity="0.85"
          />
          <path
            d="M 86.5 10 L 13.5 83 L 17.5 87 L 90.5 14 Z"
            fill="#C21A1A"
            opacity="0.85"
          />
        </svg>
      </div>

      {/* 2. BRAND TEXT & SLOGAN WORDMARK */}
      {!iconOnly && (
        <div className="flex flex-col justify-center leading-none" id="mr-tao-logo-text">
          {/* MR. TÁO TITLE */}
          <div className={`flex items-baseline font-sans font-black ${textColorClass} tracking-wide select-none`}>
            <span>Mr</span>
            <span className="mx-0.5 text-red-600 font-extrabold">.</span>
            
            {/* Styled "Táo" with custom top bar to perfectly replicate the iconic macron */}
            <span className="relative ml-0.5 inline-flex flex-col">
              {/* Custom line over T */}
              <span 
                className={`absolute left-0 ${currentSize.tBarOffset} w-[14px] ${currentSize.tBarHeight} bg-current rounded-full`}
                aria-hidden="true"
              />
              T
            </span>
            <span>áo</span>
          </div>

          {/* BRAND SLOGAN */}
          <p className={`font-sans font-medium tracking-normal ${sloganColorClass} ${currentSize.subtitle} mt-1.5 opacity-90 select-none`}>
            Bán hàng bằng cả trái tim
          </p>
        </div>
      )}
    </div>
  );
}
