import { forwardRef, type SVGProps } from 'react';

interface CGTimesheetIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
}

export const CGTimesheetIcon = forwardRef<SVGSVGElement, CGTimesheetIconProps>(
  ({ mainColor = '#1E3B70', secondColor = '#1E9DEB', className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      {/* Document Base */}
      <path
        d="M 6 2 C 4.9 2 4 2.9 4 4 L 4 20 C 4 21.1 4.9 22 6 22 L 18 22 C 19.1 22 20 21.1 20 20 L 20 8 L 14 2 Z"
        fill={secondColor}
      />

      {/* Folded Corner */}
      <path d="M 14 2 L 14 7 C 14 7.6 14.4 8 15 8 L 20 8 Z" fill={mainColor} />

      {/* Clock Face (representing Time/Labor) */}
      <circle cx="12" cy="14" r="4.5" fill={mainColor} />

      {/* Clock Hands */}
      <path
        d="M 12 11.5 V 14.5 L 14 16"
        fill="none"
        stroke={secondColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
);
CGTimesheetIcon.displayName = 'CGTimesheetIcon';
