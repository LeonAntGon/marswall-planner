/**
 * F8 - Pure comparison between the planned route and the Perseverance
 * traverse. All distances use marsDistance (Mars radius 3389.5 km).
 */

import { marsDistance, pathLength } from './marsGeo.js';

export function resamplePath(points, spacingM = 20) {
  if (!Array.isArray(points) || points.length === 0) return [];
  if (points.length === 1) {
    return [{ lat: points[0].lat, lon: points[0].lon }];
  }

  const cumulative = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += marsDistance(points[i - 1], points[i]);
    cumulative.push(total);
  }
  if (total === 0) {
    return [{ lat: points[0].lat, lon: points[0].lon }];
  }

  const samples = [];
  let segment = 1;
  for (let target = 0; target <= total; target += spacingM) {
    while (
      segment < cumulative.length - 1 &&
      cumulative[segment] < target
    ) {
      segment += 1;
    }
    const startDistance = cumulative[segment - 1];
    const endDistance = cumulative[segment];
    const span = endDistance - startDistance;
    const ratio = span > 0 ? (target - startDistance) / span : 0;
    const start = points[segment - 1];
    const end = points[segment];
    samples.push({
      lat: start.lat + (end.lat - start.lat) * ratio,
      lon: start.lon + (end.lon - start.lon) * ratio,
    });
  }

  const last = samples[samples.length - 1];
  const end = points[points.length - 1];
  if (!last || marsDistance(last, end) > 0.01) {
    samples.push({ lat: end.lat, lon: end.lon });
  }
  return samples;
}

function linePoints(coordinates) {
  return (coordinates || []).map((coordinate) => ({
    lat: coordinate[1],
    lon: coordinate[0],
  }));
}

export function resampleTraverse(geojson, spacingM = 20) {
  const samples = [];
  if (!geojson || !Array.isArray(geojson.features)) return samples;
  for (const feature of geojson.features) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    if (geometry.type === 'LineString') {
      samples.push(...resamplePath(linePoints(geometry.coordinates), spacingM));
    } else if (geometry.type === 'MultiLineString') {
      for (const line of geometry.coordinates) {
        samples.push(...resamplePath(linePoints(line), spacingM));
      }
    }
  }
  return samples;
}

export function slopeSummary(points, slope, grid, bands = [10, 20]) {
  if (!points || !slope || !grid) return null;
  const { west, south, east, north } = grid.bounds;
  const values = [];
  for (const point of points) {
    if (
      point.lon < west ||
      point.lon > east ||
      point.lat < south ||
      point.lat > north
    ) {
      continue;
    }
    const col = Math.min(
      grid.cols - 1,
      Math.max(0, Math.floor(((point.lon - west) / (east - west)) * grid.cols))
    );
    const row = Math.min(
      grid.rows - 1,
      Math.max(0, Math.floor(((north - point.lat) / (north - south)) * grid.rows))
    );
    const value = slope[row * grid.cols + col];
    if (Number.isFinite(value) && value !== grid.nodata) {
      values.push(value);
    }
  }
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const meanDeg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const medianDeg = median(sorted);
  const maxDeg = sorted[sorted.length - 1];
  return {
    sampleCount: values.length,
    meanDeg,
    medianDeg,
    maxDeg,
    above: bands.map((limitDeg) => ({
      limitDeg,
      percent:
        (values.filter((value) => value > limitDeg).length / values.length) *
        100,
    })),
  };
}

export function compareSlopes({
  route,
  traverse,
  slope,
  grid,
  resampleM = 20,
  bands = [10, 20],
}) {
  const routeSamples = resamplePath(route, resampleM);
  const roverSamples = resampleTraverse(traverse, resampleM);
  return {
    route: slopeSummary(routeSamples, slope, grid, bands),
    rover: slopeSummary(roverSamples, slope, grid, bands),
    routeSampleCount: routeSamples.length,
    roverSampleCount: roverSamples.length,
  };
}

