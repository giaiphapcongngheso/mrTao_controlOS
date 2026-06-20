import { useState, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
}

/**
 * Shared hook for pull-to-refresh gesture on mobile.
 * Attach returned handlers + styles to the scroll container.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
}: UsePullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const scrollTopRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    // Capture scroll position
    const target = e.currentTarget;
    scrollTopRef.current = target.scrollTop;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null || refreshing) return;
      // Only activate when scrolled to top
      if (scrollTopRef.current > 0) return;

      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) {
        setPulling(true);
        setPullDistance(Math.min(dy * 0.5, threshold * 1.5)); // damping
      }
    },
    [refreshing, threshold],
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(false);
    setPullDistance(0);
    touchStartY.current = null;
  }, [pullDistance, threshold, refreshing, onRefresh]);

  const indicatorStyle: React.CSSProperties = {
    transform: `translateY(${pulling || refreshing ? pullDistance : 0}px)`,
    transition: pulling ? 'none' : 'transform 0.3s ease-out',
  };

  const progress = Math.min(pullDistance / threshold, 1);

  return {
    pulling,
    refreshing,
    pullDistance,
    progress,
    indicatorStyle,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
