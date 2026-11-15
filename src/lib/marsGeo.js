import { ASSUMPTIONS } from '../config/assumptions.js';

/** Mars mean radius in kilometres. Source: NASA Mars Fact Sheet. */
export const R_MARS = ASSUMPTIONS.marsRadius.value;

/** Perseverance landing site. Source: docs/SPEC.md section 1. */
export const LANDING_SITE = Object.freeze({
  lat: 18.4447,
  lon: 77.4508,
  name: 'Octavia E. Butler Landing',
});

/** Initial map centre used by F1. Source: docs/SPEC.md F1. */
export const JEZERO_CENTER = Object.freeze({
  lat: 18.44,
  lon: 77.45,
});

/** Length of one degree of latitude on Mars, in metres. */
export const METERS_PER_DEG_LAT = (Math.PI / 180) * R_MARS * 1000;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

function normalizePoint(point) {
  if (Array.isArray(point) && point.length >= 2) {
    return { lat: Number(point[0]), lon: Number(point[1]) };
  }
  if (point && typeof point === 'object') {
    const lat = Number(point.lat);
    const lon = Number(point.lon ?? point.lng);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon };
    }
  }
  throw new TypeError('Expected a point as [lat, lon], { lat, lon } or L.LatLng');
}

/**
 * Great-circle distance on a sphere of radius R_MARS.
 * Returns metres. Supports [lat, lon], { lat, lon } and Leaflet LatLng.
 */
export function marsDistance(a, b) {
  const p1 = normalizePoint(a);
  const p2 = normalizePoint(b);
  const dLat = toRadians(p2.lat - p1.lat);
  const dLon = toRadians(p2.lon - p1.lon);
  const lat1 = toRadians(p1.lat);
  const lat2 = toRadians(p2.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MARS * 1000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total length of a polyline in metres, using marsDistance for every segment. */
export function pathLength(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += marsDistance(points[i - 1], points[i]);
  }
  return total;
}
