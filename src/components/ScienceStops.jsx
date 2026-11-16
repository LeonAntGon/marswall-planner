import { useEffect, useState } from 'react';
import L from 'leaflet';
import { useMap } from '../context/MapContext.jsx';
import {
  COMPACT_QUERY,
  COARSE_POINTER_QUERY,
  useMediaQuery,
} from '../lib/useMediaQuery.js';
import ScienceCard from './ScienceCard.jsx';

/** Vertical label offsets used to separate the two stops near Three Forks. */
const LABEL_Y = {
  maaz: 16,
  seitah: -14,
  'delta-front': -24,
  'three-forks': 20,
  'bright-angel': -18,
};

export default function ScienceStops() {
  const { map } = useMap();
  const isCompact = useMediaQuery(COMPACT_QUERY);
  const coarse = useMediaQuery(COARSE_POINTER_QUERY);
  const showLabels = !isCompact && !coarse;
  const [stops, setStops] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/science_stops.geojson')
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status} for /data/science_stops.geojson`
          );
        }
        return response.json();
      })
      .then((geojson) => {
        if (!cancelled) setStops(geojson.features || []);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        console.warn(`[ScienceStops] ${fetchError.message}`);
        setError(
          'Science stops unavailable. Run preprocess/03_science_stops.py.'
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!map || stops.length === 0) return undefined;
    const group = L.featureGroup().addTo(map);

    stops.forEach((feature, index) => {
      const properties = feature.properties;
      const latlng = [properties.lat, properties.lon];
      const size = coarse ? 44 : 34;
      const dotIcon = L.divIcon({
        className: 'science-dot-marker',
        html: `<span class="science-dot-marker__dot" style="background:${properties.color}">${index + 1}</span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      L.marker(latlng, {
        icon: dotIcon,
        title: `${properties.name} · sol ${properties.solUsed}`,
        riseOnHover: true,
      })
        .addTo(group)
        .bindTooltip(`${properties.name} · sol ${properties.solUsed}`, {
          direction: 'top',
          offset: [0, -10],
        })
        .on('click', () => setSelected(properties));

      if (showLabels) {
        const labelIcon = L.divIcon({
          className: 'science-label-marker',
          html: `<span class="science-marker__label">${properties.name}</span>`,
          iconSize: [190, 22],
          iconAnchor: [0, 11 + (LABEL_Y[properties.id] ?? 0)],
        });
        L.marker(latlng, {
          icon: labelIcon,
          interactive: false,
          keyboard: false,
        }).addTo(group);
      }
    });

    return () => {
      group.remove();
    };
  }, [map, stops, showLabels, coarse]);

  return (
    <>
      {error && <div className="science-stops__notice">{error}</div>}
      <ScienceCard stop={selected} onClose={() => setSelected(null)} />
    </>
  );
}
