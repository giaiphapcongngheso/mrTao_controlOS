import { useRef, useCallback } from 'react';

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

/**
 * Shared hook for detecting swipe gestures on touch devices.
 * Returns ref and touch event handlers to attach to the target element.
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
}: UseSwipeOptions) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const elapsed = Date.now() - touchStartRef.current.time;

      // Only count fast swipes (< 500ms)
      if (elapsed > 500) {
        touchStartRef.current = null;
        return;
      }

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > absDy && absDx >= threshold) {
        if (dx > 0) onSwipeRight?.();
        else onSwipeLeft?.();
      } else if (absDy > absDx && absDy >= threshold) {
        if (dy > 0) onSwipeDown?.();
        else onSwipeUp?.();
      }

      touchStartRef.current = null;
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold],
  );

  return { onTouchStart: handleTouchStart, onTouchEnd: handleTouchEnd };
}
