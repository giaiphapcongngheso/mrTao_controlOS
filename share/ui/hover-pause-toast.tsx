import * as React from 'react';
import { toast } from 'sonner';

type HoverPauseToastProps = Readonly<{
  /** Sonner toast id/object passed into toast.custom callback */
  toastRef: unknown;
  /** Total time before auto-dismiss (ms) */
  durationMs: number;
  className?: string;
  children: (progress: number) => React.ReactNode;
}>;

/**
 * Sonner doesn't support pause-on-hover out of the box.
 * This wrapper keeps the toast open while hovering/focusing inside it,
 * and resumes the dismiss timer when the pointer leaves / focus leaves.
 */
export function HoverPauseToast({
  toastRef,
  durationMs,
  className,
  children,
}: HoverPauseToastProps) {
  const remainingMsRef = React.useRef<number>(durationMs);
  const startedAtRef = React.useRef<number | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const [progress, setProgress] = React.useState<number>(0); // 0 → mới, 1 → sắp đóng

  const clearTimer = React.useCallback(() => {
    if (timeoutRef.current != null) {
      globalThis.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const dismiss = React.useCallback(() => {
    toast.dismiss(toastRef as any);
  }, [toastRef]);

  const startTimer = React.useCallback(() => {
    clearTimer();
    startedAtRef.current = Date.now();
    timeoutRef.current = globalThis.setTimeout(() => {
      dismiss();
    }, remainingMsRef.current);
  }, [clearTimer, dismiss]);

  const pauseTimer = React.useCallback(() => {
    if (startedAtRef.current != null) {
      const elapsed = Date.now() - startedAtRef.current;
      remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
    }
    startedAtRef.current = null;
    clearTimer();
  }, [clearTimer]);

  const resumeTimer = React.useCallback(() => {
    if (remainingMsRef.current <= 0) {
      dismiss();
      return;
    }
    startTimer();
  }, [dismiss, startTimer]);

  React.useEffect(() => {
    startTimer();
    return () => {
      clearTimer();
    };
  }, [clearTimer, startTimer]);

  // Progress bar animation (đếm ngược)
  React.useEffect(() => {
    let frameId: number;

    const update = () => {
      let remaining = remainingMsRef.current;
      if (startedAtRef.current !== null) {
        remaining = Math.max(0, remainingMsRef.current - (Date.now() - startedAtRef.current));
      }

      let nextProgress = 1;
      if (durationMs > 0) {
        nextProgress = Math.min(1, Math.max(0, 1 - remaining / durationMs));
      }

      setProgress(nextProgress);

      if (remaining > 0) {
        frameId = globalThis.requestAnimationFrame(update);
      }
    };

    frameId = globalThis.requestAnimationFrame(update);

    return () => {
      if (frameId) {
        globalThis.cancelAnimationFrame(frameId);
      }
    };
  }, [durationMs]);

  return (
    <fieldset
      className={className}
      style={{ border: 0, margin: 0, padding: 0 }}
      tabIndex={-1}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onTouchStart={pauseTimer}
      onTouchEnd={resumeTimer}
      onFocusCapture={pauseTimer}
      onBlurCapture={resumeTimer}
    >
      {children(progress)}
    </fieldset>
  );
}
