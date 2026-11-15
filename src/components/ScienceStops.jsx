import { useEffect, useState } from 'react';
import L from 'leaflet';
import { useMap } from '../context/MapContext.jsx';
import ScienceCard from './ScienceCard.jsx';

const OFFSETS = {
  maaz: [26, 4],
  seitah: [4, 26],
  'delta-front': [19, 19],
  'three-forks': [3, 3],
  'bright-angel': [-8, 11],
};

export default function ScienceStops() {
  const { map } = useMap();
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
      const offset = OFFSETS[properties.id] || [11, 11];
      const icon = L.divIcon({
        className: 'science-marker',
        html: `<span class="science-marker__dot" style="background:${properties.color}">${index + 1}</span>`,
        iconSize: [22, 22],
        iconAnchor: offset,
      });
      const marker = L.marker([properties.lat, properties.lon], {
        icon,
        title: `${properties.name} · sol ${properties.solUsed}`,
        riseOnHover: true,
      }).addTo(group);
      marker.on('click', () => setSelected(properties));
    });

    return () => {
      group.remove();
    };
  }, [map, stops]);

  return (
    <>
      {error && <div className="science-stops__notice">{error}</div>}
      <ScienceCard stop={selected} onClose={() => setSelected(null)} />
    </>
  );
}
