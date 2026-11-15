#!/usr/bin/env python3
"""
F2 preprocessing: crop the D1 CTX DTM around the landing site, compute slope in
degrees, and write the static F2/F3 outputs to public/data/.

Inputs:
  preprocess/raw/jezero_ctx_dtm_20m.tif   (D1, 20 m, Mars equirectangular)

Outputs:
  public/data/slope.png        RGBA slope overlay for L.imageOverlay
  public/data/slope.bin        Float32 little-endian slope grid, 500x500
  public/data/elevation.bin    Float32 little-endian elevation grid, 500x500
  public/data/grid.json        bounds, shape, cell size, NoData, bands and stats

Method:
  - Crop 500x500 cells (10x10 km at 20 m) centred on the landing site.
  - Central differences over the 20 m pixel grid.
  - Correct the east-west spacing by cos(latitude), because the D1 is in Mars
    equirectangular projection: true dx = 20 m * cos(lat).
  - NoData is transparent in the PNG and -9999 in the binary grids.

Run from the project root:
  python preprocess/02_slope.py
"""

from __future__ import annotations

import json
import math
import re
import sys
from datetime import date
from pathlib import Path

import numpy as np
from PIL import Image

try:
    import rasterio
    from rasterio.transform import array_bounds, xy
    from rasterio.windows import Window
except ImportError as exc:  # pragma: no cover - explicit setup message
    print("ERROR: rasterio is required. Install it with:", file=sys.stderr)
    print("  python -m ensurepip --upgrade", file=sys.stderr)
    print("  python -m pip install rasterio", file=sys.stderr)
    raise SystemExit(1) from exc


PROJECT_ROOT = Path(__file__).resolve().parent.parent
INPUT_PATH = PROJECT_ROOT / "preprocess" / "raw" / "jezero_ctx_dtm_20m.tif"
OUTPUT_DIR = PROJECT_ROOT / "public" / "data"
BANDS_PATH = PROJECT_ROOT / "src" / "config" / "slopeBands.json"

# Landing site: docs/SPEC.md section 1 and src/lib/marsGeo.js.
LANDING_LAT = 18.4447
LANDING_LON = 77.4508

# Work area: 12x12 km centred on the six F7 science stops; docs/DATASETS.md D1.
WORK_AREA_CENTER_LAT = 18.4650
WORK_AREA_CENTER_LON = 77.3787
WORK_AREA_SIZE_KM = 12.0

NODATA_OUT = -9999.0


