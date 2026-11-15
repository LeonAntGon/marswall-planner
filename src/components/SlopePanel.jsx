import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { SLOPE_OVERLAY } from '../config/layers.js';
import { ASSUMPTIONS } from '../config/assumptions.js';
import { useMap } from '../context/MapContext.jsx';

const BANDS = ASSUMPTIONS.slopeBands.value;

function makeSlopeDataUrl(buffer, grid) {
  const canvas = document.createElement('canvas');
  canvas.width = grid.cols;
  canvas.height = grid.rows;
  const context = canvas.getContext('2d');
  const image = context.createImageData(grid.cols, grid.rows);
  const view = new DataView(buffer);
  const colors = BANDS.slice(1).map((band) => {
    const hex = band.color.slice(1);
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  });

  for (let index = 0; index < grid.rows * grid.cols; index += 1) {
    const value = view.getFloat32(index * 4, true);
    const offset = index * 4;
    if (!Number.isFinite(value) || value <= BANDS[0].maxDeg) continue;
    const bandIndex =
      value <= BANDS[1].maxDeg ? 0 : value <= BANDS[2].maxDeg ? 1 : 2;
    const color = colors[bandIndex];
    image.data[offset] = color[0];
    image.data[offset + 1] = color[1];
    image.data[offset + 2] = color[2];
    image.data[offset + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

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

    Promise.all([fetch(SLOPE_OVERLAY.gridUrl), fetch('/data/slope.bin')])
      .then(async ([gridResponse, slopeResponse]) => {
        if (!gridResponse.ok) {
          throw new Error(`HTTP ${gridResponse.status} for ${SLOPE_OVERLAY.gridUrl}`);
        }
        if (!slopeResponse.ok) {
          throw new Error(`HTTP ${slopeResponse.status} for /data/slope.bin`);
        }
        const data = await gridResponse.json();
        const slopeBuffer = await slopeResponse.arrayBuffer();
        if (cancelled) return;
        if (!Array.isArray(data.leafletBounds) || data.leafletBounds.length !== 2) {
          throw new Error('grid.json has no valid leafletBounds');
        }
        setGrid({ ...data, slopeDataUrl: makeSlopeDataUrl(slopeBuffer, data) });
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
    if (!map || !grid) return undefined;

    const outline = L.rectangle(grid.leafletBounds, {
      color: '#8fe3ff',
      weight: 1,
      dashArray: '5 5',
      fill: false,
      interactive: false,
    }).addTo(map);
    outline.bindTooltip('Planning area (12 x 12 km)', {
      permanent: true,
      direction: 'center',
      className: 'planning-grid-label',
    });

    if (!enabled) return () => outline.remove();

    if (!map.getPane('slopePane')) {
      const pane = map.createPane('slopePane');
      pane.style.zIndex = 300;
    }

    const overlay = L.imageOverlay(grid.slopeDataUrl, grid.leafletBounds, {
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
      outline.remove();
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
            <span className="slope-panel__unshaded">
              below 10°: not shaded
            </span>
            {BANDS.slice(1).map((band) => (
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
