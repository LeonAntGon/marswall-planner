/**
 * Pure helpers for RoutePanel state consistency (F3/F5/F9).
 * Kept outside the component so they can be tested in Node.
 */

/**
 * True when an in-flight route request was started for exactly these inputs.
 * Uses reference equality: React state setters replace the objects whenever
 * the start, stops or destination change.
 */
export function sameRouteInputs(inflight, current) {
  if (!inflight || !current) return false;
  return (
    inflight.start === current.start &&
    inflight.stops === current.stops &&
    inflight.destination === current.destination
  );
}

/**
 * True when an emergency result was computed for the current slider values.
 * A result for another position or consumables level must not be shown.
 */
export function isEmergencyCurrent(emergency, { positionPercent, consumablesPercent }) {
  if (!emergency) return false;
  return (
    emergency.positionPercent === positionPercent &&
    emergency.consumablesPercent === consumablesPercent
  );
}
