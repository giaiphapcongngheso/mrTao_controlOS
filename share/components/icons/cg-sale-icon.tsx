import { forwardRef, type SVGProps } from 'react';

interface CGSaleIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
}

export const CGSaleIcon = forwardRef<SVGSVGElement, CGSaleIconProps>(
  ({ mainColor = '#1E3B70', secondColor = '#1E9DEB', className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      {/* Outer Coin Body */}
      <circle cx="12" cy="12" r="10" fill={secondColor} />

      {/* Inner Rim Detail to establish coin aesthetic */}
      <circle cx="12" cy="12" r="9.25" fill="none" stroke={mainColor} strokeWidth="1.5" />

      {/* Financial/Sale Symbol ($ sign) inside the coin */}
      <path
        d="M 12 6.5 V 17.5"
        fill="none"
        stroke={mainColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 15 9.75 C 15 7.5 9 7.5 9 9.75 C 9 12 15 12 15 14.25 C 15 16.5 9 16.5 9 14.25"
        fill="none"
        stroke={mainColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
);
CGSaleIcon.displayName = 'CGSaleIcon';
