import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LANDING_MARKER_STYLE, LAYERS, MAP_VIEW } from '../config/layers.js';
import { LANDING_SITE } from '../lib/marsGeo.js';
import { useMap } from '../context/MapContext.jsx';
import { useRoute } from '../context/RouteContext.jsx';

const warnedMissingUrl = new Set();
const warnedTileError = new Set();
const COVERAGE_NOTE = 'Jezero detail layers only cover the crater area.';

export default function MapView() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const { setMap } = useMap();
  const { gridData } = useRoute();
  const [mapGrid, setMapGrid] = useState(null);
  const [status, setStatus] = useState([]);
  const [overview, setOverview] = useState(false);
  const viewRef = useRef(null);

  // Keep the first loaded grid object. RouteContext re-renders when stops,
  // routes or walkback state change; none of those may recreate the map.
  useEffect(() => {
    if (gridData && !mapGrid) setMapGrid(gridData);
  }, [gridData, mapGrid]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !mapGrid || mapRef.current) return undefined;

    let disposed = false;
    let rafId = 0;

    const { west, south, east, north } = mapGrid.grid.bounds;
    const padLon = (east - west) * 0.3;
    const padLat = (north - south) * 0.3;
    const gridBounds = L.latLngBounds([
      [south, west],
      [north, east],
    ]);
    const paddedBounds = L.latLngBounds([
      [south - padLat, west - padLon],
      [north + padLat, east + padLon],
    ]);
    const worldBounds = L.latLngBounds([
      [-85, -180],
      [85, 180],
    ]);

    const map = L.map(container, {
      center: [(south + north) / 2, (west + east) / 2],
      zoom: MAP_VIEW.zoom,
      minZoom: MAP_VIEW.minZoom,
      maxBounds: paddedBounds,
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;
    map.setMaxBounds(paddedBounds);

    // Keep the F2 slope image above the base tiles but below the place-name
    // labels. Marker and controls remain above both.
    map.createPane('slopePane');
    map.getPane('slopePane').style.zIndex = 300;
    map.createPane('labelsPane');
    map.getPane('labelsPane').style.zIndex = 350;

    const layerStates = new Map();

    const publishStatus = () => {
      if (disposed) return;
      const rows = [];
      for (const state of layerStates.values()) {
        if (map.hasLayer(state.layer)) {
          rows.push({
            id: state.def.id,
            label: state.def.label,
            errors: state.errors,
          });
        }
      }
      setStatus(rows);
    };

    map.on('layeradd layerremove', publishStatus);
    map.on('baselayerchange', () => {
      // A newly selected base layer is appended after the label overlay.
      // Bring the overlay back to the front so place names stay visible.
      for (const state of layerStates.values()) {
        if (state.def.kind === 'overlay' && map.hasLayer(state.layer)) {
          state.layer.bringToFront();
        }
      }
      publishStatus();
    });

    const baseLayers = {};
    const overlays = {};

    for (const def of LAYERS) {
      if (!def.url) {
        if (!warnedMissingUrl.has(def.id)) {
          warnedMissingUrl.add(def.id);
          console.warn(
            `[MapView] Layer "${def.label}" skipped: no tile URL configured.`
          );
        }
        continue;
      }

      const layer = L.tileLayer(def.url, {
        ...def.options,
        noWrap: true,
        attribution: def.attribution,
      });
      const state = { def, layer, errors: 0 };
      layerStates.set(def.id, state);

      layer.on('tileerror', (event) => {
        state.errors += 1;
        const failingUrl = event.tile?.src || def.url;
        if (!warnedTileError.has(def.id)) {
          warnedTileError.add(def.id);
          console.warn(
            `[MapView] Tile error on "${def.label}" (first failing tile: ${failingUrl})`
          );
        }
        publishStatus();
      });

      if (def.kind === 'base') {
        baseLayers[def.label] = layer;
        if (def.default) layer.addTo(map);
      } else {
        overlays[def.label] = layer;
        if (def.default) layer.addTo(map);
      }
    }

    L.control
      .layers(baseLayers, overlays, {
        position: 'topright',
        collapsed: false,
      })
      .addTo(map);

    L.circleMarker([LANDING_SITE.lat, LANDING_SITE.lon], LANDING_MARKER_STYLE)
      .addTo(map)
      .bindPopup('Octavia E. Butler Landing (Perseverance, Mars 2020)');

    let overviewActive = false;

    const updateMinZoom = () => {
      if (overviewActive) return;
      // Leaflet's zoom control uses integer steps. Floor guarantees that the
      // whole padded area fits at the minimum integer zoom, without allowing a
      // planet-wide view.
      const minZoom = Math.floor(map.getBoundsZoom(paddedBounds));
      map.setMinZoom(minZoom);
      if (map.getZoom() < minZoom) map.setZoom(minZoom);
    };

    const enterOverview = () => {
      overviewActive = true;
      setOverview(true);
      map.setMaxBounds(worldBounds);
      map.setMinZoom(2);
      map.fitBounds(worldBounds, { animate: false });
    };

    const leaveOverview = () => {
      overviewActive = false;
      setOverview(false);
      map.setMaxBounds(paddedBounds);
      map.fitBounds(gridBounds, {
        padding: [20, 20],
        animate: false,
      });
      updateMinZoom();
    };

    viewRef.current = { enterOverview, leaveOverview };
    map.on('resize', updateMinZoom);
    rafId = requestAnimationFrame(() => {
      if (disposed) return;
      map.invalidateSize();
      map.fitBounds(gridBounds, {
        padding: [20, 20],
        animate: false,
      });
      updateMinZoom();
    });

    publishStatus();
    setMap(map);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      map.off('resize', updateMinZoom);
      map.remove();
      mapRef.current = null;
      viewRef.current = null;
      setMap(null);
    };
  }, [mapGrid, setMap]);

  const showCoverageNote = status.some((row) => row.id.startsWith('m20-'));

  return (
    <div className="map-wrap">
      <div
        ref={containerRef}
        className="map"
        role="application"
        aria-label="Interactive map of Jezero Crater"
      />
      <button
        type="button"
        className={`map-overview-toggle${overview ? ' is-active' : ''}`}
        onClick={() => {
          if (!viewRef.current) return;
          if (overview) viewRef.current.leaveOverview();
          else viewRef.current.enterOverview();
        }}
        disabled={!mapGrid}
        aria-pressed={overview}
        title={
          overview
            ? 'Return to the Jezero grid view'
            : 'Planet-wide OPM/MOLA overview; select the OPM basemap for global context'
        }
      >
        {overview ? 'Back to Jezero' : 'Global overview'}
      </button>
      <aside className="tile-status" aria-live="polite">
        <div className="tile-status__title">Tile status</div>
        {status.length === 0 ? (
          <div className="tile-status__empty">No active tile layers</div>
        ) : (
          status.map((row) => (
            <div className="tile-status__row" key={row.id}>
              <span className="tile-status__label" title={row.label}>
                {row.label}
              </span>
              <span
                className={
                  row.errors === 0 ? 'tile-status__ok' : 'tile-status__bad'
                }
              >
                {row.errors === 0
                  ? 'ok'
                  : `${row.errors} tile error${row.errors === 1 ? '' : 's'}`}
              </span>
            </div>
          ))
        )}
        {showCoverageNote && (
          <div className="tile-status__note">{COVERAGE_NOTE}</div>
        )}
      </aside>
    </div>
  );
}
