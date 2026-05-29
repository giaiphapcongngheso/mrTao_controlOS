import { forwardRef, type SVGProps } from 'react';

interface CGLogisticsIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
}

export const CGLogisticsIcon = forwardRef<SVGSVGElement, CGLogisticsIconProps>(
  ({ mainColor = '#1E3B70', secondColor = '#1E9DEB', className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      {/* Main Truck Body with perfect wheel arches */}
      <path
        d="M2.5 5 C1.7 5 1 5.7 1 6.5 L1 16.5 L3.5 16.5 C3.5 14.5 5 13 7 13 C9 13 10.5 14.5 10.5 16.5 L13.5 16.5 C13.5 14.5 15 13 17 13 C19 13 20.5 14.5 20.5 16.5 L22 16.5 C22.6 16.5 23 16 23 15.5 L23 12 L20 8 L13 8 L13 5 L2.5 5 Z"
        fill={secondColor}
      />

      {/* Cargo Stripe Detail for accent */}
      <path d="M1 9 L13 9 L13 11.5 L1 11.5 Z" fill={mainColor} opacity="0.3" />

      {/* Windshield matched exactly to cabin slope */}
      <path d="M14.5 9 L18.5 9 L20.75 12 L14.5 12 Z" fill={mainColor} opacity="0.9" />

      {/* Wheels nestled perfectly inside the arches */}
      <circle cx="7" cy="16.5" r="2.8" fill={mainColor} />
      <circle cx="7" cy="16.5" r="1.2" fill="white" />

      <circle cx="17" cy="16.5" r="2.8" fill={mainColor} />
      <circle cx="17" cy="16.5" r="1.2" fill="white" />
    </svg>
  ),
);
CGLogisticsIcon.displayName = 'CGLogisticsIcon';
