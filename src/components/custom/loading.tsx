import { cn } from '@/lib/utils';
import * as ReactDOM from 'react-dom';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  overlay?: boolean;
  fullScreen?: boolean;
  label?: string;
  /** Khi true, chỉ render spinner (và label) trong layout inline, không dùng absolute → dùng trong FullScreenLoading để message không bị đè */
  inline?: boolean;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export function Loading({
  size = 'md',
  className,
  overlay = false,
  fullScreen = false,
  label,
  inline = false,
}: LoadingProps) {
  const spinnerContent = (
    <>
      <div className={cn('relative', sizeMap[size])}>
        <div className="w-full h-full rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
      {label && <span className={cn('text-sm text-primary', className)}>{label}</span>}
    </>
  );

  const spinner = inline ? (
    <div className="flex flex-col items-center justify-center gap-2">{spinnerContent}</div>
  ) : (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-[999999]">
      {spinnerContent}
    </div>
  );

  if (overlay || fullScreen) {
    const loadingOverlay = (
      <div
        className={cn(
          'flex items-center justify-center bg-black/10 relative',
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
