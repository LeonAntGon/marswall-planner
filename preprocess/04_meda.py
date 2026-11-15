#!/usr/bin/env python3
"""
F6 preprocessing: read the selected MEDA CSV files and write
public/data/conditions.json.

Selected products (PDS4 bundle mars2020_meda):
  - PS  (derived pressure)          sol 1859
  - ATS (calibrated air temperature) sol 1859
  - RDS (calibrated radiation)      sol 1859
  - WS  (derived wind)              sol 313 (last valid reading)

The PDS RDS label does not identify a UV-band channel. RDS_TOP_7 is used as
"Solar radiation (MEDA RDS)" and is not converted to a UV product.
"""

from __future__ import annotations

import csv
import json
import math
import re
import statistics
import sys
from datetime import date
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_ROOT / "preprocess" / "raw" / "meda"
OUTPUT = PROJECT_ROOT / "public" / "data" / "conditions.json"

PS_FILE = RAW_DIR / "WE__1859___________DER_PS__________________P01.CSV"
ATS_FILE = RAW_DIR / "WE__1859___________CAL_ATS_________________P01.CSV"
RDS_FILE = RAW_DIR / "WE__1859___________CAL_RDS_________________P01.CSV"
WS_FILE = RAW_DIR / "WE__0313___________DER_WS__________________P02.CSV"

SOL_MAIN = 1859
EARTH_DATE_MAIN = "2026-05-13/14"
SOL_WIND = 313
EARTH_DATE_WIND = "2022-01-05"

EVA_START_LMST = "09:00"
EVA_END_LMST = "15:00"
EVA_START_MINUTES = 9 * 60
EVA_END_MINUTES = 15 * 60


def to_float(value: str) -> float | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        number = float(value)
    except ValueError:
        return None
    if number == 999999999 or not math.isfinite(number):
        return None
    return number


def read_rows(path: Path) -> list[dict]:
    if not path.exists():
        raise FileNotFoundError(path)
    with path.open(encoding="latin1", newline="") as handle:
        return list(csv.DictReader(handle))


def stats(values: list[float]) -> dict:
    if not values:
        raise ValueError("no valid values")
    return {
        "min": min(values),
        "mean": statistics.mean(values),
        "max": max(values),
        "count": len(values),
    }


