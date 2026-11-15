# AGENTS.md — Marswalk Planner (Jezero)

## Project goal

Build a static web app for the NASA Space Apps Challenge 2026 that gives a layered,
integrated view of Jezero Crater and helps a human explorer plan and carry out a
safe Marswalk with science stops. The app is centred on the Perseverance landing
site (18.4447 N, 77.4508 E).

The source of truth is `docs/SPEC.md` (requirements and features F1–F15) and
`docs/DATASETS.md` (datasets D1–D9, URLs, local names and processing commands).
Ignore the "Persona A / Persona B" split in those documents.

**Before any feature, read its section in `docs/SPEC.md` and the datasets it needs in
`docs/DATASETS.md`.**

## Stack

- Vite + React 18, JavaScript only (no TypeScript).
- Plain Leaflet 1.9 used imperatively through refs (no react-leaflet).
- Default Leaflet Web Mercator projection; no custom CRS.
- Plain CSS. npm. No UI kit, router or state library.
- No backend. Heavy data work is done offline by Python scripts in `preprocess/`
  that write static files to `public/data/`.

## Rules for every task

1. All UI text, comments and docs in English.
2. One feature at a time. Do not implement features that were not requested.
   Do not refactor unrelated files.
3. Never invent data, URLs, coordinates or numbers. If something is missing,
   leave a clear TODO and tell the user.
4. Every dataset, library or tool used must be added to `src/config/sources.js`
   in the same change.
5. Every number that does not come from a dataset belongs in
   `src/config/assumptions.js` with its source and an `assumed` flag.
   Never hardcode such numbers in components.
6. Distances only through `src/lib/marsGeo.js` (Mars radius 3389.5 km).
   Never use `map.distance()` or `L.control.scale` (they assume Earth).
7. Append an entry to `used.txt` every time an external piece of information is
   used. Append only, never rewrite. Format:
   `[YYYY-MM-DD HH:MM] FEATURE: Fx`
   `WHAT: ...`
   `WHERE FROM: exact URL / dataset ID / "own assumption" / "model knowledge, unverified"`
   `HOW VERIFIED: ...`
   `USED IN: file path(s)`
   `NOTE: ...`
8. Raw downloads go in `preprocess/raw/` (git-ignored). Processed outputs go in
   `public/data/` with the exact file names in `docs/DATASETS.md`.

## Folder structure

