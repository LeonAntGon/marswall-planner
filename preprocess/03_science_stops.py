#!/usr/bin/env python3
"""
F7 preprocessing: derive the six science stops from the D5 waypoints.

The anchor sols are user-approved. For each stop we pick the waypoint with the
greatest sol <= anchor and record the actual sol used. All coordinates are
approximate because they come from the rover waypoint at that sol.
"""

from __future__ import annotations

import json
import math
import sys
from datetime import date
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
WAYPOINTS = PROJECT_ROOT / "preprocess" / "raw" / "M20_waypoints.json"
GRID = PROJECT_ROOT / "public" / "data" / "grid.json"
OUTPUT = PROJECT_ROOT / "public" / "data" / "science_stops.geojson"

R = 3396190.0

STOPS = [
    {
        "id": "maaz",
        "name": "Crater floor (Maaz)",
        "type": "Crater floor / igneous",
        "minerals": "Basaltic lava flows; high-Ca pyroxene, Fe-bearing feldspar, hematite",
        "whyItMatters": "Igneous basement and aqueous alteration; a geochronology framework for Jezero.",
        "whatToSample": "Rochette and Sid cores (mission-reported).",
        "missionData": "Mars 2020 + MRO/CRISM",
        "anchorSol": 180,
        "reference": "Sun et al. 2023, JGR Planets, DOI 10.1029/2022JE007613",
        "referenceUrl": "https://doi.org/10.1029/2022JE007613",
        "color": "#b07d62",
    },
    {
        "id": "seitah",
        "name": "Séítah",
        "type": "Olivine-rich igneous",
        "minerals": "Olivine cumulate",
        "whyItMatters": "Water-altered olivine and early crust; a key sample suite from the crater floor.",
        "whatToSample": "Séítah cores (mission-reported).",
        "missionData": "Mars 2020 + MRO/CRISM",
        "anchorSol": 200,
        "reference": "Sun et al. 2023, JGR Planets, DOI 10.1029/2022JE007613",
        "referenceUrl": "https://doi.org/10.1029/2022JE007613",
        "color": "#6abf69",
    },
    {
        "id": "delta-front",
        "name": "Delta front (Hawksbill Gap)",
        "type": "Delta front sediments",
        "minerals": "Fine-grained delta sediments; hydrated minerals in the region (CRISM)",
        "whyItMatters": "Lacustrine sediments with high biosignature potential at the western delta front.",
        "whatToSample": "Delta-front outcrops and cores.",
        "missionData": "Mars 2020 + MRO/CRISM",
        "anchorSol": 441,
        "reference": "NASA Delta Front Campaign; AAPG Explorer sol 441",
        "referenceUrl": "https://science.nasa.gov/blog/campaign-2-the-delta-front",
        "color": "#f4a261",
    },
    {
        "id": "three-forks",
        "name": "Three Forks sample depot",
        "type": "Sample depot",
        "minerals": "Cached cores from the delta front",
        "whyItMatters": "First sample depot on another world; a contingency cache for Mars Sample Return.",
        "whatToSample": "10 cached sample tubes.",
        "missionData": "Mars 2020",
        "anchorSol": 675,
        "reference": "NASA Perseverance blog, sol 675",
        "referenceUrl": "https://science.nasa.gov/blog/a-lap-around-the-sun-perseverance-celebrates-one-martian-year-at-jezero/",
        "color": "#e9c46a",
    },
    {
        "id": "margin-unit",
        "name": "Margin unit (carbonates), entry",
        "type": "Margin unit / carbonates",
        "minerals": "Carbonates; possible lacustrine shoreline deposits",
        "whyItMatters": "Ancient lake-margin carbonates and possible shoreline deposits.",
        "whatToSample": "Margin-unit outcrops and cores.",
        "missionData": "Mars 2020 + MRO/CRISM",
        "anchorSol": 910,
        "reference": "LPSC 2025 abstract 2333",
        "referenceUrl": "https://www.hou.usra.edu/meetings/lpsc2025/pdf/2333.pdf",
        "color": "#5dade2",
    },
    {
        "id": "bright-angel",
        "name": "Neretva Vallis / Bright Angel (Cheyava Falls)",
        "type": "Paleochannel / Bright Angel formation",
        "minerals": "Organic-mineral associations, sulfates; potential biosignature",
        "whyItMatters": "Possible biosignature in the Neretva Vallis / Bright Angel formation.",
        "whatToSample": "Cheyava Falls core (Sapphire Canyon).",
        "missionData": "Mars 2020 + MRO/CRISM",
        "anchorSol": 1212,
        "reference": "The Planetary Society, Cheyava Falls article",
        "referenceUrl": "https://planetary.org/articles/a-biosignature-on-mars-unpacking-perseverances-cheyava-falls-find",
        "color": "#e76f51",
    },
]


