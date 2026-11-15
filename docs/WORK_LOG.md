# Marswalk Planner — Jezero Work Log

**Project owner:** Leonardo  
**Workspace:** `C:\Users\NISSI\OneDrive\Escritorio\Software\nasa\Marswalk Planner - Jezero`  
**Work period documented:** 2026-11-14 to 2026-11-15  
**Status:** F1–F9 and F12 implemented; F10, F11, F13, F14 and F15 not started.  
**Version control:** no git repository, no commits, `.gitignore` untouched.

This document records the work actually performed in this workspace: datasets
downloaded and checked, preprocessing, features, assumptions, verification
numbers, map-navigation decisions, known limitations and remaining work.

---

## 1. Project goal

Build a static web app for the NASA Space Apps Challenge 2026 that gives a
layered, integrated view of Jezero Crater and helps a human explorer plan and
carry out a safe Marswalk with science stops. The app is centred on the
Perseverance landing site at **18.4447 N, 77.4508 E**.

The source of truth is:

- `docs/SPEC.md` — requirements and features F1–F15.
- `docs/DATASETS.md` — datasets D1–D9, URLs, local names and processing.

### Stack

- Vite + React 18, JavaScript only.
- Plain Leaflet 1.9 through refs; no react-leaflet.
- Default Leaflet Web Mercator; no custom CRS.
- Plain CSS, npm, no UI kit, router or state library.
- No backend. Offline Python preprocessing writes static files to
  `public/data/`.

### Rules followed

- All UI text, comments and docs in English.
- No invented data, coordinates or URLs.
- Distances only through `src/lib/marsGeo.js` with Mars radius **3389.5 km**.
- No `map.distance()` or `L.control.scale`.
- Every non-dataset number belongs in `src/config/assumptions.js` with a
  source and an `assumed` flag.
- Every dataset, library and tool is registered in `src/config/sources.js`.
- Provenance is appended to `used.txt`.
- Raw files live in `preprocess/raw/`; processed files in `public/data/`.

---

## 2. Datasets and raw downloads

Raw downloads are in `preprocess/raw/` and are git-ignored:

| File | Dataset | Bytes |
|---|---|---:|
| `jezero_ctx_dtm_20m.tif` | D1 CTX DTM 20 m | 9,662,387 |
| `jezero_ctx_ortho_6m.tif` | D4 CTX orthoimage 6 m | 36,269,402 |
| `M20_traverse.json` | D5 traverse | 1,723,218 |
| `M20_waypoints.json` | D5 waypoints | 603,126 |
| `meda/WE__1859...DER_PS...P01.CSV` | D6 MEDA pressure, sol 1859 | 2,596,701 |
| `meda/WE__1859...CAL_ATS...P01.CSV` | D6 MEDA air temperature, sol 1859 | 3,832,386 |
| `meda/WE__1859...CAL_RDS...P01.CSV` | D6 MEDA radiation, sol 1859 | 11,897,537 |
| `meda/WE__0313...DER_WS...P02.CSV` | D6 MEDA wind, sol 313 | 1,995,142 |

D1 uses Equirectangular Mars 2000 Sphere IAU, R = 3,396,190 m, 20 m/px.
D5 traverse has 559 features and 36,661 coordinates before clipping; D5
waypoints have 708 features.

---

## 3. Preprocessing and processed outputs

### F2 — slope and elevation

`preprocess/02_slope.py` produces:

| File | Size | Contents |
|---|---:|---|
| `slope.png` | 20,130 B | RGBA slope overlay, 600×600 |
| `slope.bin` | 1,440,000 B | Float32 slope grid, 600×600 |
| `elevation.bin` | 1,440,000 B | Float32 elevation grid, 600×600 |
| `grid.json` | 2,806 B | bounds, shape, NoData, bands and statistics |

Crop: **600×600 cells, 12×12 km**, cols 347–946, rows 459–1058.  
Bounds: lon **77.2775475–77.4799947 E**, lat **18.3638751–18.5663223 N**.  
NoData: **0 cells (0 %)**.  
Slope: min **0.0058°**, max **37.7237°**, mean **5.8571°**.  
Above 10°/20°/30°: **18.37 % / 2.78 % / 0.0381 %**.

### F6 — MEDA conditions

`preprocess/04_meda.py` writes `conditions.json` (**3,698 B**):

- full-sol temperature: **−83.094 to −21.066 °C**, mean −59.055 °C;
- EVA window 09:00–15:00 LMST: min **−62.846 °C**, mean −37.033 °C,
  max −21.066 °C, 13,034 samples;
