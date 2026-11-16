import { useEffect, useRef } from 'react';
import { ASSUMPTIONS } from '../config/assumptions.js';
import { SOURCES } from '../config/sources.js';

const CATEGORIES = [
  ['dataset', 'Data sources'],
  ['reference', 'References'],
  ['library', 'Libraries'],
  ['tool', 'Tools'],
];

const ASSUMPTION_LABELS = {
  marsRadius: 'Mars radius',
  marsGravity: 'Mars gravity',
  maxWalkableSlope: 'Max walkable slope',
  routeSteepPenaltyStartDeg: 'A* steep penalty start',
  routeSteepPenaltyWeight: 'A* steep penalty weight',
  routeRidgeWarningM: 'Route ridge warning',
  mapClickSnapM: 'Map click snap radius',
  suitSpeedFactor: 'Suit speed factor',
  astronautSuitMass: 'Astronaut + suit mass',
  suitDuration: 'Suit duration',
  returnMargin: 'Return margin',
  oxygenEnergy: 'Energy per litre of O2',
  nominalMetabolicRateW: 'Nominal metabolic rate',
  consumablesStartPercent: 'Consumables at start',
  scienceStopMinutes: 'Science stop time',
  minettiGradientLimit: 'Minetti gradient limit',
  earthGravity: 'Earth gravity',
  comparisonResampleM: 'Comparison resample spacing',
  comparisonWithinM: 'Comparison distance bands',
  comparisonSlopeBandsDeg: 'Comparison slope bands',
  traverseMaxBytes: 'Traverse simplify threshold',
  traverseSimplifyToleranceM: 'Traverse simplify tolerance',
  emergencyPositionDefaultPercent: 'Emergency position default',
  slopeBands: 'Slope bands',
  workAreaSizeKm: 'Work area size',
  conditions: 'EVA condition thresholds',
};

function prettifyKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (character) => character.toUpperCase());
}

function formatAssumptionValue(key, entry) {
  if (key === 'slopeBands') {
    return `${entry.value.length} bands (${entry.value
      .map((band) => band.label)
      .join(', ')})`;
  }
  if (key === 'conditions') {
    const value = entry.value;
    const start = String(value.evaWindowStartLmst).padStart(2, '0');
    const end = String(value.evaWindowEndLmst).padStart(2, '0');
    return `EVA ${start}:00–${end}:00 LMST; temp GO ≥ ${value.tempMinGoC} °C / caution ≥ ${value.tempMinCautionC} °C`;
  }
  if (Array.isArray(entry.value)) {
    return `${entry.value.join(' / ')} ${entry.unit || ''}`.trim();
  }
  if (entry.unit) return `${entry.value} ${entry.unit}`;
  return String(entry.value);
}

function SourceCard({ source }) {
  const links = [];
  if (source.url) links.push({ href: source.url, label: 'Source' });
  if (source.pageUrl && source.pageUrl !== source.url) {
    links.push({ href: source.pageUrl, label: 'Map page' });
  }
  if (source.fileUrl) links.push({ href: source.fileUrl, label: 'Data file' });

  return (
    <article className="credits-source">
      <div className="credits-source__top">
        <h4>{source.name}</h4>
        {source.version && (
          <span className="credits-source__version">{source.version}</span>
        )}
      </div>
      {source.mission && (
        <p className="credits-source__meta">
          {source.mission}
          {source.instrument ? ` · ${source.instrument}` : ''}
        </p>
      )}
      {source.institution && (
        <p className="credits-source__meta">{source.institution}</p>
      )}
      {source.use && <p className="credits-source__use">{source.use}</p>}
      {source.citation && (
        <p className="credits-source__citation">{source.citation}</p>
      )}
      {source.verification && (
        <p className="credits-source__verification">{source.verification}</p>
      )}
      {links.length > 0 && (
        <p className="credits-source__links">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
            >
              {link.label}
            </a>
          ))}
        </p>
      )}
    </article>
  );
}

export default function Credits({ open, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="credits-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="credits-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-title"
      >
        <header className="credits-header">
          <div>
            <h2 id="credits-title">Data &amp; Credits</h2>
            <p>
              Datasets, references, libraries and tools used by Marswalk
              Planner.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="credits-close"
            onClick={onClose}
            aria-label="Close Data and Credits"
          >
            Close
          </button>
        </header>

        <div className="credits-body">
          {CATEGORIES.map(([category, label]) => {
            const entries = SOURCES.filter(
              (source) => source.category === category
            );
            if (entries.length === 0) return null;
            return (
              <section key={category} className="credits-section">
                <h3>{label}</h3>
                <div className="credits-grid">
                  {entries.map((source) => (
                    <SourceCard key={source.id} source={source} />
                  ))}
                </div>
              </section>
            );
          })}

          <section className="credits-section">
            <h3>Assumptions</h3>
            <p className="credits-note">
              Values marked <strong>assumed</strong> are project choices, not
              measurements. Sources and notes are shown where available.
            </p>
            <div className="credits-table-wrap">
              <table className="credits-assumptions">
                <thead>
                  <tr>
                    <th>Assumption</th>
                    <th>Value</th>
                    <th>Source</th>
                    <th>Assumed</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(ASSUMPTIONS).map(([key, entry]) => (
                    <tr key={key}>
                      <td data-label="Assumption">
                        {ASSUMPTION_LABELS[key] || prettifyKey(key)}
                      </td>
                      <td data-label="Value">
                        {formatAssumptionValue(key, entry)}
                      </td>
                      <td data-label="Source">
                        {entry.source}
                        {entry.url && (
                          <>
                            {' '}
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              link
                            </a>
                          </>
                        )}
                      </td>
                      <td data-label="Assumed">
                        <span
                          className={
                            entry.assumed
                              ? 'badge badge--assumed'
                              : 'badge badge--sourced'
                          }
                        >
                          {entry.assumed ? 'assumed' : 'sourced'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="credits-footer">
            Full append-only provenance log: <code>used.txt</code> in the
            project root.
          </p>
        </div>
      </div>
    </div>
  );
}
