import { useEffect, useState } from 'react';
import L from 'leaflet';
import { TRAVERSE_URL } from '../config/presets.js';
import { useMap } from '../context/MapContext.jsx';

export default function TraverseLayer() {
  const { map } = useMap();
  const [data, setData] = useState(null);
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(TRAVERSE_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${TRAVERSE_URL}`);
        }
        return response.json();
      })
      .then((geojson) => {
        if (!cancelled) setData(geojson);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        console.warn(`[TraverseLayer] ${fetchError.message}`);
        setError('Perseverance traverse unavailable. Run preprocess/05_traverse.py.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!map || !data) return undefined;
    if (!map.getPane('traversePane')) {
      map.createPane('traversePane');
    }
    map.getPane('traversePane').style.zIndex = 320;

    if (!visible) return undefined;

    const layer = L.geoJSON(data, {
      pane: 'traversePane',
      interactive: false,
      style: {
        color: '#f4a261',
        weight: 2,
        opacity: 0.9,
      },
    }).addTo(map);

    return () => {
      layer.remove();
    };
  }, [map, data, visible]);

  const sols = data
    ? data.features
        .map((feature) => Number(feature.properties?.sol))
        .filter(Number.isFinite)
    : [];
  const solMin = sols.length ? Math.min(...sols) : null;
  const solMax = sols.length ? Math.max(...sols) : null;

  return (
    <aside className="traverse-panel" aria-label="Perseverance traverse">
      <label className="traverse-panel__toggle">
        <input
          type="checkbox"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
        />
        <span>Perseverance traverse</span>
      </label>
      <div className="traverse-panel__legend">
        <span className="traverse-panel__line" aria-hidden="true" />
        <span>
          {solMin !== null && solMax !== null
            ? `Sols ${solMin}–${solMax}`
            : 'D5 traverse'}
        </span>
      </div>
      <div className="traverse-panel__credit">NASA/JPL-Caltech</div>
      {error && <div className="traverse-panel__error">{error}</div>}
    </aside>
  );
}
