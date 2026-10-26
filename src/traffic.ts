// A small, repeatable model of a day in the community: how busy each road and parking lot is at each hour. Sample data only.
import { GATES, LOTS, ROADS, lengthOf, type Lot, type LotKind, type Road } from "./plan";
import { rng } from "./live";

const g = (h: number, mu: number, s: number) => Math.exp(-Math.pow(Math.min(Math.abs(h - mu), 24 - Math.abs(h - mu)), 2) / (2 * s * s));
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/** how busy a road is at an hour of the day, 0 (empty) to 1 (jammed) */
export function roadLoad(r: Road, hour: number): number {
  const commute = 0.07 + 0.78 * g(hour, 8, 1.2) + 0.72 * g(hour, 17.8, 1.7) + 0.24 * g(hour, 13, 2.2);
  const leisure = 0.08 + 0.34 * g(hour, 12.5, 2.4) + 0.78 * g(hour, 20, 2.1);
  const base = r.kind === "commute" ? commute : r.kind === "leisure" ? leisure : (commute + leisure) / 2;
  const jitter = (rng(r.id.length * 131 + r.id.charCodeAt(0))() - 0.5) * 0.08;
  return clamp(base * (0.55 + 0.5 * r.k) + jitter);
}

const LEN = ROADS.map((r) => lengthOf(r.pts));
const TOTAL_LEN = LEN.reduce((a, b) => a + b, 0);
/** the whole network at once, weighted by road length */
export const networkIndex = (hour: number) => ROADS.reduce((s, r, i) => s + roadLoad(r, hour) * LEN[i], 0) / TOTAL_LEN;
export const avgSpeed = (index: number) => Math.round(48 - 30 * index);

/** share of a parking lot that is taken at an hour */
const PROFILE: Record<LotKind, (h: number) => number> = {
  retail: (h) => 0.12 + 0.78 * g(h, 16, 4.2),
  school: (h) => 0.06 + 0.88 * (g(h, 8, 0.9) + 0.7 * g(h, 14, 1.1)),
  care: (h) => 0.18 + 0.7 * g(h, 11, 3.2),
  home: (h) => 0.45 + 0.45 * Math.max(g(h, 1, 5), g(h, 23, 4)),
  hotel: (h) => 0.3 + 0.55 * g(h, 21, 4),
  leisure: (h) => 0.08 + 0.8 * g(h, 11, 3) + 0.3 * g(h, 18, 2),
  work: (h) => 0.06 + 0.8 * g(h, 11.5, 3.2),
};
export const lotOcc = (l: Lot, hour: number) => clamp(PROFILE[l.kind](hour) + (rng(l.cap)() - 0.5) * 0.05, 0.02, 0.99);
export const lotTaken = (l: Lot, hour: number) => Math.round(lotOcc(l, hour) * l.cap);
export const freeSpaces = (hour: number) => LOTS.reduce((s, l) => s + l.cap - lotTaken(l, hour), 0);
export const totalSpaces = LOTS.reduce((s, l) => s + l.cap, 0);
/** minutes to find a space, rising steeply as the lots fill */
export const searchMinutes = (hour: number) => {
  const occ = LOTS.reduce((s, l) => s + lotOcc(l, hour) * l.cap, 0) / totalSpaces;
  return +(1.2 + 9 * Math.pow(occ, 3)).toFixed(1);
};

/** cars waiting at a gate, and the minutes that costs */
export function gateQueue(gateId: string, hour: number) {
  const gate = GATES.find((x) => x.id === gateId);
  const road = ROADS.find((r) => r.id === gate?.road) ?? ROADS[0];
  const cars = Math.round(roadLoad(road, hour) * 26);
  return { cars, wait: +(cars * 0.28).toFixed(1) };
}

export const loadColor = (v: number) => (v < 0.4 ? "var(--good)" : v < 0.7 ? "var(--warn)" : "var(--bad)");
export const occColor = (v: number) => (v < 0.7 ? "var(--good)" : v < 0.9 ? "var(--warn)" : "var(--bad)");
export const clock = (hour: number) => {
  const h = Math.floor(hour) % 24, m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export interface FcPoint { h: number; label: string; typical: number; actual?: number; forecast?: number; band?: [number, number] }
/** the day so far (actual) and the next 12 hours (AI forecast with a widening band) around "now" */
export function forecastSeries(now: number): FcPoint[] {
  const out: FcPoint[] = [];
  for (let k = -6; k <= 12; k++) {
    const h = now + k, hh = ((h % 24) + 24) % 24;
    const v = Math.round(networkIndex(hh) * 100);
    const typical = Math.round(networkIndex(hh) * 100 * 0.92 + 2);
    const noise = Math.round((rng(Math.floor(h * 4) + 17)() - 0.5) * 6);
    const p: FcPoint = { h: k, label: clock(Math.floor(hh)), typical };
    if (k <= 0) p.actual = Math.max(2, v + noise);
    if (k >= 0) { p.forecast = v; const w = 3 + k * 0.9; p.band = [Math.max(0, Math.round(v - w)), Math.min(100, Math.round(v + w))]; }
    out.push(p);
  }
  return out;
}
/** the busiest hour in the next 12, for the plain-words advice under the chart */
export function nextPeak(now: number) {
  let best = { h: now, v: -1 };
  for (let k = 0; k <= 12; k++) { const hh = (now + k) % 24, v = networkIndex(hh); if (v > best.v) best = { h: hh, v }; }
  return { hour: Math.floor(best.h), pct: Math.round(best.v * 100) };
}

/** minutes by car along a route (the plan's map units are taken as about 2.25 m each), slower when the network is busy */
export const etaMinutes = (route: [number, number][], index: number) => {
  const km = (lengthOf(route) * 2.25) / 1000, v = Math.max(8, avgSpeed(index) * 0.7);
  return Math.max(1, Math.round((km / v) * 60));
};
