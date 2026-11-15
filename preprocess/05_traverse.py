#!/usr/bin/env python3
"""
F8 preprocessing: clip the D5 Perseverance traverse and waypoints to the F2
grid bounds and write public/data/traverse.geojson and waypoints.geojson.

The traverse is simplified only if the clipped file is larger than 500 kB,
as required by the F8 task. No third-party dependencies are used.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
GRID_FILE = PROJECT_ROOT / "public" / "data" / "grid.json"
TRAVERSE_FILE = PROJECT_ROOT / "preprocess" / "raw" / "M20_traverse.json"
WAYPOINTS_FILE = PROJECT_ROOT / "preprocess" / "raw" / "M20_waypoints.json"
TRAVERSE_OUT = PROJECT_ROOT / "public" / "data" / "traverse.geojson"
WAYPOINTS_OUT = PROJECT_ROOT / "public" / "data" / "waypoints.geojson"

MAX_BYTES = 500_000
SIMPLIFY_TOLERANCE_M = 5.0
METERS_PER_DEG_LAT = 59_157.9


def bounds_from_grid() -> dict:
    grid = json.loads(GRID_FILE.read_text(encoding="utf-8"))
    bounds = grid["bounds"]
    return {
        "west": float(bounds["west"]),
        "south": float(bounds["south"]),
        "east": float(bounds["east"]),
        "north": float(bounds["north"]),
    }


def clip_segment(p0, p1, bounds):
    """Liang-Barsky clipping in lon/lat; returns (q0, q1) or None."""
    x0, y0 = p0[0], p0[1]
    x1, y1 = p1[0], p1[1]
    dx = x1 - x0
    dy = y1 - y0
    p = [-dx, dx, -dy, dy]
    q = [
        x0 - bounds["west"],
        bounds["east"] - x0,
        y0 - bounds["south"],
        bounds["north"] - y0,
    ]
    u1 = 0.0
    u2 = 1.0
    for pi, qi in zip(p, q):
        if abs(pi) < 1e-15:
            if qi < 0:
                return None
            continue
        ratio = qi / pi
        if pi < 0:
            if ratio > u2:
                return None
            if ratio > u1:
                u1 = ratio
        else:
            if ratio < u1:
                return None
            if ratio < u2:
                u2 = ratio
    if u1 > u2:
        return None

    def interpolate(t: float):
        point = [x0 + dx * t, y0 + dy * t]
        if len(p0) >= 3 and len(p1) >= 3:
            point.append(p0[2] + (p1[2] - p0[2]) * t)
        return point

    return interpolate(u1), interpolate(u2)


def point_equal(a, b, tolerance=1e-12) -> bool:
    return (
        abs(a[0] - b[0]) <= tolerance
        and abs(a[1] - b[1]) <= tolerance
    )


def clip_line(coords, bounds):
    """Return a list of contiguous clipped LineString coordinate lists."""
    result = []
    current = []
    for index in range(1, len(coords)):
        clipped = clip_segment(coords[index - 1], coords[index], bounds)
        if not clipped:
            if current:
                result.append(current)
                current = []
            continue
        start, end = clipped
        if current and point_equal(current[-1], start):
            if not point_equal(current[-1], end):
                current.append(end)
        else:
            if current:
                result.append(current)
            if not point_equal(start, end):
                current = [start, end]
            else:
                current = []
    if current:
        result.append(current)
    return [line for line in result if len(line) >= 2]


def point_inside(point, bounds) -> bool:
    return (
        bounds["west"] <= point[0] <= bounds["east"]
        and bounds["south"] <= point[1] <= bounds["north"]
    )


def perpendicular_distance(point, start, end):
    """Approximate local metric distance from point to a lon/lat segment."""
    lat_scale = math.cos(math.radians(point[1]))
    px = point[0] * lat_scale
    py = point[1]
    ax = start[0] * lat_scale
    ay = start[1]
    bx = end[0] * lat_scale
    by = end[1]
    dx = bx - ax
    dy = by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay) * METERS_PER_DEG_LAT
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy)) * METERS_PER_DEG_LAT


def simplify_line(coords, tolerance_m):
    if len(coords) <= 2:
        return coords
    keep = [False] * len(coords)
    keep[0] = True
    keep[-1] = True
    stack = [(0, len(coords) - 1)]
    while stack:
        first, last = stack.pop()
        if last <= first + 1:
            continue
        max_distance = -1.0
        max_index = None
        for index in range(first + 1, last):
            distance = perpendicular_distance(coords[index], coords[first], coords[last])
            if distance > max_distance:
                max_distance = distance
                max_index = index
        if max_distance > tolerance_m and max_index is not None:
            keep[max_index] = True
            stack.append((first, max_index))
            stack.append((max_index, last))
    return [coordinate for coordinate, selected in zip(coords, keep) if selected]


def traverse_geojson(bounds):
    traverse = json.loads(TRAVERSE_FILE.read_text(encoding="utf-8"))
    features = []
    sols = []
    for feature in traverse.get("features", []):
        geometry = feature.get("geometry") or {}
        properties = feature.get("properties") or {}
        sol = properties.get("sol")
        if sol is not None:
            sols.append(sol)
        if geometry.get("type") == "LineString":
            lines = [geometry.get("coordinates", [])]
        elif geometry.get("type") == "MultiLineString":
            lines = geometry.get("coordinates", [])
        else:
            continue
        for line_index, coordinates in enumerate(lines):
            for part_index, clipped in enumerate(clip_line(coordinates, bounds)):
                output_properties = {
                    "sol": sol,
                    "fromRMC": properties.get("fromRMC"),
                    "toRMC": properties.get("toRMC"),
                    "line": line_index,
                    "part": part_index,
                }
                features.append(
                    {
                        "type": "Feature",
                        "geometry": {"type": "LineString", "coordinates": clipped},
                        "properties": output_properties,
                    }
                )
    return {
        "type": "FeatureCollection",
        "name": "perseverance_traverse_clipped",
        "metadata": {
            "source": "D5 M20_traverse.json",
            "gridBounds": bounds,
            "solMin": min(sols) if sols else None,
            "solMax": max(sols) if sols else None,
        },
        "features": features,
    }


def waypoints_geojson(bounds):
    waypoints = json.loads(WAYPOINTS_FILE.read_text(encoding="utf-8"))
    features = []
    for feature in waypoints.get("features", []):
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []
        if geometry.get("type") != "Point" or len(coordinates) < 2:
            continue
        point = [float(coordinates[0]), float(coordinates[1])]
        if not point_inside(point, bounds):
            continue
        properties = feature.get("properties") or {}
        elevation = coordinates[2] if len(coordinates) >= 3 else properties.get("elev_geoid")
        output_properties = {
            "RMC": properties.get("RMC"),
            "site": properties.get("site"),
            "sol": properties.get("sol"),
            "dist_m": properties.get("dist_m"),
            "dist_total_m": properties.get("dist_total_m"),
            "easting": properties.get("easting"),
            "northing": properties.get("northing"),
            "elev_geoid": elevation,
            "lat": point[1],
            "lon": point[0],
        }
        output_coordinates = [point[0], point[1]]
        if elevation is not None:
            output_coordinates.append(elevation)
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": output_coordinates},
                "properties": output_properties,
            }
        )
    return {
        "type": "FeatureCollection",
        "name": "perseverance_waypoints_clipped",
        "metadata": {
            "source": "D5 M20_waypoints.json",
            "gridBounds": bounds,
        },
        "features": features,
    }


def write_compact(path: Path, data: dict) -> int:
    encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    path.write_text(encoded, encoding="utf-8")
    return len(encoded.encode("utf-8"))


def main() -> int:
    if not GRID_FILE.exists():
        print("ERROR: public/data/grid.json is missing. Run 02_slope.py first.", file=sys.stderr)
        return 1
    if not TRAVERSE_FILE.exists() or not WAYPOINTS_FILE.exists():
        print("ERROR: D5 raw files are missing. See COMMANDS.md.", file=sys.stderr)
        return 1

    bounds = bounds_from_grid()
    traverse = traverse_geojson(bounds)
    waypoints = waypoints_geojson(bounds)

    size = write_compact(TRAVERSE_OUT, traverse)
    initial_size = size
    simplified = False
    if size > MAX_BYTES:
        simplified = True
        for feature in traverse["features"]:
            feature["geometry"]["coordinates"] = simplify_line(
                feature["geometry"]["coordinates"], SIMPLIFY_TOLERANCE_M
            )
        traverse["features"] = [
            feature
            for feature in traverse["features"]
            if len(feature["geometry"]["coordinates"]) >= 2
        ]
        traverse["metadata"]["simplified"] = True
        traverse["metadata"]["simplifyToleranceM"] = SIMPLIFY_TOLERANCE_M
        size = write_compact(TRAVERSE_OUT, traverse)

    waypoint_size = write_compact(WAYPOINTS_OUT, waypoints)
    print("F8 traverse preprocessing complete")
    print(
        f"  traverse: {len(traverse['features'])} clipped features, "
        f"{initial_size} B before simplification, {size} B final, "
        f"simplified={simplified}"
    )
    print(
        f"  waypoints: {len(waypoints['features'])} inside grid, "
        f"{waypoint_size} B"
    )
    print(f"  grid bounds: {bounds}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
