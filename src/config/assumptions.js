import slopeBands from './slopeBands.json' with { type: 'json' };

export const ASSUMPTIONS = {
  marsRadius: {
    value: 3389.5,
    unit: 'km',
    source: 'NASA Mars Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    assumed: false,
    note: 'Used by all distance calculations in src/lib/marsGeo.js.',
  },
  marsGravity: {
    value: 3.71,
    unit: 'm/s²',
    source: 'NASA Mars Fact Sheet (0.38 g)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    assumed: false,
    note: 'Used by the human effort model in F5.',
  },
  maxWalkableSlope: {
    value: 30,
    unit: '°',
    source: 'Own assumption from docs/SPEC.md section 9; adjust if an EVA reference is found',
    url: null,
    assumed: true,
    note: 'F3 blocks cells steeper than this.',
  },
  suitSpeedFactor: {
    value: 0.5,
    unit: 'fraction',
    source: 'Own assumption from docs/SPEC.md section 9',
    url: null,
    assumed: true,
    note: 'Multiplier applied to Tobler walking speed in F4.',
  },
  astronautSuitMass: {
    value: 180,
    unit: 'kg',
    source: 'Own assumption from docs/SPEC.md section 9 (80 kg astronaut + 100 kg suit)',
    url: null,
    assumed: true,
    note: 'Used by the F5 energy model.',
  },
  suitDuration: {
    value: 8,
    unit: 'h',
    source: 'Typical EVA duration, docs/SPEC.md section 9',
    url: null,
    assumed: true,
    note: 'Used by the F5 consumables model.',
  },
  returnMargin: {
    value: 0.2,
    unit: 'fraction',
    source: 'Own assumption from docs/SPEC.md section 9',
    url: null,
    assumed: true,
    note: 'Walkback reserve used by F5.',
  },
  oxygenEnergy: {
    value: 20.1,
    unit: 'kJ/L',
    source: 'Standard physiology, docs/SPEC.md section 9',
    url: null,
    assumed: false,
    note: 'Energy released per litre of oxygen consumed.',
  },
  nominalMetabolicRateW: {
    value: 300,
    unit: 'W',
    source:
      'Order-of-magnitude suited EVA working metabolic rate; project assumption',
    url: null,
    assumed: true,
    note:
      'Used for the energy capacity: rate x suitDuration x 3600. With 8 h this gives 8.64 MJ and about 429.9 L O2.',
  },
  consumablesStartPercent: {
    value: 100,
    unit: '%',
    source: 'Default UI value for the Consumables at start control',
    url: null,
    assumed: true,
    note:
      'The slider scales energy and O2 capacity and the walkback check. Range 20-100%, step 5%.',
  },
  scienceStopMinutes: {
    value: 30,
    unit: 'min',
    source: 'Own assumption for time spent at each science stop',
    url: null,
    assumed: true,
    note:
      'Each stop adds nominalMetabolicRateW x scienceStopMinutes x 60 J from that route vertex onward.',
  },
  minettiGradientLimit: {
    value: 0.45,
    unit: 'fraction',
    source: 'Minetti et al. 2002 measured gradient range (-0.45 to +0.45)',
    url: 'https://doi.org/10.1152/japplphysiol.01177.2001',
    assumed: false,
    note: 'Gradient is clamped to this range in the Minetti cost function.',
  },
  earthGravity: {
    value: 9.81,
    unit: 'm/s²',
    source: 'Standard Earth gravity',
    url: null,
    assumed: false,
    note: 'Used only for the first-order Mars gravity ratio 3.71/9.81.',
  },
  slopeBands: {
    value: slopeBands,
    unit: 'degrees',
    source:
      'Suggested bands in docs/SPEC.md F2; own assumption to justify for EVA limits',
    url: null,
    assumed: true,
    note:
      'Each maxDeg is the inclusive upper bound of its band. Slopes above 30° are treated as non-walkable in F3. The same JSON drives the PNG colours, the app legend and grid.json.',
  },
  workAreaSizeKm: {
    value: 12,
    unit: 'km',
    source:
      'User-approved F2 expansion: 600x600 cells at 20 m to include the six F7 science stops',
    url: null,
    assumed: true,
    note:
      'F2 crop is centred at 18.4650 N, 77.3787 E. It covers the landing site, Margin unit and Bright Angel; see public/data/grid.json for the exact bounds.',
  },
  comparisonResampleM: {
    value: 20,
    unit: 'm',
    source: 'F8 comparison requirement: resample our route every 20 m',
    url: null,
    assumed: true,
    note: 'Used by src/lib/compare.js for the rover-traverse comparison.',
  },
  comparisonWithinM: {
    value: [50, 100, 200],
    unit: 'm',
    source: 'F8 comparison requirement: distance bands of 50, 100 and 200 m',
    url: null,
    assumed: true,
    note: 'Percentage of our resampled route within each band of the traverse.',
  },
  comparisonSlopeBandsDeg: {
    value: [10, 20],
    unit: '°',
    source: 'F8 slope-comparison requirement: report percentage above 10° and 20°',
    url: null,
    assumed: true,
    note: 'Sampled from slope.bin every comparisonResampleM metres.',
  },
  traverseMaxBytes: {
    value: 500000,
    unit: 'bytes',
    source: 'F8 requirement: simplify traverse.geojson only above 500 kB',
    url: null,
    assumed: true,
    note: 'Preprocessing threshold used by preprocess/05_traverse.py.',
  },
  traverseSimplifyToleranceM: {
    value: 5,
    unit: 'm',
    source: 'F8 fallback simplification tolerance if the clipped traverse exceeds 500 kB',
    url: null,
    assumed: true,
    note: 'Only applied if traverse.geojson is larger than traverseMaxBytes.',
  },
  emergencyPositionDefaultPercent: {
    value: 100,
    unit: '%',
    source: 'Default position for the F9 emergency-return slider',
    url: null,
    assumed: true,
    note: 'Slider range 0-100%, step 1%.',
  },
  conditions: {
    value: {
      evaWindowStartLmst: 9,
      evaWindowEndLmst: 15,
      tempMinGoC: -75,
      tempMinCautionC: -90,
    },
    unit: 'mixed',
    source:
      'Own first-order EVA comfort thresholds and EVA window; not a medical limit',
    url: null,
    assumed: true,
    note:
      'Status uses the minimum ATS temperature inside 09:00-15:00 LMST. Pressure is information only and not part of the status. Wind is excluded because the MEDA wind sensor is damaged.',
  },
};

export default ASSUMPTIONS;