def distance_m(a, b) -> float:
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * R * math.asin(min(1.0, math.sqrt(h)))


def main() -> int:
    if not WAYPOINTS.exists():
        print(f"ERROR: missing {WAYPOINTS}", file=sys.stderr)
        return 1

    collection = json.loads(WAYPOINTS.read_text(encoding="utf-8"))
    rows = []
    for feature in collection["features"]:
        properties = feature.get("properties") or {}
        if isinstance(properties.get("sol"), (int, float)):
            rows.append(
                (
                    int(properties["sol"]),
                    properties.get("lat"),
                    properties.get("lon"),
                    properties.get("elev_geoid"),
                    properties.get("dist_total_m"),
                )
            )
    rows.sort(key=lambda row: row[0])

    features = []
    for stop in STOPS:
        candidates = [row for row in rows if row[0] <= stop["anchorSol"]]
        if not candidates:
            print(f"ERROR: no waypoint <= sol {stop['anchorSol']}", file=sys.stderr)
            return 1
        max_sol = max(row[0] for row in candidates)
        chosen = [row for row in candidates if row[0] == max_sol][-1]
        sol, lat, lon, elev, dist_total = chosen
        properties = {
            **{key: value for key, value in stop.items() if key != "anchorSol"},
            "anchorSol": stop["anchorSol"],
            "solUsed": sol,
            "lat": lat,
            "lon": lon,
            "elevGeoidM": elev,
            "distTotalM": dist_total,
            "approximate": True,
        }
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat, elev]},
                "properties": properties,
            }
        )
        print(
            f"{stop['name']}: anchor {stop['anchorSol']} -> sol {sol} "
            f"({lat:.7f}, {lon:.7f})"
        )

    geojson = {
        "type": "FeatureCollection",
        "name": "marswalk_science_stops",
        "features": features,
        "metadata": {
            "description": "F7 science stops derived from D5 waypoints at user-approved anchor sols",
            "coordinatesAreApproximate": True,
            "generatedAt": date.today().isoformat(),
            "generator": "preprocess/03_science_stops.py",
            "source": "preprocess/raw/M20_waypoints.json (D5)",
        },
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(geojson, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )

    if GRID.exists():
        grid = json.loads(GRID.read_text(encoding="utf-8"))
        bounds = grid["bounds"]
        for stop in features:
            properties = stop["properties"]
            col = int(
                (properties["lon"] - bounds["west"])
                / (bounds["east"] - bounds["west"])
                * grid["cols"]
            )
            row = int(
                (bounds["north"] - properties["lat"])
                / (bounds["north"] - bounds["south"])
                * grid["rows"]
            )
            inside = 0 <= col < grid["cols"] and 0 <= row < grid["rows"]
            print(
                f"  grid cell {col},{row} inside={inside} "
                f"for {properties['name']}"
            )

    print(f"wrote {OUTPUT.relative_to(PROJECT_ROOT)} ({OUTPUT.stat().st_size} B)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
