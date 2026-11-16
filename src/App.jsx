import { useEffect, useState } from 'react';
import MapView from './components/MapView.jsx';
import RoutePanel from './components/RoutePanel.jsx';
import ConditionsPanel from './components/ConditionsPanel.jsx';
import ScienceStops from './components/ScienceStops.jsx';
import MapLayersPanel from './components/MapLayersPanel.jsx';
import Credits from './components/Credits.jsx';
import { MapProvider } from './context/MapContext.jsx';
import { RouteProvider } from './context/RouteContext.jsx';
import { useMediaQuery, COMPACT_QUERY } from './lib/useMediaQuery.js';

function nextDetent(detent) {
  if (detent === 'peek') return 'half';
  if (detent === 'half') return 'full';
  return 'peek';
}

export default function App() {
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sheetDetent, setSheetDetent] = useState('peek');
  const [routeSummary, setRouteSummary] = useState(null);
  const isCompact = useMediaQuery(COMPACT_QUERY);
  const layoutKey = `${isCompact}-${sidebarCollapsed}`;

  useEffect(() => {
    if (!isCompact) setSheetDetent('peek');
  }, [isCompact]);

  const handlePickModeChange = (picking) => {
    if (!isCompact) return;
    setSheetDetent(picking ? 'peek' : 'half');
  };

  const handleRoutePlanned = (summary) => {
    setRouteSummary(summary);
    if (isCompact && summary) setSheetDetent('peek');
  };

  return (
    <MapProvider>
      <RouteProvider>
        <div className="app">
          <header className="topbar">
            <h1 className="topbar__title">Marswalk Planner</h1>
            <span className="topbar__divider" aria-hidden="true">
              /
            </span>
            <span className="topbar__subtitle">
              Plan a safe walk on Mars with real NASA mission data
            </span>
            <div className="topbar__actions">
              <ConditionsPanel compact />
              <button
                type="button"
                className="topbar__credits"
                onClick={() => setCreditsOpen(true)}
              >
                Data &amp; Credits
              </button>
            </div>
          </header>
          <main
            className={`map-shell${
              !isCompact && sidebarCollapsed ? ' is-sidebar-collapsed' : ''
            }`}
          >
            <MapView layoutKey={layoutKey} />
            <aside
              className={`planner-surface ${
                isCompact
                  ? `planner-sheet detent-${sheetDetent}`
                  : `app-sidebar${sidebarCollapsed ? ' is-collapsed' : ''}`
              }`}
            >
              <button
                type="button"
                className="planner-handle"
                onClick={() =>
                  isCompact
                    ? setSheetDetent((detent) => nextDetent(detent))
                    : setSidebarCollapsed((value) => !value)
                }
                aria-expanded={
                  isCompact ? sheetDetent !== 'peek' : !sidebarCollapsed
                }
                aria-label={
                  isCompact
                    ? `Planner panel, ${sheetDetent}. Tap to change size.`
                    : sidebarCollapsed
                      ? 'Show planner'
                      : 'Hide planner'
                }
              >
                <span className="planner-handle__grip" aria-hidden="true" />
                <span className="planner-handle__title">Planner</span>
                {isCompact && routeSummary && (
                  <span className="planner-handle__summary">
                    {routeSummary.warning && (
                      <span
                        className="planner-handle__warning"
                        title="Steep terrain on this route"
                        aria-label="Steep terrain warning"
                      >
                        ⚠{' '}
                      </span>
                    )}
                    {routeSummary.distanceKm.toFixed(1)} km ·{' '}
                    {routeSummary.timeText}
                    {routeSummary.warning ? ' · terrain' : ''}
                  </span>
                )}
                <span className="planner-handle__state">
                  {isCompact
                    ? sheetDetent === 'peek'
                      ? 'Open'
                      : sheetDetent === 'half'
                        ? 'Expand'
                        : 'Minimize'
                    : sidebarCollapsed
                      ? 'Show planner'
                      : 'Hide planner'}
                </span>
              </button>
              <RoutePanel
                onPickModeChange={handlePickModeChange}
                onRoutePlanned={handleRoutePlanned}
              />
            </aside>
            {!isCompact && sidebarCollapsed && (
              <button
                type="button"
                className="planner-fab"
                onClick={() => setSidebarCollapsed(false)}
              >
                Planner
              </button>
            )}
            <ScienceStops />
            <MapLayersPanel />
          </main>
          <Credits open={creditsOpen} onClose={() => setCreditsOpen(false)} />
        </div>
      </RouteProvider>
    </MapProvider>
  );
}
