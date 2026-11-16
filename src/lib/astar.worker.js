// F3 - A* route planner Web Worker.
// The pure findPath() function is also exported so it can be tested in Node.

import { ASSUMPTIONS } from '../config/assumptions.js';

const V_FLAT_KMH = 6 * Math.exp(-3.5 * 0.05);
const STEEP_PENALTY_START_DEG = ASSUMPTIONS.routeSteepPenaltyStartDeg.value;
const STEEP_PENALTY_WEIGHT = ASSUMPTIONS.routeSteepPenaltyWeight.value;
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

class MinHeap {
  constructor() {
    this.nodes = [];
    this.priorities = [];
    this.size = 0;
  }

  push(node, priority) {
    let index = this.size;
    this.size += 1;
    this.nodes[index] = node;
    this.priorities[index] = priority;

    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.priorities[parent] <= this.priorities[index]) break;
      const nodeTemp = this.nodes[parent];
      const priorityTemp = this.priorities[parent];
      this.nodes[parent] = this.nodes[index];
      this.priorities[parent] = this.priorities[index];
      this.nodes[index] = nodeTemp;
      this.priorities[index] = priorityTemp;
      index = parent;
    }
  }

  pop() {
    if (this.size === 0) return -1;
    const root = this.nodes[0];
    this.size -= 1;
    if (this.size > 0) {
      this.nodes[0] = this.nodes[this.size];
      this.priorities[0] = this.priorities[this.size];
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (
          left < this.size &&
          this.priorities[left] < this.priorities[smallest]
        ) {
          smallest = left;
        }
        if (
          right < this.size &&
          this.priorities[right] < this.priorities[smallest]
        ) {
          smallest = right;
        }
        if (smallest === index) break;
        const nodeTemp = this.nodes[smallest];
        const priorityTemp = this.priorities[smallest];
        this.nodes[smallest] = this.nodes[index];
        this.priorities[smallest] = this.priorities[index];
        this.nodes[index] = nodeTemp;
        this.priorities[index] = priorityTemp;
        index = smallest;
      }
    }
    return root;
  }
}

function toblerCostFactor(slopeDeg) {
  const slopeRad = (slopeDeg * Math.PI) / 180;
  const speed =
    6 * Math.exp(-3.5 * Math.abs(Math.tan(slopeRad) + 0.05));
  if (!(speed > 0)) return Number.POSITIVE_INFINITY;
  return V_FLAT_KMH / speed;
}

function blocked(slopeValue, nodata, maxSlopeDeg) {
  return (
    !Number.isFinite(slopeValue) ||
    slopeValue === nodata ||
    slopeValue > maxSlopeDeg
  );
}

