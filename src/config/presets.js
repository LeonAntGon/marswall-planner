import { LANDING_SITE } from '../lib/marsGeo.js';

/**
 * Exact route presets. The Three Forks coordinate is the D5 waypoint used by
 * F7 (science_stops.geojson, id "three-forks", sol 674); the landing coordinate
 * is the F1 landing site. These are dataset coordinates, not assumptions.
 */
export const ROUTE_PRESETS = {
  landingToThreeForks: {
    id: 'landing-three-forks',
    label: 'Landing → Three Forks (sol 674)',
    start: { lat: LANDING_SITE.lat, lon: LANDING_SITE.lon },
    destination: { lat: 18.45272753, lon: 77.40833585 },
  },
};

export const TRAVERSE_URL = '/data/traverse.geojson';
export const WAYPOINTS_URL = '/data/waypoints.geojson';
