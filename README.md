# Marswalk Planner — Jezero Crater

A static web app for the NASA Space Apps Challenge 2026. It builds a layered view of
Jezero Crater, the Perseverance landing site (18.4447 N, 77.4508 E), and will grow
into an EVA planner with slope-aware routing, human consumables, weather and science
stops.

The source of truth for requirements and data is:

- `docs/SPEC.md` — challenge requirements, features F1–F15 and assumptions.
- `docs/DATASETS.md` — datasets D1–D9, URLs, local file names and processing commands.

## Current status

F1 (base map), F2 (slope overlay), F3 (A* route), F4 (walk metrics), F5
(consumables, round-trip time and walkback), F6 (conditions), F7 (science stops),
F8 (rover-traverse comparison), F9 (emergency return) and F12 (Data & Credits)
are implemented.

- Slim dark topbar and full-height Leaflet map.
- Default base: **Jezero HiRISE color (25 cm)** at zoom 12, with a permanent
  OPM Mars fallback underneath.
- Available layers: OPM basemap v0.1, MOLA hillshade, Jezero HiRISE color (25 cm)
  and M20 place names.
- Collapsible left planner sidebar and right Map layers card with basemap,
  slope, traverse and place-name controls.
- `L.circleMarker` at the landing site with the popup
  “Octavia E. Butler Landing (Perseverance, Mars 2020)”.
- Tile diagnostics are available only with `?debug=1`; normal UI has no tile
  status panel.
- F2 slope overlay (600×600 cells, 12×12 km) with below-10° transparent,
  55% default opacity, colour legend and max-slope statistic.
- F3/F4 route planner: set start/stops/destination, A* with slopes above 30°
  blocked, route metrics and an SVG elevation profile.
- F5 consumables: energy and O2 bars, a Consumables-at-start slider
  (20–100 %, default 100 %), science-stop energy and a reverse-Dijkstra
  walkback check with a point-of-no-return warning.
- F5 round-trip time: outbound walking + time at stops + return walking along
  the walkback path, checked against the 8 h EVA duration and the 6 h daylight
  window.
- F6 conditions panel from MEDA: full-sol temperature, EVA-window (09:00–15:00
  LMST) minimum for the status, pressure as information only, solar radiation
  and wind.
- F7 six science stops with detail cards and **Add to route**.
- F8 Perseverance traverse layer (clipped D5 line) and a pure-function
  comparison: mean/median/max distance and coverage within 50/100/200 m.
  It also samples `slope.bin` every 20 m and compares mean/median/max slope and
  the percentage above 10°/20° for the rover traverse and our route.
- F9 emergency return: position slider, marker, lowest-energy path from
  `costToBase`/predecessors, return consumables and OK/NOT ENOUGH status.
- UX/UI pass: Start/Destination/Science stops stepper, presets, walk summary,
  mission-assumptions and validation accordions, conditions chip/drawer,
  responsive sidebar and route legend.
- Map navigation is locked to the grid plus 30 % padding; tile layers have
  `noWrap`, the initial view fits the grid, and the minimum zoom is the padded
  area fit (no planet-wide view).
- F12 Data & Credits modal generated from `sources.js` and `assumptions.js`,
  with assumed/sourced badges.
- Map instance exposed through `MapContext` for future features.

### Known limitations

- The M20 detail layers only cover the Jezero area. Outside that coverage the
  map is blank, and the status box says so.
- The OPM MOLA hillshade has native tiles only at zoom 0–6; Leaflet upscales
  z6 at the Jezero view. A Global overview button is available for planet-wide
  OPM context.
- The M20 detail tiles are TMS. XYZ requests return 403, so `tms: true` is
  required.
- The place-names overlay is clipped to the measured z12 tile rectangle because
  the nominal MMGIS bounding box includes tiles that return 403.
- The slope overlay and the route planner share the 12×12 km D1 crop. Points
  outside it are rejected with a message.
