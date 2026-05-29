import { forwardRef, type SVGProps } from 'react';

interface CGMaintenanceIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
}

export const CGMaintenanceIcon = forwardRef<SVGSVGElement, CGMaintenanceIconProps>(
  ({ mainColor = '#1E3B70', secondColor = '#1E9DEB', className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      <defs>
        {/* Mask to cut a gap in the gear around the wrench */}
        <mask id="cg-gear-gap-mask">
          <rect x="-10" y="-10" width="44" height="44" fill="white" />
          <g transform="rotate(-45 12 12)">
            {/* Expanded wrench shape to create a 1.5px transparent gap */}
            <circle cx="5" cy="12" r="6" fill="black" />
            <circle cx="19" cy="12" r="6" fill="black" />
            <rect x="5" y="8" width="14" height="8" fill="black" />
          </g>
        </mask>

        {/* Mask to cut the U-shapes into the wrench heads */}
        <mask id="cg-wrench-u-mask">
          <rect x="-10" y="-10" width="44" height="44" fill="white" />
          <rect x="-1" y="10.5" width="6" height="3" rx="1.5" fill="black" />
          <rect x="19" y="10.5" width="6" height="3" rx="1.5" fill="black" />
        </mask>
      </defs>

      {/* Background Gear */}
      <g mask="url(#cg-gear-gap-mask)" fill={mainColor}>
        {/* Thick Gear Donut */}
        <path
          d="M 12 3 a 9 9 0 1 0 0 18 a 9 9 0 1 0 0 -18 M 12 6.5 a 5.5 5.5 0 1 1 0 11 a 5.5 5.5 0 1 1 0 -11"
          fillRule="evenodd"
        />

        {/* Thick rounded teeth */}
        <rect x="10" y="1" width="4" height="22" rx="1" />
        <rect x="10" y="1" width="4" height="22" rx="1" transform="rotate(45 12 12)" />
        <rect x="10" y="1" width="4" height="22" rx="1" transform="rotate(90 12 12)" />
        <rect x="10" y="1" width="4" height="22" rx="1" transform="rotate(135 12 12)" />
      </g>

      {/* Foreground Wrench */}
      <g mask="url(#cg-wrench-u-mask)" transform="rotate(-45 12 12)" fill={secondColor}>
        {/* Left Head */}
        <circle cx="5" cy="12" r="4.5" />
        {/* Right Head */}
        <circle cx="19" cy="12" r="4.5" />
        {/* Thick Shaft */}
        <rect x="5" y="9.5" width="14" height="5" />
      </g>
    </svg>
  ),
);
CGMaintenanceIcon.displayName = 'CGMaintenanceIcon';
