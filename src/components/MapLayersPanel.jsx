import { useEffect, useState } from 'react';
import { useMap } from '../context/MapContext.jsx';
import { COMPACT_QUERY, useMediaQuery } from '../lib/useMediaQuery.js';
import SlopePanel from './SlopePanel.jsx';
import TraverseLayer from './TraverseLayer.jsx';

export default function MapLayersPanel() {
  const { map, layers } = useMap();
  const isCompact = useMediaQuery(COMPACT_QUERY);
  const isNarrowDesktop = useMediaQuery('(max-width: 1100px)');
  const [collapsed, setCollapsed] = useState(isCompact || isNarrowDesktop);
  const [selectedBase, setSelectedBase] = useState('Jezero HiRISE color (25 cm)');
  const [placeNames, setPlaceNames] = useState(false);

  const baseEntries = layers ? Object.entries(layers.baseLayers) : [];
  const placeNamesLayer = layers?.overlays?.['M20 place names'];

  useEffect(() => {
    setCollapsed(isCompact || isNarrowDesktop);
  }, [isCompact, isNarrowDesktop]);

  // The fallback layer is not a selectable base. Ensure the declared default
  // base is actually attached once the map-layer registry is ready.
  useEffect(() => {
    if (!map || !layers) return;
    const layer = layers.baseLayers[selectedBase];
    if (layer && !map.hasLayer(layer)) map.addLayer(layer);
  }, [map, layers, selectedBase]);

  const selectBase = (label) => {
    if (!map || !layers) return;
    for (const [name, layer] of baseEntries) {
      if (name === label) map.addLayer(layer);
      else map.removeLayer(layer);
    }
    setSelectedBase(label);
  };

  const togglePlaceNames = (event) => {
    const checked = event.target.checked;
    if (map && placeNamesLayer) {
      if (checked) map.addLayer(placeNamesLayer);
      else map.removeLayer(placeNamesLayer);
    }
    setPlaceNames(checked);
  };

  return (
    <aside className={`map-layers-card${collapsed ? ' is-collapsed' : ''}`}>
      <button
        type="button"
        className="map-layers-card__header"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
      >
        <span>Map layers</span>
        <span aria-hidden="true">{collapsed ? '+' : '−'}</span>
      </button>
      {!collapsed && (
        <div className="map-layers-card__body">
          <fieldset className="map-layers-card__bases">
            <legend>Basemap</legend>
            {baseEntries.map(([label, layer]) => (
              <label key={label}>
                <input
                  type="radio"
                  name="mars-basemap"
                  checked={map?.hasLayer(layer) || selectedBase === label}
                  onChange={() => selectBase(label)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label className="map-layers-card__place-names">
            <input
              type="checkbox"
              checked={placeNames}
              onChange={togglePlaceNames}
            />
            M20 place names
          </label>
          <SlopePanel />
          <TraverseLayer />
        </div>
      )}
    </aside>
  );
}
