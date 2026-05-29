import { forwardRef, type SVGProps } from 'react';

interface CGQaQcIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
}

export const CGQaQcIcon = forwardRef<SVGSVGElement, CGQaQcIconProps>(
  ({ mainColor = '#1E3B70', secondColor = '#1E9DEB', className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      {/* Wide background Ribbon */}
      <path d="M6.5 12v10.5l5.5-3 5.5 3V12h-11z" fill={mainColor} opacity="0.3" />

      {/* Foreground Ribbon */}
      <path d="M8 12v8.5l4-2.2 4 2.2V12H8z" fill={mainColor} opacity="0.9" />

      {/* Badge Outer Ring */}
      <circle cx="12" cy="9" r="7.5" fill={secondColor} />

      {/* Badge Stitching Effect */}
      <circle
        cx="12"
        cy="9"
        r="6.2"
        fill="none"
        stroke="white"
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.6"
      />

      {/* Badge Inner Solid Ring */}
      <circle cx="12" cy="9" r="4.8" fill={mainColor} opacity="0.95" />

      {/* Centered Checkmark */}
      <path d="M11 11.8L8 8.8l1-1 2 2 4-4 1 1z" fill="white" />
    </svg>
  ),
);
CGQaQcIcon.displayName = 'CGQaQcIcon';
