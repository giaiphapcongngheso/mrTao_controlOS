import { useEffect, useRef, useState } from 'react';

/**
 * Ensures a loading indicator stays visible for at least `minDurationMs`
 * milliseconds to prevent distracting UI flicker on fast connections.
 *
 * @param isLoading - The *actual* loading state from data fetching.
 * @param minDurationMs - Minimum display time in ms (default `0` = no minimum).
 * @returns A derived boolean that remains `true` until `minDurationMs` has elapsed
 *          **and** the real loading state has become `false`.
 */
export function useMinimumLoading(isLoading: boolean, minDurationMs = 0): boolean {
  const [display, setDisplay] = useState(isLoading);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Loading just started – record timestamp and show indicator.
      startRef.current = Date.now();
      setDisplay(true);

      // Cancel any pending hide-timer from a previous cycle.
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } else if (startRef.current !== null) {
      // Loading finished – keep showing for the remainder of minDurationMs.
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, minDurationMs - elapsed);

      if (remaining === 0) {
        setDisplay(false);
        startRef.current = null;
      } else {
        timerRef.current = setTimeout(() => {
          setDisplay(false);
          startRef.current = null;
          timerRef.current = null;
        }, remaining);
      }
    } else {
      // Not loading and no start recorded – ensure display is off.
      setDisplay(false);
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading, minDurationMs]);

  return display;
}