export function findPath({
  rows,
  cols,
  bounds,
  cellSizeMeters,
  nodata,
  slope,
  start,
  goal,
  maxSlopeDeg = 30,
  steepPenaltyStartDeg = STEEP_PENALTY_START_DEG,
  steepPenaltyWeight = STEEP_PENALTY_WEIGHT,
  blockCorners = true,
}) {
  if (!rows || !cols || !bounds || !cellSizeMeters || !slope) {
    return { error: 'The route grid is incomplete.' };
  }
  if (
    !start ||
    !goal ||
    start.col < 0 ||
    start.col >= cols ||
    start.row < 0 ||
    start.row >= rows ||
    goal.col < 0 ||
    goal.col >= cols ||
    goal.row < 0 ||
    goal.row >= rows
  ) {
    return { error: 'Start or destination is outside the route grid.' };
  }

  const size = rows * cols;
  if (slope.length !== size) {
    return { error: 'The slope grid size does not match grid.json.' };
  }

  const startIdx = start.row * cols + start.col;
  const goalIdx = goal.row * cols + goal.col;
  if (blocked(slope[startIdx], nodata, maxSlopeDeg)) {
    return {
      error: `The start cell is blocked (slope above ${maxSlopeDeg} deg or NoData).`,
    };
  }
  if (blocked(slope[goalIdx], nodata, maxSlopeDeg)) {
    return {
      error: `The destination cell is blocked (slope above ${maxSlopeDeg} deg or NoData).`,
    };
  }
  if (startIdx === goalIdx) {
    return { path: [startIdx], cost: 0, visited: 1 };
  }

  const dy = cellSizeMeters.y;
  const rowDx = new Float64Array(rows);
  let minDx = Number.POSITIVE_INFINITY;
  for (let row = 0; row < rows; row += 1) {
    const lat = bounds.north - ((row + 0.5) / rows) * (bounds.north - bounds.south);
    const dx = cellSizeMeters.x * Math.cos((lat * Math.PI) / 180);
    rowDx[row] = dx;
    if (dx < minDx) minDx = dx;
  }

  const gScore = new Float64Array(size);
  gScore.fill(Number.POSITIVE_INFINITY);
  const cameFrom = new Int32Array(size);
  cameFrom.fill(-1);
  const closed = new Uint8Array(size);
  const heap = new MinHeap();

  const heuristic = (idx) => {
    const row = Math.floor(idx / cols);
    const col = idx - row * cols;
    return Math.hypot(
      (goal.col - col) * minDx,
      (goal.row - row) * dy
    );
  };

  gScore[startIdx] = 0;
  heap.push(startIdx, heuristic(startIdx));
  let visited = 0;

  while (heap.size > 0) {
    const current = heap.pop();
    if (current < 0) break;
    if (closed[current]) continue;
    if (current === goalIdx) break;
    closed[current] = 1;
    visited += 1;

    const row = Math.floor(current / cols);
    const col = current - row * cols;
    const dx = rowDx[row];

    for (let i = 0; i < DIRS.length; i += 1) {
      const nextCol = col + DIRS[i][0];
      const nextRow = row + DIRS[i][1];
      if (
        nextCol < 0 ||
        nextCol >= cols ||
        nextRow < 0 ||
        nextRow >= rows
      ) {
        continue;
      }
      const nextIdx = nextRow * cols + nextCol;
      if (closed[nextIdx]) continue;
      const nextSlope = slope[nextIdx];
      if (blocked(nextSlope, nodata, maxSlopeDeg)) continue;

      // Do not squeeze diagonally between two blocked cells: that would let a
      // route cross a cliff edge that the 8-neighbour grid otherwise blocks.
      if (
        blockCorners &&
        nextCol !== col &&
        nextRow !== row &&
        (blocked(slope[row * cols + nextCol], nodata, maxSlopeDeg) ||
          blocked(slope[nextRow * cols + col], nodata, maxSlopeDeg))
      ) {
        continue;
      }

      const step =
        DIRS[i][0] === 0 || DIRS[i][1] === 0
          ? DIRS[i][1] === 0
            ? dx
            : dy
          : Math.hypot(dx, dy);
      let costFactor = toblerCostFactor(nextSlope);
      if (steepPenaltyWeight > 0 && nextSlope > steepPenaltyStartDeg) {
        const span = Math.max(1e-6, maxSlopeDeg - steepPenaltyStartDeg);
        const t = Math.min(1, (nextSlope - steepPenaltyStartDeg) / span);
        costFactor *= 1 + steepPenaltyWeight * t * t;
      }
      const tentative = gScore[current] + step * costFactor;
      if (tentative + 1e-9 < gScore[nextIdx]) {
        gScore[nextIdx] = tentative;
        cameFrom[nextIdx] = current;
        heap.push(nextIdx, tentative + heuristic(nextIdx));
      }
    }
  }

  if (goalIdx !== startIdx && cameFrom[goalIdx] === -1) {
    return { error: 'No route found between these cells.' };
  }

  const path = [];
  let node = goalIdx;
  while (node !== -1) {
    path.push(node);
    if (node === startIdx) break;
    node = cameFrom[node];
  }
  path.reverse();
  if (path[0] !== startIdx) {
    return { error: 'No route found between these cells.' };
  }

  return { path, cost: gScore[goalIdx], visited };
}

const workerScope =
  typeof self !== 'undefined' && typeof self.postMessage === 'function'
    ? self
    : null;

if (workerScope) {
  workerScope.onmessage = (event) => {
    const message = event.data;
    if (!message || message.type !== 'route') return;
    const started = performance.now();

    try {
      const { grid, slope, legs, maxSlopeDeg } = message;
      const allPath = [];
      let visited = 0;
      let cost = 0;

      for (let i = 0; i < legs.length; i += 1) {
        const result = findPath({
          rows: grid.rows,
          cols: grid.cols,
          bounds: grid.bounds,
          cellSizeMeters: grid.cellSizeMeters,
          nodata: grid.nodata,
          slope,
          start: legs[i].start,
          goal: legs[i].goal,
          maxSlopeDeg,
        });

        if (result.error) {
          workerScope.postMessage({
            type: 'error',
            message: `Leg ${i + 1}: ${result.error}`,
            leg: i,
          });
          return;
        }

        visited += result.visited;
        cost += result.cost;
        const legPath = result.path;
        if (
          allPath.length > 0 &&
          legPath.length > 0 &&
          allPath[allPath.length - 1] === legPath[0]
        ) {
          legPath.shift();
        }
        allPath.push(...legPath);
      }

      workerScope.postMessage({
        type: 'route',
        path: allPath,
        visited,
        cost,
        ms: performance.now() - started,
      });
    } catch (error) {
      workerScope.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