```
docs/SPEC.md                         Requirements, features F1-F15, assumptions and submission checklist.
docs/DATASETS.md                     Dataset D1-D9 URLs, local names and processing commands.
README.md                            Project overview, quick start, F1/F2 status and data status.
COMMANDS.md                          Every setup/run/build/check/preprocess command.
AGENTS.md                            This file: rules, structure, priorities and current status.
used.txt                             Append-only provenance log.
package.json                         npm dependencies, scripts and the check:tiles command.
package-lock.json                    Locked dependency tree produced by npm install.
vite.config.js                       Vite React plugin and ES module worker format.
index.html                           App shell and page metadata.
.gitignore                           Ignores node_modules, dist, raw downloads and TIF files.
public/favicon.svg                   Small Mars favicon.
public/data/.gitkeep                 Keeps the processed-data directory in git.
public/data/slope.png                F2 RGBA slope overlay (600x600).
public/data/slope.bin                F2 Float32 slope grid (600x600).
public/data/elevation.bin            F2 Float32 elevation grid (600x600).
public/data/grid.json                F2 bounds, shape, NoData, bands and statistics.
public/data/conditions.json          F6 MEDA conditions (sol 1859 + wind sol 313).
public/data/science_stops.geojson    F7 six approximate science stops from D5.
public/data/traverse.geojson         F8 D5 traverse clipped and simplified.
public/data/waypoints.geojson        F8 D5 waypoints inside the grid.
preprocess/README.md                 D1/D4/D5/D6/F2/F6/F7/F8 pipeline and tool status.
preprocess/requirements.txt          Python dependencies: numpy, rasterio, pillow.
preprocess/02_slope.py               F2 crop, slope calculation, PNG and binary grids.
preprocess/03_science_stops.py       F7 derive science stops from D5 waypoints.
preprocess/04_meda.py                F6 MEDA CSV to conditions.json.
preprocess/05_traverse.py            F8 clip/simplify D5 traverse and waypoints.
preprocess/raw/.gitkeep              Keeps the raw-download directory in git.
preprocess/raw/jezero_ctx_dtm_20m.tif        D1 raw CTX DTM (git-ignored, downloaded).
preprocess/raw/jezero_ctx_ortho_6m.tif       D4 raw CTX orthoimage (git-ignored, downloaded).
preprocess/raw/M20_traverse.json             D5 raw traverse GeoJSON (git-ignored, downloaded).
preprocess/raw/M20_waypoints.json            D5 raw waypoints GeoJSON (git-ignored, downloaded).
preprocess/raw/meda/*.CSV                    MEDA PS/ATS/RDS/WS raw files (git-ignored, downloaded).
scripts/check_tiles.mjs              Probes every tile layer in src/config/layers.js from the landing site.
src/main.jsx                         React entry point, Leaflet CSS and global styles.
src/App.jsx                          Topbar, map shell and all feature panels.
src/styles.css                       Dark UI, Leaflet overrides, status, route, conditions and cards.
src/config/assumptions.js            SPEC section 9 constants plus slope bands, work area and conditions thresholds.
src/config/slopeBands.json           Shared slope colour bands for app and Python script.
src/config/layers.js                 F1 view, marker style, tile layers and SLOPE_OVERLAY.
src/config/presets.js                F8 exact Landing -> Three Forks preset and data URLs.
src/config/sources.js                Source registry for F12 credits and provenance (24 entries).
src/context/MapContext.jsx           MapProvider plus useMap() for map-aware features.
src/context/RouteContext.jsx         Grid loading, shared route stops and walkback field for F3/F5/F7/F9.
src/lib/marsGeo.js                   R_MARS, landing site, Jezero centre, Mars distance and path length.
src/lib/gridData.js                  Loads grid.json/slope.bin/elevation.bin and converts cells to lat/lon.
src/lib/astar.worker.js              F3 A* route planner Web Worker.
src/lib/walkback.worker.js           F5 reverse Dijkstra cost-to-base field and predecessors.
src/lib/effort.js                    F5 Minetti energy, Tobler time, consumables and safety model.
src/lib/compare.js                   F8 pure route-vs-traverse comparison functions.
src/components/MapView.jsx           F1 map lifecycle, layer control, marker and tile status.
src/components/SlopePanel.jsx        F2 image overlay, opacity slider, legend and stats.
src/components/RoutePanel.jsx        F3/F4/F5/F8/F9 controls, metrics, compare and emergency.
src/components/ConditionsPanel.jsx   F6 MEDA conditions, EVA-window status and pressure info.
src/components/ScienceStops.jsx      F7 six map markers and selected-stop state.
src/components/ScienceCard.jsx       F7 detail card and Add to route.
src/components/TraverseLayer.jsx     F8 traverse toggle, legend and credit.
src/components/Credits.jsx           F12 Data & Credits modal.
```

Planned, not created yet:

```
preprocess/01_crop_dtm.sh            Optional GDAL crop; 02_slope.py already crops with rasterio.
```

## Feature priorities

