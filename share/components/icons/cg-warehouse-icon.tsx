import { forwardRef, type SVGProps } from 'react';

interface CGWarehouseIconProps extends SVGProps<SVGSVGElement> {
  mainColor?: string;
  secondColor?: string;
}

export const CGWarehouseIcon = forwardRef<SVGSVGElement, CGWarehouseIconProps>(
  ({ mainColor = '#1E3B70', secondColor = '#1E9DEB', className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      {/* Main Building Base */}
      <path d="M 2 10 L 12 5 L 22 10 L 22 22 L 2 22 Z" fill={secondColor} />

      {/* Minimalist Warehouse Outline with a large loading bay */}
      <path
        d="M 1 9 L 12 4 L 23 9 L 22 9 L 22 22 L 18 22 L 18 10 L 6 10 L 6 22 L 2 22 L 2 9 Z"
        fill={secondColor}
      />

      {/* 3 Symmetric Cargo Boxes (Pyramid Stack) */}
      <rect x="9.5" y="11" width="5" height="5" rx="0.5" fill={mainColor} />
      <rect x="6.5" y="17" width="5" height="5" rx="0.5" fill={mainColor} />
      <rect x="12.5" y="17" width="5" height="5" rx="0.5" fill={mainColor} />
    </svg>
  ),
);
CGWarehouseIcon.displayName = 'CGWarehouseIcon';
