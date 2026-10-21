import { labels, rng, RANGES, type Filters, type Quality, type Tone } from "./data";

const AREA_SEED = { "All plant": 1, "Train A": 2, "Train B": 3, "Train C": 4 } as const;
const seedOf = (f: Filters) => 300 + RANGES.indexOf(f.range) * 17 + AREA_SEED[f.area];
export const areaShare = (f: Filters) => (f.area === "All plant" ? 1 : 1 / 3);

/* ---------- financials ---------- */
export const PRICE = 31.5; // LE per m³ sold
export const ANNUAL_M3 = 43_800_000; // 120,000 m³/day × 365
export interface WhatIf { recovery: number; tariff: number; solar: number }
export const WHATIF_BASE: WhatIf = { recovery: 45.2, tariff: 2.2, solar: 25.9 };
const SEC0 = 3.18;
const SOLAR_LCOE = 0.9; // LE per kWh from the own solar field

export interface CostLine { id: string; name: string; value: number; budget: number }
const BUDGET: Record<string, number> = { energy: 6.3, membranes: 4.3, chemicals: 3.4, labour: 3.65, maintenance: 2.9, capital: 4.475 };
const NAMES: [string, string][] = [["energy", "Energy"], ["membranes", "Membranes"], ["chemicals", "Chemicals"], ["labour", "Labour"], ["maintenance", "Maintenance"], ["capital", "Capital & finance"]];

/** simple estimate of what one m³ costs for a given operating point */
export function costModel(w: WhatIf) {
  const feed = WHATIF_BASE.recovery / w.recovery; // feed water needed per m³ of product
  const sec = SEC0 * (0.15 + 0.85 * feed);
  const blended = w.tariff * (1 - w.solar / 100) + SOLAR_LCOE * (w.solar / 100);
  const v: Record<string, number> = {
    energy: sec * blended,
    membranes: 4.3 * (1 + 0.02 * (w.recovery - WHATIF_BASE.recovery)),
    chemicals: 3.3 * (0.4 + 0.6 * feed),
    labour: 3.6, maintenance: 3.0, capital: 4.475,
  };
  const lines: CostLine[] = NAMES.map(([id, name]) => ({ id, name, value: v[id], budget: BUDGET[id] }));
  return { lines, total: lines.reduce((s, l) => s + l.value, 0), sec, budgetTotal: lines.reduce((s, l) => s + l.budget, 0) };
}
export const BASE_COST = costModel(WHATIF_BASE);

export function costSeries(f: Filters) {
  const r = rng(seedOf(f) + 5);
  const ls = labels(f.range);
  return ls.map((t, i) => ({ t, cost: +(BASE_COST.total * (1.025 - (i / ls.length) * 0.03 + (r() - 0.5) * 0.03)).toFixed(2), price: PRICE }));
}

/** one cost type over the chosen period: actual against its budget */
export function itemSeries(f: Filters, id: string) {
  const line = BASE_COST.lines.find((l) => l.id === id)!;
  const r = rng(seedOf(f) + 31 + id.length * 7 + id.charCodeAt(0));
  return labels(f.range).map((t) => ({ t, actual: +(line.value * (0.96 + r() * 0.08)).toFixed(2), budget: line.budget }));
}

/* ---------- sustainability ---------- */
export const GRID_CO2 = 0.45; // kg CO₂ per kWh of grid power
export const PLANT_KW = 15836;
const HOURS = { "24H": 1, "7D": 24, "30D": 24, YTD: 730 } as const;
export function co2Series(f: Filters) {
  const r = rng(seedOf(f) + 9);
  const k = areaShare(f);
  const ls = labels(f.range);
  return ls.map((t, i) => {
    const sun = f.range === "24H" ? Math.max(0, Math.sin(((i - 6) / 12) * Math.PI)) * 0.55 : 0.24 + r() * 0.05;
    const kwh = PLANT_KW * k * HOURS[f.range] * (0.97 + r() * 0.06);
    return { t, grid: +((kwh * (1 - sun) * GRID_CO2) / 1000).toFixed(1), avoided: +((kwh * sun * GRID_CO2) / 1000).toFixed(1), share: +(sun * 100).toFixed(1) };
  });
}