| ID | Feature | Priority | Status |
|---|---|---|---|
| F1 | Jezero base map with zoom and layer control | MUST | Done |
| F2 | Elevation and slope layers (green/yellow/red) | MUST | Done |
| F3 | A-to-B route with slope-aware A* | MUST | Done |
| F4 | Walk panel: distance, ascent, time, max slope | MUST | Done |
| F6 | Conditions panel: temperature, pressure, wind, UV | MUST | Done |
| F7 | Science stops with detail card | MUST | Done |
| F12 | In-app Data & Credits screen | MUST | Done |
| F5 | Consumables and walkback rule | SHOULD | Done |
| F8 | Validation against the Perseverance traverse | SHOULD | Done |
| F9 | Emergency replanning | SHOULD | Done |
| F10 | Risk-vs-science control | NICE | Pending |
| F11 | Time-of-day window | NICE | Pending |
| F13 | Data-confidence layer | NICE | Pending |
| F14 | Astronaut mode | NICE | Pending |
| F15 | AI route assistant | NICE | Pending |

Minimum deliverable: F1, F2, F3, F4, F6, F7, F12.
Recommended: the minimum plus F5, F8, F9.

## Current status (2026-11-15)

- [x] Project skeleton, Vite/React/Leaflet app and npm scripts.
- [x] F1 map with OPM, MOLA hillshade, M20 HiRISE grayscale, M20 HiRISE color and
      M20 place names.
- [x] Default base: `m20-gray` at zoom 12; OPM remains in the layer control.
- [x] Landing-site `L.circleMarker` and popup.
- [x] Tile status box, one-time per-layer console warnings, StrictMode-safe
      `map.remove()` cleanup and `invalidateSize()`.
- [x] `MapContext` exposes the map to future features.
- [x] `npm run check:tiles` reusable tile probe; measured TMS and zoom ranges.
- [x] `docs/DATASETS.md` D8 updated with D8c/D8d and verification results.
- [x] D1, D4, D5 raw files downloaded to `preprocess/raw/` and verified with
      `file`, exact byte sizes and local metadata parsing.
- [x] D1/D4 projection, bounds, NoData and D1 elevation statistics reported.
- [x] D5 traverse/waypoint feature counts, property names, sol ranges and
      coordinates reported.
- [x] pip and rasterio 1.5.2 installed; `preprocess/02_slope.py` implemented.
- [x] F2 slope overlay expanded to 600x600 (12x12 km) and new statistics.
- [x] F3 A* route planner with slope blocking, worker and map points.
- [x] F4 route metrics and SVG elevation profile with Tobler time.
- [x] F12 Data & Credits modal from sources.js and assumptions.js.
- [x] F6 conditions panel with MEDA sol 1859, EVA-window temperature status and wind sol 313.
- [x] F7 six science stops, detail cards and Add to route.
- [x] F5 consumables, energy/O2 bars, science-stop energy and walkback.
- [x] F5 round-trip time against EVA duration and daylight window.
- [x] F8 traverse/waypoints clipped, comparison metrics and Three Forks preset.
- [x] F8 slope table, rover/our length ratio and honest detour note.
- [x] F9 emergency return with position slider, predecessors, stats and cancel.
- [x] Map noWrap, padded max bounds, grid initial view and no-planet min zoom.
- [x] MOLA z6 tile upscaling and an explicit Global overview/Back to Jezero mode.
- [ ] Install GDAL CLI for the literal `gdalinfo -stats` output (optional).
- [ ] Public demo deployment (Vercel/Netlify) and submission checklist.

### F1 verification notes

- `npm run build` succeeds (50 modules, 367.61 kB JS, 34.95 kB CSS, 3.65 kB A* worker, 3.40 kB walkback worker).
- Headless Chrome check: 4 base radios and 1 overlay checkbox; default gray
  checked; zoom 12; marker popup exact text; no page errors.
- MOLA hillshade has native tiles only at z0-z6; its URL is unchanged and
  `maxNativeZoom: 6` upscales the z6 tile at z11/z12. Tested with tile status
  `ok` and no console errors. `m20-gray` is 200 at z0-z18, `m20-rgb` at
  z10-z18, place names at z4-z18, and all three return 403 at z19.
- M20 detail layers only cover the Jezero area; outside it they are blank.
- Place names are clipped to the measured z12 200-tile rectangle because the
  nominal MMGIS bbox includes tiles that return 403. This avoids false errors on
  the default view.

### F2 verification notes