export function flattenTraverse(geojson) {
  const points = [];
  if (!geojson || !Array.isArray(geojson.features)) return points;

  const addCoordinate = (coordinate, sol) => {
    if (
      Array.isArray(coordinate) &&
      coordinate.length >= 2 &&
      Number.isFinite(coordinate[0]) &&
      Number.isFinite(coordinate[1])
    ) {
      points.push({
        lon: coordinate[0],
        lat: coordinate[1],
        sol: Number.isFinite(sol) ? sol : null,
      });
    }
  };

  for (const feature of geojson.features) {
    const geometry = feature.geometry;
    const sol = Number(feature.properties?.sol);
    if (!geometry) continue;
    if (geometry.type === 'LineString') {
      for (const coordinate of geometry.coordinates) addCoordinate(coordinate, sol);
    } else if (geometry.type === 'MultiLineString') {
      for (const line of geometry.coordinates) {
        for (const coordinate of line) addCoordinate(coordinate, sol);
      }
    } else if (geometry.type === 'Point') {
      addCoordinate(geometry.coordinates, sol);
    }
  }
  return points;
}

function waypointCoordinate(feature) {
  const properties = feature.properties || {};
  const coordinates = feature.geometry?.coordinates;
  const lat = Number(properties.lat ?? coordinates?.[1]);
  const lon = Number(properties.lon ?? coordinates?.[0]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function nearestWaypoint(point, waypoints) {
  let best = null;
  for (const feature of waypoints?.features || []) {
    const coordinate = waypointCoordinate(feature);
    if (!coordinate) continue;
    const distanceM = marsDistance(point, coordinate);
    if (!best || distanceM < best.distanceM) {
      best = {
        ...feature.properties,
        ...coordinate,
        distanceM,
      };
    }
  }
  return best;
}

function nearestDistance(point, traversePoints) {
  let best = Number.POSITIVE_INFINITY;
  for (const traversePoint of traversePoints) {
    const distance = marsDistance(point, traversePoint);
    if (distance < best) best = distance;
  }
  return best;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function compareToRover({
  route,
  traverse,
  waypoints,
  resampleM = 20,
  withinM = [50, 100, 200],
}) {
  if (!Array.isArray(route) || route.length === 0) {
    throw new Error('No planned route to compare.');
  }
  const traversePoints = flattenTraverse(traverse);
  if (traversePoints.length === 0) {
    throw new Error('The rover traverse has no points.');
  }

  const samples = resamplePath(route, resampleM);
  const distances = samples.map((point) =>
    nearestDistance(point, traversePoints)
  );
  const count = distances.length;
  const meanM = distances.reduce((sum, value) => sum + value, 0) / count;
  const maxM = Math.max(...distances);
  const medM = median(distances);
  const within = withinM.map((limit) => ({
    limitM: limit,
    percent: (distances.filter((value) => value <= limit).length / count) * 100,
  }));

  const startWaypoint = nearestWaypoint(route[0], waypoints);
  const endWaypoint = nearestWaypoint(route[route.length - 1], waypoints);
  let startSol = null;
  let endSol = null;
  let roverLengthM = null;

  if (
    startWaypoint &&
    endWaypoint &&
    Number.isFinite(Number(startWaypoint.sol)) &&
    Number.isFinite(Number(endWaypoint.sol))
  ) {
    startSol = Math.min(Number(startWaypoint.sol), Number(endWaypoint.sol));
    endSol = Math.max(Number(startWaypoint.sol), Number(endWaypoint.sol));

    // A sol has several waypoints. Use the start-of-sol minimum and the
    // end-of-sol maximum driven distance so a stationary waypoint cannot
    // collapse the rover length to zero.
    const startDistances = (waypoints?.features || [])
      .filter(
        (feature) =>
          Number(feature.properties?.sol) === startSol &&
          Number.isFinite(Number(feature.properties?.dist_total_m))
      )
      .map((feature) => Number(feature.properties.dist_total_m));
    const endDistances = (waypoints?.features || [])
      .filter(
        (feature) =>
          Number(feature.properties?.sol) === endSol &&
          Number.isFinite(Number(feature.properties?.dist_total_m))
      )
      .map((feature) => Number(feature.properties.dist_total_m));

    if (startDistances.length > 0 && endDistances.length > 0) {
      roverLengthM = Math.abs(
        Math.max(...endDistances) - Math.min(...startDistances)
      );
    }
  }

  const ourLengthM = pathLength(route);
  return {
    sampleCount: count,
    traversePointCount: traversePoints.length,
    meanM,
    medianM: medM,
    maxM,
    within,
    ourLengthM,
    roverLengthM,
    roverLengthRatio:
      roverLengthM !== null && ourLengthM > 0
        ? roverLengthM / ourLengthM
        : null,
    startSol,
    endSol,
    startWaypoint,
    endWaypoint,
  };
}