export interface Goal { name: string; now: number; start: number; target: number; unit: string; year: number; digits: number }
export const GOALS: Goal[] = [
  { name: "Solar share of power", now: 25.9, start: 12, target: 40, unit: "%", year: 2028, digits: 1 },
  { name: "CO₂ per m³ of water", now: 1.06, start: 1.45, target: 0.8, unit: "kg", year: 2028, digits: 2 },
  { name: "Water recovery", now: 45.2, start: 43.5, target: 48, unit: "%", year: 2027, digits: 1 },
];
export const goalProgress = (g: Goal) => Math.max(0, Math.min(100, ((g.now - g.start) / (g.target - g.start)) * 100));

export const MARINE: Quality[] = [
  { name: "Salt rise at mixing edge", value: 1.4, unit: "g/L", min: 0, max: 2, digits: 1 },
  { name: "Temperature rise", value: 0.6, unit: "°C", min: 0, max: 3, digits: 1 },
  { name: "Residual chlorine", value: 0.02, unit: "mg/L", min: 0, max: 0.05, digits: 2 },
  { name: "Brine dilution (min 30:1)", value: 38, unit: ": 1", min: 30, max: 60, digits: 0 },
  { name: "Outfall pH", value: 7.9, unit: "", min: 6.5, max: 9, digits: 1 },
];

export interface Chem { name: string; use: number; target: number }
export const CHEMICALS: Chem[] = [
  { name: "Lime", use: 14.2, target: 15 },
  { name: "CO₂ (remineralising)", use: 9.4, target: 10 },
  { name: "Ferric coagulant", use: 8.4, target: 9 },
  { name: "Sodium bisulfite", use: 3.0, target: 3.2 },
  { name: "Antiscalant", use: 2.1, target: 2.4 },
  { name: "Sodium hypochlorite", use: 1.9, target: 2.0 },
];

/* ---------- benchmarks ---------- */
export interface Bench { id: string; name: string; unit: string; us: number; avg: number; best: number; lowerBetter: boolean; digits: number }
const AREA_BENCH: Record<string, { sec: number; rec: number }> = { "All plant": { sec: 3.18, rec: 45.2 }, "Train A": { sec: 3.12, rec: 45.6 }, "Train B": { sec: 3.31, rec: 44.2 }, "Train C": { sec: 3.1, rec: 45.9 } };
export function benchmarks(f: Filters): Bench[] {
  const a = AREA_BENCH[f.area];
  const j = (rng(seedOf(f) + 2)() - 0.5) * 0.01; // tiny drift so each time range reads slightly different
  const v = (x: number) => x * (1 + j);
  return [
    { id: "sec", name: "Energy per m³", unit: "kWh/m³", us: v(a.sec), avg: 3.6, best: 2.8, lowerBetter: true, digits: 2 },
    { id: "rec", name: "Water recovery", unit: "%", us: a.rec, avg: 42, best: 50, lowerBetter: false, digits: 1 },
    { id: "av", name: "Plant availability", unit: "%", us: 98.7 + j * 20, avg: 96.5, best: 99.2, lowerBetter: false, digits: 1 },
    { id: "cost", name: "Cost per m³", unit: "LE/m³", us: v(BASE_COST.total), avg: 28.5, best: 21, lowerBetter: true, digits: 1 },
    { id: "rej", name: "Salt rejection", unit: "%", us: 99.7, avg: 99.5, best: 99.8, lowerBetter: false, digits: 1 },
    { id: "life", name: "Membrane life", unit: "years", us: v(4.7), avg: 5, best: 7, lowerBetter: false, digits: 1 },
    { id: "loss", name: "Network water loss", unit: "%", us: v(2.1), avg: 4, best: 1.5, lowerBetter: true, digits: 1 },
    { id: "co2", name: "CO₂ per m³", unit: "kg", us: v(1.06), avg: 1.6, best: 0.6, lowerBetter: true, digits: 2 },
  ];
}
/** 0–100 where the industry average sits at 50 and best-in-class at 100 */
export function benchScore(b: Bench) {
  const span = Math.abs(b.best - b.avg);
  const diff = b.lowerBetter ? b.avg - b.us : b.us - b.avg;
  return Math.max(0, Math.min(100, 50 + (diff / span) * 50));
}
export function benchTone(b: Bench): Tone {
  const s = benchScore(b);
  return s >= 75 ? "good" : s >= 50 ? "info" : "warn";
}
