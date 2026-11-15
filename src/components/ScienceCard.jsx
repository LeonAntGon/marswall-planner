import { useEffect, useRef, useState } from 'react';
import { useRoute } from '../context/RouteContext.jsx';

export default function ScienceCard({ stop, onClose }) {
  const { addStop } = useRoute();
  const [message, setMessage] = useState(null);
  const [added, setAdded] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!stop) return undefined;
    setMessage(null);
    setAdded(false);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [stop, onClose]);

  if (!stop) return null;

  const handleAdd = () => {
    const result = addStop({
      id: stop.id,
      name: stop.name,
      lat: stop.lat,
      lon: stop.lon,
      solUsed: stop.solUsed,
    });
    setAdded(result.ok);
    setMessage(result.message);
  };

  return (
    <div
      className="science-card-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="science-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="science-card-title"
      >
        <header className="science-card__header">
          <div>
            <h2 id="science-card-title">{stop.name}</h2>
            <p>
              {stop.type} · sol {stop.solUsed}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="science-card__close"
            onClick={onClose}
            aria-label="Close science stop"
          >
            Close
          </button>
        </header>

        <div className="science-card__body">
          <div className="science-card__badges">
            <span className="badge badge--assumed">approximate location</span>
            <span className="badge badge--sourced">anchor sol {stop.anchorSol}</span>
          </div>

          <p className="science-card__coords">
            {stop.lat.toFixed(5)}°, {stop.lon.toFixed(5)}°
            {Number.isFinite(stop.elevGeoidM)
              ? ` · elevation ${stop.elevGeoidM.toFixed(0)} m`
              : ''}
          </p>

          <section>
            <h3>Why it matters</h3>
            <p>{stop.whyItMatters}</p>
          </section>
          <section>
            <h3>What to sample</h3>
            <p>{stop.whatToSample}</p>
          </section>
          <section>
            <h3>Minerals</h3>
            <p>{stop.minerals}</p>
          </section>
          <section>
            <h3>Mission data</h3>
            <p>{stop.missionData}</p>
          </section>
          <section>
            <h3>Reference</h3>
            <p>
              {stop.reference}
              {stop.referenceUrl && (
                <>
                  {' '}
                  <a
                    href={stop.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    link
                  </a>
                </>
              )}
            </p>
          </section>

          <div className="science-card__actions">
            <button
              type="button"
              className="science-card__add"
              onClick={handleAdd}
              disabled={added}
            >
              {added ? 'Added to route' : 'Add to route'}
            </button>
          </div>

          {message && (
            <p
              className={
                added ? 'science-card__success' : 'science-card__error'
              }
            >
              {message}
            </p>
          )}

          <p className="science-card__note">
            Coordinates come from the D5 waypoint at sol {stop.solUsed}; they are
            approximate.
          </p>
        </div>
      </div>
    </div>
  );
}
