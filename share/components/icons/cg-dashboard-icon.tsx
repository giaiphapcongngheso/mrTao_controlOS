import { forwardRef, type SVGProps } from 'react';

interface CGDashboardIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
}

export const CGDashboardIcon = forwardRef<SVGSVGElement, CGDashboardIconProps>(
  ({ mainColor = '#1E3B70', secondColor = '#1E9DEB', className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      {/* Top Left Widget */}
      <rect x="3" y="3" width="8" height="8" rx="2" fill={secondColor} />

      {/* Bottom Left Widget */}
      <rect x="3" y="13" width="8" height="8" rx="2" fill={mainColor} />

      {/* Top Right Widget (Taller to create layout asymmetry) */}
      <rect x="13" y="3" width="8" height="12" rx="2" fill={mainColor} />

      {/* Bottom Right Widget (Shorter) */}
      <rect x="13" y="17" width="8" height="4" rx="1.5" fill={secondColor} />
    </svg>
  ),
);
CGDashboardIcon.displayName = 'CGDashboardIcon';
