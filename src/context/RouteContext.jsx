import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ASSUMPTIONS } from '../config/assumptions.js';
import {
  cellToLatLon,
  isBlockedCell,
  latLonToCell,
  loadGridData,
} from '../lib/gridData.js';

const MAX_SLOPE = ASSUMPTIONS.maxWalkableSlope.value;
const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [gridData, setGridData] = useState(null);
  const [gridError, setGridError] = useState(null);
  const [stops, setStops] = useState([]);
  const [walkback, setWalkback] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadGridData()
      .then((loaded) => {
        if (!cancelled) setGridData(loaded);
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn(`[RouteProvider] ${error.message}`);
        setGridError('Route grid unavailable. Run preprocess/02_slope.py.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addStop = (point) => {
    if (!gridData) {
      return {
        ok: false,
        message: gridError || 'Route grid is still loading.',
      };
    }
    const cell = latLonToCell(point.lat, point.lon, gridData.grid);
    if (!cell) {
      const widthKm =
        (gridData.grid.cols * gridData.grid.cellSizeMeters.x) / 1000;
      const heightKm =
        (gridData.grid.rows * gridData.grid.cellSizeMeters.y) / 1000;
      return {
        ok: false,
        message: `This stop is outside the ${widthKm} x ${heightKm} km route grid.`,
      };
    }
    if (isBlockedCell(gridData.slope, cell.col, cell.row, gridData.grid, MAX_SLOPE)) {
      return {
        ok: false,
        message: `This stop cell is blocked (slope above ${MAX_SLOPE}° or NoData).`,
      };
    }

    const center = cellToLatLon(cell.col, cell.row, gridData.grid);
    setStops((previous) => [
      ...previous,
      {
        ...point,
        ...cell,
        lat: center.lat,
        lon: center.lon,
        source: 'science-stop',
      },
    ]);
    return { ok: true, message: 'Added to route.' };
  };

  const value = useMemo(
    () => ({
      gridData,
      gridError,
      stops,
      setStops,
      addStop,
      walkback,
      setWalkback,
    }),
    [gridData, gridError, stops, walkback]
  );

  return (
    <RouteContext.Provider value={value}>{children}</RouteContext.Provider>
  );
}

export function useRoute() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRoute must be used inside a RouteProvider');
  }
  return context;
}
