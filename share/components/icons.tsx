import { forwardRef, SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;

/**
 * Custom Import Icon - File with arrow pointing down (data coming into system)
 */
export const ImportIcon = forwardRef<SVGSVGElement, IconProps>(({ className, ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <polyline points="9 14 12 17 15 14" />
  </svg>
));
ImportIcon.displayName = 'ImportIcon';

/**
 * Custom Export Icon - File with arrow pointing up (data going out of system)
 */
export const ExportIcon = forwardRef<SVGSVGElement, IconProps>(({ className, ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="17" x2="12" y2="11" />
    <polyline points="9 14 12 11 15 14" />
  </svg>
));
ExportIcon.displayName = 'ExportIcon';

/**
 * Spinner/Loader Icon
 */
export const SpinnerIcon = forwardRef<SVGSVGElement, IconProps>(({ className, ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
));
SpinnerIcon.displayName = 'SpinnerIcon';

/**
 * Manufacturing / Production Icon - Nhà máy sản xuất
 */
export const ManufacturingIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Gear - bottom left */}
      <circle cx="9" cy="13" r="2.5" />
      <path d="M9 8v2M9 16v2M4 13h2M14 13h2M5.46 9.46l1.42 1.42M11.12 15.12l1.42 1.42M5.46 16.54l1.42-1.42M11.12 10.88l1.42-1.42" />
      {/* Wrench - top right */}
      <path d="M20.66 3.34a2.5 2.5 0 0 0-3.54 0L12 8.46l3.54 3.54 5.12-5.12a2.5 2.5 0 0 0 0-3.54z" />
      <path d="M12 8.46L9.5 11" />
    </svg>
  ),
);
ManufacturingIcon.displayName = 'ManufacturingIcon';

/**
 * Overtime / Business Trip Icon - Tăng ca / Công tác
 */
export const OvertimeBusinessTripIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <circle cx="12" cy="14" r="3" />
      <path d="M12 12v2.5l1.5 1.5" />
    </svg>
  ),
);
OvertimeBusinessTripIcon.displayName = 'OvertimeBusinessTripIcon';
