import { forwardRef, type SVGProps } from 'react';

interface CGInstallationIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
}

export const CGInstallationIcon = forwardRef<SVGSVGElement, CGInstallationIconProps>(
  ({ mainColor = '#1E3B70', secondColor = '#1E9DEB', className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      <defs>{/* Masks can be added here if needed in the future */}</defs>

      {/* --- LEFT: BOILER TANK --- */}
      {/* Tank Body (Massive solid base) */}
      <path
        d="M 2 5 C 2 2.5 4.5 1 7 1 C 9.5 1 12 2.5 12 5 L 12 21 A 1 1 0 0 1 11 22 L 3 22 A 1 1 0 0 1 2 21 Z"
        fill={secondColor}
      />
      {/* Tank Texture/Bands */}
      <rect x="2" y="8" width="10" height="1.5" fill={mainColor} opacity="0.3" />

      {/* Internal Flame (Symbolizes the heat/energy inside the boiler) */}
      <path
        d="M 7 12 Q 9.5 15.5 9.5 17.5 A 2.5 2.5 0 1 1 4.5 17.5 Q 4.5 15.5 7 12 Z"
        fill={mainColor}
        opacity="0.9"
      />

      {/* --- TOP-RIGHT: CONNECTING PIPES --- */}
      {/* Pipe Body */}
      <path
        d="M 12 11 L 16 11 C 18 11 19 10 19 8 L 19 2"
        fill="none"
        stroke={mainColor}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Pipe Flange at Tank Junction */}
      <rect x="11" y="8.5" width="2" height="5" rx="0.5" fill={secondColor} />
      {/* Pipe Flange at Top Exit */}
      <rect x="16.5" y="1" width="5" height="2" rx="0.5" fill={secondColor} />

      {/* --- BOTTOM-RIGHT: INSTALLATION PLUS --- */}
      {/* A thick plus sign to symbolize addition / installation */}
      <g fill={secondColor}>
        <rect x="15" y="17.5" width="8" height="3" rx="0.5" />
        <rect x="17.5" y="15" width="3" height="8" rx="0.5" />
      </g>
    </svg>
  ),
);
CGInstallationIcon.displayName = 'CGInstallationIcon';
