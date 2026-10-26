// Water model for the community: homes and buildings, irrigation, lagoons and leak detection. Sample data only.
import { ZONES, type Pt, type ZoneId } from "./data";

export const WATER_COST = 12; // EGP per m³ of potable water (sample)
const g = (h: number, mu: number, s: number) => Math.exp(-Math.pow(Math.min(Math.abs(h - mu), 24 - Math.abs(h - mu)), 2) / (2 * s * s));

const DOMESTIC_ZONES = ZONES.filter((z) => z.id !== "golf");
const DOMESTIC_BASE = DOMESTIC_ZONES.reduce((s, z) => s + z.water, 0);
const IRRIGATION_BASE = ZONES.find((z) => z.id === "golf")?.water ?? 0;

const domShape = (h: number) => 0.45 + 0.6 * g(h, 7.5, 1.7) + 0.7 * g(h, 20, 2.3);
const irrShape = (h: number) => 0.06 + 2.4 * g(h, 3.5, 1.9) + 0.2 * g(h, 19, 1.5);
const mean = (f: (h: number) => number) => Array.from({ length: 24 }, (_, h) => f(h)).reduce((a, b) => a + b, 0) / 24;
const DM = mean(domShape), IM = mean(irrShape);

/** water drawn by homes and buildings, and by irrigation, at an hour (m³/h) */
export const domesticAt = (h: number) => (DOMESTIC_BASE * domShape(h)) / DM;
export const irrigationAt = (h: number) => (IRRIGATION_BASE * irrShape(h)) / IM;
export const waterNow = (h: number) => domesticAt(h) + irrigationAt(h);

export interface WaterIn { cutPct: number; reusePct: number }
export interface WaterHour { h: number; label: string; domestic: number; irrigation: number; reused: number; potable: number }
export const WATER_DEFAULTS: WaterIn = { cutPct: 10, reusePct: 35 };

/** a day of water use, with irrigation trimmed and part of it supplied by treated wastewater instead of potable water */
export function waterDay({ cutPct, reusePct }: WaterIn) {
  const hours: WaterHour[] = Array.from({ length: 24 }, (_, h) => {
    const irr = irrigationAt(h) * (1 - cutPct / 100), reused = irr * (reusePct / 100);
    return { h, label: `${String(h).padStart(2, "0")}:00`, domestic: domesticAt(h), irrigation: irr - reused, reused, potable: domesticAt(h) + irr - reused };
  });
  const potable = hours.reduce((s, x) => s + x.potable, 0);
  const baseline = Array.from({ length: 24 }, (_, h) => waterNow(h)).reduce((a, b) => a + b, 0);
  return { hours, potable, baseline, saved: baseline - potable, savedEgp: (baseline - potable) * WATER_COST, reused: hours.reduce((s, x) => s + x.reused, 0) };
}

export interface Lagoon { id: string; name: string; level: number; target: number; pump: "Auto" | "Running"; ntu: number; evap: number }
export const LAGOONS: Lagoon[] = [
  { id: "l1", name: "Lagoon 1, north corridor", level: 92, target: 90, pump: "Auto", ntu: 2.1, evap: 38 },
  { id: "l2", name: "Lagoon 2, bend", level: 81, target: 90, pump: "Running", ntu: 3.4, evap: 41 },
  { id: "l3", name: "Lagoon 3, clubhouse pond", level: 96, target: 90, pump: "Auto", ntu: 1.8, evap: 52 },
  { id: "l4", name: "Lagoon 4, mid corridor", level: 88, target: 90, pump: "Auto", ntu: 2.6, evap: 29 },
  { id: "l5", name: "Lagoon 5, south basin", level: 94, target: 90, pump: "Auto", ntu: 2.2, evap: 33 },
];

/** night-flow ratio per district-metered area: 1.00 is normal, above about 1.10 suggests a leak */
export const DMA: Record<ZoneId, number> = { apartments: 1.03, villas: 1.15, commercial: 1.0, hotel: 1.04, school: 0.99, hospital: 1.01, golf: 1.0, future: 1.0 };
export const leakTone = (r: number) => (r >= 1.1 ? "bad" : r >= 1.06 ? "warn" : "good");
export const leakColor = (r: number) => `var(--${leakTone(r)})`;
export const LEAK: { zone: ZoneId; at: Pt; m3Day: number; since: string } = { zone: "villas", at: [405, 566], m3Day: 38, since: "3 days" };
