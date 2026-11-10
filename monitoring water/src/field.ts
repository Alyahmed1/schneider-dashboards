import { NOZZLES, type PivotState } from "./model";

/** shared by the big field (Pivot detail) and the mini circles (Pivots overview), so both always show the same state */
export const RINGS = 8;
export type CellKind = "ok" | "under" | "wet" | "pend";

/** a ring is under-applied when any of the nozzles over it is closed or faulty */
export const underRings = (p: PivotState): boolean[] =>
  Array.from({ length: RINGS }, (_, i) => p.nozzles.slice(i * (NOZZLES / RINGS), (i + 1) * (NOZZLES / RINGS)).some((n) => n !== "on"));

/** c = compass angle (degrees from north, clockwise) of the middle of the sector */
export function cellKind(p: PivotState, under: boolean[], ring: number, c: number): CellKind {
  if (c > p.angle) return "pend";
  if (p.running && p.angle - c <= 14) return "wet";
  return under[ring] ? "under" : "ok";
}
