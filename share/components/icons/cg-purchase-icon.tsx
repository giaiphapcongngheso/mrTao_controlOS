import { forwardRef, type SVGProps } from 'react';

interface CGPurchaseIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
}

export const CGPurchaseIcon = forwardRef<SVGSVGElement, CGPurchaseIconProps>(
  ({ mainColor = '#1E3B70', secondColor = '#1E9DEB', className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      {/* Cart Basket */}
      <path d="M 7 7 L 21 7 L 18.5 15 L 8 15 Z" fill={secondColor} />

      {/* Cart Handle/Chassis */}
      <path
        d="M 2 3 L 5 3 L 7 7 L 8.5 15"
        fill="none"
        stroke={mainColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Cart Wheels */}
      <circle cx="10" cy="19" r="2.5" fill={mainColor} />
      <circle cx="17" cy="19" r="2.5" fill={mainColor} />
    </svg>
  ),
);
CGPurchaseIcon.displayName = 'CGPurchaseIcon';
