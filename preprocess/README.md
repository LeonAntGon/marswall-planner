# Preprocessing pipeline

This folder holds the offline Python work that turns the NASA datasets into the
static files served from `public/data/`. F1 needs no preprocessing; F2, F6, F7
and F8 are implemented.

## Current status (2026-11-15)

Raw downloads are complete in `preprocess/raw/` (git-ignored):

| File | Dataset | Bytes |
|---|---|---:|
| `jezero_ctx_dtm_20m.tif` | D1 CTX DTM 20 m | 9,662,387 |
| `jezero_ctx_ortho_6m.tif` | D4 CTX orthoimage 6 m | 36,269,402 |
| `M20_traverse.json` | D5 rover traverse | 1,723,218 |
| `M20_waypoints.json` | D5 rover waypoints | 603,126 |
| `meda/WE__1859...DER_PS...P01.CSV` | D6 MEDA pressure | 2,596,701 |
| `meda/WE__1859...CAL_ATS...P01.CSV` | D6 MEDA air temperature | 3,832,386 |
| `meda/WE__1859...CAL_RDS...P01.CSV` | D6 MEDA radiation | 11,897,537 |
| `meda/WE__0313...DER_WS...P02.CSV` | D6 MEDA wind (sol 313) | 1,995,142 |

`file` reports both TIFs as little-endian TIFF images and the JSON files as
JSON text data. Rasterio reads the D1 as `ESRI:103885` (Equirectangular Mars
2000 Sphere IAU, sphere radius 3,396,190 m).

### Tool status

| Tool | Status |
|---|---|
| Python | 3.13.5 |
| NumPy | 2.2.2 |
| Pillow | 11.1.0 |
| pip | 25.1.1 (installed with ensurepip) |
| Rasterio | 1.5.2 |
| GDAL CLI (`gdalinfo`, `gdalwarp`, `gdaldem`, `gdal_translate`) | missing; optional |

The F2 script uses rasterio, so GDAL CLI is not required. Install GDAL only for
the literal `gdalinfo -stats` output or future GDAL workflows:

```powershell
winget install --id GISInternals.GDAL -e --accept-source-agreements --accept-package-agreements
```

Open a new terminal and run `gdalinfo --version`. QGIS LTR
(`winget install --id OSGeo.QGIS_LTR -e`) is an alternative because it bundles
GDAL in its OSGeo4W Shell.

### D1 metadata checked with rasterio

- Projection: Equirectangular Mars 2000 Sphere IAU, sphere radius 3,396,190 m,
  central meridian 0, standard parallel 0, units metres.
- Size: 1596 x 1512 px, 20 m per pixel, float32, uncompressed.
- Metre bounds: 4,573,663.250853, 1,079,453.140188 to 4,605,583.250853,
  1,109,693.140188.
- Lon/lat bounds: 77.160465-77.698975 E, 18.211027-18.721194 N.
- Elevation: min -2710.6958 m, max -1515.5396 m, mean -2356.8696 m.
- NoData: -3.40282265508890445e+38.
- Landing site inside: yes, pixel column 860.47, row 819.46, nearest elevation
  -2567.19 m.

D4:
- 5322 x 5040 px, 6 m per pixel, 8-bit, uncompressed.
- Same projection; metre bounds 4,573,663.250853, 1,079,453.140188 to
  4,605,595.250853, 1,109,693.140188; lon/lat bounds 77.160465-77.699178 E,
  18.211027-18.721194 N.
- NoData 0; landing site inside at pixel column 2868.25, row 2731.52.
- D4's right edge is 12 m farther east than D1 due to the different pixel size.

### D5 JSON checked

- Traverse: 559 LineString features, properties `SCLK_END, SCLK_START, fromRMC,
  length, sol, toRMC`, sol 14-2022, 36,661 coordinates, lat 18.41997-18.49966,
  lon 77.21679-77.46313.
- Waypoints: 708 Point features, properties include `sol, lat, lon, elev_geoid,
  elev_radii, easting, northing, yaw, pitch, roll, images`, sol 13-2022.
- GeoJSON coordinates are `[lon, lat, elevation]`. First point:
  `[77.45088573, 18.44462715, -2569.91]`; last point:
  `[77.23322287, 18.43559434, -1936.366943]`.

## Implemented: F2 slope pipeline

### `02_slope.py`

Run from the project root:

```powershell
python preprocess/02_slope.py
```

The script:

1. Opens the D1 GeoTIFF with rasterio.
2. Derives the landing pixel from 18.4447 N, 77.4508 E and the work-area centre
   from 18.4650 N, 77.3787 E using the file transform.
3. Crops **600 x 600 cells (12 x 12 km)** centred on the work-area centre so
   all six F7 science stops are inside.
4. Computes slope in degrees with central differences over the 20 m grid.
   The east-west spacing is corrected by `cos(latitude)` because the D1 is in
   Mars equirectangular projection; at 18.4 deg the true dx is about 18.97 m,
   not 20 m.
5. Masks NoData, writes the PNG and binary grids, and writes `grid.json`.

Results from the current run:

| Item | Value |
|---|---|
| Crop window | cols 347-946, rows 459-1058 (600 x 600) |
| Bounds | lon 77.2775475-77.4799947 E; lat 18.3638751-18.5663223 N |
| Landing pixel in crop | 513.4746, 360.4563 |
| Slope min / max / mean | 0.0058 / 37.7237 / 5.8571 deg |
| Valid / NoData cells | 360,000 / 0 |
| Above 10 / 20 / 30 deg | 18.3739 % / 2.7789 % / 0.0381 % |
| Elevation in crop | -2621.004 to -1741.164 m |
| Six F7 stop cells | all valid (not NoData) |

