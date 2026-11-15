import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEnergyProfile } from '../src/lib/effort.js';

const OPTIONS = {
  grid: { rows: 1, cols: 10 },
  costToBase: null,
  capacityFraction: 1,
  massKg: 180,
  marsGravity: 3.71,
  metabolicRateW: 300,
  enduranceHours: 8,
  scienceStopMinutes: 30,
  returnMarginFraction: 0.2,
  o2KjPerLiter: 20.1,
};

function point(col) {
  return { col, row: 0, lat: 18.4, lon: 77.3 + col * 0.0002, elev: -2500 };
}

// REGRESSION: a stop whose cell the route crosses earlier (on the way to a
// previous stop) had its energy charged at that first crossing instead of
// where the explorer actually stops, shifting the walkback safety profile.
test('stop energy is charged where each stop is visited, in order', () => {
  // start col 0 -> stop A col 4 -> stop B col 2 (crossed on the way out)
  const route = [0, 1, 2, 3, 4, 3, 2].map(point);
  const stops = [
    { col: 4, row: 0 },
    { col: 2, row: 0 },
  ];
  const profile = buildEnergyProfile(route, stops, OPTIONS);
  const stopJ = profile.stopEnergyJ;

  assert.equal(profile.cumulative[2].stopJ, 0, 'stop B is not reached yet');
  assert.equal(profile.cumulative[4].stopJ, stopJ, 'stop A at index 4');
  assert.equal(profile.cumulative[6].stopJ, 2 * stopJ, 'stop B at index 6');
});

test('two stops on the same cell are both charged', () => {
  const route = [0, 1, 2].map(point);
  const stops = [
    { col: 1, row: 0 },
    { col: 1, row: 0 },
  ];
  const profile = buildEnergyProfile(route, stops, OPTIONS);
  assert.equal(profile.cumulative[1].stopJ, 2 * profile.stopEnergyJ);
});