def hex_to_rgba(value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = value.lstrip("#")
    if len(value) != 6:
        raise ValueError(f"Expected a #rrggbb colour, got {value!r}")
    return (
        int(value[0:2], 16),
        int(value[2:4], 16),
        int(value[4:6], 16),
        alpha,
    )


def read_bands() -> list[dict]:
    with BANDS_PATH.open(encoding="utf-8") as handle:
        bands = json.load(handle)
    if not bands:
        raise ValueError("slopeBands.json is empty")
    return bands


def main() -> int:
    if not INPUT_PATH.exists():
        print(f"ERROR: missing input DTM: {INPUT_PATH}", file=sys.stderr)
        return 1
    if not BANDS_PATH.exists():
        print(f"ERROR: missing slope bands: {BANDS_PATH}", file=sys.stderr)
        return 1

    bands = read_bands()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with rasterio.open(INPUT_PATH) as src:
        wkt = src.crs.to_wkt() if src.crs else ""
        if "Equirectangular" not in wkt or "Mars_2000_Sphere" not in wkt:
            print("ERROR: unexpected CRS. Expected Mars 2000 Sphere Equirectangular.", file=sys.stderr)
            print(wkt, file=sys.stderr)
            return 1
        if abs(src.transform.b) > 1e-9 or abs(src.transform.d) > 1e-9:
            print("ERROR: the DTM is not north-up; no shear is supported.", file=sys.stderr)
            return 1

        radius_match = re.search(r'SPHEROID\["[^"]+",\s*([0-9.]+)', wkt)
        if not radius_match:
            print("ERROR: could not read the sphere radius from the CRS.", file=sys.stderr)
            return 1
        sphere_radius_m = float(radius_match.group(1))

        col_f, row_f = ~src.transform * (
            math.radians(LANDING_LON) * sphere_radius_m,
            math.radians(LANDING_LAT) * sphere_radius_m,
        )
        if not (0 <= col_f < src.width and 0 <= row_f < src.height):
            print("ERROR: landing site is outside the D1 extent.", file=sys.stderr)
            return 1

        center_col_f, center_row_f = ~src.transform * (
            math.radians(WORK_AREA_CENTER_LON) * sphere_radius_m,
            math.radians(WORK_AREA_CENTER_LAT) * sphere_radius_m,
        )
        if not (0 <= center_col_f < src.width and 0 <= center_row_f < src.height):
            print("ERROR: work-area centre is outside the D1 extent.", file=sys.stderr)
            return 1

        cell_x_m = abs(src.transform.a)
        cell_y_m = abs(src.transform.e)
        if cell_x_m <= 0 or cell_y_m <= 0:
            print("ERROR: invalid pixel size.", file=sys.stderr)
            return 1

        cells = int(round(WORK_AREA_SIZE_KM * 1000.0 / cell_x_m))
        if cells <= 0:
            print("ERROR: invalid crop size.", file=sys.stderr)
            return 1

        col0 = int(round(center_col_f - cells / 2.0))
        row0 = int(round(center_row_f - cells / 2.0))
        col0 = max(0, min(col0, src.width - cells))
        row0 = max(0, min(row0, src.height - cells))
        window = Window(col0, row0, cells, cells)

        elevation = src.read(1, window=window).astype(np.float64)
        source_nodata = src.nodata
        crop_transform = src.window_transform(window)
        west_m, south_m, east_m, north_m = array_bounds(cells, cells, crop_transform)

        crs_name = "Equirectangular Mars 2000 Sphere IAU"
        lon_west = math.degrees(west_m / sphere_radius_m)
        lon_east = math.degrees(east_m / sphere_radius_m)
        lat_south = math.degrees(south_m / sphere_radius_m)
        lat_north = math.degrees(north_m / sphere_radius_m)

        valid = np.isfinite(elevation)
        if source_nodata is not None and math.isfinite(float(source_nodata)):
            valid &= elevation != source_nodata
        valid &= elevation > -1e30

        elevation_work = np.where(valid, elevation, np.nan)
        _, y_centers = xy(
            crop_transform,
            np.arange(cells),
            np.zeros(cells),
            offset="center",
        )
        lat_centers = np.degrees(np.asarray(y_centers, dtype=np.float64) / sphere_radius_m)
        dx_m = cell_x_m * np.cos(np.radians(lat_centers))

        dz_dy = np.gradient(elevation_work, axis=0) / cell_y_m
        dz_dx = np.gradient(elevation_work, axis=1) / dx_m[:, None]
        slope = np.degrees(np.arctan(np.hypot(dz_dx, dz_dy)))
        slope = np.clip(slope, 0.0, 90.0)

        valid_slope = valid & np.isfinite(slope)
        slope_values = slope[valid_slope]
        elevation_values = elevation[valid]

        if slope_values.size == 0:
            print("ERROR: no valid slope cells.", file=sys.stderr)
            return 1

        rgba = np.zeros((cells, cells, 4), dtype=np.uint8)
        previous_max = -math.inf
        band_percent = []
        for band in bands:
            max_deg = band.get("maxDeg")
            if max_deg is None:
                mask = valid_slope & (slope > previous_max)
            else:
                mask = valid_slope & (slope > previous_max) & (slope <= float(max_deg))
            rgba[mask] = hex_to_rgba(band["color"])
            band_percent.append(
                {
                    "label": band["label"],
                    "color": band["color"],
                    "percent": round(float(mask.sum()) / float(valid_slope.sum()) * 100.0, 3),
                }
            )
            if max_deg is not None:
                previous_max = float(max_deg)

        slope_out = np.where(valid_slope, slope, NODATA_OUT).astype("<f4")
        elevation_out = np.where(valid, elevation, NODATA_OUT).astype("<f4")

        png_path = OUTPUT_DIR / "slope.png"
        slope_bin_path = OUTPUT_DIR / "slope.bin"
        elevation_bin_path = OUTPUT_DIR / "elevation.bin"
        grid_path = OUTPUT_DIR / "grid.json"

        Image.fromarray(rgba, mode="RGBA").save(png_path, optimize=True)
        slope_out.tofile(slope_bin_path)
        elevation_out.tofile(elevation_bin_path)

        percent_above_30 = float((slope_values > 30.0).sum()) / float(slope_values.size) * 100.0
        stats = {
            "validCells": int(valid_slope.sum()),
            "nodataCells": int((~valid_slope).sum()),
            "slopeMinDeg": round(float(slope_values.min()), 4),
            "slopeMaxDeg": round(float(slope_values.max()), 4),
            "slopeMeanDeg": round(float(slope_values.mean()), 4),
            "percentAbove30": round(percent_above_30, 3),
            "elevationMinM": round(float(elevation_values.min()), 4),
            "elevationMaxM": round(float(elevation_values.max()), 4),
            "bands": band_percent,
        }

        grid = {
            "source": "D1 - Mars 2020 Terrain Relative Navigation CTX DTM Mosaic (20 m)",
            "sourceFile": "preprocess/raw/jezero_ctx_dtm_20m.tif",
            "sourceCitation": "Fergason et al. 2020, LPSC 51; DOI 10.5066/P906QQT8; CC0",
            "crs": src.crs.to_string() if src.crs else None,
            "crsName": crs_name,
            "sphereRadiusMeters": sphere_radius_m,
            "rows": cells,
            "cols": cells,
            "cellSizeMeters": {"x": cell_x_m, "y": cell_y_m},
            "bounds": {
                "west": lon_west,
                "south": lat_south,
                "east": lon_east,
                "north": lat_north,
            },
            "leafletBounds": [
                [lat_south, lon_west],
                [lat_north, lon_east],
            ],
            "cropWindow": {
                "colOff": int(col0),
                "rowOff": int(row0),
                "width": cells,
                "height": cells,
            },
            "workArea": {
                "centerLat": WORK_AREA_CENTER_LAT,
                "centerLon": WORK_AREA_CENTER_LON,
                "sizeKm": WORK_AREA_SIZE_KM,
            },
            "landing": {
                "lat": LANDING_LAT,
                "lon": LANDING_LON,
                "pixel": {
                    "col": round(float(col_f - col0), 4),
                    "row": round(float(row_f - row0), 4),
                },
            },
            "nodata": NODATA_OUT,
            "sourceNodata": None if source_nodata is None else float(source_nodata),
            "dtype": "float32",
            "endianness": "little",
            "order": "C",
            "slopeUnits": "degrees",
            "elevationUnits": "meters",
            "slopeMethod": (
                "Central differences over the 20 m pixel grid; east-west spacing "
                "corrected by cos(latitude). Slopes above 30 degrees are treated "
                "as non-walkable in F3."
            ),
            "generatedAt": date.today().isoformat(),
            "generator": "preprocess/02_slope.py",
            "bands": bands,
            "stats": stats,
            "outputs": {
                "slopePng": "public/data/slope.png",
                "slopeBin": "public/data/slope.bin",
                "elevationBin": "public/data/elevation.bin",
                "gridJson": "public/data/grid.json",
            },
        }

        with grid_path.open("w", encoding="utf-8") as handle:
            json.dump(grid, handle, indent=2, ensure_ascii=True)
            handle.write("\n")

    print("F2 slope preprocessing complete")
    print(f"  crop: cols {col0}..{col0 + cells - 1}, rows {row0}..{row0 + cells - 1} ({cells}x{cells})")
    print(f"  bounds: lon {lon_west:.7f}..{lon_east:.7f}, lat {lat_south:.7f}..{lat_north:.7f}")
    print(f"  landing pixel in crop: {grid['landing']['pixel']['col']}, {grid['landing']['pixel']['row']}")
    print(f"  slope: min {stats['slopeMinDeg']} deg, max {stats['slopeMaxDeg']} deg, mean {stats['slopeMeanDeg']} deg")
    print(f"  above 30 deg: {stats['percentAbove30']}% of {stats['validCells']} valid cells")
    print(f"  wrote {png_path.relative_to(PROJECT_ROOT)} ({png_path.stat().st_size} B)")
    print(f"  wrote {slope_bin_path.relative_to(PROJECT_ROOT)} ({slope_bin_path.stat().st_size} B)")
    print(f"  wrote {elevation_bin_path.relative_to(PROJECT_ROOT)} ({elevation_bin_path.stat().st_size} B)")
    print(f"  wrote {grid_path.relative_to(PROJECT_ROOT)} ({grid_path.stat().st_size} B)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