- **24 hourly ATS means**;
- pressure: 716.61–750.86 Pa, mean 736.05 Pa (information only);
- `RDS_TOP_7`: 4.956–154.770 W/m², mean 79.496 W/m²;
- wind sol 313 (2022-01-05): mean 4.265 m/s, max 22.47 m/s.

The F6 UI status is **GO**, driven only by the minimum temperature inside the
EVA window. Pressure has an “info only” tooltip and does not enter the status.
Wind is excluded because the MEDA wind sensors were damaged by dust-laden
whirlwinds. The radiation label is **“Solar radiation (MEDA RDS)”** with
`RDS_TOP_7` in the tooltip; no UV conversion.

### F7 — science stops

`preprocess/03_science_stops.py` writes `science_stops.geojson`
(**6,661 B**, 6 features):

| Stop | Anchor sol | Sol used |
|---|---:|---:|
| Crater floor (Maaz) | 180 | 180 |
| Séítah | 200 | 200 |
| Delta front (Hawksbill Gap) | 441 | 441 |
| Three Forks sample depot | 675 | 674 |
| Margin unit (entry) | 910 | 909 |
| Neretva Vallis / Bright Angel | 1212 | 1210 |

Coordinates are approximate; all six points are inside the 12×12 km grid.

### F8 — Perseverance traverse and waypoints

`preprocess/05_traverse.py` clips D5 to the grid bounds:

| File | Contents |
|---|---|
| `traverse.geojson` | 402 clipped features, **107,593 B** |
| `waypoints.geojson` | 517 waypoints, **152,143 B** |

The clipped traverse was **1,010,195 B** before simplification, exceeding the
500 kB threshold, so it was simplified with a **5 m** tolerance. Every segment
keeps its `sol`; waypoints keep `sol` and `dist_total_m`.

---

## 4. Feature log

### F1 — Jezero base map

- Leaflet map with OPM basemap v0.1, MOLA hillshade, M20 HiRISE grayscale,
  M20 HiRISE color and M20 place names.
- Default base: `m20-gray`; landing-site marker with popup
  “Octavia E. Butler Landing (Perseverance, Mars 2020)”.
- Tile status box, one-time per-layer console warnings, StrictMode-safe map
  cleanup.
- `MapContext` exposes the map to the other features.
- `npm run check:tiles` probes every tile layer and recorded TMS/zoom ranges.

**Map navigation fix (2026-11-15):**

- All tile layers use `noWrap: true`, so the world no longer repeats sideways.
- `maxBounds` = grid bounds plus **30 % padding** in longitude and latitude.
- `maxBoundsViscosity: 1.0`.
- `worldCopyJump: false`.
- Initial view uses `fitBounds(gridBounds, { padding: [20, 20] })`.
- `minZoom` is `Math.floor(getBoundsZoom(paddedBounds))` and is recalculated
  on resize. In the 1440×900 preview the initial zoom is **12** and minimum
  zoom is **11**; it is not possible to zoom out to a planet-wide view.
- `MapView` keeps a stable `mapGrid` object, so `RouteContext` updates for
  stops/routes/walkback never destroy or recreate a live map.

**Why OPM no longer shows the whole planet:** OPM is a base layer, not the
default and not an overlay. The previous globe-wide view came from the old
free navigation. The new `maxBounds` and `minZoom` intentionally restrict the
view to Jezero plus 30 % padding. `noWrap` prevents repeats but is not the
main cause. OPM is also low-detail at z11 over Jezero; M20 HiRISE provides the
detail. A global overview mode would be a new feature and is not implemented.

### F2 — slope overlay

- Toggle, opacity slider, legend and max-slope statistic.
- Uses the shared slope bands in `src/config/slopeBands.json`.
- Overlay aligns with the delta front and crater rims.

### F3/F4 — route and metrics

- A* in a Web Worker with slopes above **30°** and NoData blocked.
- Start, stops and destination set by map clicks; route points and stop
  markers drawn in Leaflet.
- Metrics: distance, ascent, descent, max slope, walking time and SVG
  elevation profile.
- Tobler walking speed multiplied by the assumed suit speed factor **0.5**.
- Route limited to the 12×12 km grid.

### F5 — consumables, energy and walkback

- Minetti 2002 walking cost with gradient clamp **±0.45**.
- Crew + suit mass **180 kg**; Mars/Earth gravity scaling **3.71/9.81**.
- Energy capacity: **300 W × 8 h × 3600 = 8.64 MJ**.
- O2 capacity: **429.9 L** at 100 %.
- Each 30-minute science stop adds **540 kJ** and **26.87 L O2** from that
  route vertex onward.
- Consumables-at-start slider: **20–100 %, step 5, default 100 %**.
- Energy and O2 bars show used, capacity and remaining.
- Reverse Dijkstra cost-to-base field in a worker; unsafe segments are red.
- Panel shows the first point of no return with remaining energy, return cost
  and margin.
