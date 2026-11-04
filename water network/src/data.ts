import type { WorkOrder } from "./cmms";
import { NET, ZONES, dayCurve, networkAt } from "./network";
// Sample numbers only: a New Cairo drinking-water network, about 150,000 m³/day, six supply zones, one elevated reservoir.
export type Range = "24H" | "7D" | "30D" | "YTD";
export type ZoneName = (typeof ZONES)[number]["name"];
export type Area = "All network" | ZoneName;
export type Tone = "good" | "warn" | "bad" | "info";
export interface Filters { range: Range; area: Area }

export const RANGES: Range[] = ["24H", "7D", "30D", "YTD"];
export const AREAS: Area[] = ["All network", ...ZONES.map((z) => z.name)];
export const RANGE_LABEL: Record<Range, string> = { "24H": "last 24 hours", "7D": "last 7 days", "30D": "last 30 days", YTD: "year to date" };
export const BUCKET: Record<Range, string> = { "24H": "per hour", "7D": "per day", "30D": "per day", YTD: "per month" };

export const PRICE = 3.2; // LE per m³ of water billed to customers
export const PLANT = { name: "New Cairo Water Network", capacity: 160000, trains: 3 };

/** small seeded random so charts stay stable between renders */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
/** share of the whole network that a zone holds */
const TOTAL_DAILY = ZONES.reduce((a, z) => a + z.daily, 0);
export const areaK = (a: Area) => (a === "All network" ? 1 : ZONES.find((z) => z.name === a)!.daily / TOTAL_DAILY);
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
/** m³ of water supplied in one bucket, for the whole network */
const bucketBase = (r: Range) => (r === "24H" ? NET.supplied / 24 : r === "YTD" ? NET.supplied * 30 : NET.supplied);

export interface ProdPoint { t: string; actual: number; target: number }
/** water supplied into the network: the 24-hour view follows the real demand curve, longer views follow the weekly rhythm */
export function productionSeries(f: Filters): ProdPoint[] {
  const k = areaK(f.area), base = bucketBase(f.range) * k, r = rng(77 + areaSeed(f.area) * 13 + RANGES.indexOf(f.range));
  const curve = dayCurve();
  return labels(f.range).map((t, i) => {
    if (f.range === "24H") return { t, target: Math.round(base), actual: Math.round(curve[i].supplied * 3.6 * k) };
    const weekend = f.range === "7D" && (i === 4 || i === 5) ? 0.96 : 1;
    return { t, target: Math.round(base), actual: Math.round(base * (0.97 + r() * 0.05) * weekend) };
  });
}

export interface Kpi { id: string; label: string; value: number; decimals: number; suffix?: string; unit: string; delta: number; goodWhenDown?: boolean; note: string; spark: number[] }
function spark(seed: number, base: number, spread: number) {
  const r = rng(seed);
  return Array.from({ length: 14 }, () => +(base * (1 - spread + r() * spread * 2)).toFixed(3));
}
const zoneOf = (a: Area) => ZONES.find((z) => z.name === a);
export function overviewKpis(f: Filters, wos: WorkOrder[]): Kpi[] {
  const series = productionSeries(f);
  const total = series.reduce((s, p) => s + p.actual, 0);
  const target = series.reduce((s, p) => s + p.target, 0);
  const s = areaSeed(f.area);
  const open = wos.filter((w) => w.status !== "Done" && (f.area === "All network" || w.area === "All network" || w.area === f.area));
  const late = open.filter((w) => w.late).length;
  const big = total >= 1e6;
  const peak = networkAt(8);
  const z = zoneOf(f.area);
  const nrw = z ? z.nrw * 100 : NET.nrw * 100;
  const bar = z ? peak.zones[z.id].pressure : ZONES.reduce((a, q) => a + peak.zones[q.id].pressure, 0) / ZONES.length;
  return [
    { id: "water", label: "Water supplied", value: big ? total / 1e6 : total / 1e3, decimals: big ? 2 : 1, suffix: big ? " M" : " k", unit: "m³", delta: +(((total / target) - 1) * 100).toFixed(1), note: "vs plan", spark: spark(s, big ? 3.6 : 148, 0.04) },
    { id: "nrw", label: "Non-revenue water", value: nrw, decimals: 1, unit: "%", delta: -0.8, goodWhenDown: true, note: "vs last period", spark: spark(s + 10, nrw, 0.05) },
    { id: "press", label: "Average pressure", value: bar, decimals: 1, unit: "bar", delta: 0.1, note: "service minimum 2.5 bar", spark: spark(s + 20, bar, 0.04) },
    { id: "energy", label: "Specific energy", value: 0.52 + (s - 1) * 0.005, decimals: 2, unit: "kWh/m³", delta: -1.6, goodWhenDown: true, note: "vs last period", spark: spark(s + 30, 0.52, 0.03) },
    { id: "wo", label: "Open work orders", value: open.length, decimals: 0, unit: "", delta: -2, goodWhenDown: true, note: `${late} overdue`, spark: spark(s + 40, 12, 0.2) },
  ];
}

