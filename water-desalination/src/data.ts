import type { WorkOrder } from "./cmms";
// Sample numbers only — a 120,000 m³/day sea-water RO plant with three 40,000 m³/day trains.
export type Range = "24H" | "7D" | "30D" | "YTD";
export type Area = "All plant" | "Train A" | "Train B" | "Train C";
export type Tone = "good" | "warn" | "bad" | "info";
export interface Filters { range: Range; area: Area }

export const RANGES: Range[] = ["24H", "7D", "30D", "YTD"];
export const AREAS: Area[] = ["All plant", "Train A", "Train B", "Train C"];
export const RANGE_LABEL: Record<Range, string> = { "24H": "last 24 hours", "7D": "last 7 days", "30D": "last 30 days", YTD: "year to date" };
export const BUCKET: Record<Range, string> = { "24H": "per hour", "7D": "per day", "30D": "per day", YTD: "per month" };

export const PLANT = { name: "Red Sea SWRO Plant", capacity: 120000, trains: 3 };

/** small seeded random so charts stay stable between renders */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const areaK = (a: Area) => (a === "All plant" ? 1 : 1 / 3);
const areaSeed = (a: Area) => AREAS.indexOf(a) + 1;

export function fmt(n: number, d = 0) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function compact(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} k`;
  return fmt(n);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function labels(range: Range): string[] {
  if (range === "24H") return Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
  if (range === "7D") return Array.from({ length: 7 }, (_, i) => DAYS[(new Date().getDay() + i + 1) % 7]);
  if (range === "30D") return Array.from({ length: 30 }, (_, i) => String(i + 1));
  return MONTHS;
}
/** m³ produced in one bucket at full plant size */
const bucketBase = (r: Range) => (r === "24H" ? 5000 : r === "YTD" ? 3_600_000 : 120000);

export interface ProdPoint { t: string; actual: number; target: number }
export function productionSeries(f: Filters): ProdPoint[] {
  const k = areaK(f.area), base = bucketBase(f.range) * k, r = rng(77 + areaSeed(f.area) * 13 + RANGES.indexOf(f.range));
  return labels(f.range).map((t) => {
    const dip = r() < 0.08 ? 0.93 : 1;
    return { t, target: Math.round(base), actual: Math.round(base * (0.965 + r() * 0.04) * dip) };
  });
}

export interface Kpi { id: string; label: string; value: number; decimals: number; suffix?: string; unit: string; delta: number; goodWhenDown?: boolean; note: string; spark: number[] }
function spark(seed: number, base: number, spread: number) {
  const r = rng(seed);
  return Array.from({ length: 14 }, () => +(base * (1 - spread + r() * spread * 2)).toFixed(3));
}
export function overviewKpis(f: Filters, wos: WorkOrder[]): Kpi[] {
  const series = productionSeries(f);
  const total = series.reduce((s, p) => s + p.actual, 0);
  const target = series.reduce((s, p) => s + p.target, 0);
  const s = areaSeed(f.area);
  const open = wos.filter((w) => w.status !== "Done" && (f.area === "All plant" || w.area === "All plant" || w.area === f.area));
  const late = open.filter((w) => w.late).length;
  const big = total >= 1e6;
  return [
    { id: "water", label: "Water produced", value: big ? total / 1e6 : total / 1e3, decimals: big ? 2 : 1, suffix: big ? " M" : " k", unit: "m³", delta: +(((total / target) - 1) * 100).toFixed(1), note: "vs target", spark: spark(s, 100, 0.04) },
    { id: "energy", label: "Specific energy", value: 3.18 + (s - 1) * 0.04, decimals: 2, unit: "kWh/m³", delta: -2.4, goodWhenDown: true, note: "vs last period", spark: spark(s + 10, 3.2, 0.03) },
    { id: "cost", label: "Water cost", value: 24.6 + (s - 1) * 0.3, decimals: 1, unit: "LE/m³", delta: -1.7, goodWhenDown: true, note: "vs budget", spark: spark(s + 20, 24.6, 0.03) },
    { id: "avail", label: "Plant availability", value: 98.7, decimals: 1, unit: "%", delta: 0.4, note: "vs target 98%", spark: spark(s + 30, 98.5, 0.006) },
    { id: "wo", label: "Open work orders", value: open.length, decimals: 0, unit: "", delta: -3, goodWhenDown: true, note: `${late} overdue`, spark: spark(s + 40, 14, 0.2) },
  ];
}

export interface Alarm { id: string; sev: "Critical" | "Warning" | "Info"; text: string; where: string; time: string; wo?: string; area: Area | "All plant" }
const ALARMS: Alarm[] = [
  { id: "a1", sev: "Critical", text: "Train B differential pressure above 2.3 bar", where: "RO membranes", time: "12 min ago", wo: "WO-2417", area: "Train B" },
  { id: "a2", sev: "Warning", text: "Gravity filter 3 needs a backwash", where: "Pre-treatment", time: "41 min ago", wo: "WO-2421", area: "All plant" },
  { id: "a3", sev: "Warning", text: "HP pump C2 vibration trending up", where: "HP pumps", time: "2 h ago", wo: "WO-2409", area: "Train C" },
  { id: "a4", sev: "Info", text: "Antiscalant dosing tank at 28%", where: "Chemicals", time: "3 h ago", wo: "WO-2425", area: "All plant" },
  { id: "a5", sev: "Info", text: "Solar field producing 4.1 MW (peak)", where: "Electrical", time: "5 h ago", area: "All plant" },
];
export function alarms(f: Filters): Alarm[] {
  return ALARMS.filter((a) => f.area === "All plant" || a.area === "All plant" || a.area === f.area);
}

export interface Train { name: Area; permeate: number; recovery: number; fouling: number; dp: number; lastCip: string; nextCipDays: number; tone: Tone }
const TRAINS: Train[] = [
  { name: "Train A", permeate: 1660, recovery: 45.6, fouling: 12, dp: 1.7, lastCip: "14 Sep", nextCipDays: 41, tone: "good" },
  { name: "Train B", permeate: 1610, recovery: 44.2, fouling: 27, dp: 2.4, lastCip: "02 Aug", nextCipDays: 6, tone: "bad" },
  { name: "Train C", permeate: 1690, recovery: 45.9, fouling: 9, dp: 1.6, lastCip: "27 Sep", nextCipDays: 58, tone: "good" },
];
export const trains = (f: Filters) => TRAINS.filter((t) => f.area === "All plant" || t.name === f.area);
export function membraneScore(f: Filters) {
  const t = trains(f);
  return Math.round(100 - t.reduce((s, x) => s + x.fouling, 0) / t.length);
}

export interface Stage {
  id: string; name: string; short: string; flow: number; unit: string; tone: Tone; note: string;
  readings: { label: string; value: string; unit: string }[];
  equipment: { name: string; state: "Running" | "Standby" | "Alarm"; load: number }[];
}
export function stages(f: Filters): Stage[] {
  const k = areaK(f.area);
  const fl = (n: number) => Math.round(n * k);
  return [
    { id: "intake", name: "Sea intake", short: "Open-sea pumps", flow: fl(11100), unit: "m³/h", tone: "good", note: "Intake velocity within limit",
      readings: [{ label: "Seawater temp", value: "27.4", unit: "°C" }, { label: "Salinity", value: "41.2", unit: "g/L" }, { label: "Screen ΔP", value: "0.12", unit: "bar" }],
      equipment: [{ name: "Intake pump 1", state: "Running", load: 82 }, { name: "Intake pump 2", state: "Running", load: 80 }, { name: "Intake pump 3", state: "Running", load: 79 }, { name: "Intake pump 4", state: "Standby", load: 0 }] },
    { id: "pre", name: "Pre-treatment", short: "Coagulation · filters", flow: fl(10950), unit: "m³/h", tone: "warn", note: "Gravity filter 3 needs a backwash",
      readings: [{ label: "SDI (limit 3)", value: "2.9", unit: "" }, { label: "Filter ΔP", value: "0.84", unit: "bar" }, { label: "Turbidity", value: "0.31", unit: "NTU" }],
      equipment: [{ name: "Gravity filter 1", state: "Running", load: 71 }, { name: "Gravity filter 2", state: "Running", load: 74 }, { name: "Gravity filter 3", state: "Alarm", load: 96 }, { name: "Ferric dosing", state: "Running", load: 55 }] },
    { id: "hp", name: "HP pumps", short: "Cartridge · high pressure", flow: fl(10900), unit: "m³/h", tone: "warn", note: "Pump C2 vibration trending up",
      readings: [{ label: "Discharge", value: "58.2", unit: "bar" }, { label: "Pump efficiency", value: "88.1", unit: "%" }, { label: "Motor load", value: "86", unit: "%" }],
      equipment: [{ name: "HP pump A", state: "Running", load: 85 }, { name: "HP pump B", state: "Running", load: 87 }, { name: "HP pump C", state: "Alarm", load: 91 }, { name: "Booster pump", state: "Running", load: 63 }] },
    { id: "ro", name: "RO membranes", short: "3 trains", flow: fl(4980), unit: "m³/h", tone: "bad", note: "Train B ΔP high — cleaning in 6 days",
      readings: [{ label: "Recovery", value: "45.2", unit: "%" }, { label: "Salt rejection", value: "99.7", unit: "%" }, { label: "Membrane ΔP", value: "1.9", unit: "bar" }],
      equipment: [{ name: "Train A", state: "Running", load: 92 }, { name: "Train B", state: "Alarm", load: 88 }, { name: "Train C", state: "Running", load: 94 }, { name: "CIP skid", state: "Standby", load: 0 }] },
    { id: "erd", name: "Energy recovery", short: "Pressure exchangers", flow: fl(6100), unit: "m³/h", tone: "good", note: "Recovering 96% of brine pressure",
      readings: [{ label: "Efficiency", value: "96.0", unit: "%" }, { label: "Brine pressure", value: "56.4", unit: "bar" }, { label: "Energy saved", value: "38", unit: "%" }],
      equipment: [{ name: "Exchanger bank A", state: "Running", load: 90 }, { name: "Exchanger bank B", state: "Running", load: 89 }, { name: "Exchanger bank C", state: "Running", load: 91 }] },
    { id: "post", name: "Post-treatment", short: "Minerals · chlorine", flow: fl(4960), unit: "m³/h", tone: "good", note: "Water quality within limits",
      readings: [{ label: "pH", value: "7.9", unit: "" }, { label: "Free chlorine", value: "0.6", unit: "mg/L" }, { label: "Hardness", value: "82", unit: "mg/L" }],
      equipment: [{ name: "Lime dosing", state: "Running", load: 48 }, { name: "CO₂ dosing", state: "Running", load: 52 }, { name: "Chlorine dosing", state: "Running", load: 40 }] },
    { id: "tank", name: "Storage", short: "Product water tanks", flow: fl(4950), unit: "m³/h", tone: "good", note: "72% full — 38,000 m³ stored",
      readings: [{ label: "Level", value: "72", unit: "%" }, { label: "Stored", value: "38,000", unit: "m³" }, { label: "Cover time", value: "7.6", unit: "h" }],
      equipment: [{ name: "Tank 1", state: "Running", load: 74 }, { name: "Tank 2", state: "Running", load: 70 }] },
    { id: "net", name: "Network", short: "Distribution pumps", flow: fl(4920), unit: "m³/h", tone: "good", note: "Pressure steady at 6.2 bar",
      readings: [{ label: "Line pressure", value: "6.2", unit: "bar" }, { label: "Leak loss", value: "2.1", unit: "%" }, { label: "Customers", value: "186 k", unit: "" }],
      equipment: [{ name: "Transfer pump 1", state: "Running", load: 77 }, { name: "Transfer pump 2", state: "Running", load: 75 }, { name: "Transfer pump 3", state: "Standby", load: 0 }] },
  ];
}
export function stageTrend(id: string, base: number) {
  const r = rng(id.length * 131 + id.charCodeAt(0));
  return Array.from({ length: 24 }, (_, i) => ({ t: `${String(i).padStart(2, "0")}:00`, v: Math.round(base * (0.97 + r() * 0.06)) }));
}

export interface Quality { name: string; value: number; unit: string; min: number; max: number; digits: number }
export const QUALITY: Quality[] = [
  { name: "Salinity (TDS)", value: 218, unit: "mg/L", min: 0, max: 500, digits: 0 },
  { name: "Boron", value: 0.9, unit: "mg/L", min: 0, max: 1.5, digits: 1 },
  { name: "Chloride", value: 78, unit: "mg/L", min: 0, max: 250, digits: 0 },
  { name: "Turbidity", value: 0.08, unit: "NTU", min: 0, max: 1, digits: 2 },
  { name: "pH", value: 7.9, unit: "", min: 6.5, max: 8.5, digits: 1 },
  { name: "Free chlorine", value: 0.6, unit: "mg/L", min: 0.2, max: 1.0, digits: 1 },
];
export const qualityOk = (q: Quality) => q.value >= q.min && q.value <= q.max;

