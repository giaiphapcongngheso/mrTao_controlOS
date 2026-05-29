import { forwardRef, type SVGProps } from 'react';

interface CGFactoryIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
  size?: number | string;
}

export const CGFactoryIcon = forwardRef<SVGSVGElement, CGFactoryIconProps>(
  ({ mainColor = '#1E3B70', secondColor = '#1E9DEB', size = 24, className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Smoke Cloud */}
      <g fill={mainColor}>
        <path d="M6.5 11 Q7 8 10 6.5 L11 8.5 Q8.5 9 8 11 Z" />
        <circle cx="10" cy="5" r="2.5" />
        <circle cx="14" cy="4" r="3.5" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="19.5" cy="8.5" r="2.2" />
        <circle cx="16" cy="9.5" r="2.5" />
        <circle cx="12" cy="8.5" r="2.5" />
        <circle cx="14" cy="7" r="3" />
        <circle cx="17" cy="7.5" r="2" />
      </g>

      {/* Factory Base, Smokestack, and Building */}
      <path
        fill={secondColor}
        d="
          M2 20.5 L22 20.5 L22 22 L2 22 Z 
          M4 20.5 L5 11 L8 11 L9 20.5 Z
          M8 13 L20.5 13 L20.5 20.5 L8 20.5 Z
          M12 14.25 L12 16.25 L14.5 16.25 L14.5 14.25 Z 
          M16 14.25 L16 16.25 L18.5 16.25 L18.5 14.25 Z 
          M12 17.25 L12 19.25 L14.5 19.25 L14.5 17.25 Z 
          M16 17.25 L16 19.25 L18.5 19.25 L18.5 17.25 Z
        "
      />
    </svg>
  ),
);
CGFactoryIcon.displayName = 'CGFactoryIcon';
