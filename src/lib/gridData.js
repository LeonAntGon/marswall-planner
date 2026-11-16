/**
 * F3/F4 grid loader and coordinate helpers.
 *
 * The F2 script writes grid.json and two little-endian Float32 arrays. This
 * module loads them once and converts between Leaflet lat/lon and grid cells.
 */

const GRID_URL = '/data/grid.json';
const SLOPE_URL = '/data/slope.bin';
const ELEVATION_URL = '/data/elevation.bin';

function decodeFloat32(buffer) {
  const view = new DataView(buffer);
  const count = buffer.byteLength / 4;
  const out = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    out[i] = view.getFloat32(i * 4, true);
  }
  return out;
}

async function fetchArrayBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.arrayBuffer();
}

export async function loadGridData() {
  const gridResponse = await fetch(GRID_URL);
  if (!gridResponse.ok) {
    throw new Error(`HTTP ${gridResponse.status} for ${GRID_URL}`);
  }
  const grid = await gridResponse.json();

  const [slopeBuffer, elevationBuffer] = await Promise.all([
    fetchArrayBuffer(SLOPE_URL),
    fetchArrayBuffer(ELEVATION_URL),
  ]);

  const expectedBytes = grid.rows * grid.cols * 4;
  if (slopeBuffer.byteLength !== expectedBytes) {
    throw new Error(
      `slope.bin has ${slopeBuffer.byteLength} bytes, expected ${expectedBytes}`
    );
  }
  if (elevationBuffer.byteLength !== expectedBytes) {
    throw new Error(
      `elevation.bin has ${elevationBuffer.byteLength} bytes, expected ${expectedBytes}`
    );
  }

  return {
    grid,
    slope: decodeFloat32(slopeBuffer),
    elevation: decodeFloat32(elevationBuffer),
  };
}

export function isInsideGrid(col, row, grid) {
  return (
    Number.isInteger(col) &&
    Number.isInteger(row) &&
    col >= 0 &&
    col < grid.cols &&
    row >= 0 &&
    row < grid.rows
  );
}

export function latLonToCell(lat, lon, grid) {
  const { west, south, east, north } = grid.bounds;
  if (lon < west || lon > east || lat < south || lat > north) return null;

  const x = ((lon - west) / (east - west)) * grid.cols;
  const y = ((north - lat) / (north - south)) * grid.rows;
  const col = Math.min(grid.cols - 1, Math.max(0, Math.floor(x)));
  const row = Math.min(grid.rows - 1, Math.max(0, Math.floor(y)));
  return { col, row };
}

export function cellToLatLon(col, row, grid) {
  const { west, south, east, north } = grid.bounds;
  const lon = west + ((col + 0.5) / grid.cols) * (east - west);
  const lat = north - ((row + 0.5) / grid.rows) * (north - south);
  return { lat, lon };
}

export function cellIndex(col, row, grid) {
  return row * grid.cols + col;
}

export function isBlockedCell(slope, col, row, grid, maxSlopeDeg) {
  if (!isInsideGrid(col, row, grid)) return true;
  const value = slope[cellIndex(col, row, grid)];
  return (
    !Number.isFinite(value) ||
    value === grid.nodata ||
    value > maxSlopeDeg
  );
}

/**
 * Nearest walkable cell to a tapped cell. Returns null when no walkable cell
 * exists inside the requested radius. Distance is reported in cells so the
 * caller can convert it with the grid cell size.
 */
export function findNearestWalkableCell(
  slope,
  col,
  row,
  grid,
  maxSlopeDeg,
  radiusCells
) {
  if (!isBlockedCell(slope, col, row, grid, maxSlopeDeg)) {
    return { col, row, distanceCells: 0 };
  }

  let best = null;
  const radius = Math.max(1, Math.floor(radiusCells));
  for (let dr = -radius; dr <= radius; dr += 1) {
    for (let dc = -radius; dc <= radius; dc += 1) {
      if (dc === 0 && dr === 0) continue;
      const candidateCol = col + dc;
      const candidateRow = row + dr;
      if (isBlockedCell(slope, candidateCol, candidateRow, grid, maxSlopeDeg)) {
        continue;
      }
      const distanceCells = Math.hypot(dc, dr);
      if (!best || distanceCells < best.distanceCells) {
        best = { col: candidateCol, row: candidateRow, distanceCells };
      }
    }
  }
  return best;
}
