import { JEZERO_CENTER } from '../lib/marsGeo.js';

/**
 * F1 map view. Zoom 12 is used because the NASA M20 grayscale layer is the
 * default base and is verified at zoom 12. OPM remains available below it.
 */
export const MAP_VIEW = {
  center: [JEZERO_CENTER.lat, JEZERO_CENTER.lon],
  zoom: 12,
  minZoom: 3,
};

/** Visual style for the landing-site circle marker. */
export const LANDING_MARKER_STYLE = {
  radius: 7,
  color: '#ffffff',
  weight: 2,
  fillColor: '#ff6b35',
  fillOpacity: 0.9,
};

/**
 * Tile layers for F1. Every layer with url: null is skipped by MapView and
 * logged once; this mechanism is kept for future unverified layers.
 */
export const LAYERS = [
  {
    id: 'opm-basemap',
    label: 'OPM basemap v0.1',
    kind: 'base',
    url: 'https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-mars-basemap-v0-1/all/{z}/{x}/{y}.png',
    options: {},
    attribution: 'OpenPlanetaryMap',
    sourceId: 'opm-basemap',
    verify: true,
    verification:
      'HTTP 200 image/png at z11/x1464/y917 (1779 B, 2026-11-14). The z11 tile over Jezero is a flat background; real detail comes from the M20 layers.',
  },
  {
    id: 'opm-hillshade',
    label: 'MOLA hillshade',
    kind: 'base',
    url: 'https://s3.us-east-2.amazonaws.com/opmmarstiles/hillshade-tiles/{z}/{x}/{y}.png',
    options: {
      tms: true,
      maxNativeZoom: 6,
      maxZoom: 19,
    },
    attribution: 'NASA/MOLA · OpenPlanetaryMap',
    sourceId: 'opm-hillshade',
    verify: true,
    verification:
      'TMS confirmed against the OPM basemap hemispheres. HTTP 200 at z6/x45/y35; HTTP 404 at z7-z19 (native max zoom 6). maxNativeZoom is 6, so Leaflet upscales the z6 tile at the Jezero z11/z12 view instead of requesting missing z7+ tiles.',
  },
  {
    id: 'm20-gray',
    label: 'Jezero HiRISE grayscale (25 cm)',
    kind: 'base',
    default: true,
    url: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120/{z}/{x}/{y}.png',
    options: {
      tms: true,
      minZoom: 0,
      maxZoom: 19,
      maxNativeZoom: 18,
      // Official MMGIS bounding box, converted to Leaflet [south, west] order.
      bounds: [
        [18.306796, 77.223018],
        [18.669355, 77.583908],
      ],
    },
    attribution: 'NASA/JPL-Caltech/University of Arizona',
    sourceId: 'm20-map',
    verify: true,
    verification:
      'TMS. HTTP 200 image/png at z0-z18, HTTP 403 at z19. Default F1 base at zoom 12; landing site pixel is opaque HiRISE imagery.',
  },
  {
    id: 'm20-rgb',
    label: 'Jezero HiRISE color (25 cm)',
    kind: 'base',
    url: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/M20_HiRISE_RGB_mosaic_25cm_v4p2/{z}/{x}/{y}.png',
    options: {
      tms: true,
      minZoom: 10,
      maxZoom: 19,
      maxNativeZoom: 18,
    },
    attribution: 'NASA/JPL-Caltech/University of Arizona',
    sourceId: 'm20-map',
    verify: true,
    verification:
      'TMS. HTTP 403 at z0-z9, HTTP 200 image/png at z10-z18, HTTP 403 at z19. URL supplied by the Posit forum thread and confirmed with curl.',
  },
  {
    id: 'm20-placenames',
    label: 'M20 place names',
    kind: 'overlay',
    default: true,
    url: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/M20_Placenames_175k_800dpi/{z}/{x}/{y}.png',
    options: {
      tms: true,
      minZoom: 4,
      maxZoom: 19,
      maxNativeZoom: 18,
      pane: 'labelsPane',
      // NASA MMGIS nominal coverage is lon 76.837-78.154, lat 17.821-18.918,
      // but the tile service returns 403 outside the actual label rectangle.
      // Measured at z12 on 2026-11-14: x 2927-2936, yTMS 2260-2266 are 200;
      // adjacent rows/columns are 403. Bounds below are that rectangle's edges.
      bounds: [
        [18.312811, 77.34375],
        [18.895893, 77.6953125],
      ],
    },
    attribution: 'NASA/JPL-Caltech',
    sourceId: 'm20-map',
    verify: true,
    verification:
      'TMS. HTTP 403 at z0-z3, HTTP 200 image/png at z4-z18, HTTP 403 at z19. Tiles are sparse labels; a transparent tile at the landing site is expected.',
  },
];

/**
 * F2 image overlay. It is not a tile layer, so it is not part of LAYERS or the
 * Leaflet layer control. SlopePanel reads its bounds from public/data/grid.json.
 */
export const SLOPE_OVERLAY = {
  id: 'slope-20m',
  label: 'Slope (20 m)',
  url: '/data/slope.png',
  gridUrl: '/data/grid.json',
  defaultOpacity: 0.6,
  sourceId: 'd1-ctx-dtm',
};