export interface Alarm { id: string; sev: "Critical" | "Warning" | "Info"; text: string; where: string; time: string; wo?: string; area: Area | "All network" }
const ALARMS: Alarm[] = [
  { id: "a1", sev: "Critical", text: "First Settlement pressure below 2.5 bar at peak", where: "First Settlement", time: "12 min ago", wo: "WO-3117", area: "First Settlement" },
  { id: "a2", sev: "Critical", text: "Burst on a DN300 main, Rehab (12 L/s)", where: "Rehab", time: "41 min ago", wo: "WO-3121", area: "Rehab" },
  { id: "a3", sev: "Warning", text: "Pressure sensor PT-06 offline, Narges", where: "Narges", time: "2 h ago", wo: "WO-3109", area: "Narges" },
  { id: "a4", sev: "Warning", text: "Night flow rising in Narges, possible leak", where: "Narges", time: "3 h ago", wo: "WO-3125", area: "Narges" },
  { id: "a5", sev: "Info", text: "Reservoir refilled to 87% on the night tariff", where: "Reservoir", time: "5 h ago", area: "All network" },
];
export function alarms(f: Filters): Alarm[] {
  return ALARMS.filter((a) => f.area === "All network" || a.area === "All network" || a.area === f.area);
}

/** one supply zone, as the Home popups and tables show it (taken from the hydraulic model at the morning peak) */
export interface ZoneRow { name: ZoneName; flow: number; pressure: number; minPressure: number; loss: number; leaks: number; chlorine: number; tone: Tone }
export const zoneRows = (f: Filters): ZoneRow[] => {
  const s = networkAt(8);
  return ZONES.filter((z) => f.area === "All network" || z.name === f.area).map((z) => {
    const q = s.zones[z.id];
    const tone: Tone = q.minPressure < 2.5 ? "bad" : q.nrw > 0.2 ? "warn" : "good";
    return { name: z.name, flow: q.supplied, pressure: q.pressure, minPressure: q.minPressure, loss: q.nrw * 100, leaks: q.leaks, chlorine: q.minChlorine, tone };
  });
};
/** share of the water-quality checks that pass, in percent */
export function complianceScore(f: Filters) {
  return f.area === "All network" ? 99.4 : f.area === "Narges" ? 98.6 : 99.5;
}

