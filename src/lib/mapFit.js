import { COMPACT_QUERY } from './useMediaQuery.js';

/**
 * Padding for Leaflet fitBounds that keeps the grid or route clear of the
 * planner sidebar / bottom sheet and the layers card. Values are read from the
 * live DOM so a collapsed sidebar or a different sheet detent is respected.
 */
export function getMapFitPadding(map) {
  const container = map?.getContainer?.();
  if (!container) {
    return { paddingTopLeft: [16, 16], paddingBottomRight: [16, 16] };
  }

  const compact =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(COMPACT_QUERY).matches;
  const shell = container.closest('.map-shell');

  if (compact) {
    const sheet = shell?.querySelector('.planner-sheet');
    const sheetHeight = sheet ? sheet.getBoundingClientRect().height : 64;
    const bottom = Math.min(Math.max(sheetHeight, 64), 96) + 16;
    return { paddingTopLeft: [16, 16], paddingBottomRight: [16, bottom] };
  }

  const sidebar = shell?.querySelector('.app-sidebar');
  const layers = shell?.querySelector('.map-layers-card');
  const left =
    sidebar && !sidebar.classList.contains('is-collapsed')
      ? sidebar.getBoundingClientRect().width + 24
      : 24;
  const right =
    layers && !layers.classList.contains('is-collapsed')
      ? layers.getBoundingClientRect().width + 24
      : 24;
  return { paddingTopLeft: [left, 16], paddingBottomRight: [right, 24] };
}

/** Fit a Leaflet map to bounds while respecting the current overlay chrome. */
export function fitMapBounds(map, bounds, { maxZoom = 14 } = {}) {
  if (!map || !bounds) return;
  map.fitBounds(bounds, {
    ...getMapFitPadding(map),
    maxZoom,
    animate: false,
  });
}