- `python preprocess/02_slope.py` completed with rasterio 1.5.2.
- Crop: 600x600 cells, cols 347-946, rows 459-1058, 12x12 km.
- Centre: 18.4650 N, 77.3787 E; bounds lon 77.2775475-77.4799947 E,
  lat 18.3638751-18.5663223 N.
- NoData: 0 cells (0.0 %).
- Slope: min 0.0058 deg, max 37.7237 deg, mean 5.8571 deg.
- Above 10/20/30 deg: 18.37 % / 2.78 % / 0.0381 %.
- All six F7 stop cells valid; slopes: Maaz 1.77, Seitah 1.77, Delta front
  7.57, Three Forks 1.05, Margin 1.62, Bright Angel 15.77 deg.
- Outputs: `slope.png` 20,130 B; `slope.bin` 1,440,000 B; `elevation.bin`
  1,440,000 B; `grid.json` 2,806 B.
- F3/F4 browser test still passes; route note shows 12x12 km; outside-grid
  point shows the message.
- A* timings (cold start, 600x600): Seitah 224 ms, Delta front 423 ms,
  Three Forks 228 ms, Margin unit 438 ms, Bright Angel 844 ms. All < 2 s.
- Real-terrain test: Three Forks base -> upper delta sol 460, 18 cells,
  max slope 12.78 deg, passes ~140 m from Hawksbill Gap, no no-route.
- Slope overlay still aligns with the delta/crater rims.

### F6 verification notes

- `python preprocess/04_meda.py` completed.
- `conditions.json` 3,698 B from PS/ATS/RDS sol 1859 and WS sol 313.
- Full-sol temperature: -83.094 to -21.066 C (mean -59.055 C).
- EVA window 09:00-15:00 LMST: min -62.846 C, mean -37.033 C, max -21.066 C.
- 24 hourly ATS means stored in `conditions.json`.
- Pressure: 716.61-750.86 Pa (mean 736.05 Pa); information only, with tooltip.
- `RDS_TOP_7` solar radiation 4.956-154.770 W/m2 (mean 79.496 W/m2).
- Wind sol 313: mean 4.265 m/s, max 22.47 m/s; last valid reading.
- UI status **GO**; uses the EVA-window minimum temperature only. Pressure is
  information only; wind is excluded.
- Label is "Solar radiation (MEDA RDS)" with RDS_TOP_7 tooltip; no UV product.
- Thresholds: temp GO >= -75 C / caution >= -90 C; EVA window 09:00-15:00 LMST;
  both marked assumed in the UI.

### F7 verification notes

- `python preprocess/03_science_stops.py` completed; `science_stops.geojson`
  6,661 B, 6 features.
- Sols used: Maaz 180, Seitah 200, Delta front 441, Three Forks 674,
  Margin 909, Bright Angel 1210. All coordinates approximate.
- Maaz sol 180 is 903 m from the landing marker.
- Delta front and Three Forks are 293 m apart; marker icons are offset.
- Browser test: six markers, cards open, all six Add to route actions return
  "Added to route."; route panel shows six unique stops; no errors.
- Visual sanity: Three Forks near the delta front/base of scarp; Bright Angel
  on the western/northwestern edge; no obvious anomaly.
- F12: 24 sources and 22 assumptions (17 assumed, 5 sourced); modal opens and
  closes with no console errors.

### F5 verification notes

- Minetti 2002 model, gradient clamp ±0.45, mass 180 kg, Mars/Earth gravity
  ratio 3.71/9.81. Capacity 8.64 MJ and 429.9 L O2 at 100%.
- Stop energy 540 kJ and 26.87 L O2 per 30-minute science stop.
- Node checks: flat 2 km 337.0 kJ / 16.76 L / 3.90%; 5% climb 2 km
  485.2 kJ / 24.14 L / 5.62%.
- Bright Angel without stops: 1,978.5 kJ / 98.43 L / 22.9% capacity; first
  unsafe slider **40%** (vertex 408).
