import test from 'node:test';
import assert from 'node:assert/strict';
import { findPath } from '../src/lib/astar.worker.js';
import { findNearestWalkableCell } from '../src/lib/gridData.js';

const bounds = { west: 0, south: 0, east: 1, north: 1 };
const cellSizeMeters = { x: 20, y: 20 };

function grid(rows, cols, values) {
  return {
    rows,
    cols,
    bounds,
    cellSizeMeters,
    nodata: -9999,
    slope: new Float32Array(values),
  };
}

test('diagonal moves cannot squeeze between two blocked cells', () => {
  const values = new Array(9).fill(1);
  values[1] = 40; // col 1, row 0
  values[3] = 40; // col 0, row 1
  const g = grid(3, 3, values);
  const common = {
    rows: 3,
    cols: 3,
    bounds,
    cellSizeMeters,
    nodata: -9999,
    slope: g.slope,
    start: { col: 0, row: 0 },
    goal: { col: 2, row: 2 },
    maxSlopeDeg: 30,
  };

  const guarded = findPath({ ...common, blockCorners: true });
  const unguarded = findPath({ ...common, blockCorners: false });
  assert.ok(guarded.error, 'guarded search must not cut the corner');
  assert.ok(unguarded.path, 'unguarded search shows why the rule is needed');
});

test('the steep penalty increases the cost of a >20 degree route', () => {
  const values = new Array(5).fill(22);
  const g = grid(1, 5, values);
  const common = {
    rows: 1,
    cols: 5,
    bounds,
    cellSizeMeters,
    nodata: -9999,
    slope: g.slope,
    start: { col: 0, row: 0 },
    goal: { col: 4, row: 0 },
    maxSlopeDeg: 30,
  };

  const base = findPath({
    ...common,
    steepPenaltyStartDeg: 15,
    steepPenaltyWeight: 0,
  });
  const penalized = findPath({
    ...common,
    steepPenaltyStartDeg: 15,
    steepPenaltyWeight: 2,
  });

  assert.ok(base.path);
  assert.ok(penalized.path);
  assert.ok(penalized.cost > base.cost * 1.4);
});

test('map taps snap to the nearest walkable cell', () => {
  const values = new Array(25).fill(1);
  values[12] = 40; // centre cell, col 2 row 2
  const g = grid(5, 5, values);

  assert.deepEqual(findNearestWalkableCell(g.slope, 0, 0, g, 30, 2), {
    col: 0,
    row: 0,
    distanceCells: 0,
  });

  const snapped = findNearestWalkableCell(g.slope, 2, 2, g, 30, 2);
  assert.ok(snapped);
  assert.equal(snapped.distanceCells, 1);
  assert.ok(g.slope[snapped.row * g.cols + snapped.col] <= 30);

  g.slope.fill(40);
  assert.equal(findNearestWalkableCell(g.slope, 2, 2, g, 30, 2), null);
});
