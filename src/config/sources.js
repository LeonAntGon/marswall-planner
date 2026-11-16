/**
 * Source registry used by the future Data & Credits screen (F12) and by the
 * provenance log. Every dataset, library and tool used by the app has an entry.
 */
export const SOURCES = [
  {
    id: 'd1-ctx-dtm',
    category: 'dataset',
    name: 'Mars 2020 Terrain Relative Navigation CTX DTM Mosaic (20 m)',
    datasetId: 'D1',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'Context Camera (CTX)',
    institution: 'USGS Astrogeology / NASA/JPL-Caltech',
    url: 'https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic',
    fileUrl:
      'https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif',
    use: 'F2 slope overlay and slope/elevation grids; F3 route cost; F4 elevation profile; F5 effort model',
    citation: 'Fergason et al. 2020, LPSC 51; DOI 10.5066/P906QQT8; CC0',
    verification:
      'Downloaded 2026-11-14, 9,662,387 bytes; rasterio 1.5.2 read the ESRI:103885 CRS; F2 crop and slope statistics are recorded in used.txt.',
  },
  {
    id: 'd5-m20-traverse',
    category: 'dataset',
    name: 'Mars 2020 Perseverance traverse and waypoints',
    datasetId: 'D5',
    mission: 'Mars 2020',
    instrument: 'Perseverance rover traverse and waypoint archive',
    institution: 'NASA/JPL-Caltech',
    url: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json',
    fileUrl:
      'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json',
    use: 'F8 - clipped traverse line and waypoints for the rover comparison',
    citation:
      'NASA Mars 2020 MMGIS traverse and waypoint GeoJSON, accessed 2026-11-14.',
    verification:
      'Raw files: M20_traverse.json 1,723,218 B and M20_waypoints.json 603,126 B. preprocess/05_traverse.py clipped them to the 12x12 km grid; traverse.geojson is 107,593 B and was simplified above the 500 kB threshold; waypoints.geojson is 152,143 B with 517 waypoints.',
  },
  {
    id: 'm20-map',
    category: 'dataset',
    name: 'Mars 2020 Perseverance location map tile layers (MMGIS)',
    datasetId: 'D8',
    mission: 'Mars 2020',
    instrument: 'HiRISE orthoimage mosaics, place names and rover location map',
    institution: 'NASA/JPL-Caltech / University of Arizona',
    url: 'https://mars.nasa.gov/maps/location/api/configure/get?mission=M20',
    pageUrl: 'https://science.nasa.gov/mission/mars-2020-perseverance/location-map/',
    tileUrls: [
      'https://mars.nasa.gov/mmgis-maps/M20/Layers/JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120/{z}/{x}/{y}.png',
      'https://mars.nasa.gov/mmgis-maps/M20/Layers/M20_HiRISE_RGB_mosaic_25cm_v4p2/{z}/{x}/{y}.png',
      'https://mars.nasa.gov/mmgis-maps/M20/Layers/M20_Placenames_175k_800dpi/{z}/{x}/{y}.png',
    ],
    use: 'F1 - Jezero HiRISE grayscale and color base layers, plus place names',
    citation:
      'NASA Mars 2020 MMGIS configuration endpoint, accessed 2026-11-14; the color v4p2 URL was also reported in a Posit Community thread.',
    verification:
      'Config endpoint HTTP 200. Tiles probed with curl and Node on 2026-11-14; see used.txt for the zoom-by-zoom results.',
  },
  {
    id: 'opm-basemap',
    category: 'dataset',
    name: 'OPM Mars Basemap v0.1',
    datasetId: 'D8',
    mission: 'Multiple Mars missions (composite)',
    instrument: 'Composite vector basemap',
    institution: 'OpenPlanetaryMap',
    url: 'https://github.com/openplanetary/opm/wiki/OPM-Basemaps',
    tileUrl:
      'https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-mars-basemap-v0-1/all/{z}/{x}/{y}.png',
    use: 'F1 - optional global base layer; kept available in the layer control',
    citation: 'OpenPlanetaryMap, OPM Basemaps wiki',
    verification: 'HTTP 200 image/png at z11/x1464/y917 (1779 B) on 2026-11-14.',
  },
  {
    id: 'opm-hillshade',
    category: 'dataset',
    name: 'OPM MOLA hillshade tiles',
    datasetId: 'D8',
    mission: 'Mars Global Surveyor (MGS)',
    instrument: 'Mars Orbiter Laser Altimeter (MOLA)',
    institution: 'NASA/MOLA; tiles hosted by OpenPlanetaryMap',
    url: 'https://github.com/openplanetary/opm/wiki/OPM-Basemaps',
    tileUrl:
      'https://s3.us-east-2.amazonaws.com/opmmarstiles/hillshade-tiles/{z}/{x}/{y}.png',
    use: 'F1 - optional MOLA relief base layer',
    citation: 'OpenPlanetaryMap, Hillshade Mars Map',
    verification:
      'TMS confirmed. HTTP 200 at z6/x45/y35; HTTP 404 at z7-z11. Native max zoom is 6.',
  },
  {
    id: 'nasa-mars-fact-sheet',
    category: 'reference',
    name: 'NASA Mars Fact Sheet',
    datasetId: 'D9',
    mission: 'NASA planetary reference data',
    instrument: 'Physical and orbital parameters',
    institution: 'NASA / NSSDC',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    use: 'Mars radius 3389.5 km (marsGeo.js) and gravity 3.71 m/s² (assumptions.js)',
    citation: 'NASA Goddard Space Flight Center, Mars Fact Sheet',
    verification: 'HTTP 200 on 2026-11-14.',
  },
  {
    id: 'm20-landing-site',
    category: 'reference',
    name: 'Jezero Crater landing-site coordinates',
    mission: 'Mars 2020',
    instrument: 'Perseverance landing site',
    institution: 'NASA/JPL-Caltech',
    url: 'https://science.nasa.gov/mission/mars-2020-perseverance/location-map/',
    coordinates: {
      lat: 18.4447,
      lon: 77.4508,
    },
    use: 'F1 - landing-site marker and initial map view',
    citation:
      'Coordinates supplied in docs/SPEC.md section 1; cross-checked with the first D5 traverse waypoint.',
    verification:
      'NASA page HTTP 200. Coordinates cross-checked with D5 first waypoint (18.44462715, 77.45088573); not independently geocoded.',
  },
  {
    id: 'posit-forum',
    category: 'reference',
    name: 'Posit Community: R Leaflet TMS issue for the NASA JPL tile provider',
    url: 'https://forum.posit.co/t/r-leaflet-not-handling-tms-true-for-nasa-jpl-tms-provider/179427',
    use: 'F1 - hint for the Mars 2020 color HiRISE tile URL (v4p2); treated as unverified until tile probes',
    citation: 'Posit Community forum thread, accessed 2026-11-14',
    verification:
      'Forum page HTTP 200. The v4p2 tile pattern was verified with curl at z10-z18; TMS confirmed by XYZ 403 responses.',
  },
  {
    id: 'leaflet',
    category: 'library',
    name: 'Leaflet',
    version: '1.9.4',
    institution: 'Leaflet contributors',
    url: 'https://leafletjs.com/',
    license: 'BSD-2-Clause',
    use: 'F1 - map, tile layers, layer control and circle marker',
    verification: 'npm package leaflet@1.9.4 installed; project site HTTP 200.',
  },
  {
    id: 'react',
    category: 'library',
    name: 'React and React DOM',
    version: '18.3.1',
    institution: 'Meta and contributors',
    url: 'https://react.dev/',
    license: 'MIT',
    use: 'F1 - UI composition, map lifecycle and tile status state',
    verification: 'npm packages react@18.3.1 and react-dom@18.3.1 installed.',
  },
  {
    id: 'vite',
    category: 'tool',
    name: 'Vite',
    version: '7.3.8',
    institution: 'Vite contributors',
    url: 'https://vite.dev/',
    license: 'MIT',
    use: 'Development server and production build',
    verification: 'npm package vite@7.3.8 installed; npm run build succeeds.',
  },
  {
    id: 'vite-react-plugin',
    category: 'tool',
    name: '@vitejs/plugin-react',
    version: '5.2.0',
    institution: 'Vite contributors',
    url: 'https://github.com/vitejs/vite-plugin-react',
    license: 'MIT',
    use: 'JSX transformation and React Fast Refresh',
    verification: 'npm package @vitejs/plugin-react@5.2.0 installed.',
  },
  {
    id: 'node',
    category: 'tool',
    name: 'Node.js',
    version: '22.17.0',
    institution: 'OpenJS Foundation',
    url: 'https://nodejs.org/',
    license: 'MIT',
    use: 'Build runtime, scripts/check_tiles.mjs and the built-in node:test runner (npm test)',
    verification: 'node --version reports v22.17.0.',
  },
  {
    id: 'dev-tools',
    category: 'tool',
    name: 'curl, Git for Windows, file and npm',
    version: 'curl 8.13.0; Git 2.40.1; file 5.44; npm 11.13.0',
    institution: 'curl, Git, file and npm projects',
    url: 'https://curl.se/',
    use: 'Dataset downloads, file-type checks and package management during development',
    verification: 'Versions checked on 2026-11-14 (see used.txt).',
  },
  {
    id: 'wcag-target-size',
    category: 'reference',
    name: 'W3C WCAG 2.2 - Target Size (Minimum and Enhanced)',
    institution: 'World Wide Web Consortium (W3C)',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
    license: 'W3C Document License',
    citation:
      'WCAG 2.2 success criteria 2.5.8 (24 px minimum) and 2.5.5 (44 px enhanced).',
    use: 'Compact layout touch targets: 44 px route buttons, form controls and expanded hit areas for text links.',
    verification:
      'Checked 2026-11-15: the 44 px value is the enhanced target size; 24 px is the AA minimum. The compact layout audit measured every visible route button at 44 px.',
  },
  {
    id: 'mdn-responsive-css',
    category: 'reference',
    name: 'MDN Web Docs - CSS environment variables, pointer media query, dynamic viewport units and Pointer Events',
    institution: 'Mozilla and individual contributors',
    url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/env',
    license: 'CC-BY-SA 2.5',
    citation:
      'Used env(safe-area-inset-*), @media (pointer: coarse), 100dvh, touch-action and the Pointer Events API.',
    use: 'Bottom-sheet layout, safe-area padding, compact viewport sizing, touch target rules and the draggable elevation profile.',
    verification:
      'Checked 2026-11-15 in MDN; verified in Chrome 147 at 320-1280 px widths and with touch emulation.',
  },
  {
    id: 'chrome-headless',
    category: 'tool',
    name: 'Google Chrome (headless) and Chrome DevTools Protocol',
    version: '147.0.7727.55',
    institution: 'Google',
    url: 'https://developer.chrome.com/docs/chromium/headless',
    license: 'Proprietary',
    use: 'Responsive layout verification at 320, 390, 820, 1023, 1024 and 1280 px, touch emulation, screenshots and console/runtime error checks.',
    verification:
      'Chrome 147.0.7727.55 run on 2026-11-15; no page errors in the audited layouts.',
  },
  {
    id: 'preprocess-stack',
    category: 'tool',
    name: 'Python preprocessing stack',
    version:
      'Python 3.13.5; NumPy 2.2.2; Pillow 11.1.0; rasterio 1.5.2; GDAL CLI optional/missing',
    institution: 'Python Software Foundation and project contributors',
    url: 'https://www.python.org/',
    license: 'PSF / BSD / HPND',
    use: 'Offline dataset preparation for D1, D4 and D5; F2 slope outputs; no browser runtime dependency',
    verification:
      'Tool check on 2026-11-14: python, numpy, pillow and rasterio present; gdalinfo missing (optional).',
  },
  {
    id: 'meda',
    category: 'dataset',
    name: 'Mars 2020 MEDA environmental data',
    datasetId: 'D6',
    mission: 'Mars 2020',
    instrument: 'Mars Environmental Dynamics Analyzer (MEDA)',
    institution:
      'NASA/JPL-Caltech; Centro de Astrobiología (CAB) / INTA; PDS Atmospheres Node',
    url: 'https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/',
    use: 'F6 — pressure, air temperature, solar radiation (MEDA RDS) and wind',
    citation:
      'PDS4 bundle urn:nasa:pds:mars2020_meda, release 2026-08-11; PS/ATS/RDS sol 1859 and WS sol 313.',
    verification:
      'PDS directory HTTP 200; files fetched 2026-11-14. The RDS label has no UV-band column; RDS_TOP_7 is used as "Solar radiation (MEDA RDS)" without any UV conversion.',
  },
  {
    id: 'sun-2023',
    category: 'reference',
    name: 'Sun et al. 2023, JGR Planets — First Science Campaign on the Jezero Crater Floor',
    url: 'https://doi.org/10.1029/2022JE007613',
    use: 'F7 — Maaz/Séítah context and anchor sols',
    citation:
      'Sun et al. 2023, Journal of Geophysical Research: Planets, DOI 10.1029/2022JE007613.',
    verification:
      'Crossref API HTTP 200; publisher page 403 to curl due to bot protection.',
  },
  {
    id: 'minetti-2002',
    category: 'reference',
    name: 'Minetti et al. 2002 — Energy cost of walking and running at extreme uphill and downhill slopes',
    url: 'https://doi.org/10.1152/japplphysiol.01177.2001',
    use: 'F5 — Minetti walking energy cost and ±0.45 gradient range',
    citation:
      'Minetti et al. 2002, Journal of Applied Physiology 93:1039-1046, DOI 10.1152/japplphysiol.01177.2001.',
    verification:
      'Crossref API HTTP 200; publisher page may block automated fetch.',
  },
  {
    id: 'nasa-delta-front',
    category: 'reference',
    name: 'NASA Science — Campaign #2: The Delta Front',
    url: 'https://science.nasa.gov/blog/campaign-2-the-delta-front',
    use: 'F7 — Delta Front Campaign began on sol 415',
    verification: 'HTTP 200 on 2026-11-14.',
  },
  {
    id: 'aapg-explorer-441',
    category: 'reference',
    name: 'AAPG Explorer — Perseverance Examines Martian Geology for Signs of Life',
    url: 'https://www.aapg.org/news-and-media/explorer/perseverance-examines-martian-geology-for-signs-of-life/',
    use: 'F7 — sol 441 ascent into Hawksbill Gap',
    verification:
      'Direct automated fetch blocked (HTTP 403/000); search result snippet confirms “May 17, 2022 (SOL 441)”. Verify in a browser if needed.',
  },
  {
    id: 'nasa-blog-675',
    category: 'reference',
    name: 'NASA Science — A Lap Around the Sun: Perseverance Celebrates One Martian Year at Jezero',
    url: 'https://science.nasa.gov/blog/a-lap-around-the-sun-perseverance-celebrates-one-martian-year-at-jezero/',
    use: 'F7 — sol 675 Three Forks sample depot',
    verification: 'HTTP 200; article text mentions sol 675 and Three Forks.',
  },
  {
    id: 'lpsc-2025-2333',
    category: 'reference',
    name: 'LPSC 2025 Abstract 2333 — Margin Unit observations',
    url: 'https://www.hou.usra.edu/meetings/lpsc2025/pdf/2333.pdf',
    use: 'F7 — Margin unit characterized between sols 910 and 1159',
    verification:
      'HTTP 200 application/pdf; DLR mirror https://elib.dlr.de/217864/1/2333.pdf also HTTP 200.',
  },
  {
    id: 'planetary-society-cheyava',
    category: 'reference',
    name: "The Planetary Society — A biosignature on Mars? Unpacking Perseverance's Cheyava Falls find",
    url: 'https://planetary.org/articles/a-biosignature-on-mars-unpacking-perseverances-cheyava-falls-find',
    use: 'F7 — Cheyava Falls / Bright Angel, sol 1212',
    verification:
      'HTTP 200; NASA/Planetary Society image caption identifies the 1,212th sol.',
  },
  {
    id: 'nasa-meda-wind-damage',
    category: 'reference',
    name: 'NASA — Perseverance Studies the Wild Winds of Jezero Crater',
    url: 'https://www.nasa.gov/solar-system/nasas-perseverance-studies-the-wild-winds-of-jezero-crater/',
    use: 'F6 — evidence that sand carried in whirlwinds damaged MEDA’s two wind sensors',
    verification:
      'HTTP 200; article states “Sand carried in whirlwinds damaged MEDA\'s two wind sensors.”',
  },
];

export default SOURCES;