Outputs:

| File | Size | Contents |
|---|---:|---|
| `public/data/slope.png` | 20,130 B | RGBA slope overlay, 600 x 600 |
| `public/data/slope.bin` | 1,440,000 B | Float32 little-endian slope, 600 x 600 |
| `public/data/elevation.bin` | 1,440,000 B | Float32 little-endian elevation, 600 x 600 |
| `public/data/grid.json` | 2,806 B | bounds, `leafletBounds`, rows, cols, cell size, NoData, bands, stats |

`grid.json` uses NoData `-9999`, `dtype: float32`, little-endian, C order. The
PNG has transparent NoData and the four colour bands from
`src/config/slopeBands.json`.

The app displays the overlay with `L.imageOverlay` in `SlopePanel`, using
`leafletBounds` from `grid.json`. The overlay sits in a custom pane at z-index
300; place names are at 350 so labels stay above the slope colours.

## Implemented: F6 MEDA conditions

Run:

```powershell
python preprocess/04_meda.py
```

`04_meda.py` reads the four CSVs in `preprocess/raw/meda/`:

- `WE__1859___________DER_PS__________________P01.CSV`
- `WE__1859___________CAL_ATS_________________P01.CSV`
- `WE__1859___________CAL_RDS_________________P01.CSV`
- `WE__0313___________DER_WS__________________P02.CSV`

It writes `public/data/conditions.json` (3,698 B). Results:

| Quantity | Value |
|---|---|
| Full-sol temperature (sol 1859) | -83.094 to -21.066 C; mean -59.055 C |
| EVA window 09:00-15:00 LMST | min -62.846 C; mean -37.033 C; max -21.066 C |
| Hourly ATS means | 24 entries stored in `conditions.json` |
| Pressure (sol 1859) | 716.61-750.86 Pa; mean 736.05 Pa; information only |
| Solar radiation `RDS_TOP_7` (sol 1859) | 4.956-154.770 W/m2; mean 79.496 W/m2 |
| Wind (sol 313, 2022-01-05) | mean 4.265 m/s; max 22.47 m/s |

The F6 status is **GO**: it uses the minimum ATS temperature inside the EVA
window (09:00-15:00 LMST), not the full-sol night minimum. Pressure is
information only and has a tooltip saying so. The RDS PDS label has no UV-band
column; `RDS_TOP_7` is labelled **“Solar radiation (MEDA RDS)”** and is not
converted to a UV product. Wind is shown separately and is not used in the
status.

## Implemented: F7 science stops

Run:

```powershell
python preprocess/03_science_stops.py
```

It reads `M20_waypoints.json`, picks the waypoint with the greatest sol <= each
anchor, and writes `public/data/science_stops.geojson` (6,661 B, 6 features):

| Stop | Anchor | Sol used |
|---|---:|---:|
| Crater floor (Maaz) | 180 | 180 |
| Séítah | 200 | 200 |
| Delta front (Hawksbill Gap) | 441 | 441 |
| Three Forks sample depot | 675 | 674 |
| Margin unit (entry) | 910 | 909 |
| Neretva Vallis / Bright Angel | 1212 | 1210 |

All coordinates are approximate. The script prints the grid cell and confirms
that all six points are inside the 600 x 600 grid.

## Implemented: F8 Perseverance traverse

Run:

```powershell
python preprocess/05_traverse.py
```

It reads `M20_traverse.json` and `M20_waypoints.json`, clips both to the F2 grid
bounds, preserves the sol on every clipped segment, and writes:

- `public/data/traverse.geojson` — 402 clipped features. The initial clipped
  file was 1,010,195 B, above the 500 kB threshold, so it was simplified with a
  5 m tolerance to 107,593 B.
- `public/data/waypoints.geojson` — 517 waypoints inside the grid, 152,143 B,
  with `sol`, `dist_total_m`, site and elevation.

The mars.nasa.gov server sends no CORS headers, so the browser never fetches
the raw D5 JSON.

### `01_crop_dtm.sh` (optional)

An optional GDAL crop; `02_slope.py` already performs the crop with rasterio.

## Outputs

```
public/data/slope.png          exists (F2)
public/data/slope.bin          exists (F2)
public/data/elevation.bin      exists (F2)
public/data/grid.json          exists (F2)
public/data/conditions.json    exists (F6)
public/data/science_stops.geojson exists (F7)
public/data/traverse.geojson   exists (F8)
public/data/waypoints.geojson  exists (F8)
```

`public/data/` is included in `npm run build` and served at `/data/...`.

## Verification checklist

- [x] D1 projection, pixel size and NoData checked with rasterio (and earlier
      with a direct TIFF header parser).
- [x] DTM elevations are negative and plausible (-2621 to -1741 m in the crop).
- [x] `slope.png` lines up with the delta front and small crater rims in the
      HiRISE base map.
- [x] Slope and elevation grids have the same 600 x 600 shape and bounds as
      `grid.json`.
- [x] NoData is transparent in the PNG and -9999 in the binaries.
- [x] All six F7 stop cells are valid (not NoData).
- [x] F6 conditions: full-sol and EVA-window temperature, 24 hourly ATS means,
      solar radiation and wind populated; status uses the EVA-window minimum
      temperature only; pressure is information only; wind excluded.
- [x] F8 traverse and waypoints clipped to the grid; 402 traverse features,
      517 waypoints; traverse simplified only after exceeding 500 kB.
- [ ] Literal `gdalinfo -stats` output pending GDAL CLI installation (optional).
