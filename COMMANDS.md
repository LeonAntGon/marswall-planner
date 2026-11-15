# Commands — Marswalk Planner (Jezero)

All commands below are for Windows PowerShell in the project root:

```
C:\Users\NISSI\OneDrive\Escritorio\Software\nasa\Marswalk Planner - Jezero
```

## 1. First-time setup

Requirements:

- Node.js 22+ and npm 11+
- Python 3.13+ for the offline preprocessing
- Internet access for npm and NASA tiles

Install the app dependencies:

```powershell
npm install
```

Install the Python preprocessing dependencies once:

```powershell
python -m ensurepip --upgrade
python -m pip install rasterio
python -c "import rasterio; print('rasterio', rasterio.__version__)"
```

`numpy` and `pillow` are already present on this machine. If they are missing:

```powershell
python -m pip install numpy pillow
```

GDAL is **not required** for F2 because the slope script uses rasterio. Install it only if you want the literal `gdalinfo -stats` output or future GDAL workflows:

```powershell
winget install --id GISInternals.GDAL -e --accept-source-agreements --accept-package-agreements
```

Open a new terminal afterwards and check:

```powershell
gdalinfo --version
```

## 2. Run the app

```powershell
npm run dev
```

Open:

```
http://localhost:5173/
```

Expected initial view:

- Jezero Crater, zoom 12.
- Jezero HiRISE grayscale base layer.
- M20 place names overlay.
- Orange landing-site marker with the popup “Octavia E. Butler Landing (Perseverance, Mars 2020)”.
- Slope panel at the bottom-right with checkbox, opacity slider, legend and max-slope statistic.
- Route panel at the top-left with start/stop/destination controls.
- Conditions panel at the right with MEDA temperature, pressure, solar radiation, wind and a GO status.
- Six numbered science-stop markers on the map.
- Perseverance traverse checkbox, orange legend and NASA/JPL-Caltech credit at the bottom centre.
- Map fitted to the 12×12 km grid; navigation limited to the grid plus 30% padding. No tile world wrap.

To calculate a route:

1. Click **Set start**, then click the map.
2. Click **Add stop** for each intermediate stop, then click the map.
3. Click **Set destination**, then click the map.
4. Click **Calculate route**.

The panel shows distance, ascent, descent, max slope, Tobler time and an
elevation profile. Slopes above 30° are blocked. Points outside the 12×12 km
grid are rejected.

Click a numbered science marker to open its card, then **Add to route** to
append it as a route stop.

Click **Data & Credits** in the topbar to open the source and assumption list.

Press `Ctrl+C` in the terminal to stop the server.

If port 5173 is busy:

```powershell
npx vite --port 5174
```

Then open `http://localhost:5174/`.

## 3. Production build

```powershell
npm run build
```

The output goes to `dist/`. It includes the app and `public/data/`.

Preview the production build:

```powershell
npm run preview
```

Open:

```
http://localhost:4173/
```

## Unit tests

```powershell
npm test
```

Runs the pure-logic regression tests in `tests/*.test.js` with the built-in Node test runner (`node:test`). No extra dependencies and no network access.

## 4. Tile verification

```powershell
npm run check:tiles
```

This probes every tile layer in `src/config/layers.js` at the landing site for zoom 6–19 and prints HTTP status, content type, byte size and PNG dimensions. It takes roughly 1–2 minutes and makes network requests to NASA and OPM. The script retries one 403/429/5xx response per tile after 3 seconds.

Expected highlights:

- `m20-gray`: HTTP 200 at z0–z18; 403 at z19.
- `m20-rgb`: 403 at z0–z9; 200 at z10–z18; 403 at z19.
- `m20-placenames`: 403 at z0–z3; 200 at z4–z18; 403 at z19.
- `opm-hillshade`: 200 only at z6; 404 above z6.
- `opm-basemap`: 200 at z6–z19.

## 5. Build the F2 slope outputs

Run from the project root:

```powershell
python preprocess/02_slope.py
```

It reads `preprocess/raw/jezero_ctx_dtm_20m.tif`, crops 600×600 cells (12×12 km) centred at 18.4650 N, 77.3787 E, calculates slope in degrees and writes:

| File | Size | Contents |
|---|---:|---|
| `public/data/slope.png` | 20,130 B | RGBA slope overlay |
| `public/data/slope.bin` | 1,440,000 B | Float32 slope grid, 600×600 |
| `public/data/elevation.bin` | 1,440,000 B | Float32 elevation grid, 600×600 |
| `public/data/grid.json` | 2,806 B | bounds, shape, NoData, bands and statistics |

