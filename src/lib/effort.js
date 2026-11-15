/**
 * F5 - First-order walking energy and consumables model.
 *
 * Minetti et al. 2002 gross walking cost:
 *   C(i) = 280.5 i^5 - 58.7 i^4 - 76.8 i^3 + 51.9 i^2 + 19.6 i + 2.5
 * where i is the signed gradient as a fraction. The gradient is clamped to
 * [-0.45, +0.45], the measured range of the study.
 *
 * Mars adjustment: multiply the Earth cost by crew+suit mass and by
 * (Mars gravity / Earth gravity). This is a first-order approximation, not a
 * biomechanical EVA model.
 */

import { ASSUMPTIONS } from '../config/assumptions.js';
import { marsDistance } from './marsGeo.js';

const GRADIENT_LIMIT = ASSUMPTIONS.minettiGradientLimit.value;
const EARTH_GRAVITY = ASSUMPTIONS.earthGravity.value;

export const MINETTI_GRADIENT_LIMIT = GRADIENT_LIMIT;

export function clampGradient(gradient) {
  return Math.max(-GRADIENT_LIMIT, Math.min(GRADIENT_LIMIT, gradient));
}

export function minettiCostPerKgMeter(gradient) {
  const i = clampGradient(gradient);
  return (
    280.5 * i ** 5 -
    58.7 * i ** 4 -
    76.8 * i ** 3 +
    51.9 * i ** 2 +
    19.6 * i +
    2.5
  );
}

export function walkingEnergyJPerMeter(gradient, massKg, marsGravity) {
  return (
    minettiCostPerKgMeter(gradient) *
    massKg *
    (marsGravity / EARTH_GRAVITY)
  );
}

export function energyCapacityJ(metabolicRateW, enduranceHours) {
  return metabolicRateW * enduranceHours * 3600;
}

export function energyToO2Liters(energyJ, o2KjPerLiter) {
  return energyJ / (o2KjPerLiter * 1000);
}

/**
 * F4/F5 walking time using Tobler's hiking function and the suit-speed factor.
 * Used by the outbound metrics, the round-trip check and F9.
 */
export function walkingTimeSeconds(points, suitSpeedFactor) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let timeSeconds = 0;
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const distance = marsDistance(
      [previous.lat, previous.lon],
      [current.lat, current.lon]
    );
    if (distance <= 0) continue;
    const slopeRad = Math.atan2(current.elev - previous.elev, distance);
    const speedKmh =
      6 *
      Math.exp(-3.5 * Math.abs(Math.tan(slopeRad) + 0.05)) *
      suitSpeedFactor;
    if (speedKmh > 0) {
      timeSeconds += distance / ((speedKmh * 1000) / 3600);
    }
  }
  return timeSeconds;
}

function stepEnergyJ(previous, current, massKg, marsGravity) {
  const distance = marsDistance(
    [previous.lat, previous.lon],
    [current.lat, current.lon]
  );
  if (distance <= 0) return 0;
  const gradient = (current.elev - previous.elev) / distance;
  return walkingEnergyJPerMeter(gradient, massKg, marsGravity) * distance;
}

/**
 * Build walking energy, stop energy, O2 and walkback safety for a route.
 *
 * options:
 *   grid             { rows, cols }
 *   costToBase       Float32Array or null, indexed row*cols+col
 *   capacityFraction 0.2-1 (slider)
 *   massKg, marsGravity, metabolicRateW, enduranceHours,
 *   scienceStopMinutes, returnMarginFraction, o2KjPerLiter
 */
