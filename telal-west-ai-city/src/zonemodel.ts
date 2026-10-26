// How each zone's power use moves through a day, and which AI City offers serve it. Sample data only.
import type { ZoneId } from "./data";

const g = (h: number, mu: number, s: number) => Math.exp(-Math.pow(Math.min(Math.abs(h - mu), 24 - Math.abs(h - mu)), 2) / (2 * s * s));

const PROFILE: Record<ZoneId, (h: number) => number> = {
  apartments: (h) => 0.55 + 0.55 * g(h, 20.5, 3) + 0.25 * g(h, 7, 1.5),
  villas: (h) => 0.5 + 0.6 * g(h, 20.5, 3.2) + 0.25 * g(h, 7, 1.5),
  commercial: (h) => 0.35 + 0.85 * g(h, 14.5, 4),
  school: (h) => 0.2 + 0.9 * g(h, 10, 3),
  hospital: (h) => 0.8 + 0.2 * g(h, 13, 5),
  hotel: (h) => 0.6 + 0.35 * g(h, 20, 3.5),
  golf: (h) => 0.45 + 0.9 * g(h, 5.5, 1.2) + 0.2 * g(h, 19, 2),
  future: (h) => 0.5 + 0.1 * g(h, 12, 4),
};

/** power of a zone (MW) at an hour of the day, scaled so the day's average equals the zone's base figure */
export function zoneMw(id: ZoneId, base: number, hour: number): number {
  let sum = 0;
  for (let h = 0; h < 24; h++) sum += PROFILE[id](h);
  return (base * PROFILE[id](hour)) / (sum / 24);
}
export const zoneCurve = (id: ZoneId, base: number) => Array.from({ length: 24 }, (_, h) => ({ h, label: `${String(h).padStart(2, "0")}:00`, mw: +zoneMw(id, base, h).toFixed(2) }));

/** the AI City offers (slide 12) that matter most in each zone, named as in OFFERS */
export const SERVES: Record<ZoneId, string[]> = {
  apartments: ["Smart Parking Management", "Energy Optimization", "Water Monitoring", "AI Resident Assistant"],
  villas: ["Water Monitoring", "Energy Optimization", "AI Resident Assistant"],
  commercial: ["AI Traffic Management", "Smart Parking Management", "AI Video Analytics", "Energy Optimization"],
  school: ["AI Video Analytics", "AI Traffic Management", "Smart Parking Management"],
  hospital: ["Predictive Maintenance", "Energy Optimization", "Smart Parking Management"],
  hotel: ["Smart Parking Management", "Energy Optimization", "AI Resident Assistant"],
  golf: ["Water Monitoring", "Predictive Maintenance", "AI Video Analytics"],
  future: ["Digital Data Platform", "Energy Optimization"],
};

/** colour ramp for heat colouring: pale cream to deep rust */
const STOPS: [number, number, number][] = [[239, 227, 200], [217, 168, 91], [181, 101, 31], [122, 42, 20]];
export function heat(v: number): string {
  const x = Math.max(0, Math.min(1, v)) * (STOPS.length - 1), i = Math.min(STOPS.length - 2, Math.floor(x)), f = x - i;
  const c = STOPS[i].map((a, k) => Math.round(a + (STOPS[i + 1][k] - a) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
