import { useState, useEffect, useCallback } from 'react';

/**
 * Shared hook to detect mobile viewport.
 * Extracted from NotificationsView and notification-bell to avoid duplication.
 *
 * @param breakpoint - Max width in pixels to consider as mobile (default: 768)
 * @returns true when viewport is at or below the breakpoint
 */
export function useIsMobile(breakpoint = 768): boolean {
  const query = `(max-width: ${breakpoint}px)`;

  const getMatches = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handleChange = () => {
      setMatches(mediaQuery.matches);
    };

    // Set initial value
    handleChange();

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}
