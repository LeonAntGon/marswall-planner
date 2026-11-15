#!/usr/bin/env node
/**
 * Probe every tile layer declared in src/config/layers.js at the Jezero
 * landing site. No dependencies; uses Node's built-in fetch.
 *
 * Usage: npm run check:tiles
 *
 * For each layer the script prints one row per zoom (6-19) with HTTP status,
 * content type, byte size and PNG dimensions. TMS layers are requested with
 * y counted from the bottom, matching Leaflet's tms: true option.
 */

import { LAYERS, MAP_VIEW } from '../src/config/layers.js';
import { LANDING_SITE } from '../src/lib/marsGeo.js';

const MIN_ZOOM = 6;
const MAX_ZOOM = 19;
const DELAY_MS = 800;
const RETRY_DELAY_MS = 3000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function pngDimensions(buffer) {
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer.toString('ascii', 1, 4) === 'PNG'
  ) {
    return `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;
  }
  return '-';
}

function tileCoordinates(lat, lon, zoom, tms) {
  const n = 2 ** zoom;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const yXyz = Math.floor(
    ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n
  );
  const yTms = n - 1 - yXyz;
  return { x, y: tms ? yTms : yXyz, yXyz, yTms };
}

function expandUrl(pattern, z, x, y) {
  return pattern
    .replaceAll('{z}', String(z))
    .replaceAll('{x}', String(x))
    .replaceAll('{y}', String(y));
}

async function fetchTile(url) {
  const headers = {
    'User-Agent': USER_AGENT,
    Referer: 'http://localhost:5173/',
    Accept: 'image/png,image/*;q=0.8,*/*;q=0.5',
  };
  let response = await fetch(url, {
    headers,
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  });
  let retried = false;

  if ([403, 429, 500, 502, 503, 504].includes(response.status)) {
    retried = true;
    await sleep(RETRY_DELAY_MS);
    response = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    });
  }

  const contentType = (response.headers.get('content-type') || '').split(';')[0];
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    contentType,
    bytes: buffer.length,
    dimensions: pngDimensions(buffer),
    retried,
  };
}

async function checkLayer(layer) {
  const tms = Boolean(layer.options?.tms);
  console.log(`\n=== ${layer.id} — ${layer.label} ===`);
  console.log(
    `scheme=${tms ? 'TMS' : 'XYZ'} configured minZoom=${layer.options?.minZoom ?? '-'} ` +
      `maxNativeZoom=${layer.options?.maxNativeZoom ?? '-'}`
  );
  console.log('zoom\tx\ty\tstatus\tcontent-type\tbytes\tdimensions\tnote');

  const results = [];
  for (let zoom = MIN_ZOOM; zoom <= MAX_ZOOM; zoom += 1) {
    const { x, y, yXyz, yTms } = tileCoordinates(
      LANDING_SITE.lat,
      LANDING_SITE.lon,
      zoom,
      tms
    );
    const url = expandUrl(layer.url, zoom, x, y);

    try {
      const result = await fetchTile(url);
      results.push({ zoom, ...result });
      console.log(
        [
          zoom,
          x,
          y,
          result.status,
          result.contentType || '-',
          result.bytes,
          result.dimensions,
          result.retried ? 'retried after 3 s' : '',
        ].join('\t')
      );
    } catch (error) {
      results.push({ zoom, status: 0, error: error.message });
      console.log(`${zoom}\t${x}\t${y}\tERR\t-\t-\t-\t${error.message}`);
    }

    if (tms && zoom === MIN_ZOOM) {
      console.log(
        `# TMS check uses y=${yTms}; XYZ equivalent would be y=${yXyz}`
      );
    }
    await sleep(DELAY_MS);
  }

  const ok = results.filter((r) => r.status === 200);
  const okZooms = ok.map((r) => r.zoom);
  const failed = results.filter((r) => r.status !== 200);
  console.log(
    `summary: 200 at ${
      okZooms.length ? `${Math.min(...okZooms)}-${Math.max(...okZooms)}` : 'none'
    }; non-200 at ${
      failed.length ? failed.map((r) => `${r.zoom}:${r.status}`).join(', ') : 'none'
    }`
  );

  if (
    layer.options?.maxNativeZoom != null &&
    okZooms.length &&
    layer.options.maxNativeZoom !== Math.max(...okZooms)
  ) {
    console.log(
      `WARNING: configured maxNativeZoom=${layer.options.maxNativeZoom} but highest 200 is ${Math.max(
        ...okZooms
      )}`
    );
  }

  return { layer, results, okZooms };
}

const summaries = [];
for (const layer of LAYERS) {
  if (!layer.url) {
    console.log(`\n=== ${layer.id} ===`);
    console.log('skipped: url is null');
    continue;
  }
  summaries.push(await checkLayer(layer));
}

console.log('\n=== summary ===');
console.log('layer\t200 zooms\tconfigured maxNativeZoom\tdefault\tinitial zoom status');
for (const { layer, okZooms, results } of summaries) {
  const initial = results.find((r) => r.zoom === MAP_VIEW.zoom);
  console.log(
    [
      layer.id,
      okZooms.length ? `${Math.min(...okZooms)}-${Math.max(...okZooms)}` : 'none',
      layer.options?.maxNativeZoom ?? '-',
      layer.default ? 'yes' : 'no',
      initial ? initial.status : 'n/a',
    ].join('\t')
  );
}

const defaultLayer = LAYERS.find((layer) => layer.kind === 'base' && layer.default);
if (defaultLayer) {
  const summary = summaries.find((s) => s.layer.id === defaultLayer.id);
  const initial = summary?.results.find((r) => r.zoom === MAP_VIEW.zoom);
  if (!initial || initial.status !== 200) {
    console.error(
      `\nFAIL: default base layer "${defaultLayer.id}" is not HTTP 200 at initial zoom ${MAP_VIEW.zoom}.`
    );
    process.exitCode = 1;
  }
}

const anyLayerWithNoTiles = summaries.find((s) => s.okZooms.length === 0);
if (anyLayerWithNoTiles) {
  console.error(
    `\nFAIL: layer "${anyLayerWithNoTiles.layer.id}" returned no HTTP 200 tile in z${MIN_ZOOM}-z${MAX_ZOOM}.`
  );
  process.exitCode = 1;
}
