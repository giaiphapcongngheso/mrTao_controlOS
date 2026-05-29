import { forwardRef, type SVGProps } from 'react';

interface CGReportIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
}

export const CGReportIcon = forwardRef<SVGSVGElement, CGReportIconProps>(
  ({ mainColor = '#1E3B70', secondColor = '#1E9DEB', className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      {/* Chart Bars */}
      <rect x="4" y="14" width="4" height="6" rx="1" fill={secondColor} />
      <rect x="10" y="10" width="4" height="10" rx="1" fill={secondColor} />
      <rect x="16" y="4" width="4" height="16" rx="1" fill={secondColor} />

      {/* Trend Line overlay */}
      <path
        d="M 2 15 L 8 9 L 14 11 L 21 4"
        fill="none"
        stroke={mainColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="4" r="2" fill={mainColor} />
    </svg>
  ),
);
CGReportIcon.displayName = 'CGReportIcon';