- F6 uses the latest published MEDA data, not real-time weather; the status
  uses the EVA-window minimum temperature, pressure is information only, and
  wind is excluded.
- F7 coordinates are approximate; they come from the D5 waypoint at each
  anchor sol.
- F5 is a first-order Minetti model with a first-order Mars gravity scaling
  (3.71/9.81). It is not a validated EVA physiology model.
- F8 compares against a traverse clipped to the 12×12 km grid and simplified
  because the clipped file exceeded 500 kB. The rover is a sanity check, not
  ground truth: wheels, hazards and science targets impose different
  constraints.
- F9 follows the lowest-energy walkback path from the selected position; it is
  not a new time-optimal search.
- The colour bands, suit speed factor, F6 status thresholds, F5 consumables,
  F8 comparison settings and F9 default position are project assumptions
  documented in `src/config/assumptions.js`.

## Quick start

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173/`. The slope overlay needs the F2
preprocessed files; they are already present in `public/data/`. To regenerate
them:

```powershell
python -m ensurepip --upgrade
python -m pip install rasterio
python preprocess/02_slope.py
```

See `COMMANDS.md` for every command (setup, dev, build, tile check, data
download, F2 preprocessing and troubleshooting).

Production build:

```bash
npm run build
npm run preview
```

Tile verification (probes every layer in `src/config/layers.js` at the landing
site, zoom 6–19):

```bash
npm run check:tiles
```

The script uses only Node's built-in `fetch`, sleeps between requests, and prints
HTTP status, content type, byte size and PNG dimensions for each tile.

## Map layers and sources

| Layer | Kind | Default | Verified range | Source |
|---|---|---|---|---|
| OPM basemap v0.1 | base | no | HTTP 200 z6–19 | OpenPlanetaryMap |
| MOLA hillshade | base | no | HTTP 200 z6 only; 404 z7+ | NASA/MOLA, OPM tiles |
| Jezero HiRISE grayscale (25 cm) | base | **yes** | HTTP 200 z0–18; 403 z19 | NASA Mars 2020 MMGIS |
| Jezero HiRISE color (25 cm) | base | no | HTTP 200 z10–18; 403 outside | NASA Mars 2020 MMGIS / Posit forum hint |
| M20 place names | overlay | **yes** | HTTP 200 z4–18; 403 outside | NASA Mars 2020 MMGIS |
| Slope (20 m) | image overlay | **yes** | 600×600 crop, 12×12 km | D1 CTX DTM 20 m |
| Perseverance traverse | GeoJSON line | **yes** | D5 clipped to 12×12 km | NASA/JPL-Caltech D5 |

All tile layers use `noWrap: true`. The map is limited to the 12×12 km grid
plus 30 % padding, opens fitted to the grid, and cannot zoom out to a
planet-wide view.

The full source registry is in `src/config/sources.js`. The **Data & Credits**
button in the topbar renders it, together with the assumptions table.

## Using the route planner

1. Click **Set start**, then click the map.
2. Click **Add stop** for each intermediate science stop, then click the map.
3. Click **Set destination**, then click the map.
4. Click **Calculate route**.

The route panel shows distance, ascent, descent, maximum slope and the Tobler
time estimate (with the assumed suit speed factor). A small SVG shows the
elevation profile. Slopes above 30° and NoData cells are blocked. Points outside
the 12×12 km route grid are rejected with a message.

Science stops are the six numbered markers on the map. Click one to open its
card, then **Add to route** to append it as a stop.

### Consumables and walkback

The route panel includes a **Consumables at start** slider (20–100 %, default
100 %). It scales energy and O2 capacity and the walkback check. Each route stop
adds 30 minutes of nominal metabolic energy (540 kJ) from that vertex onward.

Energy and O2 bars show used, capacity and remaining values. A reverse Dijkstra
cost-to-base field is computed in a Web Worker; unsafe route segments are drawn
red and the panel shows the first **point of no return** with its remaining
energy, return cost and margin.

The F5 model is first-order: Minetti 2002 walking cost, 180 kg crew + suit,
and a first-order Mars gravity scaling (3.71/9.81). It is not a validated EVA
physiology model.

### Round-trip time

The route panel shows outbound walking time, time at stops, and walking time
back to base along the walkback path. Their sum is checked against the assumed
8 h EVA duration and the 6 h daylight window (09:00–15:00 LMST); either excess
is shown as a visible warning.

### Perseverance comparison (F8)

Use the **Perseverance traverse** toggle at the bottom of the map to show or hide
the clipped D5 line. With a route on screen, **Compare with Perseverance** reports
mean, median and maximum distance to the traverse and the percentage of our
route within 50, 100 and 200 m. It also compares our length with the rover's
driven length between the nearest waypoints, shows the rover/our length ratio and
notes that the rover length includes science detours and exploration.

The result also has a **Rover traverse vs our route** slope table: mean slope,
median slope, % above 10°, % above 20° and maximum slope, sampled from
`slope.bin` every 20 m. The **Landing → Three Forks (sol 674)** button runs that
route and its comparison in one click.

The rover is a sanity check, not ground truth: its wheels, hazards and science
targets impose different constraints.

### Emergency return (F9)

When a route exists, the **Position along route** slider places a magenta marker
on the route. **Emergency: return to base** follows the predecessor path from
that point to the base, draws it dashed in magenta, and reports return distance,
walking time, energy/O2 needed and remaining, and an **OK / NOT ENOUGH** status.
**Cancel emergency** removes the return path.

## How to regenerate the data

`preprocess/raw/` is git-ignored, so a fresh clone does not contain the source
datasets. Download these files from the URLs in `docs/DATASETS.md`:

| Local raw file | Dataset |
|---|---|
| `preprocess/raw/jezero_ctx_dtm_20m.tif` | D1 CTX DTM 20 m |
| `preprocess/raw/jezero_ctx_ortho_6m.tif` | D4 CTX orthoimage 6 m |
| `preprocess/raw/M20_traverse.json` | D5 traverse |
| `preprocess/raw/M20_waypoints.json` | D5 waypoints |
| `preprocess/raw/meda/WE__1859...DER_PS...P01.CSV` | D6 MEDA pressure, sol 1859 |
| `preprocess/raw/meda/WE__1859...CAL_ATS...P01.CSV` | D6 MEDA air temperature, sol 1859 |
| `preprocess/raw/meda/WE__1859...CAL_RDS...P01.CSV` | D6 MEDA radiation, sol 1859 |
| `preprocess/raw/meda/WE__0313...DER_WS...P02.CSV` | D6 MEDA wind, sol 313 |

The exact `curl` commands for all files are in `COMMANDS.md`.

Then run the preprocessing and the app:

```powershell
python -m ensurepip --upgrade
python -m pip install rasterio
python preprocess/02_slope.py
python preprocess/04_meda.py
python preprocess/03_science_stops.py
python preprocess/05_traverse.py
npm install
npm run dev
```

`public/data/` is versioned because the app serves those processed files
directly. `preprocess/raw/` stays local.

## Data status

Raw downloads are in `preprocess/raw/` and are git-ignored:

| File | Dataset | Bytes | Check |
|---|---|---:|---|
| `jezero_ctx_dtm_20m.tif` | D1 CTX DTM 20 m | 9,662,387 | TIFF, 1596 × 1512, float32 |
| `jezero_ctx_ortho_6m.tif` | D4 CTX ortho 6 m | 36,269,402 | TIFF, 5322 × 5040, 8-bit |
| `M20_traverse.json` | D5 traverse | 1,723,218 | GeoJSON, 559 features |
| `M20_waypoints.json` | D5 waypoints | 603,126 | GeoJSON, 708 features |

D1 metadata: Equirectangular Mars 2000 Sphere IAU, R = 3,396,190 m, 20 m/px,
lon 77.160465–77.698975 E, lat 18.211027–18.721194 N, elevation −2710.70 to
−1515.54 m, NoData −3.4028e38. The landing site is inside the raster.

F2 processed files are in `public/data/` and are included in the production build:

| File | Size | Contents |
|---|---:|---|
| `slope.png` | 20,130 B | RGBA slope overlay, 600×600 |
| `slope.bin` | 1,440,000 B | Float32 slope grid, 600×600 |
| `elevation.bin` | 1,440,000 B | Float32 elevation grid, 600×600 |
| `grid.json` | 2,806 B | bounds, shape, cell size, NoData, bands and stats |
| `conditions.json` | 3,698 B | F6 MEDA conditions, 24 hourly ATS means, wind sol 313 |
| `science_stops.geojson` | 6,661 B | F7 six approximate science stops |
| `traverse.geojson` | 107,593 B | F8 D5 traverse clipped and simplified |
| `waypoints.geojson` | 152,143 B | F8 517 D5 waypoints inside the grid |

The crop is lon 77.2775475–77.4799947 E, lat 18.3638751–18.5663223 N. NoData
is 0 %. Slope statistics: min 0.0058°, max 37.7237°, mean 5.8571°; 18.37 % of
cells are above 10°, 2.78 % above 20°, and 0.0381 % above 30°. Elevation in the
crop is −2621.00 to −1741.16 m. All six F7 stop cells are valid (not NoData).

The raw D5 traverse is 1,010,195 B after clipping, above the 500 kB threshold;
`preprocess/05_traverse.py` simplifies it to 107,593 B with a 5 m tolerance.
Waypoints keep `sol` and `dist_total_m` for the rover-length comparison.

## Preprocessing prerequisites

F1 does not need Python. F2/F6/F7 do. On this Windows machine:

- Python 3.13.5, NumPy 2.2.2 and Pillow 11.1.0 are present.
- `pip` and `rasterio` 1.5.2 are now installed.
- GDAL CLI is optional and still missing.

Install or refresh the Python tools:

```powershell
python -m ensurepip --upgrade
python -m pip install rasterio
python -c "import rasterio; print(rasterio.__version__)"
```

Regenerate the derived data:

```powershell
python preprocess/02_slope.py
python preprocess/04_meda.py
python preprocess/03_science_stops.py
python preprocess/05_traverse.py
```

The MEDA raw CSVs must be present in `preprocess/raw/meda/`; download commands are
in `COMMANDS.md`.

GDAL is only needed for the literal `gdalinfo -stats` output or future GDAL
workflows:

```powershell
winget install --id GISInternals.GDAL -e --accept-source-agreements --accept-package-agreements
```

Open a new terminal afterwards and check `gdalinfo --version`. QGIS LTR is an
alternative (`winget install --id OSGeo.QGIS_LTR -e`) and includes GDAL in its
OSGeo4W Shell.

## Project structure

```
COMMANDS.md            Every setup/run/build/check/preprocess command.
docs/                  Requirements and dataset reference.
preprocess/            Offline Python pipeline: 02_slope, 03_science_stops, 04_meda, 05_traverse.
preprocess/raw/        Git-ignored raw downloads, including MEDA CSVs.
public/data/           Processed F2/F6/F7/F8 outputs served by the app.
scripts/check_tiles.mjs  npm run check:tiles.
src/config/            layers, sources, assumptions, presets and slope bands.
src/context/           MapContext and RouteContext.
src/lib/               marsGeo distances, grid loader, A*, walkback worker, effort, compare and stubs.
src/components/        MapView, SlopePanel, RoutePanel, ConditionsPanel, ScienceStops, ScienceCard, TraverseLayer, Credits.
```

## Mars geometry

All geographic distances go through `src/lib/marsGeo.js`, using the Mars mean
radius **3389.5 km**. Leaflet's `map.distance()` and `L.control.scale` are Earth
based and must not be used.

## Next step

F5, F6, F8 and F9 are done. F10, F11, F13, F14 and F15 are not started. No git
repository is initialized, and no commits were made.