export function buildEnergyProfile(route, stops, options) {
  if (!route || route.length === 0) return null;

  const {
    grid,
    costToBase = null,
    capacityFraction = 1,
    massKg,
    marsGravity,
    metabolicRateW,
    enduranceHours,
    scienceStopMinutes,
    returnMarginFraction,
    o2KjPerLiter,
  } = options;

  if (
    !grid ||
    !Number.isFinite(massKg) ||
    !Number.isFinite(marsGravity) ||
    !Number.isFinite(metabolicRateW) ||
    !Number.isFinite(enduranceHours) ||
    !Number.isFinite(scienceStopMinutes) ||
    !Number.isFinite(returnMarginFraction) ||
    !Number.isFinite(o2KjPerLiter)
  ) {
    return null;
  }

  const capacityJ = energyCapacityJ(metabolicRateW, enduranceHours) * capacityFraction;
  const o2CapacityL = energyToO2Liters(capacityJ, o2KjPerLiter);
  const stopEnergyJ = metabolicRateW * scienceStopMinutes * 60;

  // Stops are visited in order, so search each one from the previous stop's
  // index. A plain findIndex would charge a stop at an earlier crossing of
  // its cell (for example on the way to a previous stop).
  const stopCountAt = new Map();
  let searchFrom = 0;
  for (const stop of stops || []) {
    const offset = route
      .slice(searchFrom)
      .findIndex((point) => point.col === stop.col && point.row === stop.row);
    const index = offset >= 0 ? searchFrom + offset : -1;
    if (index >= 0) {
      searchFrom = index;
      stopCountAt.set(index, (stopCountAt.get(index) || 0) + 1);
    }
  }

  const segmentsJ = [];
  const cumulative = [];
  let walkingJ = 0;
  let stopJ = 0;

  for (let i = 0; i < route.length; i += 1) {
    let segment = 0;
    if (i > 0) {
      segment = stepEnergyJ(route[i - 1], route[i], massKg, marsGravity);
    }
    walkingJ += segment;
    segmentsJ.push(segment);
    stopJ += (stopCountAt.get(i) || 0) * stopEnergyJ;
    cumulative.push({
      walkingJ,
      stopJ,
      totalJ: walkingJ + stopJ,
    });
  }

  const energyUsedJ = walkingJ + stopJ;
  const o2UsedL = energyToO2Liters(energyUsedJ, o2KjPerLiter);
  const walkbackAvailable = costToBase != null;
  const safety = [];
  let firstUnsafe = null;

  for (let i = 0; i < route.length; i += 1) {
    const point = route[i];
    const cell = point.row * grid.cols + point.col;
    const returnValue = walkbackAvailable ? costToBase[cell] : null;
    const returnJ =
      walkbackAvailable && Number.isFinite(returnValue) ? returnValue : null;
    const requiredJ =
      !walkbackAvailable
        ? null
        : returnJ === null
          ? null
          : returnJ * (1 + returnMarginFraction);
    const remainingJ = capacityJ - cumulative[i].totalJ;
    const safe = !walkbackAvailable
      ? null
      : returnJ === null
        ? false
        : remainingJ >= requiredJ;
    const margin =
      returnJ !== null && returnJ > 0 ? remainingJ / returnJ - 1 : null;

    safety.push({
      safe,
      remainingJ,
      returnJ,
      requiredJ,
      margin,
      cumulativeJ: cumulative[i].totalJ,
    });

    if (walkbackAvailable && safe === false && firstUnsafe === null) {
      firstUnsafe = {
        index: i,
        point,
        remainingJ,
        returnJ,
        requiredJ,
        margin,
        cumulativeJ: cumulative[i].totalJ,
      };
    }
  }

  return {
    capacityJ,
    o2CapacityL,
    energyUsedJ,
    energyRemainingJ: capacityJ - energyUsedJ,
    energyPercent: capacityJ > 0 ? (energyUsedJ / capacityJ) * 100 : null,
    o2UsedL,
    o2RemainingL: o2CapacityL - o2UsedL,
    o2Percent: o2CapacityL > 0 ? (o2UsedL / o2CapacityL) * 100 : null,
    walkingJ,
    stopJ,
    stopEnergyJ,
    stopMinutes: (stops || []).length * scienceStopMinutes,
    segmentsJ,
    cumulative,
    walkbackAvailable,
    safety,
    firstUnsafe,
  };
}
