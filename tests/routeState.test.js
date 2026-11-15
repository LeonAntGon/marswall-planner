import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isEmergencyCurrent,
  sameRouteInputs,
} from '../src/lib/routeState.js';

const start = { col: 1, row: 1 };
const destination = { col: 9, row: 9 };
const stops = [];

// REGRESSION: changing the start, stops or destination while A* was running
// let the old worker result land and show a route for inputs that no longer
// match the panel.
test('sameRouteInputs detects any changed route input', () => {
  const inflight = { start, stops, destination };
  assert.equal(sameRouteInputs(inflight, { start, stops, destination }), true);
  assert.equal(
    sameRouteInputs(inflight, { start, stops, destination: { col: 3, row: 3 } }),
    false
  );
  assert.equal(
    sameRouteInputs(inflight, { start: { col: 2, row: 2 }, stops, destination }),
    false
  );
  assert.equal(
    sameRouteInputs(inflight, { start, stops: [...stops, start], destination }),
    false
  );
});

test('sameRouteInputs with no request in flight is never a match', () => {
  assert.equal(sameRouteInputs(null, { start, stops, destination }), false);
});

// REGRESSION: moving the consumables slider after an emergency return kept
// showing the old OK / NOT ENOUGH verdict computed for other consumables.
test('isEmergencyCurrent is false once consumables change', () => {
  const emergency = { ok: true, positionPercent: 50, consumablesPercent: 100 };
  assert.equal(
    isEmergencyCurrent(emergency, { positionPercent: 50, consumablesPercent: 100 }),
    true
  );
  assert.equal(
    isEmergencyCurrent(emergency, { positionPercent: 50, consumablesPercent: 20 }),
    false
  );
  assert.equal(
    isEmergencyCurrent(emergency, { positionPercent: 60, consumablesPercent: 100 }),
    false
  );
});

test('isEmergencyCurrent keeps error messages for the same inputs', () => {
  const emergency = {
    error: 'No walkback path is available from this point.',
    positionPercent: 50,
    consumablesPercent: 100,
  };
  assert.equal(
    isEmergencyCurrent(emergency, { positionPercent: 50, consumablesPercent: 100 }),
    true
  );
  assert.equal(isEmergencyCurrent(null, { positionPercent: 50, consumablesPercent: 100 }), false);
});
