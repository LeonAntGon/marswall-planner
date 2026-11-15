import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { ASSUMPTIONS } from '../config/assumptions.js';
import { useMap } from '../context/MapContext.jsx';
import { useRoute } from '../context/RouteContext.jsx';
import { buildEnergyProfile, walkingTimeSeconds } from '../lib/effort.js';
import { compareSlopes, compareToRover } from '../lib/compare.js';
import { LANDING_SITE, marsDistance, pathLength } from '../lib/marsGeo.js';
import {
  ROUTE_PRESETS,
  TRAVERSE_URL,
  WAYPOINTS_URL,
} from '../config/presets.js';
import {
  cellToLatLon,
  isBlockedCell,
  latLonToCell,
} from '../lib/gridData.js';
import { isEmergencyCurrent, sameRouteInputs } from '../lib/routeState.js';

const MAX_SLOPE = ASSUMPTIONS.maxWalkableSlope.value;
const SUIT_FACTOR = ASSUMPTIONS.suitSpeedFactor.value;

function formatPoint(point) {
  return `${point.lat.toFixed(4)}°, ${point.lon.toFixed(4)}°`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

function computeMetrics(points) {
  if (!points || points.length === 0) return null;
  if (points.length === 1) {
    return {
      totalM: 0,
      ascentM: 0,
      descentM: 0,
      maxSlopeDeg: points[0].slope,
      timeSeconds: 0,
      profile: null,
    };
  }

  let totalM = 0;
  let ascentM = 0;
  let descentM = 0;
  let maxSlopeDeg = 0;
  let cumulativeM = 0;
  const profile = [{ d: 0, elev: points[0].elev }];

  for (let i = 0; i < points.length; i += 1) {
    maxSlopeDeg = Math.max(maxSlopeDeg, points[i].slope);
    if (i === 0) continue;

    const previous = points[i - 1];
    const current = points[i];
    const distance = marsDistance(
      [previous.lat, previous.lon],
      [current.lat, current.lon]
    );
    const dz = current.elev - previous.elev;

    totalM += distance;
    cumulativeM += distance;
    if (dz > 0) ascentM += dz;
    else descentM -= dz;

    profile.push({ d: cumulativeM, elev: current.elev });
  }

  return {
    totalM,
    ascentM,
    descentM,
    maxSlopeDeg,
    timeSeconds: walkingTimeSeconds(points, SUIT_FACTOR),
    profile,
  };
}

function cellPathToBase(previous, startIndex, baseIndex) {
  if (!previous) return null;
  const path = [];
  const seen = new Set();
  let node = startIndex;
  while (node >= 0) {
    if (seen.has(node)) return null;
    seen.add(node);
    path.push(node);
    if (node === baseIndex) return path;
    node = previous[node];
  }
  return null;
}

function pointsFromCellPath(indices, gridData) {
  if (!indices || !gridData) return null;
  return indices.map((index) => {
    const row = Math.floor(index / gridData.grid.cols);
    const col = index - row * gridData.grid.cols;
    const { lat, lon } = cellToLatLon(col, row, gridData.grid);
    return {
      col,
      row,
      lat,
      lon,
      elev: gridData.elevation[index],
      slope: gridData.slope[index],
    };
  });
}

function ElevationProfile({ profile, safety, stopIndices = [], currentIndex, onSelect }) {
  if (!profile || profile.length < 2) return null;

  const width = 260;
  const height = 64;
  const pad = 3;
  const total = profile[profile.length - 1].d || 1;
  const elevations = profile.map((point) => point.elev);
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const span = Math.max(1, maxElev - minElev);

  const pointList = profile
    .map((point) => {
      const x = pad + (point.d / total) * (width - pad * 2);
      const y =
        pad + (1 - (point.elev - minElev) / span) * (height - pad * 2);
      return { x: x.toFixed(1), y: y.toFixed(1), value: `${x.toFixed(1)},${y.toFixed(1)}` };
    })
    ;
  const points = pointList.map((point) => point.value).join(' ');

  return (
    <div className="route-profile">
      <div className="route-profile__head">
        <span>Elevation profile</span>
        <span>
          {minElev.toFixed(0)}–{maxElev.toFixed(0)} m
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Elevation profile of the route"
      >
        <polygon
          points={`${pad},${height - pad} ${points} ${width - pad},${
            height - pad
          }`}
          fill="rgba(0, 229, 255, 0.12)"
        />
        {pointList.slice(1).map((point, index) => {
          const unsafe = safety?.[index + 1]?.safe === false;
          return (
            <line
              key={`profile-segment-${index}`}
              x1={pointList[index].x}
              y1={pointList[index].y}
              x2={point.x}
              y2={point.y}
              stroke={unsafe ? '#ff4d4d' : '#00e5ff'}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
        {stopIndices.map((index) => {
          const point = pointList[index];
          return point ? (
            <circle key={`profile-stop-${index}`} cx={point.x} cy={point.y} r="2.5" fill="#ffd166" />
          ) : null;
        })}
        {currentIndex !== null && currentIndex !== undefined && pointList[currentIndex] && (
          <circle
            cx={pointList[currentIndex].x}
            cy={pointList[currentIndex].y}
            r="3"
            fill="#ff6bd6"
          />
        )}
        <polyline points={points} fill="none" stroke="transparent" strokeWidth="12" onMouseMove={(event) => {
          if (!onSelect) return;
          const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
          const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
          onSelect(Math.round(fraction * (profile.length - 1)));
        }} />
      </svg>
    </div>
  );
}

function ConsumableBar({ label, used, capacity, remaining, unit }) {
  const percent =
    capacity > 0 ? Math.min(100, Math.max(0, (used / capacity) * 100)) : 0;
  const over = used > capacity;
  return (
    <div className="consumable">
      <div className="consumable__head">
        <span>{label}</span>
        <span>
          {used.toFixed(1)} / {capacity.toFixed(1)} {unit}
        </span>
      </div>
      <div className="consumable__bar">
        <div
          className={`consumable__fill${over ? ' is-over' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="consumable__meta">
        remaining {remaining.toFixed(1)} {unit}
      </div>
    </div>
  );
}

export default function RoutePanel() {
  const { map } = useMap();
  const { gridData, gridError, stops, setStops, walkback, setWalkback } =
    useRoute();
  const [mode, setMode] = useState(null);
  const [start, setStart] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [walkbackError, setWalkbackError] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [consumablesPercent, setConsumablesPercent] = useState(
    ASSUMPTIONS.consumablesStartPercent.value
  );
  const [comparison, setComparison] = useState(null);
  const [comparisonError, setComparisonError] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [positionPercent, setPositionPercent] = useState(
    ASSUMPTIONS.emergencyPositionDefaultPercent.value
  );
  const [emergency, setEmergency] = useState(null);
  const workerRef = useRef(null);
  const walkbackWorkerRef = useRef(null);
  const compareDataRef = useRef(null);
  const compareRequestRef = useRef(0);
  const requestRef = useRef(0);
  const inflightInputsRef = useRef(null);

  useEffect(
    () => () => {
      requestRef.current += 1;
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (walkbackWorkerRef.current) {
        walkbackWorkerRef.current.terminate();
        walkbackWorkerRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    // Inputs changed while a route was being calculated for other inputs:
    // cancel it so its late result cannot be shown for the new inputs.
    if (
      inflightInputsRef.current &&
      !sameRouteInputs(inflightInputsRef.current, { start, stops, destination })
    ) {
      inflightInputsRef.current = null;
      requestRef.current += 1;
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (walkbackWorkerRef.current) {
        walkbackWorkerRef.current.terminate();
        walkbackWorkerRef.current = null;
      }
      setCalculating(false);
    }
    compareRequestRef.current += 1;
    setRoute(null);
    setMetrics(null);
    setRouteError(null);
    setWalkbackError(null);
    setWalkback(null);
    setComparison(null);
    setComparisonError(null);
    setComparing(false);
    setEmergency(null);
    setPositionPercent(ASSUMPTIONS.emergencyPositionDefaultPercent.value);
  }, [start, stops, destination, setWalkback]);

  const effort = useMemo(() => {
    if (!route || !gridData) return null;
    return buildEnergyProfile(route, stops, {
      grid: gridData.grid,
      costToBase: walkback?.cost ?? null,
      capacityFraction: consumablesPercent / 100,
      massKg: ASSUMPTIONS.astronautSuitMass.value,
      marsGravity: ASSUMPTIONS.marsGravity.value,
      metabolicRateW: ASSUMPTIONS.nominalMetabolicRateW.value,
      enduranceHours: ASSUMPTIONS.suitDuration.value,
      scienceStopMinutes: ASSUMPTIONS.scienceStopMinutes.value,
      returnMarginFraction: ASSUMPTIONS.returnMargin.value,
      o2KjPerLiter: ASSUMPTIONS.oxygenEnergy.value,
    });
  }, [route, gridData, stops, walkback, consumablesPercent]);

  const roundTrip = useMemo(() => {
    if (!route || !metrics || !gridData || !walkback?.previous) return null;
    const destinationPoint = route[route.length - 1];
    const destinationIndex =
      destinationPoint.row * gridData.grid.cols + destinationPoint.col;
    const baseIndex =
      walkback.start.row * gridData.grid.cols + walkback.start.col;
    const indices = cellPathToBase(
      walkback.previous,
      destinationIndex,
      baseIndex
    );
    const returnPoints = pointsFromCellPath(indices, gridData);
    if (!returnPoints) return null;

    const returnsSeconds = walkingTimeSeconds(returnPoints, SUIT_FACTOR);
    const stopsSeconds =
      stops.length * ASSUMPTIONS.scienceStopMinutes.value * 60;
    const totalSeconds =
      metrics.timeSeconds + stopsSeconds + returnsSeconds;
    const evaDurationSeconds = ASSUMPTIONS.suitDuration.value * 3600;
    const evaWindowSeconds =
      (ASSUMPTIONS.conditions.value.evaWindowEndLmst -
        ASSUMPTIONS.conditions.value.evaWindowStartLmst) *
      3600;

    return {
      returnsSeconds,
      stopsSeconds,
      totalSeconds,
      evaDurationSeconds,
      evaWindowSeconds,
      exceedsDuration: totalSeconds > evaDurationSeconds,
      exceedsWindow: totalSeconds > evaWindowSeconds,
    };
  }, [route, metrics, gridData, walkback, stops]);

  const positionIndex =
    route && route.length > 0
      ? Math.round(((route.length - 1) * positionPercent) / 100)
      : null;
  const positionPoint =
    positionIndex !== null ? route?.[positionIndex] ?? null : null;
  // Stops are matched in visiting order: once a stop is matched, subsequent
  // stops search from that index onward so a stop cell crossed earlier (on the
  // way to a previous stop) is not charged at the wrong position.
  let stopSearchFrom = 0;
  const stopIndices = [];
  for (const stop of stops || []) {
    const offset = route
      .slice(stopSearchFrom)
      .findIndex((point) => point.col === stop.col && point.row === stop.row);
    if (offset >= 0) {
      stopSearchFrom += offset;
      stopIndices.push(stopSearchFrom);
    }
  }
  const duringWalk = useMemo(() => {
    if (!route || !metrics || !effort || positionIndex === null) return null;
    const walkedM = metrics.profile?.[positionIndex]?.d || 0;
    const cumulative = effort.cumulative[positionIndex];
    const elapsedWalking = walkingTimeSeconds(route.slice(0, positionIndex + 1), SUIT_FACTOR);
    const stopsDone = stopIndices.filter((index) => index <= positionIndex).length;
    return {
      walkedM,
      remainingM: Math.max(0, metrics.totalM - walkedM),
      elapsedSeconds: elapsedWalking + stopsDone * ASSUMPTIONS.scienceStopMinutes.value * 60,
      energyRemainingJ: effort.capacityJ - cumulative.totalJ,
      o2RemainingL: (effort.capacityJ - cumulative.totalJ) / (ASSUMPTIONS.oxygenEnergy.value * 1000),
    };
  }, [route, metrics, effort, positionIndex, stopIndices]);
  const shownEmergency = isEmergencyCurrent(emergency, {
    positionPercent,
    consumablesPercent,
  })
    ? emergency
    : null;

  const loadComparisonData = async () => {
    if (compareDataRef.current) return compareDataRef.current;
    const [traverseResponse, waypointsResponse] = await Promise.all([
      fetch(TRAVERSE_URL),
      fetch(WAYPOINTS_URL),
    ]);
    if (!traverseResponse.ok) {
      throw new Error(`HTTP ${traverseResponse.status} for ${TRAVERSE_URL}`);
    }
    if (!waypointsResponse.ok) {
      throw new Error(`HTTP ${waypointsResponse.status} for ${WAYPOINTS_URL}`);
    }
    const [traverse, waypoints] = await Promise.all([
      traverseResponse.json(),
      waypointsResponse.json(),
    ]);
    compareDataRef.current = { traverse, waypoints };
    return compareDataRef.current;
  };

  const runComparison = async (points) => {
    if (!points || points.length === 0) return;
    const requestId = compareRequestRef.current + 1;
    compareRequestRef.current = requestId;
    setComparing(true);
    setComparisonError(null);
    try {
      const data = await loadComparisonData();
      if (requestId !== compareRequestRef.current) return;
      const result = compareToRover({
        route: points,
        traverse: data.traverse,
        waypoints: data.waypoints,
        resampleM: ASSUMPTIONS.comparisonResampleM.value,
        withinM: ASSUMPTIONS.comparisonWithinM.value,
      });
      const slopes = compareSlopes({
        route: points,
        traverse: data.traverse,
        slope: gridData.slope,
        grid: gridData.grid,
        resampleM: ASSUMPTIONS.comparisonResampleM.value,
        bands: ASSUMPTIONS.comparisonSlopeBandsDeg.value,
      });
      if (requestId !== compareRequestRef.current) return;
      setComparison({ ...result, slopes });
    } catch (error) {
      if (requestId !== compareRequestRef.current) return;
      setComparisonError(error.message || 'Rover comparison failed.');
    } finally {
      if (requestId === compareRequestRef.current) setComparing(false);
    }
  };

  useEffect(() => {
    if (!map || !gridData) return undefined;

    const handleClick = (event) => {
      if (!mode) return;
      const cell = latLonToCell(event.latlng.lat, event.latlng.lng, gridData.grid);
      if (!cell) {
        const widthKm = (gridData.grid.cols * gridData.grid.cellSizeMeters.x) / 1000;
        const heightKm = (gridData.grid.rows * gridData.grid.cellSizeMeters.y) / 1000;
        setRouteError(
          `Point is outside the ${widthKm} x ${heightKm} km route grid.`
        );
        return;
      }
      if (isBlockedCell(gridData.slope, cell.col, cell.row, gridData.grid, MAX_SLOPE)) {
        setRouteError(
          `This cell is blocked (slope above ${MAX_SLOPE}° or NoData).`
        );
        return;
      }

      const { lat, lon } = cellToLatLon(cell.col, cell.row, gridData.grid);
      const point = { ...cell, lat, lon };

      if (mode === 'start') setStart(point);
      else if (mode === 'destination') setDestination(point);
      else setStops((previous) => [...previous, point]);

      setMode(null);
      setRouteError(null);
    };

    map.on('click', handleClick);
    const container = map.getContainer();
    container.style.cursor = mode ? 'crosshair' : '';

    return () => {
      map.off('click', handleClick);
      container.style.cursor = '';
    };
  }, [map, gridData, mode]);

  useEffect(() => {
    if (!map || !gridData) return undefined;

    const group = L.featureGroup().addTo(map);

    const addPointMarker = (point, label, color) => {
      if (!point) return;
      L.circleMarker([point.lat, point.lon], {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95,
      })
        .bindPopup(label)
        .addTo(group);
    };

    addPointMarker(start, 'Start', '#2ecc71');
    stops.forEach((stop, index) => {
      addPointMarker(stop, `Stop ${index + 1}`, '#f2c14e');
    });
    addPointMarker(destination, 'Destination', '#e74c3c');
    if (positionPoint) {
      addPointMarker(
        positionPoint,
        `Route position ${positionPercent}%`,
        '#ff6bd6'
      );
    }

    if (route && route.length > 1) {
      const latLngs = route.map((point) => [point.lat, point.lon]);
      L.polyline(latLngs, {
        color: '#ffffff',
        weight: 6,
        opacity: 0.45,
      }).addTo(group);
      L.polyline(latLngs, {
        color: '#00e5ff',
        weight: 3.5,
        opacity: 0.95,
      }).addTo(group);

      if (effort?.safety) {
        for (let index = 1; index < route.length; index += 1) {
          if (effort.safety[index]?.safe === false) {
            L.polyline(
              [
                [route[index - 1].lat, route[index - 1].lon],
                [route[index].lat, route[index].lon],
              ],
              {
                color: '#ff4d4d',
                weight: 5,
                opacity: 0.95,
              }
            ).addTo(group);
          }
        }
      }
    }

    if (shownEmergency?.returnPoints?.length > 1) {
      const returnLatLngs = shownEmergency.returnPoints.map((point) => [
        point.lat,
        point.lon,
      ]);
      L.polyline(returnLatLngs, {
        color: '#ffffff',
        weight: 5,
        opacity: 0.35,
      }).addTo(group);
      L.polyline(returnLatLngs, {
        color: '#ff6bd6',
        weight: 3,
        opacity: 0.95,
        dashArray: '7 6',
      }).addTo(group);
    }

    return () => {
      group.remove();
    };
  }, [
    map,
    gridData,
    start,
    stops,
    destination,
    route,
    effort,
    positionPoint,
    positionPercent,
    shownEmergency,
  ]);

  const calculateRoute = (options = {}) => {
    const routeStart = options.start || start;
    const routeDestination = options.destination || destination;
    const routeStops = options.stops ?? stops;
    if (!gridData || !routeStart || !routeDestination) return;

    if (options.start) setStart(options.start);
    if (options.destination) setDestination(options.destination);
    if (options.stops) setStops(options.stops);

    const legs = [];
    let previous = routeStart;
    for (const stop of routeStops) {
      legs.push({
        start: { col: previous.col, row: previous.row },
        goal: { col: stop.col, row: stop.row },
      });
      previous = stop;
    }
    legs.push({
      start: { col: previous.col, row: previous.row },
      goal: { col: routeDestination.col, row: routeDestination.row },
    });

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (walkbackWorkerRef.current) {
      walkbackWorkerRef.current.terminate();
      walkbackWorkerRef.current = null;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    inflightInputsRef.current = {
      start: routeStart,
      stops: routeStops,
      destination: routeDestination,
    };

    compareRequestRef.current += 1;
    setCalculating(true);
    setRouteError(null);
    setWalkbackError(null);
    setRoute(null);
    setMetrics(null);
    setComparison(null);
    setComparisonError(null);
    setComparing(false);
    setEmergency(null);

    const runAstar = () =>
      new Promise((resolve, reject) => {
        const worker = new Worker(
          new URL('../lib/astar.worker.js', import.meta.url),
          { type: 'module' }
        );
        workerRef.current = worker;

        worker.onmessage = (event) => {
          if (requestId !== requestRef.current) {
            worker.terminate();
            reject(new Error('Stale route request.'));
            return;
          }
          const message = event.data;
          if (message.type === 'error') {
            worker.terminate();
            workerRef.current = null;
            reject(new Error(message.message));
            return;
          }
          worker.terminate();
          workerRef.current = null;
          if (Number.isFinite(message.ms)) {
            console.info(
              `[F3] A* ${message.path.length} cells in ${message.ms.toFixed(1)} ms`
            );
          }
          resolve(message.path);
        };

        worker.onerror = (error) => {
          worker.terminate();
          workerRef.current = null;
          reject(new Error(`Route worker error: ${error.message}`));
        };

        const slopeCopy = gridData.slope.slice();
        worker.postMessage(
          {
            type: 'route',
            grid: {
              rows: gridData.grid.rows,
              cols: gridData.grid.cols,
              bounds: gridData.grid.bounds,
              cellSizeMeters: gridData.grid.cellSizeMeters,
              nodata: gridData.grid.nodata,
            },
            slope: slopeCopy,
            legs,
            maxSlopeDeg: MAX_SLOPE,
          },
          [slopeCopy.buffer]
        );
      });

    const canReuseWalkback =
      walkback &&
      walkback.start &&
      walkback.start.col === routeStart.col &&
      walkback.start.row === routeStart.row;

    const runWalkback = () => {
      if (canReuseWalkback) return Promise.resolve(walkback);
      return new Promise((resolve, reject) => {
        const worker = new Worker(
          new URL('../lib/walkback.worker.js', import.meta.url),
          { type: 'module' }
        );
        walkbackWorkerRef.current = worker;

        worker.onmessage = (event) => {
          if (requestId !== requestRef.current) {
            worker.terminate();
            reject(new Error('Stale walkback request.'));
            return;
          }
          const message = event.data;
          if (message.type === 'error') {
            worker.terminate();
            walkbackWorkerRef.current = null;
            reject(new Error(message.message));
            return;
          }
          worker.terminate();
          walkbackWorkerRef.current = null;
          if (Number.isFinite(message.ms)) {
            console.info(
              `[F5] walkback Dijkstra ${message.visited} cells in ${message.ms.toFixed(1)} ms`
            );
          }
          resolve({
            cost: message.cost,
            previous: message.previous,
            start: { col: routeStart.col, row: routeStart.row },
            visited: message.visited,
            ms: message.ms,
          });
        };

        worker.onerror = (error) => {
          worker.terminate();
          walkbackWorkerRef.current = null;
          reject(new Error(`Walkback worker error: ${error.message}`));
        };

        const slopeCopy = gridData.slope.slice();
        const elevationCopy = gridData.elevation.slice();
        worker.postMessage(
          {
            type: 'walkback',
            grid: {
              rows: gridData.grid.rows,
              cols: gridData.grid.cols,
              bounds: gridData.grid.bounds,
              cellSizeMeters: gridData.grid.cellSizeMeters,
              nodata: gridData.grid.nodata,
            },
            slope: slopeCopy,
            elevation: elevationCopy,
            start: { col: routeStart.col, row: routeStart.row },
            massKg: ASSUMPTIONS.astronautSuitMass.value,
            marsGravity: ASSUMPTIONS.marsGravity.value,
            earthGravity: ASSUMPTIONS.earthGravity.value,
            maxSlopeDeg: MAX_SLOPE,
          },
          [slopeCopy.buffer, elevationCopy.buffer]
        );
      });
    };

    Promise.all([
      runAstar(),
      runWalkback().catch((error) => ({ error: error.message })),
    ])
      .then(([path, walkbackResult]) => {
        if (requestId !== requestRef.current) return;
        inflightInputsRef.current = null;

        const points = path.map((index) => {
          const row = Math.floor(index / gridData.grid.cols);
          const col = index - row * gridData.grid.cols;
          const { lat, lon } = cellToLatLon(col, row, gridData.grid);
          return {
            col,
            row,
            lat,
            lon,
            elev: gridData.elevation[index],
            slope: gridData.slope[index],
          };
        });

        setRoute(points);
        setMetrics(computeMetrics(points));
        if (walkbackResult.error) {
          setWalkbackError(walkbackResult.error);
          setWalkback(null);
        } else {
          setWalkback(walkbackResult);
          setWalkbackError(null);
        }
        if (options.compareAfter) {
          runComparison(points);
        }
        setCalculating(false);
      })
      .catch((error) => {
        if (requestId !== requestRef.current) return;
        inflightInputsRef.current = null;
        setRouteError(error.message || 'Route calculation failed.');
        setCalculating(false);
      });
  };

  const runPreset = (preset) => {
    if (!gridData) return;
    const startCell = latLonToCell(
      preset.start.lat,
      preset.start.lon,
      gridData.grid
    );
    const destinationCell = latLonToCell(
      preset.destination.lat,
      preset.destination.lon,
      gridData.grid
    );
    if (!startCell || !destinationCell) {
      setRouteError(`${preset.label} is outside the route grid.`);
      return;
    }
    const startPoint = {
      ...startCell,
      ...cellToLatLon(startCell.col, startCell.row, gridData.grid),
    };
    const destinationPoint = {
      ...destinationCell,
      ...cellToLatLon(
        destinationCell.col,
        destinationCell.row,
        gridData.grid
      ),
    };
    const presetStops = (preset.stops || []).map((stop) => {
      const cell = latLonToCell(stop.lat, stop.lon, gridData.grid);
      if (!cell) return null;
      return {
        ...cell,
        ...cellToLatLon(cell.col, cell.row, gridData.grid),
        name: stop.name,
        source: 'science-stop',
      };
    }).filter(Boolean);

    calculateRoute({
      start: startPoint,
      destination: destinationPoint,
      stops: presetStops,
      compareAfter: true,
    });
  };

  const useLandingSite = () => {
    if (!gridData) return;
    const cell = latLonToCell(LANDING_SITE.lat, LANDING_SITE.lon, gridData.grid);
    if (!cell) return;
    setStart({ ...cell, ...cellToLatLon(cell.col, cell.row, gridData.grid) });
    setMode(null);
  };

  const runEmergency = () => {
    if (
      !gridData ||
      !route ||
      positionIndex === null ||
      !positionPoint ||
      !effort ||
      !walkback?.cost ||
      !walkback?.previous
    ) {
      return;
    }

    const currentIndex =
      positionPoint.row * gridData.grid.cols + positionPoint.col;
    const baseIndex =
      walkback.start.row * gridData.grid.cols + walkback.start.col;
    const indices = cellPathToBase(
      walkback.previous,
      currentIndex,
      baseIndex
    );
    const returnPoints = pointsFromCellPath(indices, gridData);
    if (!returnPoints) {
      setEmergency({
        error: 'No walkback path is available from this point.',
        positionPercent,
        consumablesPercent,
      });
      return;
    }

    const returnEnergyJ = walkback.cost[currentIndex];
    if (!Number.isFinite(returnEnergyJ)) {
      setEmergency({
        error: 'No walkback energy is available from this point.',
        positionPercent,
        consumablesPercent,
      });
      return;
    }
    const cumulative = effort.cumulative[positionIndex];
    if (!cumulative) {
      setEmergency({
        error: 'Route energy at this position is unavailable.',
        positionPercent,
        consumablesPercent,
      });
      return;
    }

    const returnDistanceM = pathLength(returnPoints);
    const returnSeconds = walkingTimeSeconds(returnPoints, SUIT_FACTOR);
    const remainingJ = effort.capacityJ - cumulative.totalJ;
    const remainingO2L =
      remainingJ / (ASSUMPTIONS.oxygenEnergy.value * 1000);
    const returnO2L =
      returnEnergyJ / (ASSUMPTIONS.oxygenEnergy.value * 1000);
    const requiredJ = returnEnergyJ * (1 + ASSUMPTIONS.returnMargin.value);
    const marginJ = remainingJ - requiredJ;

    setEmergency({
      returnPoints,
      returnDistanceM,
      returnSeconds,
      returnEnergyJ,
      returnO2L,
      remainingJ,
      remainingO2L,
      requiredJ,
      marginJ,
      ok: marginJ >= 0,
      positionPercent,
      consumablesPercent,
      positionIndex,
    });
  };

  const cancelEmergency = () => setEmergency(null);

  const clearAll = () => {
    requestRef.current += 1;
    inflightInputsRef.current = null;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (walkbackWorkerRef.current) {
      walkbackWorkerRef.current.terminate();
      walkbackWorkerRef.current = null;
    }
    setCalculating(false);
    setMode(null);
    setStart(null);
    setStops([]);
    setDestination(null);
    setRoute(null);
    setMetrics(null);
    setRouteError(null);
    setWalkbackError(null);
    setWalkback(null);
    compareRequestRef.current += 1;
    setComparison(null);
    setComparisonError(null);
    setComparing(false);
    setEmergency(null);
    setPositionPercent(ASSUMPTIONS.emergencyPositionDefaultPercent.value);
  };

  const removeStop = (index) => {
    setStops((previous) => previous.filter((_, i) => i !== index));
  };

  const modeLabel =
    mode === 'start'
      ? 'the start'
      : mode === 'stop'
        ? 'a stop'
        : mode === 'destination'
          ? 'the destination'
          : null;

  const gridWidthKm = gridData
    ? (gridData.grid.cols * gridData.grid.cellSizeMeters.x) / 1000
    : null;
  const gridHeightKm = gridData
    ? (gridData.grid.rows * gridData.grid.cellSizeMeters.y) / 1000
    : null;

  return (
    <aside className="route-panel" aria-label="Route planner">
      <div className="route-panel__header">
        <h2>Route</h2>
        <span className="route-panel__tag">A* · 20 m</span>
      </div>

      {gridError && <div className="route-panel__error">{gridError}</div>}
      {!gridError && !gridData && (
        <div className="route-panel__muted">Loading slope grid...</div>
      )}

      {gridData && (
        <>
          {!route && !calculating && (
            <div className="route-empty">Pick a preset or set a start point to begin.</div>
          )}
          {calculating && (
            <div className="route-loading" role="status">
              Planning route and return field…
            </div>
          )}
          <div className="route-panel__modes">
            <button
              type="button"
              className={mode === 'start' ? 'is-active' : ''}
              onClick={() => setMode('start')}
            >
              Set start
            </button>
            <button
              type="button"
              className={mode === 'stop' ? 'is-active' : ''}
              onClick={() => setMode('stop')}
            >
              Add stop
            </button>
            <button
              type="button"
              className={mode === 'destination' ? 'is-active' : ''}
              onClick={() => setMode('destination')}
            >
              Set destination
            </button>
          </div>

          {modeLabel && (
            <div className="route-panel__hint">
              Click the map to set {modeLabel}.
            </div>
          )}

          <div className="route-stepper" aria-label="Marswalk planning steps">
            <div className={`route-step${mode === 'start' || !start ? ' is-active' : ''}`}>
              <span>1</span>
              <strong>Start</strong>
              <small>{start ? formatPoint(start) : 'Choose a start point'}</small>
              <button type="button" onClick={() => setMode('start')}>change</button>
            </div>
            <div className={`route-step${mode === 'destination' || (start && !destination) ? ' is-active' : ''}`}>
              <span>2</span>
              <strong>Destination</strong>
              <small>{destination ? formatPoint(destination) : 'Choose a destination'}</small>
              <button type="button" onClick={() => setMode('destination')}>change</button>
            </div>
            <div className={`route-step${mode === 'stop' || (start && destination) ? ' is-active' : ''}`}>
              <span>3</span>
              <strong>Science stops (optional)</strong>
              <small>{stops.length ? `${stops.length} selected` : 'Optional'}</small>
              <button type="button" onClick={() => setMode('stop')}>change</button>
            </div>
          </div>
          {!start && (
            <button type="button" className="route-panel__landing" onClick={useLandingSite}>
              Use landing site
            </button>
          )}

          <div className="route-panel__points">
            <div className="route-panel__point-row">
              <span>Start</span>
              <strong>{start ? formatPoint(start) : 'not set'}</strong>
            </div>
            <div className="route-panel__point-row">
              <span>Stops</span>
              <strong>{stops.length}</strong>
            </div>
            {stops.length > 0 && (
              <ol className="route-panel__stop-list">
                {stops.map((stop, index) => (
                  <li key={`${stop.col}-${stop.row}-${index}`}>
                    <span>
                      {stop.name ? `${stop.name} · ` : ''}
                      {formatPoint(stop)}
                    </span>
                    <button
                      type="button"
                      className="route-panel__link"
                      onClick={() => removeStop(index)}
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div className="route-panel__point-row">
              <span>Destination</span>
              <strong>{destination ? formatPoint(destination) : 'not set'}</strong>
            </div>
          </div>

          <div className="route-panel__actions">
            <button
              type="button"
              className="route-panel__primary"
              disabled={!start || !destination || calculating}
              onClick={() => calculateRoute()}
              title={!start || !destination ? 'Set a start and destination first' : 'Plan the route'}
            >
              {calculating ? 'Planning...' : 'Plan route'}
            </button>
            <button type="button" onClick={clearAll} disabled={calculating}>
              Clear all
            </button>
          </div>

          <button
            type="button"
            className="route-panel__preset"
            onClick={() => runPreset(ROUTE_PRESETS.landingToThreeForks)}
            disabled={!gridData || calculating}
          >
            {ROUTE_PRESETS.landingToThreeForks.label}
          </button>
          <button
            type="button"
            className="route-panel__preset"
            onClick={() => runPreset(ROUTE_PRESETS.landingToBrightAngel)}
            disabled={!gridData || calculating}
          >
            {ROUTE_PRESETS.landingToBrightAngel.label}
          </button>

          <details className="mission-assumptions">
            <summary>Mission assumptions</summary>
            <div className="route-panel__consumables-control">
              <div className="route-panel__control-head">
                <span>Consumables at start</span>
                <strong>{consumablesPercent}%</strong>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={consumablesPercent}
                onChange={(event) =>
                  setConsumablesPercent(Number(event.target.value))
                }
              />
              <div className="route-panel__model-assumption">
                Model assumption <span className="badge badge--assumed">assumed</span>
              </div>
            </div>
            <div className="mission-assumptions__row"><span>Science stop time</span><strong>{ASSUMPTIONS.scienceStopMinutes.value} min <em>assumed</em></strong></div>
            <div className="mission-assumptions__row"><span>EVA duration</span><strong>{ASSUMPTIONS.suitDuration.value} h <em>assumed</em></strong></div>
            <div className="mission-assumptions__row"><span>Return margin</span><strong>{ASSUMPTIONS.returnMargin.value * 100}% <em>assumed</em></strong></div>
            <div className="mission-assumptions__row"><span>Suit speed factor</span><strong>{SUIT_FACTOR} <em>assumed</em></strong></div>
          </details>

          {routeError && <div className="route-panel__error">{routeError}</div>}
          {walkbackError && (
            <div className="route-panel__error">
              Walkback unavailable: {walkbackError}
            </div>
          )}

          {metrics && (
            <section className="walk-summary" aria-label="Walk summary">
              <div className="route-panel__section-title">Walk summary</div>
              <div className="walk-summary__grid">
                <div><span>Distance</span><strong>{(metrics.totalM / 1000).toFixed(2)} km</strong></div>
                <div><span>Walking time</span><strong>{formatDuration(metrics.timeSeconds)}</strong></div>
                <div><span>Time at stops</span><strong>{effort ? `${effort.stopMinutes} min` : '—'}</strong></div>
                <div><span>Round trip</span><strong>{roundTrip ? formatDuration(roundTrip.totalSeconds) : '—'}</strong></div>
                <div><span>Energy used</span><strong>{effort ? `${(effort.energyUsedJ / 1000).toFixed(0)} kJ · ${(effort.energyPercent).toFixed(1)}%` : '—'}</strong></div>
                <div><span>O2 used</span><strong>{effort ? `${effort.o2UsedL.toFixed(1)} L · ${(effort.o2Percent).toFixed(1)}%` : '—'}</strong></div>
                <div><span>Max slope</span><strong>{metrics.maxSlopeDeg.toFixed(1)}°</strong></div>
                <div><span>Ascent / descent</span><strong>{metrics.ascentM.toFixed(0)} / {metrics.descentM.toFixed(0)} m</strong></div>
                <div><span>Science stops</span><strong>{stops.length}</strong></div>
              </div>
              <div className={`walk-summary__verdict ${effort?.firstUnsafe ? 'is-danger' : roundTrip?.exceedsDuration || roundTrip?.exceedsWindow ? 'is-warning' : 'is-safe'}`}>
                {effort?.firstUnsafe
                  ? `Point of no return at ${(effort.firstUnsafe.index / Math.max(1, route.length - 1) * metrics.totalM / 1000).toFixed(2)} km`
                  : roundTrip?.exceedsDuration || roundTrip?.exceedsWindow
                    ? 'Round trip has EVA time warnings'
                    : 'Safe to walk and return'}
              </div>
            </section>
          )}

          {route && (
            <div className="route-legend" aria-label="Route legend">
              <span><i className="route-legend__line is-planned" /> planned route</span>
              <span><i className="route-legend__line is-unsafe" /> unsafe</span>
              <span><i className="route-legend__line is-emergency" /> emergency return</span>
            </div>
          )}

          {metrics && (
            <div className="route-panel__metrics">
              <div className="route-metric">
                <span>Distance</span>
                <strong>{(metrics.totalM / 1000).toFixed(2)} km</strong>
              </div>
              <div className="route-metric">
                <span>Ascent</span>
                <strong>{metrics.ascentM.toFixed(0)} m</strong>
              </div>
              <div className="route-metric">
                <span>Descent</span>
                <strong>{metrics.descentM.toFixed(0)} m</strong>
              </div>
              <div className="route-metric">
                <span>Max slope</span>
                <strong>{metrics.maxSlopeDeg.toFixed(1)}°</strong>
              </div>
              <div className="route-metric">
                <span>Walking time</span>
                <strong>{formatDuration(metrics.timeSeconds)}</strong>
              </div>
              <div className="route-panel__assumption">
                Suit speed factor {SUIT_FACTOR}{' '}
                <span className="badge badge--assumed">assumed</span>
              </div>
               <ElevationProfile
                 profile={metrics.profile}
                 safety={effort?.safety}
                 stopIndices={stopIndices}
                 currentIndex={positionIndex}
                 onSelect={(index) => setPositionPercent((index / Math.max(1, route.length - 1)) * 100)}
               />
            </div>
          )}

          {route && (
            <details className="route-validation">
              <summary>Validation vs Perseverance</summary>
              <div className="route-panel__compare-control">
                <button
                  type="button"
                  onClick={() => runComparison(route)}
                  disabled={comparing}
                >
                  {comparing ? 'Comparing...' : 'Compare with Perseverance'}
                </button>
              </div>
              {comparisonError && (
                <div className="route-panel__error">{comparisonError}</div>
              )}
            </details>
          )}

          {roundTrip && (
            <div className="route-panel__time-check">
              <div className="route-panel__section-title">Time check</div>
              <div className="route-panel__time-row">
                <span>Round trip (walk + stops + return)</span>
                <strong>{formatDuration(roundTrip.totalSeconds)}</strong>
              </div>
              <div className="route-panel__time-row">
                <span>EVA duration</span>
                <span>{formatDuration(roundTrip.evaDurationSeconds)}</span>
              </div>
              <div className="route-panel__time-row">
                <span>EVA window</span>
                <span>{formatDuration(roundTrip.evaWindowSeconds)}</span>
              </div>
              {roundTrip.exceedsDuration && (
                <div className="route-panel__warning">
                  Round trip exceeds EVA duration
                </div>
              )}
              {roundTrip.exceedsWindow && (
                <div className="route-panel__warning">
                  Round trip exceeds daylight EVA window
                </div>
              )}
            </div>
          )}
          {route && metrics && !roundTrip && (
            <div className="route-panel__muted">
              Round-trip time unavailable: the walkback path field is missing.
            </div>
          )}

          {effort && metrics && (
            <div className="route-panel__effort">
              <div className="route-panel__section-title">Consumables</div>
              {effort.walkbackAvailable ? (
                effort.firstUnsafe ? (
                  <div className="route-panel__warning">
                    <strong>Point of no return</strong> at vertex{' '}
                    {effort.firstUnsafe.index + 1} (
                    {effort.firstUnsafe.point.lat.toFixed(4)}°,{' '}
                    {effort.firstUnsafe.point.lon.toFixed(4)}°): remaining{' '}
                    {(effort.firstUnsafe.remainingJ / 1000).toFixed(1)} kJ,
                    return cost{' '}
                    {effort.firstUnsafe.returnJ === null
                      ? 'unavailable'
                      : `${(effort.firstUnsafe.returnJ / 1000).toFixed(1)} kJ`}
                    {effort.firstUnsafe.margin === null
                      ? ''
                      : `, margin ${(
                          effort.firstUnsafe.margin * 100
                        ).toFixed(1)}% (needs +${(
                          ASSUMPTIONS.returnMargin.value * 100
                        ).toFixed(0)}%)`}
                    .
                  </div>
                ) : (
                  <div className="route-panel__safe">
                    Walkback safe along the whole route.
                  </div>
                )
              ) : null}
              <ConsumableBar
                label="Energy"
                used={effort.energyUsedJ / 1000}
                capacity={effort.capacityJ / 1000}
                remaining={effort.energyRemainingJ / 1000}
                unit="kJ"
              />
              <ConsumableBar
                label="O2"
                used={effort.o2UsedL}
                capacity={effort.o2CapacityL}
                remaining={effort.o2RemainingL}
                unit="L"
              />
              <div className="route-panel__effort-meta">
                Walking {(effort.walkingJ / 1000).toFixed(1)} kJ · stops{' '}
                {(effort.stopJ / 1000).toFixed(1)} kJ ({stops.length} ×{' '}
                {ASSUMPTIONS.scienceStopMinutes.value} min)
              </div>
              <div className="route-panel__time-meta">
                Walking time {formatDuration(metrics.timeSeconds)} · time at
                stops {effort.stopMinutes} min
              </div>
              <div className="route-panel__model-note">
                First-order Minetti model; Mars gravity scaling (3.71/9.81) is
                an approximation.
              </div>
            </div>
          )}

          {route && metrics && (
            <div className="route-panel__emergency">
              <div className="route-panel__section-title">During the walk</div>
              <div className="route-panel__control-head">
                <span>Simulate position along the route</span>
                <strong>{positionPercent}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={positionPercent}
                onChange={(event) => {
                  setPositionPercent(Number(event.target.value));
                  setEmergency(null);
                }}
              />
              <div className="route-panel__emergency-position">
                {positionPoint
                  ? formatPoint(positionPoint)
                  : 'No route position selected'}
              </div>
              {duringWalk && (
                <div className="during-walk__stats">
                  <div className="route-panel__time-row"><span>Distance walked / remaining</span><strong>{(duringWalk.walkedM / 1000).toFixed(2)} / {(duringWalk.remainingM / 1000).toFixed(2)} km</strong></div>
                  <div className="route-panel__time-row"><span>Elapsed time</span><strong>{formatDuration(duringWalk.elapsedSeconds)}</strong></div>
                  <ConsumableBar label="Energy remaining" used={Math.max(0, effort.capacityJ - duringWalk.energyRemainingJ) / 1000} capacity={effort.capacityJ / 1000} remaining={duringWalk.energyRemainingJ / 1000} unit="kJ" />
                  <ConsumableBar label="O2 remaining" used={Math.max(0, effort.o2CapacityL - duringWalk.o2RemainingL)} capacity={effort.o2CapacityL} remaining={duringWalk.o2RemainingL} unit="L" />
                  {shownEmergency && !shownEmergency.error && (
                    <div className="route-panel__time-row"><span>Distance / time back</span><strong>{(shownEmergency.returnDistanceM / 1000).toFixed(2)} km · {formatDuration(shownEmergency.returnSeconds)}</strong></div>
                  )}
                </div>
              )}
              <button
                type="button"
                className="route-panel__emergency-button"
                onClick={runEmergency}
                disabled={!walkback?.previous || !effort}
              >
                Emergency: return to base
              </button>
              {!walkback?.previous && (
                <div className="route-panel__muted">
                  Walkback path field is not available.
                </div>
              )}
              {shownEmergency?.error && (
                <div className="route-panel__error">{shownEmergency.error}</div>
              )}
              {shownEmergency && !shownEmergency.error && (
                <div className="route-panel__emergency-result">
                  <div
                    className={
                      shownEmergency.ok
                        ? 'route-panel__safe'
                        : 'route-panel__warning'
                    }
                  >
                    <strong>{shownEmergency.ok ? 'OK' : 'NOT ENOUGH'}</strong>
                  </div>
                  <div className="route-panel__time-row">
                    <span>Return distance</span>
                    <strong>
                      {(shownEmergency.returnDistanceM / 1000).toFixed(2)} km
                    </strong>
                  </div>
                  <div className="route-panel__time-row">
                    <span>Return walking time</span>
                    <strong>{formatDuration(shownEmergency.returnSeconds)}</strong>
                  </div>
                  <div className="route-panel__time-row">
                    <span>Energy needed</span>
                    <strong>
                      {(shownEmergency.returnEnergyJ / 1000).toFixed(1)} kJ ·{' '}
                      {shownEmergency.returnO2L.toFixed(1)} L O2
                    </strong>
                  </div>
                  <div className="route-panel__time-row">
                    <span>Remaining at position</span>
                    <strong>
                      {(shownEmergency.remainingJ / 1000).toFixed(1)} kJ ·{' '}
                      {shownEmergency.remainingO2L.toFixed(1)} L O2
                    </strong>
                  </div>
                  <div className="route-panel__time-row">
                    <span>Margin (needs +20%)</span>
                    <strong>
                      {(shownEmergency.marginJ / 1000).toFixed(1)} kJ
                    </strong>
                  </div>
                  <div className="route-panel__emergency-legend">
                    Dashed magenta: emergency return path
                  </div>
                  <button type="button" onClick={cancelEmergency}>
                    Cancel emergency
                  </button>
                </div>
              )}
            </div>
          )}

          {comparison && (
            <details className="route-validation-result" open>
              <summary>Validation results</summary>
              <div className="route-comparison">
              <div className="route-panel__section-title">Rover check</div>
              <div className="route-comparison__metrics">
                <div>
                  <span>Mean</span>
                  <strong>{comparison.meanM.toFixed(0)} m</strong>
                </div>
                <div>
                  <span>Median</span>
                  <strong>{comparison.medianM.toFixed(0)} m</strong>
                </div>
                <div>
                  <span>Max</span>
                  <strong>{comparison.maxM.toFixed(0)} m</strong>
                </div>
              </div>
              <div className="route-comparison__bands">
                {comparison.within.map((band) => (
                  <span key={band.limitM}>
                    ≤ {band.limitM} m: {band.percent.toFixed(0)}%
                  </span>
                ))}
              </div>
              <div className="route-comparison__lengths">
                <div>
                  Our route: {(comparison.ourLengthM / 1000).toFixed(2)} km
                </div>
                <div>
                  Rover driven length:{' '}
                  {comparison.roverLengthM === null
                    ? 'unavailable'
                    : `${(comparison.roverLengthM / 1000).toFixed(2)} km`}
                  {comparison.startSol !== null && (
                    <>
                      {' '}
                      (sol {comparison.startSol} → {comparison.endSol})
                    </>
                  )}
                </div>
                {comparison.roverLengthRatio !== null && (
                  <div className="route-comparison__ratio">
                    Rover / our route: {comparison.roverLengthRatio.toFixed(2)}×
                  </div>
                )}
                <div className="route-comparison__detour-note">
                  Includes science detours and exploration between those sols.
                </div>
              </div>

              {comparison.slopes?.rover && comparison.slopes?.route && (
                <div className="route-comparison__slopes">
                  <div className="route-panel__section-title">
                    Rover traverse vs our route
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th />
                        <th>Rover traverse</th>
                        <th>Our route</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Mean slope</td>
                        <td>
                          {comparison.slopes.rover.meanDeg.toFixed(1)}°
                        </td>
                        <td>
                          {comparison.slopes.route.meanDeg.toFixed(1)}°
                        </td>
                      </tr>
                      <tr>
                        <td>Median slope</td>
                        <td>
                          {comparison.slopes.rover.medianDeg.toFixed(1)}°
                        </td>
                        <td>
                          {comparison.slopes.route.medianDeg.toFixed(1)}°
                        </td>
                      </tr>
                      {[10, 20].map((limit) => {
                        const roverband =
                          comparison.slopes.rover.above.find(
                            (band) => band.limitDeg === limit
                          );
                        const routeband =
                          comparison.slopes.route.above.find(
                            (band) => band.limitDeg === limit
                          );
                        return (
                          <tr key={limit}>
                            <td>% above {limit}°</td>
                            <td>
                              {roverband
                                ? `${roverband.percent.toFixed(1)}%`
                                : '—'}
                            </td>
                            <td>
                              {routeband
                                ? `${routeband.percent.toFixed(1)}%`
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td>Max slope</td>
                        <td>
                          {comparison.slopes.rover.maxDeg.toFixed(1)}°
                        </td>
                        <td>
                          {comparison.slopes.route.maxDeg.toFixed(1)}°
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="route-comparison__slope-note">
                    If the rover also avoids steep terrain, that supports our
                    slope-based cost; same-slope behaviour is evidence, not
                    proof.
                  </p>
                </div>
              )}

              <p className="route-comparison__note">
                The rover traverse is a sanity check, not ground truth: its
                wheels, hazards and science targets impose different
                constraints, so agreement shows the slope-based cost is
                plausible and differences are expected.
              </p>
              </div>
            </details>
          )}

          <div className="route-panel__note">
            Route limited to the {gridWidthKm} × {gridHeightKm} km slope grid.
            Slopes above {MAX_SLOPE}° are blocked.{' '}
            <span className="badge badge--assumed">assumed</span>
          </div>
        </>
      )}
    </aside>
  );
}
