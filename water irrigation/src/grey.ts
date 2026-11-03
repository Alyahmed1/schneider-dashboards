/* ================= Grey water: reuse of shower, basin and laundry water (all numbers are sample data) =================
   Headquarters, villas and staff housing make about 68 m³ of grey water a day. A small plant (screen, biological membrane
   reactor, UV, chlorine) cleans it into a storage tank, and it goes back out to water the gardens and fodder alfalfa. */
import { fmt, rng } from "./farm";
import { zonesAt } from "./landscape";

export const GW = { name: "Grey water plant", capacity: 120, generated: 68, collect: 40, store: 60, kwhPerM3: 1.1 };

// grey water made in each hour of the day, relative: morning and evening showers, laundry at midday
const SHAPE = [0.2, 0.15, 0.12, 0.12, 0.3, 0.9, 2.0, 2.6, 2.2, 1.4, 1.0, 0.9, 1.1, 1.2, 0.9, 0.8, 0.9, 1.3, 1.9, 2.4, 2.2, 1.6, 0.9, 0.4];
const SUM = SHAPE.reduce((a, b) => a + b, 0);
const gen = (h: number) => (SHAPE[Math.floor(h) % 24] / SUM) * GW.generated; // m³/h

export interface GwPt { h: number; gen: number; treat: number; landscape: number; farm: number; overflow: number; coll: number; store: number }
/** step through the day every 15 minutes: the collection tank fills, the plant treats, the storage tank is drawn down by reuse */
function simulate(): GwPt[] {
  const out: GwPt[] = [];
  let coll = 14, store = 30;
  for (let i = 0; i <= 96; i++) {
    const h = i / 4;
    const g = gen(h);
    const treat = coll > 3 ? 3.6 : Math.min(g, coll);
    const landscape = zonesAt(Math.min(h, 23.99)).reduce((a, z) => a + z.lpm * 0.06, 0); // litres per minute → m³ per hour
    const farm = h >= 5 && h < 11 ? 5.3 : 0;
    const want = landscape + farm;
    const give = Math.min(want, (store + treat * 0.25) / 0.25);
    coll = Math.max(0, Math.min(GW.collect, coll + (g - treat) * 0.25));
    store += (treat - give) * 0.25;
    const overflow = store > GW.store ? (store - GW.store) / 0.25 : 0;
    store = Math.max(0, Math.min(GW.store, store));
    out.push({ h, gen: g, treat, landscape: give * (landscape / (want || 1)), farm: give * (farm / (want || 1)), overflow, coll, store });
  }
  return out;
}
const SIM = simulate();
export const gwAt = (h: number) => SIM[Math.max(0, Math.min(96, Math.round(h * 4)))];
export const gwDay = () => {
  const sum = (k: "gen" | "treat" | "landscape" | "farm" | "overflow") => SIM.slice(0, 96).reduce((a, p) => a + p[k] * 0.25, 0);
  return { gen: sum("gen"), treated: sum("treat"), landscape: sum("landscape"), farm: sum("farm"), overflow: sum("overflow") };
};
export const hourlyFlows = () => Array.from({ length: 24 }, (_, h) => { const p = gwAt(h + 0.5); return { h, gen: +p.gen.toFixed(1), treat: +p.treat.toFixed(1), reuse: +(p.landscape + p.farm).toFixed(1) }; });

/* ---------- water quality ---------- */
export interface Param { id: string; name: string; unit: string; inlet?: number; outlet: number; min?: number; max?: number; dec: number }
export const PARAMS: Param[] = [
  { id: "bod", name: "BOD₅", unit: "mg/L", inlet: 145, outlet: 7.2, max: 20, dec: 1 },
  { id: "tss", name: "Suspended solids", unit: "mg/L", inlet: 88, outlet: 4.1, max: 15, dec: 1 },
  { id: "tur", name: "Turbidity", unit: "NTU", inlet: 62, outlet: 1.1, max: 5, dec: 1 },
  { id: "ph", name: "pH", unit: "", inlet: 7.2, outlet: 7.1, min: 6.5, max: 8.5, dec: 1 },
  { id: "cl", name: "Free chlorine", unit: "mg/L", outlet: 0.74, min: 0.5, max: 1.5, dec: 2 },
  { id: "ec", name: "Conductivity (EC)", unit: "dS/m", inlet: 0.9, outlet: 1.0, max: 2.5, dec: 2 },
  { id: "ecoli", name: "E. coli", unit: "CFU/100 mL", inlet: 100000, outlet: 0, max: 1, dec: 0 },
];
export const paramOk = (p: Param, v: number) => (p.min === undefined || v >= p.min) && (p.max === undefined || v <= p.max);
export const limitText = (p: Param) => (p.min !== undefined && p.max !== undefined ? `${p.min} to ${p.max}` : p.max !== undefined ? `max ${p.max}` : `min ${p.min}`);

/** treated-water turbidity and free chlorine hour by hour today (chlorine dips below its limit once, at 14:00) */
export function qualitySeries() {
  const r = rng(321);
  return Array.from({ length: 24 }, (_, h) => ({
    h, tur: +(0.9 + r() * 0.5 + (h === 8 || h === 19 ? 0.5 : 0)).toFixed(2),
    cl: +(0.74 + (r() - 0.5) * 0.14 - (h === 14 ? 0.27 : h === 13 || h === 15 ? 0.1 : 0)).toFixed(2),
  }));
}
export const compliance = () => { const q = qualitySeries(); return (q.filter((p) => p.cl >= 0.5 && p.tur <= 5).length / q.length) * 100; };

export const SAMPLES = [
  { when: "Today 08:15", point: "Treated outlet", bod: 6.8, tss: 3.9, ecoli: "< 1", result: "Pass" },
  { when: "Yesterday 08:10", point: "Treated outlet", bod: 7.5, tss: 4.4, ecoli: "< 1", result: "Pass" },
  { when: "Yesterday 08:20", point: "Inlet", bod: 151, tss: 91, ecoli: "1.1 × 10⁵", result: "Raw" },
  { when: "2 days ago 08:05", point: "Treated outlet", bod: 8.1, tss: 4.8, ecoli: "< 1", result: "Pass" },
  { when: "3 days ago 08:12", point: "Storage tank", bod: 7.9, tss: 4.6, ecoli: "< 1", result: "Pass" },
];

/* ---------- reuse and savings ---------- */
export const FRESH_VALUE = 4.5; // LE per m³ of fresh water not pumped
export const TREAT_COST = 2.1; // LE per m³ for energy, chlorine and membrane cleaning
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31];
const OCC = [0.82, 0.85, 0.9, 0.95, 1.0, 1.04, 1.06, 1.05, 1.0, 0.97]; // how full the housing is
export function reuseYtd() {
  const r = rng(808);
  return MONTHS.map((t, i) => { const g = GW.generated * DAYS[i] * OCC[i]; return { t, gen: Math.round(g), reused: Math.round(g * (0.9 + r() * 0.06)) }; });
}
export const fmtM3 = (n: number) => `${fmt(n)} m³`;
