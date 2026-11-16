import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query. Used by the layout shell to switch between
 * the desktop sidebar and the compact bottom sheet.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia(query);
    const handleChange = (event) => setMatches(event.matches);
    setMatches(media.matches);
    if (media.addEventListener) media.addEventListener('change', handleChange);
    else media.addListener(handleChange);
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', handleChange);
      } else {
        media.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

export const COMPACT_QUERY = '(max-width: 1023px)';
export const COARSE_POINTER_QUERY = '(pointer: coarse)';
