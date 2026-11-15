import { createContext, useContext, useMemo, useState } from 'react';

export const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [map, setMap] = useState(null);
  const value = useMemo(() => ({ map, setMap }), [map]);

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMap must be used inside a MapProvider');
  }
  return context;
}