Expected summary:

```
crop: cols 347..946, rows 459..1058 (600x600)
bounds: lon 77.2775475..77.4799947, lat 18.3638751..18.5663223
landing pixel in crop: 513.4746, 360.4563
slope: min 0.0058 deg, max 37.7237 deg, mean 5.8571 deg
above 30 deg: 0.038% of 360000 valid cells
```

The script is safe to re-run; it overwrites the four outputs.

## 6. Verify the F2 outputs

Check the files and sizes:

```powershell
Get-Item public\data\slope.png, public\data\slope.bin, public\data\elevation.bin, public\data\grid.json | Select-Object Name,Length
```

Check the grid metadata and statistics:

```powershell
python -c "import json; g=json.load(open('public/data/grid.json')); print(g['rows'], g['cols']); print(g['bounds']); print(g['stats'])"
```

Check the binary arrays:

```powershell
python -c "import numpy as np; s=np.fromfile('public/data/slope.bin',dtype='<f4'); e=np.fromfile('public/data/elevation.bin',dtype='<f4'); print(s.shape, e.shape); print(float(s[s>-9999].max()), float(e[e>-9999].max()))"
```

Expected: shapes `(360000,)`, slope max `37.723694`, elevation max `-1741.1643`.

## F6 — MEDA conditions

Create the raw directory and download the four selected MEDA products:

```powershell
New-Item -ItemType Directory -Force preprocess\raw\meda | Out-Null
$base = "https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/"
curl.exe -L --fail -o preprocess/raw/meda/WE__1859___________DER_PS__________________P01.CSV ($base + "data_derived_env/sol_1740_1859/sol_1859/WE__1859___________DER_PS__________________P01.CSV")
curl.exe -L --fail -o preprocess/raw/meda/WE__1859___________CAL_ATS_________________P01.CSV ($base + "data_calibrated_env/sol_1740_1859/sol_1859/WE__1859___________CAL_ATS_________________P01.CSV")
curl.exe -L --fail -o preprocess/raw/meda/WE__1859___________CAL_RDS_________________P01.CSV ($base + "data_calibrated_env/sol_1740_1859/sol_1859/WE__1859___________CAL_RDS_________________P01.CSV")
curl.exe -L --fail -o preprocess/raw/meda/WE__0313___________DER_WS__________________P02.CSV ($base + "data_derived_env/sol_0300_0419/sol_0313/WE__0313___________DER_WS__________________P02.CSV")
```

Build `conditions.json`:

```powershell
python preprocess/04_meda.py
Get-Item public\data\conditions.json
```

Expected: `conditions.json` 3,698 B; status **GO**; full-sol temperature −83.1
to −21.1 °C; EVA-window (09:00–15:00 LMST) minimum −62.8 °C; pressure 736.0 Pa
mean (information only); `RDS_TOP_7` 79.5 W/m² mean; wind sol 313 (2022-01-05)
4.3 m/s mean.

## F7 — science stops

```powershell
python preprocess/03_science_stops.py
Get-Item public\data\science_stops.geojson
```

Expected: 6 features, 6,661 B; sols 180, 200, 441, 674, 909 and 1210.

## F8 — Perseverance traverse and comparison

```powershell
python preprocess/05_traverse.py
Get-Item public\data\traverse.geojson,public\data\waypoints.geojson
```

Expected: `traverse.geojson` 402 clipped features, 107,593 B (1,010,195 B before
the required 5 m simplification); `waypoints.geojson` 517 waypoints, 152,143 B.
In the app, toggle **Perseverance traverse** at the bottom of the map and use
**Compare with Perseverance** or the **Landing → Three Forks (sol 674)** preset.
The result includes mean/median/max distance, % within 50/100/200 m, the
rover/our length ratio, and a slope table sampled every 20 m (mean, median,
% above 10°/20°, max).

## F5 - consumables and walkback

F5 has no separate preprocess command; it uses the F2 grid and the route panel.

1. Set a start, add science stops, set a destination and click **Calculate
   route**.
2. Use **Consumables at start** (20–100 %, default 100 %) to scale energy/O2
   capacity and the walkback check.
3. The panel shows energy/O2 bars and a walkback message. Unsafe segments are
   red.

Expected demo values for Landing → Bright Angel with two stops (Séítah and
Margin unit): the first unsafe point appears at **55 %**; use **50 %** to show a
clear red segment and the point-of-no-return warning. Without stops the first
unsafe point appears at **40 %**.

