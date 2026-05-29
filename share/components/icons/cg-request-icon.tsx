import { forwardRef, type SVGProps } from 'react';

interface CGRequestIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
}

export const CGRequestIcon = forwardRef<SVGSVGElement, CGRequestIconProps>(
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
      {/* Form Lines */}
      <rect x="8" y="10" width="8" height="2" rx="1" fill={mainColor} />
      <rect x="8" y="14" width="5" height="2" rx="1" fill={mainColor} />

      {/* Support/Request Chat Bubble placed dynamically over the document */}
      <ellipse cx="15" cy="17" rx="6" ry="5" fill={mainColor} />
      <path d="M 18.5 19.5 L 21 22.5 L 15.5 21" fill={mainColor} />

      {/* Help / Request Question Mark inside the bubble */}
      <path
        d="M 14 14.6 C 14 13.2 16 13.2 16 14.6 C 16 15.8 15 16.2 15 17.2"
        fill="none"
        stroke={secondColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="15" cy="19.2" r="0.9" fill={secondColor} />
    </svg>
  ),
);
CGRequestIcon.displayName = 'CGRequestIcon';