def main() -> int:
    try:
        ps_rows = read_rows(PS_FILE)
        ats_rows = read_rows(ATS_FILE)
        rds_rows = read_rows(RDS_FILE)
        ws_rows = read_rows(WS_FILE)
    except FileNotFoundError as error:
        print(f"ERROR: missing MEDA file: {error.filename}", file=sys.stderr)
        print("See COMMANDS.md for the download commands.", file=sys.stderr)
        return 1

    pressures = [
        value
        for row in ps_rows
        if (value := to_float(row.get("PRESSURE", ""))) is not None
    ]
    pressure = stats(pressures)

    ats_columns = [
        column for column in ats_rows[0].keys() if column.startswith("ATS_LOCAL_TEMP")
    ] if ats_rows else []
    if not ats_columns:
        print("ERROR: ATS columns not found.", file=sys.stderr)
        return 1

    row_data: list[tuple[float, int, float]] = []
    for row in ats_rows:
        values = [
            value
            for column in ats_columns
            if (value := to_float(row.get(column, ""))) is not None
        ]
        if not values:
            continue
        match = re.search(r"M(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)", row.get("LMST", ""))
        if not match:
            continue
        hour = int(match.group(1))
        minute = int(match.group(2))
        second = float(match.group(3))
        minutes = hour * 60 + minute + second / 60
        row_data.append((statistics.mean(values) - 273.15, hour, minutes))

    if not row_data:
        print("ERROR: no valid ATS values with LMST.", file=sys.stderr)
        return 1

    temperatures_c = [item[0] for item in row_data]
    hourly_map: dict[int, list[float]] = {}
    for temperature_c, hour, _ in row_data:
        hourly_map.setdefault(hour, []).append(temperature_c)
    hourly = [
        {
            "hour": hour,
            "tempC": round(statistics.mean(hourly_map[hour]), 3),
            "count": len(hourly_map[hour]),
        }
        for hour in sorted(hourly_map)
    ]

    window = [
        temperature_c
        for temperature_c, _, minutes in row_data
        if EVA_START_MINUTES <= minutes <= EVA_END_MINUTES
    ]
    if not window:
        print(
            f"ERROR: no ATS samples between {EVA_START_LMST} and {EVA_END_LMST} LMST.",
            file=sys.stderr,
        )
        return 1

    temperature = {
        "sol": SOL_MAIN,
        "earthDate": EARTH_DATE_MAIN,
        "fullSol": {
            "minC": round(min(temperatures_c), 3),
            "meanC": round(statistics.mean(temperatures_c), 3),
            "maxC": round(max(temperatures_c), 3),
            "count": len(temperatures_c),
        },
        "evaWindow": {
            "startLmst": EVA_START_LMST,
            "endLmst": EVA_END_LMST,
            "minC": round(min(window), 3),
            "meanC": round(statistics.mean(window), 3),
            "maxC": round(max(window), 3),
            "count": len(window),
        },
        "hourly": hourly,
        "method": (
            "mean of valid ATS_LOCAL_TEMP1..5 per time step; full-sol min/mean/max "
            "from all steps; EVA-window min/mean/max from steps between "
            "09:00 and 15:00 LMST; hourly means use LMST hour"
        ),
    }

    rds_values = [
        value
        for row in rds_rows
        if (value := to_float(row.get("RDS_TOP_7", ""))) is not None
    ]
    if not rds_values:
        print("ERROR: no valid RDS_TOP_7 values.", file=sys.stderr)
        return 1
    solar = stats(rds_values)
    solar_radiation = {
        "label": "Solar radiation (MEDA RDS)",
        "channel": "RDS_TOP_7",
        "minWm2": solar["min"],
        "meanWm2": solar["mean"],
        "maxWm2": solar["max"],
        "count": solar["count"],
        "sol": SOL_MAIN,
        "earthDate": EARTH_DATE_MAIN,
        "method": "valid RDS_TOP_7 values in W/m2; no UV conversion",
    }

    wind_values = [
        value
        for row in ws_rows
        if (
            value := to_float(row.get("HORIZONTAL_WIND_SPEED", ""))
        ) is not None
    ]
    if not wind_values:
        print("ERROR: no valid wind values in sol 313.", file=sys.stderr)
        return 1
    wind = stats(wind_values)
    wind_json = {
        "sol": SOL_WIND,
        "earthDate": EARTH_DATE_WIND,
        "meanMs": wind["mean"],
        "maxMs": wind["max"],
        "count": wind["count"],
        "note": (
            "Last valid wind reading. MEDA's wind sensors were damaged by "
            "dust-laden whirlwinds; wind is not used in the go/caution/no-go "
            "indicator."
        ),
    }

    payload = {
        "temperature": temperature,
        "pressure": {
            "minPa": round(pressure["min"], 3),
            "meanPa": round(pressure["mean"], 3),
            "maxPa": round(pressure["max"], 3),
            "count": pressure["count"],
            "sol": SOL_MAIN,
            "earthDate": EARTH_DATE_MAIN,
        },
        "solarRadiation": {
            **solar_radiation,
            "minWm2": round(solar_radiation["minWm2"], 3),
            "meanWm2": round(solar_radiation["meanWm2"], 3),
            "maxWm2": round(solar_radiation["maxWm2"], 3),
        },
        "wind": {
            **wind_json,
            "meanMs": round(wind_json["meanMs"], 3),
            "maxMs": round(wind_json["maxMs"], 3),
        },
        "source": (
            "NASA/JPL-Caltech MEDA PDS4 bundle mars2020_meda, release "
            "2026-08-11; PS/ATS/RDS sol 1859 and WS sol 313."
        ),
        "generatedAt": date.today().isoformat(),
        "generator": "preprocess/04_meda.py",
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=True)
        handle.write("\n")

    print("F6 MEDA preprocessing complete")
    print(
        f"  temperature full sol: {temperature['fullSol']['minC']} to "
        f"{temperature['fullSol']['maxC']} C; mean {temperature['fullSol']['meanC']} C"
    )
    print(
        f"  temperature EVA {EVA_START_LMST}-{EVA_END_LMST}: "
        f"{temperature['evaWindow']['minC']} to {temperature['evaWindow']['maxC']} C; "
        f"mean {temperature['evaWindow']['meanC']} C"
    )
    print(
        f"  pressure: {payload['pressure']['minPa']} to "
        f"{payload['pressure']['maxPa']} Pa; mean {payload['pressure']['meanPa']} Pa"
    )
    print(
        f"  solar radiation (RDS_TOP_7): {payload['solarRadiation']['minWm2']} to "
        f"{payload['solarRadiation']['maxWm2']} W/m2; mean "
        f"{payload['solarRadiation']['meanWm2']} W/m2"
    )
    print(
        f"  wind sol 313: mean {payload['wind']['meanMs']} m/s; "
        f"max {payload['wind']['maxMs']} m/s"
    )
    print(f"  wrote {OUTPUT.relative_to(PROJECT_ROOT)} ({OUTPUT.stat().st_size} B)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
