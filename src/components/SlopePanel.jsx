import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { SLOPE_OVERLAY } from '../config/layers.js';
import { ASSUMPTIONS } from '../config/assumptions.js';
import { useMap } from '../context/MapContext.jsx';

const BANDS = ASSUMPTIONS.slopeBands.value;

export default function SlopePanel() {
  const { map } = useMap();
  const overlayRef = useRef(null);
  const opacityRef = useRef(SLOPE_OVERLAY.defaultOpacity);
  const [grid, setGrid] = useState(null);
  const [enabled, setEnabled] = useState(true);
  const [opacity, setOpacity] = useState(SLOPE_OVERLAY.defaultOpacity);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    fetch(SLOPE_OVERLAY.gridUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status} for ${SLOPE_OVERLAY.gridUrl}`
          );
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data.leafletBounds) || data.leafletBounds.length !== 2) {
          throw new Error('grid.json has no valid leafletBounds');
        }
        setGrid(data);
        setStatus('ready');
      })
      .catch((fetchError) => {
        if (cancelled) return;
        console.warn(`[SlopePanel] ${fetchError.message}`);
        setError('Slope data unavailable. Run preprocess/02_slope.py.');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    opacityRef.current = opacity;
    if (overlayRef.current) {
      overlayRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  useEffect(() => {
    if (!map || !grid || !enabled) return undefined;

    if (!map.getPane('slopePane')) {
      const pane = map.createPane('slopePane');
      pane.style.zIndex = 300;
    }

    const overlay = L.imageOverlay(SLOPE_OVERLAY.url, grid.leafletBounds, {
      pane: 'slopePane',
      opacity: opacityRef.current,
      interactive: false,
      className: 'slope-overlay',
    });

    const handleError = () => {
      console.warn(`[SlopePanel] Could not load ${SLOPE_OVERLAY.url}`);
      setError('Slope image unavailable. Run preprocess/02_slope.py.');
      setStatus('error');
      overlay.remove();
      if (overlayRef.current === overlay) overlayRef.current = null;
    };

    overlay.on('error', handleError);
    overlay.addTo(map);
    overlayRef.current = overlay;

    return () => {
      overlay.off('error', handleError);
      overlay.remove();
      if (overlayRef.current === overlay) overlayRef.current = null;
    };
  }, [map, grid, enabled]);

  const stats = grid?.stats;

  return (
    <aside className="slope-panel" aria-label="Slope layer controls">
      <div className="slope-panel__title">Slope</div>
      {status === 'loading' && (
        <div className="slope-panel__muted">Loading slope data...</div>
      )}
      {status === 'error' && <div className="slope-panel__error">{error}</div>}
      {status === 'ready' && grid && (
        <>
          <label className="slope-panel__toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            <span>Show slope (20 m)</span>
          </label>
          <label className="slope-panel__opacity">
            <span>Opacity</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
            <span>{Math.round(opacity * 100)}%</span>
          </label>
          <div className="slope-panel__legend">
            {BANDS.map((band) => (
              <span className="slope-panel__legend-item" key={band.label}>
                <span
                  className="slope-panel__swatch"
                  style={{ backgroundColor: band.color }}
                />
                {band.label}
              </span>
            ))}
          </div>
          {stats && (
            <div className="slope-panel__stats">
              Max {stats.slopeMaxDeg}° · {stats.percentAbove30}% above 30°
            </div>
          )}
          <div className="slope-panel__source">
            D1 CTX DTM · 20 m baseline
          </div>
        </>
      )}
    </aside>
  );
}