- Round-trip time = outbound walking + time at stops + walking back to base
  along the walkback path. It is checked against **EVA duration 8 h** and the
  **6 h daylight EVA window** (09:00–15:00 LMST).

Verification:

| Case | Energy | O2 | % capacity |
|---|---:|---:|---:|
| Flat 2 km | 337.0 kJ | 16.76 L | 3.90 % |
| 5 % climb, 2 km | 485.2 kJ | 24.14 L | 5.62 % |
| Bright Angel without stops | 1,978.5 kJ | 98.43 L | 22.9 % |
| Bright Angel + Séítah + Margin | 3,191.2 kJ | 158.77 L | 36.94 % |

- Bright Angel without stops: first unsafe slider **40 %**.
- Bright Angel with two stops: first unsafe slider **55 %**; **50 %** shows a
  clear red segment and the warning.
- Browser route with two stops: 9.94 km, 3,145 kJ, 156.5 L; first unsafe at
  55 %.
- Round trip: Three Forks **2 h 4 min** (safe); Bright Angel without stops
  **7 h 45 min** (exceeds 6 h window); Bright Angel with two stops
  **9 h 4 min** (exceeds both 8 h and 6 h).

**Node vs browser energy discrepancy:** exact Bright Angel cell 81,204 gives
3,191.2 kJ; browser click cell 98,203 gives 3,145.0 kJ. Node with cell 98,203
reproduces 3,145.0 kJ. This is endpoint snapping, not a model inconsistency.

### F6 — conditions panel

- Full-sol temperature range and EVA-window minimum displayed.
- Status GO.
- Pressure card labelled “info only” with a tooltip.
- Solar radiation and wind shown separately.
- Thresholds and EVA window marked as assumptions.

### F7 — science stops

- Six numbered markers with detail cards.
- **Add to route** appends the stop from `science_stops.geojson`.
- Marker offsets for Maaz and Bright Angel avoid overlap with other stops.

### F8 — Perseverance validation

- Toggle **Perseverance traverse** at the bottom centre; orange line, legend,
  NASA/JPL-Caltech credit.
- `compare.js` is pure JS:
  - resample our route every **20 m**;
  - nearest traverse point distance;
  - mean, median, max;
  - percentage within **50/100/200 m**;
  - rover driven length from nearest waypoints, by sol order;
  - rover/our length ratio.
- Slope comparison samples `slope.bin` every **20 m** along the clipped
  traverse and our route.
- One-click preset **Landing → Three Forks (sol 674)** calculates the route and
  runs the comparison.
- Honest note: the rover traverse is a sanity check, not ground truth.

Direct results:

| Route | Mean | Median | Max | ≤50 m | ≤100 m | ≤200 m | Our length | Rover length |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Landing → Three Forks | 400.2 m | 358.7 m | 869.8 m | 5.3 % | 13.7 % | 32.8 % | 2.59 km | 13.94 km (sol 13→674) |
| Landing → Bright Angel | 159.2 m | 109.1 m | 630.4 m | 18.9 % | 47.2 % | 73.2 % | 9.52 km | 27.38 km (sol 13→1189) |

For Bright Angel, the nearest end waypoint is sol 1189; sol 1210 gives
27.43 km. Rover/our length ratios are **5.38×** and **2.88×**. The UI note says
“Includes science detours and exploration between those sols.”

Slope table (20 m samples):

| Metric | Rover traverse | Three Forks route | Bright Angel route |
|---|---:|---:|---:|
| Mean slope | 4.90° | 2.01° | 2.54° |
| Median slope | 3.41° | 1.72° | 2.09° |
| > 10° | 14.5 % | 0.0 % | 1.0 % |
| > 20° | 0.0 % | 0.0 % | 0.0 % |
| Max slope | 19.88° | 6.73° | 15.77° |

The UI sentence is: “If the rover also avoids steep terrain, that supports our
slope-based cost; same-slope behaviour is evidence, not proof.”

### F9 — emergency return

- Slider **Position along route**, 0–100 %, step 1, default 100 %.
- Magenta marker at the selected route point.
- The walkback worker stores a `previous` `Int32Array` with `cost`.
- **Emergency: return to base** reconstructs the lowest-energy path from that
  position to the base without a new search.
- Dashed magenta return path; route remains visible.
- Shows return distance, walking time, energy/O2 needed, energy/O2 remaining,
  margin and **OK / NOT ENOUGH**.
- **Cancel emergency** removes the return path.

Verification:

- Bright Angel + two stops, consumables 20 %, position 50 %:
  return **4.66 km / 1 h 46 min**, **660.9 kJ / 32.9 L O2** needed,
  **60.1 kJ / 3.0 L O2** remaining, margin **−733.0 kJ**, status
  **NOT ENOUGH**; cancel removes the magenta path.
- Three Forks at 100 % and 50 % positions: **OK**; return 2.59 km and 1.27 km.

### F12 — Data & Credits

- Modal generated from `sources.js` and `assumptions.js`.
- Sources: **24**.
- Assumptions: **22** (17 assumed, 5 sourced).
- Includes the D5 traverse source and the F8 comparison/slope settings.

### Map layers and credits

- OPM basemap v0.1, MOLA hillshade, M20 HiRISE grayscale/color, M20 place
  names and the slope overlay.
- Perseverance traverse GeoJSON layer with toggle and credit.
- Data & Credits modal is reachable from the topbar.

---

## 5. Important assumptions

- Max walkable slope: **30°**.
- Suit speed factor: **0.5**.
- Astronaut + suit mass: **180 kg**.
- Suit duration: **8 h**.
- Return margin: **20 %**.
- Oxygen energy: **20.1 kJ/L**.
- Nominal metabolic rate: **300 W**.
- Consumables default: **100 %**.
- Science stop time: **30 min**.
- Conditions: temp GO ≥ **−75 °C**, caution ≥ **−90 °C**, EVA window
  **09:00–15:00 LMST**.
- F8 comparison resample: **20 m**; distance bands **50/100/200 m**; slope
  bands **10°/20°**.
- F8 traverse simplification threshold **500 kB**, tolerance **5 m**.
- F9 emergency default position: **100 %**.

Exact sources and flags are in `src/config/assumptions.js`. Provenance is in
`used.txt` (**41 entries**).

---

## 6. Verification summary

### Build

- Vite production build: **50 modules**.
- JS: **366.83 kB** (107.53 kB gzip).
- CSS: **34.49 kB** (9.99 kB gzip).
- A* worker: **3.65 kB**.
- Walkback worker: **3.40 kB**.
- `npm run preview` tested.

### Performance

- A* in the final regression: **111.7 ms**.
- Walkback Dijkstra with predecessors: **1,757.9 ms**.
- Earlier F8/F9 runs: A* 29.1/137.6 ms; walkback 667.6/347.0 ms.
- All targets are under **2 s**.

### Map regression

- Initial view fits the grid; 1440×900 preview initial zoom 12, minimum 11.
- Zoom-out stops after one level and cannot reach a planet view.
- Zoomed drags east, west, north and south stop at padded edges.
- No repeated tiles; 402 traverse paths, six science markers and the slope
  overlay remain visible.
- No console or page errors.

### F8/F9 regression

- Three Forks preset works and auto-runs comparison.
- Slope table and rover/our ratio visible.
- Traverse toggle removes/re-adds 402 paths.
- F9 emergency at 50 % position works; cancel removes the magenta path.
- Existing overlap numbers remain visible.

---

## 7. Known limitations

- OPM is a base layer, not the default; it is low-detail at the Jezero zoom.
  The whole-planet view was intentionally removed by the map restriction.
- D5 traverse is clipped to the 12×12 km grid and simplified above 500 kB.
- F8 comparison is a sanity check, not rover ground truth; wheels, hazards and
  science targets impose different constraints.
- F5 is a first-order Minetti model with first-order Mars gravity scaling.
- F9 follows the lowest-energy walkback path, not a time-optimal search.
- F6 uses published MEDA data, not real-time weather; wind is excluded.
- F7 coordinates are approximate.
- F1 tile errors for MOLA above z6 are expected and reported by the status
  box; the URL was not modified.

---

## 8. Remaining work

Not started:

- F10 — risk-vs-science control.
- F11 — time-of-day window.
- F13 — data-confidence layer.
- F14 — astronaut mode.
- F15 — AI route assistant.

Optional:

- GDAL CLI for literal `gdalinfo -stats`.
- Public demo deployment and submission checklist.

---

## 9. Commands

```powershell
npm install
npm run dev

# Production
npm run build
npm run preview

# Data regeneration
python preprocess/02_slope.py
python preprocess/03_science_stops.py
python preprocess/04_meda.py
python preprocess/05_traverse.py
```

`COMMANDS.md` contains the raw download commands, tile checks, expected file
sizes and troubleshooting.

---

## 10. Version control

- No git repository exists in this workspace.
- No commits were made.
- `.gitignore` was not modified.
- Raw D5/MEDA downloads are covered by the existing `preprocess/raw/*`
  ignore rules.
- `public/data/traverse.geojson` and `public/data/waypoints.geojson` are
  versioned app data, not ignored.
