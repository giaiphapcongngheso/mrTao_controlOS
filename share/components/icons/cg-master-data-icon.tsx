import { forwardRef, type SVGProps } from 'react';

interface CGMasterDataIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
}

export const CGMasterDataIcon = forwardRef<SVGSVGElement, CGMasterDataIconProps>(
  ({ mainColor = '#1E3B70', secondColor = '#1E9DEB', className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      {/* Bottom Tier */}
      <path
        d="M3 16.5v3.5c0 1.93 4.03 3.5 9 3.5s9-1.57 9-3.5v-3.5c0 1.93-4.03 3.5-9 3.5s-9-1.57-9-3.5z"
        fill={mainColor}
        opacity="0.3"
      />
      {/* Middle Tier */}
      <path
        d="M3 11v3.5c0 1.93 4.03 3.5 9 3.5s9-1.57 9-3.5V11c0 1.93-4.03 3.5-9 3.5S3 12.93 3 11z"
        fill={mainColor}
        opacity="0.6"
      />
      {/* Top Tier Body */}
      <path
        d="M3 5.5v3.5C3 10.93 7.03 12.5 12 12.5s9-1.57 9-3.5V5.5C21 7.43 16.97 9 12 9S3 7.43 3 5.5z"
        fill={mainColor}
        opacity="0.9"
      />
      {/* Top Tier Surface */}
      <ellipse cx="12" cy="5.5" rx="9" ry="3.5" fill={secondColor} />

      {/* Central Sparkle (Master/Primary indicator) */}
      <path
        d="M12 2.5 L12.7 4.8 L15 5.5 L12.7 6.2 L12 8.5 L11.3 6.2 L9 5.5 L11.3 4.8 Z"
        fill="white"
        opacity="0.9"
      />

      {/* Small Left Sparkle */}
      <path
        d="M7.5 3 L7.8 4.2 L9 4.5 L7.8 4.8 L7.5 6 L7.2 4.8 L6 4.5 L7.2 4.2 Z"
        fill="white"
        opacity="0.7"
      />

      {/* Small Right Sparkle */}
      <path
        d="M16.5 5.5 L16.7 6.3 L17.5 6.5 L16.7 6.7 L16.5 7.5 L16.3 6.7 L15.5 6.5 L16.3 6.3 Z"
        fill="white"
        opacity="0.6"
      />
    </svg>
  ),
);
CGMasterDataIcon.displayName = 'CGMasterDataIcon';
