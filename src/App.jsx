import { useState } from 'react';
import MapView from './components/MapView.jsx';
import RoutePanel from './components/RoutePanel.jsx';
import ConditionsPanel from './components/ConditionsPanel.jsx';
import ScienceStops from './components/ScienceStops.jsx';
import MapLayersPanel from './components/MapLayersPanel.jsx';
import Credits from './components/Credits.jsx';
import { MapProvider } from './context/MapContext.jsx';
import { RouteProvider } from './context/RouteContext.jsx';

export default function App() {
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <MapProvider>
      <RouteProvider>
        <div className="app">
          <header className="topbar">
            <h1 className="topbar__title">Marswalk Planner</h1>
            <span className="topbar__divider" aria-hidden="true">
              /
            </span>
            <span className="topbar__subtitle">Plan a safe walk on Mars with real NASA mission data</span>
            <ConditionsPanel compact />
            <button
              type="button"
              className="topbar__credits"
              onClick={() => setCreditsOpen(true)}
            >
              Data &amp; Credits
            </button>
          </header>
          <main className="map-shell">
            <MapView />
            <aside className={`app-sidebar${sidebarCollapsed ? ' is-collapsed' : ''}`}>
              <button
                type="button"
                className="app-sidebar__toggle"
                onClick={() => setSidebarCollapsed((value) => !value)}
                aria-expanded={!sidebarCollapsed}
              >
                {sidebarCollapsed ? 'Show planner' : 'Hide planner'}
              </button>
              <RoutePanel />
            </aside>
            <ScienceStops />
            <MapLayersPanel />
          </main>
          <Credits
            open={creditsOpen}
            onClose={() => setCreditsOpen(false)}
          />
        </div>
      </RouteProvider>
    </MapProvider>
  );
}
