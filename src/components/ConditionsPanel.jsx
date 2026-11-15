import { useEffect, useState } from 'react';
import { ASSUMPTIONS } from '../config/assumptions.js';

const THRESHOLDS = ASSUMPTIONS.conditions.value;

function temperatureStatus(minC) {
  if (minC >= THRESHOLDS.tempMinGoC) return 'GO';
  if (minC >= THRESHOLDS.tempMinCautionC) return 'CAUTION';
  return 'NO-GO';
}

function statusClass(status) {
  if (status === 'GO') return 'is-go';
  if (status === 'CAUTION') return 'is-caution';
  return 'is-no-go';
}

export default function ConditionsPanel({ compact = false }) {
  const [conditions, setConditions] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/conditions.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for /data/conditions.json`);
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setConditions(data);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        console.warn(`[ConditionsPanel] ${fetchError.message}`);
        setError('Conditions data unavailable. Run preprocess/04_meda.py.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <aside className="conditions-panel" aria-label="Weather conditions">
        <div className="conditions-panel__title">Conditions</div>
        <div className="conditions-panel__error">{error}</div>
      </aside>
    );
  }

  if (!conditions) {
    return (
      <aside className="conditions-panel" aria-label="Weather conditions">
        <div className="conditions-panel__title">Conditions</div>
        <div className="conditions-panel__muted">Loading MEDA data...</div>
      </aside>
    );
  }

  const { temperature, pressure, solarRadiation, wind } = conditions;
  const tempStatus = temperatureStatus(temperature.evaWindow.minC);
  const overall = tempStatus;

  return (
    <>
      {compact && (
        <button
          type="button"
          className={`conditions-chip ${statusClass(overall)}`}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <strong>{overall}</strong>
          <span>
            EVA window min {temperature.evaWindow.minC.toFixed(1)} °C · Sol{' '}
            {temperature.sol}
          </span>
        </button>
      )}
      {(!compact || open) && <aside className={`conditions-panel${compact ? ' conditions-drawer' : ''}`} aria-label="Weather conditions">
      {compact && (
        <button type="button" className="conditions-drawer__close" onClick={() => setOpen(false)}>
          Close
        </button>
      )}
      <div className="conditions-panel__header">
        <div>
          <div className="conditions-panel__title">Conditions</div>
          <div className="conditions-panel__subtitle">
            MEDA · latest published, not real-time
          </div>
        </div>
        <span className={`conditions-status ${statusClass(overall)}`}>
          {overall}
        </span>
      </div>

      <div className="conditions-panel__status-note">
        <div>
          Status uses the <strong>minimum temperature in the EVA window</strong>{' '}
          ({temperature.evaWindow.startLmst}–{temperature.evaWindow.endLmst}{' '}
          LMST). Pressure is information only. Wind is excluded.
        </div>
        <div>
          GO: temp ≥ {THRESHOLDS.tempMinGoC} °C; caution: ≥{' '}
          {THRESHOLDS.tempMinCautionC} °C.
        </div>
        <div className="conditions-panel__assumed">
          Thresholds and EVA window are project assumptions{' '}
          <span className="badge badge--assumed">assumed</span>
        </div>
      </div>

      <div className="condition-card">
        <div className="condition-card__title">Air temperature</div>
        <div className="condition-card__value">
          {temperature.fullSol.minC.toFixed(1)} to{' '}
          {temperature.fullSol.maxC.toFixed(1)} °C full sol
        </div>
        <div className="condition-card__meta">
          EVA {temperature.evaWindow.startLmst}–{temperature.evaWindow.endLmst}{' '}
          min {temperature.evaWindow.minC.toFixed(1)} °C · Sol{' '}
          {temperature.sol} · {temperature.earthDate}
        </div>
      </div>

      <div className="condition-card">
        <div
          className="condition-card__title"
          title="Information only; pressure is not part of the status."
        >
          Pressure <span className="condition-card__info">info only</span>
        </div>
        <div className="condition-card__value">
          {pressure.meanPa.toFixed(1)} Pa mean
        </div>
        <div className="condition-card__meta">
          {pressure.minPa.toFixed(1)}–{pressure.maxPa.toFixed(1)} Pa · Sol{' '}
          {pressure.sol} · {pressure.earthDate}
        </div>
      </div>

      <div className="condition-card">
        <div className="condition-card__title">
          Solar radiation (MEDA RDS)
          <span
            className="conditions-panel__channel"
            title="MEDA PDS column RDS_TOP_7"
          >
            RDS_TOP_7
          </span>
        </div>
        <div className="condition-card__value">
          {solarRadiation.meanWm2.toFixed(1)} W/m² mean
        </div>
        <div className="condition-card__meta">
          peak {solarRadiation.maxWm2.toFixed(1)} W/m² · Sol{' '}
          {solarRadiation.sol} · {solarRadiation.earthDate}
        </div>
      </div>

      <div className="condition-card condition-card--wind">
        <div className="condition-card__title">Wind</div>
        <div className="condition-card__value">
          {wind.meanMs.toFixed(1)} m/s mean
        </div>
        <div className="condition-card__meta">
          max {wind.maxMs.toFixed(1)} m/s · last valid wind reading: sol{' '}
          {wind.sol}, {wind.earthDate}
        </div>
        <div className="condition-card__note">
          Sensor damaged by dust-laden whirlwinds; not used in the status.
        </div>
      </div>
      </aside>}
    </>
  );
}