- Bright Angel with Seitah + Margin stops: 3,191.2 kJ / 158.77 L / 36.94%;
  first unsafe slider **55%** (vertex 428). Use 50% in the UI to show a clear
  red segment and the point-of-no-return warning.
- Browser exact-ish route with two stops: 9.94 km, energy 3,145 kJ, O2 156.5 L;
  first unsafe at 55%; 50% shows 55 red segments and the warning.
- Worker timings: A* 359.1 ms, walkback Dijkstra 317.6 ms; Node walkback
  1,290.3 ms. Both targets < 2 s.
- A2 discrepancy explained: exact Bright Angel (cell 81,204) gives 3,191.2 kJ;
  the browser click cell (98,203) gives 3,145.0 kJ, reproduced exactly in Node.
  It is endpoint snapping, not a model inconsistency.
- Round-trip time: Three Forks 2 h 4 min (safe); Bright Angel without stops
  7 h 45 min (exceeds 6 h window); Bright Angel + Seitah + Margin 9 h 4 min
  (exceeds both 8 h and 6 h).
- No git commands were run; no commits.

### F8 verification notes

- `python preprocess/05_traverse.py`: 402 clipped traverse features; initial
  1,010,195 B, simplified because >500 kB, final 107,593 B; 517 waypoints
  (152,143 B) with sol and dist_total_m.
- F8 direct Landing -> Three Forks: mean 400.2 m, median 358.7 m, max 869.8 m;
  within 50/100/200 m = 5.3/13.7/32.8%; our 2.59 km vs rover 13.94 km
  (sols 13 -> 674).
- F8 direct Landing -> Bright Angel: mean 159.2 m, median 109.1 m, max 630.4 m;
  within 50/100/200 m = 18.9/47.2/73.2%; our 9.52 km vs rover 27.38 km
  (nearest end waypoint sol 1189; sol 1210 is 27.43 km).
- Compare timing 92-228 ms in Node; no extra worker. Traverse layer toggles
  402 paths off/on in the browser.
- Slope table (20 m samples): Three Forks rover mean/median/max = 4.90/3.41/
  19.88°, >10/20° = 14.5/0.0%; our route 2.01/1.72/6.73°, >10/20° = 0.0/0.0%.
  Bright Angel rover same 4.90/3.41/19.88°, 14.5/0.0%; our route 2.54/2.09/
  15.77°, >10/20° = 1.0/0.0%.
- Rover/our length ratio: Three Forks 5.38x; Bright Angel 2.88x. The detour
  note is visible.
- Map regression: 30% padded max bounds, noWrap on all tile layers, initial
  grid view; zoomed drags in all four directions showed no repeated tiles;
  slope overlay, six stops and 402 traverse paths remained visible.
- MOLA hillshade now uses `maxNativeZoom: 6` so it displays upscaled at
  z11/z12 with no 404s (tile status ok). OPM remains a low-detail base at
  Jezero; an explicit **Global overview** button switches to the world view
  (z2, world max bounds, one noWrap copy) and **Back to Jezero** restores the
  padded grid view. Both tested in preview with no page errors.

### F9 verification notes

- Walkback worker now returns `previous` (Int32Array) with `cost`; no new search
  for emergency routing.
- Browser exact-ish Bright Angel with two stops: at 50% position and 20%
  consumables, return 4.66 km / 1 h 46 min, 660.9 kJ / 32.9 L needed, 60.1 kJ /
  3.0 L remaining, margin -733.0 kJ, status NOT ENOUGH; cancel removes the
  magenta path.
- Emergency at 100% and 50% on Three Forks returned OK with 2.59 km/1.27 km and
  magenta dashed path. A*/walkback timings remain under 2 s (137.6/347.0 ms
  in the F9 test).
- No git commands were run; no commits.

## Next step

F5, F6, F8 and F9 are done. F10, F11, F13, F14 and F15 are not started. No git
repository is initialized and no commits were made.
