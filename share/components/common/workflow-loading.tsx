import { cn } from '../../lib/utils';
import * as ReactDOM from 'react-dom';

type WorkflowLoadingProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  overlay?: boolean;
  fullScreen?: boolean;
};

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export function WorkflowLoading({
  className,
  size = 'md',
  overlay = false,
  fullScreen = false,
}: WorkflowLoadingProps) {
  const pixelSize = typeof size === 'number' ? size : sizeMap[size];

  const spinner = (
    <div className={cn('flex items-center justify-center', className)}>
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient for first V - Blue */}
          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#367EA6" />
            <stop offset="100%" stopColor="#367EA6" />
          </linearGradient>

          {/* Gradient for second V - Green */}
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#65A96A" />
            <stop offset="100%" stopColor="#65A96A" />
          </linearGradient>

          {/* Gradient for spinning circle */}
          <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#367EA6" />
            <stop offset="50%" stopColor="#65A96A" />
            <stop offset="100%" stopColor="#367EA6" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Spinning circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="url(#circleGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="200 83"
          className="animate-spin-circle"
        />

        {/* Background W shape - light gray */}
        <path
          d="M27 32 L36 68 L50 48 L64 68 L73 32"
          stroke="#e5e7eb"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* First V - Blue animated stroke */}
        <path
          d="M27 32 L36 68 L50 48"
          stroke="url(#blueGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="100"
          strokeDashoffset="100"
          className="animate-draw-first-v"
        />

        {/* Second V - Green animated stroke */}
        <path
          d="M50 48 L64 68 L73 32"
          stroke="url(#greenGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="100"
          strokeDashoffset="100"
          className="animate-draw-second-v"
        />

        <style>
          {`
            @keyframes drawFirstV {
              0% {
                stroke-dashoffset: 100;
              }
              50% {
                stroke-dashoffset: 0;
              }
              100% {
                stroke-dashoffset: 0;
              }
            }

            @keyframes drawSecondV {
              0% {
                stroke-dashoffset: 100;
              }
              50% {
                stroke-dashoffset: 100;
              }
              100% {
                stroke-dashoffset: 0;
              }
            }

            @keyframes spinCircle {
              0% {
                transform: rotate(0deg);
                transform-origin: center;
              }
              100% {
                transform: rotate(360deg);
                transform-origin: center;
              }
            }

            .animate-draw-first-v {
              animation: drawFirstV 2s ease-in-out infinite;
            }

            .animate-draw-second-v {
              animation: drawSecondV 2s ease-in-out infinite;
            }

            .animate-spin-circle {
              animation: spinCircle 1.5s linear infinite;
            }
          `}
        </style>
      </svg>
    </div>
  );

  if (overlay || fullScreen) {
    const loadingOverlay = (
      <div
        className={cn(
          'flex items-center justify-center bg-black/10',
          fullScreen ? 'fixed inset-0 z-[2147483647]' : 'absolute inset-0 z-[999999]',
        )}
        style={
          fullScreen ? { zIndex: 2147483647 } : { zIndex: 999999, position: 'absolute' as const }
        }
      >
        {spinner}
      </div>
    );

    // Nếu là fullScreen hoặc overlay, render vào Portal để đảm bảo luôn ở trên cùng
    if ((fullScreen || overlay) && typeof document !== 'undefined') {
      return ReactDOM.createPortal(loadingOverlay, document.body);
    }

    return loadingOverlay;
  }

  return spinner;
}