export interface Stage {
  id: string; name: string; short: string; flow: number; unit: string; tone: Tone; note: string;
  readings: { label: string; value: string; unit: string }[];
  equipment: { name: string; state: "Running" | "Standby" | "Alarm"; load: number }[];
}
/** the chain, in the order the water travels; the stage pictures are keyed by these ids */
export function stages(f: Filters): Stage[] {
  const k = areaK(f.area);
  const fl = (n: number) => Math.round(n * k);
  const out = NET.supplied / 24; // m³/h leaving the plant
  const billed = NET.billed / 24;
  return [
    { id: "source", name: "Source & intake", short: "River intake · screens", flow: fl(out * 1.02), unit: "m³/h", tone: "good", note: "Intake level normal, screens clear",
      readings: [{ label: "River level", value: "3.1", unit: "m" }, { label: "Raw turbidity", value: "18", unit: "NTU" }, { label: "Water temp", value: "24.6", unit: "°C" }],
      equipment: [{ name: "Raw pump 1", state: "Running", load: 81 }, { name: "Raw pump 2", state: "Running", load: 79 }, { name: "Raw pump 3", state: "Standby", load: 0 }] },
    { id: "plant", name: "Treatment plant", short: "Settling · filters · chlorine", flow: fl(out), unit: "m³/h", tone: "good", note: "Filtered water at 0.4 NTU, chlorine dosing steady",
      readings: [{ label: "Filtered turbidity", value: "0.4", unit: "NTU" }, { label: "Chlorine dose", value: "1.6", unit: "mg/L" }, { label: "Filter run", value: "38", unit: "h" }],
      equipment: [{ name: "Clarifier 1", state: "Running", load: 84 }, { name: "Clarifier 2", state: "Running", load: 86 }, { name: "Sand filter bank", state: "Running", load: 72 }, { name: "Chlorinator", state: "Running", load: 55 }] },
    { id: "ps1", name: "Pump station PS-1", short: "Clear-water tank · high-lift pumps", flow: fl(out), unit: "m³/h", tone: "good", note: "Three of four pumps running, discharge 5.8 bar",
      readings: [{ label: "Discharge pressure", value: "5.8", unit: "bar" }, { label: "Tank level", value: "72", unit: "%" }, { label: "Power", value: "1,120", unit: "kW" }],
      equipment: [{ name: "High-lift pump 1", state: "Running", load: 82 }, { name: "High-lift pump 2", state: "Running", load: 80 }, { name: "High-lift pump 3", state: "Running", load: 78 }, { name: "High-lift pump 4", state: "Standby", load: 0 }] },
    { id: "res", name: "Elevated reservoir", short: "Storage tower · level control", flow: fl(out), unit: "m³/h", tone: "warn", note: "Level 77%, draining through the morning peak",
      readings: [{ label: "Level", value: "77", unit: "%" }, { label: "Stored", value: "34,600", unit: "m³" }, { label: "Chlorine out", value: "0.77", unit: "mg/L" }],
      equipment: [{ name: "Inlet valve", state: "Running", load: 60 }, { name: "Outlet valve", state: "Running", load: 100 }, { name: "Level sensor", state: "Running", load: 77 }] },
    { id: "trunk", name: "Trunk mains & booster", short: "DN1200 mains · PS-2 · PRVs", flow: fl(out), unit: "m³/h", tone: "good", note: "Booster PS-2 lifts pressure for Narges and Narges",
      readings: [{ label: "Hub pressure", value: "4.6", unit: "bar" }, { label: "Booster flow", value: "608", unit: "L/s" }, { label: "Mains length", value: "17", unit: "km" }],
      equipment: [{ name: "Booster pump 1", state: "Running", load: 74 }, { name: "Booster pump 2", state: "Standby", load: 0 }, { name: "PRV Lotus", state: "Running", load: 68 }, { name: "PRV Narges", state: "Running", load: 61 }] },
    { id: "zones", name: "Supply zones", short: "5 zones · meters · pressure", flow: fl(out), unit: "m³/h", tone: "bad", note: "First Settlement pressure drops below 2.5 bar at the morning peak",
      readings: [{ label: "Lowest pressure", value: "1.8", unit: "bar" }, { label: "Zones in range", value: "5 of 6", unit: "" }, { label: "Open faults", value: "8", unit: "" }],
      equipment: [{ name: "Zone meter Z1", state: "Running", load: 69 }, { name: "Zone meter Z2", state: "Alarm", load: 92 }, { name: "Zone meter Z3", state: "Running", load: 77 }, { name: "Zone meter Z4", state: "Running", load: 63 }] },
    { id: "meters", name: "Customer metering", short: "Smart meters · billing", flow: fl(billed), unit: "m³/h", tone: "good", note: "98.2% of meters reported in the last 24 hours",
      readings: [{ label: "Smart meters", value: "41,800", unit: "" }, { label: "Reading rate", value: "98.2", unit: "%" }, { label: "Tampering flags", value: "14", unit: "" }],
      equipment: [{ name: "Meter gateway N", state: "Running", load: 58 }, { name: "Meter gateway S", state: "Running", load: 61 }, { name: "Billing link", state: "Running", load: 34 }] },
    { id: "leak", name: "Leak & loss control", short: "Loggers · bursts · repairs", flow: fl(out - billed), unit: "m³/h", tone: "warn", note: "Four known leaks lose about 32 L/s",
      readings: [{ label: "Non-revenue water", value: (NET.nrw * 100).toFixed(1), unit: "%" }, { label: "Known leaks", value: "4", unit: "" }, { label: "Crews on site", value: "2", unit: "" }],
      equipment: [{ name: "Logger LK-01", state: "Alarm", load: 78 }, { name: "Logger LK-02", state: "Alarm", load: 88 }, { name: "Logger LK-03", state: "Alarm", load: 82 }, { name: "Repair crew 1", state: "Running", load: 100 }] },
  ];
}
export function stageTrend(id: string, base: number) {
  const r = rng(id.length * 131 + id.charCodeAt(0));
  const curve = dayCurve();
  const peak = Math.max(...curve.map((d) => d.supplied));
  return Array.from({ length: 24 }, (_, i) => ({ t: `${String(i).padStart(2, "0")}:00`, v: Math.round(base * (0.55 + 0.6 * (curve[i].supplied / peak)) * (0.985 + r() * 0.03)) }));
}

/** drinking-water quality at the customer tap against its limit; the limits follow the common national drinking-water standard (sample values) */
export interface Quality { name: string; value: number; unit: string; min: number; max: number; digits: number }
export const QUALITY: Quality[] = [
  { name: "Free chlorine", value: 0.55, unit: "mg/L", min: 0.2, max: 1, digits: 2 },
  { name: "Turbidity", value: 0.4, unit: "NTU", min: 0, max: 1, digits: 1 },
  { name: "pH", value: 7.5, unit: "", min: 6.5, max: 8.5, digits: 1 },
  { name: "Total dissolved solids", value: 310, unit: "mg/L", min: 0, max: 500, digits: 0 },
  { name: "Colour", value: 3, unit: "TCU", min: 0, max: 15, digits: 0 },
  { name: "Iron", value: 0.08, unit: "mg/L", min: 0, max: 0.3, digits: 2 },
  { name: "Nitrate", value: 6, unit: "mg/L", min: 0, max: 45, digits: 0 },
  { name: "Total coliforms", value: 0, unit: "MPN/100 mL", min: 0, max: 1, digits: 0 },
];
export const qualityOk = (q: Quality) => q.value >= q.min && q.value <= q.max;
