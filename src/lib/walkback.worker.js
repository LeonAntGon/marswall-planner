// F5 - Reverse Dijkstra cost-to-base field for walkback safety.
// Exported for Node tests; attaches a worker message handler in a Worker.

import {
  MINETTI_GRADIENT_LIMIT,
  minettiCostPerKgMeter,
} from './effort.js';

const GRADIENT_BINS = 4001;

function buildEnergyPerMeterTable(massKg, marsGravity, earthGravity) {
  const table = new Float64Array(GRADIENT_BINS);
  for (let index = 0; index < GRADIENT_BINS; index += 1) {
    const gradient =
      -MINETTI_GRADIENT_LIMIT +
      (2 * MINETTI_GRADIENT_LIMIT * index) / (GRADIENT_BINS - 1);
    table[index] =
      minettiCostPerKgMeter(gradient) *
      massKg *
      (marsGravity / earthGravity);
  }
  return table;
}

function lookupEnergyPerMeter(table, gradient) {
  const clamped = Math.max(
    -MINETTI_GRADIENT_LIMIT,
    Math.min(MINETTI_GRADIENT_LIMIT, gradient)
  );
  const index = Math.round(
    ((clamped + MINETTI_GRADIENT_LIMIT) /
      (2 * MINETTI_GRADIENT_LIMIT)) *
      (GRADIENT_BINS - 1)
  );
  return table[index];
}

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

export function dijkstraCostToBase({
  rows,
  cols,
  bounds,
  cellSizeMeters,
  nodata,
  slope,
  elevation,
  start,
  massKg,
  marsGravity,
  earthGravity,
  maxSlopeDeg = 30,
}) {
  if (
    !rows ||
    !cols ||
    !bounds ||
    !cellSizeMeters ||
    !slope ||
    !elevation ||
    !start
  ) {
    return { error: 'The walkback grid is incomplete.' };
  }
  if (
    start.col < 0 ||
    start.col >= cols ||
    start.row < 0 ||
    start.row >= rows
  ) {
    return { error: 'The walkback base is outside the grid.' };
  }

  const size = rows * cols;
  if (slope.length !== size || elevation.length !== size) {
    return { error: 'The walkback arrays do not match grid.json.' };
  }

  const isBlocked = (index) => {
    const value = slope[index];
    return (
      !Number.isFinite(value) ||
      value === nodata ||
      value > maxSlopeDeg
    );
  };

  const startIdx = start.row * cols + start.col;
  if (isBlocked(startIdx)) {
    return { error: 'The walkback base cell is blocked.' };
  }

  const dy = cellSizeMeters.y;
  const rowDx = new Float64Array(rows);
  for (let row = 0; row < rows; row += 1) {
    const lat =
      bounds.north - ((row + 0.5) / rows) * (bounds.north - bounds.south);
    rowDx[row] = cellSizeMeters.x * Math.cos((lat * Math.PI) / 180);
  }

  const cost = new Float32Array(size);
  cost.fill(Number.POSITIVE_INFINITY);
  const previous = new Int32Array(size);
  previous.fill(-1);
  const closed = new Uint8Array(size);
  const heap = new MinHeap();
  const energyPerMeter = buildEnergyPerMeterTable(
    massKg,
    marsGravity,
    earthGravity
  );
  cost[startIdx] = 0;
  heap.push(startIdx, 0);

  const started = performance.now();
  let visited = 0;

  while (heap.size > 0) {
    const current = heap.pop();
    if (current < 0) break;
    if (closed[current]) continue;
    closed[current] = 1;
    visited += 1;

    const row = Math.floor(current / cols);
    const col = current - row * cols;
    const dx = rowDx[row];
    const currentCost = cost[current];

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
      const next = nextRow * cols + nextCol;
      if (closed[next] || isBlocked(next)) continue;

      const step =
        DIRS[i][0] === 0 || DIRS[i][1] === 0
          ? DIRS[i][1] === 0
            ? dx
            : dy
          : Math.hypot(dx, dy);

      // Reverse edge: the walker goes next -> current.
      const gradient = (elevation[current] - elevation[next]) / step;
      const costPerMeter = lookupEnergyPerMeter(energyPerMeter, gradient);
      const tentative = currentCost + costPerMeter * step;

      if (tentative + 1e-6 < cost[next]) {
        cost[next] = tentative;
        previous[next] = current;
        heap.push(next, tentative);
      }
    }
  }

  return {
    cost,
    previous,
    visited,
    ms: performance.now() - started,
  };
}

const workerScope =
  typeof self !== 'undefined' && typeof self.postMessage === 'function'
    ? self
    : null;

if (workerScope) {
  workerScope.onmessage = (event) => {
    const message = event.data;
    if (!message || message.type !== 'walkback') return;
    try {
      const result = dijkstraCostToBase({
        rows: message.grid.rows,
        cols: message.grid.cols,
        bounds: message.grid.bounds,
        cellSizeMeters: message.grid.cellSizeMeters,
        nodata: message.grid.nodata,
        slope: message.slope,
        elevation: message.elevation,
        start: message.start,
        massKg: message.massKg,
        marsGravity: message.marsGravity,
        earthGravity: message.earthGravity,
        maxSlopeDeg: message.maxSlopeDeg,
      });
      if (result.error) {
        workerScope.postMessage({ type: 'error', message: result.error });
        return;
      }
      workerScope.postMessage(
        {
          type: 'walkback',
          cost: result.cost,
          previous: result.previous,
          visited: result.visited,
          ms: result.ms,
        },
        [result.cost.buffer, result.previous.buffer]
      );
    } catch (error) {
      workerScope.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