The **Time check** row reports outbound walking + time at stops + return walking
along the walkback path, compared with the 8 h EVA duration and 6 h window.
Landing → Bright Angel with two stops gives **9 h 4 min** and both warnings.

## F9 — emergency return

With a route on screen, move **Position along route** and click **Emergency:
return to base**. The dashed magenta path follows the walkback predecessors; the
panel reports return km/time, energy/O2 needed and remaining, margin and
**OK / NOT ENOUGH**. **Cancel emergency** removes the path.

## 7. Re-download the raw datasets (only if `preprocess/raw/` is empty)

The raw downloads are git-ignored. To restore them:

```powershell
curl.exe -L --fail --retry 3 -o preprocess/raw/jezero_ctx_dtm_20m.tif "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif"
curl.exe -L --fail --retry 3 -o preprocess/raw/jezero_ctx_ortho_6m.tif "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif"
curl.exe -L --fail --retry 3 -o preprocess/raw/M20_traverse.json "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json"
curl.exe -L --fail --retry 3 -o preprocess/raw/M20_waypoints.json "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json"
```

Verify the files:

```powershell
Get-Item preprocess\raw\* | Select-Object Name,Length
& 'C:\Program Files\Git\usr\bin\file.exe' preprocess\raw\jezero_ctx_dtm_20m.tif preprocess\raw\jezero_ctx_ortho_6m.tif preprocess\raw\M20_traverse.json preprocess\raw\M20_waypoints.json
```

Expected sizes: D1 `9,662,387 B`; D4 `36,269,402 B`; traverse `1,723,218 B`; waypoints `603,126 B`.

## 8. After changing data or config

Rebuild the production bundle so `dist/` contains the latest `public/data`:

```powershell
npm run build
```

If you change a tile URL or zoom range, re-run:

```powershell
npm run check:tiles
```

For the map-navigation fix, verify in `npm run preview`: initial view is the
Jezero grid, dragging/zooming stops at the padded edge, and no repeated tiles
appear in any direction.

If you regenerate F2/F6/F7/F8 data, run the corresponding script and then
`npm run build` so `dist/` contains the new files.

## 9. Troubleshooting

**`python` opens the Microsoft Store or `python3` fails**

Use `python` (the installed 3.13 interpreter), not `python3`.

**`ModuleNotFoundError: No module named 'rasterio'`**

```powershell
python -m ensurepip --upgrade
python -m pip install rasterio
```

If permission is denied, add `--user`:

```powershell
python -m pip install --user rasterio
```

**`Slope data unavailable. Run preprocess/02_slope.py.` in the app**

The app could not fetch `/data/grid.json`. Run the F2 script from the project root and rebuild if you are testing `dist/`:

```powershell
python preprocess/02_slope.py
npm run build
```

**The slope panel is visible but the overlay is blank**

Check that `public/data/slope.png` exists and is served:

```powershell
Get-Item public\data\slope.png
```

Then reload the page. The overlay is an `L.imageOverlay`, not a tile layer.

**`Conditions data unavailable. Run preprocess/04_meda.py.`**

The app could not fetch `/data/conditions.json`. Make sure the four MEDA CSVs
are in `preprocess/raw/meda/`, then run:

```powershell
python preprocess/04_meda.py
npm run build
```

**`Science stops unavailable. Run preprocess/03_science_stops.py.`**

The app could not fetch `/data/science_stops.geojson`. Run:

```powershell
python preprocess/03_science_stops.py
npm run build
```

**A science stop says it is outside the route grid**

The stop lies outside the 12×12 km F2 grid. Regenerate F2 with the current
600×600 script or remove that stop. The six built-in stops are inside.

**Port 5173 or 4173 is already in use**

Stop the other dev/preview process, or use:

```powershell
npx vite --port 5174
```

**`gdalinfo` is not recognized**

GDAL is optional. Install it with winget as shown in section 1, or continue with rasterio.

**NASA tiles return 403/404**

The M20 tile service rate-limits and only covers the Jezero area. The status box reports errors; the app keeps working. The MOLA hillshade has no tiles above zoom 6 and is expected to show 404s if selected at zoom 12.

## 10. Quick start (one screen)

```powershell
npm install
python -m ensurepip --upgrade
python -m pip install rasterio
python preprocess/02_slope.py
python preprocess/04_meda.py
python preprocess/03_science_stops.py
python preprocess/05_traverse.py
npm run dev
```

Open `http://localhost:5173/`.

For a production preview:

```powershell
npm run build
npm run preview
```

Open `http://localhost:4173/`.
