import { useState } from 'react';
import MapView from './components/MapView.jsx';
import RoutePanel from './components/RoutePanel.jsx';
import SlopePanel from './components/SlopePanel.jsx';
import ConditionsPanel from './components/ConditionsPanel.jsx';
import ScienceStops from './components/ScienceStops.jsx';
import TraverseLayer from './components/TraverseLayer.jsx';
import Credits from './components/Credits.jsx';
import { MapProvider } from './context/MapContext.jsx';
import { RouteProvider } from './context/RouteContext.jsx';

export default function App() {
  const [creditsOpen, setCreditsOpen] = useState(false);

  return (
    <MapProvider>
      <RouteProvider>
        <div className="app">
          <header className="topbar">
            <h1 className="topbar__title">Marswalk Planner</h1>
            <span className="topbar__divider" aria-hidden="true">
              /
            </span>
            <span className="topbar__subtitle">Jezero Crater · NASA Space Apps 2026</span>
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
            <RoutePanel />
            <ScienceStops />
            <TraverseLayer />
            <ConditionsPanel />
            <SlopePanel />
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
