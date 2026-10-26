import type { WorkOrder } from "./cmms";
// Sample numbers only — a 150,000 m³/day activated-sludge wastewater plant with three 50,000 m³/day aeration lanes.
export type Range = "24H" | "7D" | "30D" | "YTD";
export type Area = "All plant" | "Lane A" | "Lane B" | "Lane C";
export type Tone = "good" | "warn" | "bad" | "info";
export interface Filters { range: Range; area: Area }

export const RANGES: Range[] = ["24H", "7D", "30D", "YTD"];
export const AREAS: Area[] = ["All plant", "Lane A", "Lane B", "Lane C"];
export const RANGE_LABEL: Record<Range, string> = { "24H": "last 24 hours", "7D": "last 7 days", "30D": "last 30 days", YTD: "year to date" };
export const BUCKET: Record<Range, string> = { "24H": "per hour", "7D": "per day", "30D": "per day", YTD: "per month" };

export const PRICE = 2.4; // LE per m³ of treated water reused for irrigation
export const PLANT = { name: "New Cairo Wastewater Treatment Plant", capacity: 150000, trains: 3 };

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
/** m³ treated in one bucket at full plant size */
const bucketBase = (r: Range) => (r === "24H" ? 6250 : r === "YTD" ? 4_500_000 : 150000);

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
    { id: "water", label: "Flow treated", value: big ? total / 1e6 : total / 1e3, decimals: big ? 2 : 1, suffix: big ? " M" : " k", unit: "m³", delta: +(((total / target) - 1) * 100).toFixed(1), note: "vs target", spark: spark(s, big ? 3.6 : 120, 0.04) },
    { id: "energy", label: "Specific energy", value: 0.46 + (s - 1) * 0.01, decimals: 2, unit: "kWh/m³", delta: -2.1, goodWhenDown: true, note: "vs last period", spark: spark(s + 10, 0.46, 0.03) },
    { id: "cost", label: "Treatment cost", value: 5.9 + (s - 1) * 0.1, decimals: 1, unit: "LE/m³", delta: -1.4, goodWhenDown: true, note: "vs budget", spark: spark(s + 20, 5.9, 0.03) },
    { id: "avail", label: "Plant availability", value: 99.0, decimals: 1, unit: "%", delta: 0.3, note: "vs target 98%", spark: spark(s + 30, 98.9, 0.006) },
    { id: "wo", label: "Open work orders", value: open.length, decimals: 0, unit: "", delta: -3, goodWhenDown: true, note: `${late} overdue`, spark: spark(s + 40, 14, 0.2) },
  ];
}

export interface Alarm { id: string; sev: "Critical" | "Warning" | "Info"; text: string; where: string; time: string; wo?: string; area: Area | "All plant" }
const ALARMS: Alarm[] = [
  { id: "a1", sev: "Critical", text: "Lane B dissolved oxygen below 1.5 mg/L", where: "Aeration", time: "12 min ago", wo: "WO-2417", area: "Lane B" },
  { id: "a2", sev: "Warning", text: "Grit classifier 2 needs emptying", where: "Grit & grease", time: "41 min ago", wo: "WO-2421", area: "All plant" },
  { id: "a3", sev: "Warning", text: "Blower B-401C vibration trending up", where: "Blowers", time: "2 h ago", wo: "WO-2409", area: "Lane C" },
  { id: "a4", sev: "Info", text: "Polymer dosing tank at 28%", where: "Chemicals", time: "3 h ago", wo: "WO-2425", area: "All plant" },
  { id: "a5", sev: "Info", text: "Biogas CHP producing 1.2 MW (full output)", where: "Electrical", time: "5 h ago", area: "All plant" },
];
export function alarms(f: Filters): Alarm[] {
  return ALARMS.filter((a) => f.area === "All plant" || a.area === "All plant" || a.area === f.area);
}

/** one aeration lane (an activated-sludge tank) */
export interface Lane { name: Area; flow: number; mlss: number; oxygen: number; sludgeAge: number; lastClean: string; nextCleanDays: number; tone: Tone }
const LANES: Lane[] = [
  { name: "Lane A", flow: 2080, mlss: 3380, oxygen: 2.1, sludgeAge: 11.4, lastClean: "14 Sep", nextCleanDays: 41, tone: "good" },
  { name: "Lane B", flow: 2020, mlss: 3560, oxygen: 1.1, sludgeAge: 12.1, lastClean: "02 Aug", nextCleanDays: 6, tone: "bad" },
  { name: "Lane C", flow: 2050, mlss: 3410, oxygen: 2.2, sludgeAge: 11.2, lastClean: "27 Sep", nextCleanDays: 58, tone: "good" },
];
export const lanes = (f: Filters) => LANES.filter((t) => f.area === "All plant" || t.name === f.area);
/** share of the effluent checks that pass, in percent (lane B is short of oxygen, so its ammonia is the weak spot) */
const COMPLIANCE: Record<Area, number> = { "All plant": 99.1, "Lane A": 99.6, "Lane B": 97.9, "Lane C": 99.8 };
export function complianceScore(f: Filters) {
  return COMPLIANCE[f.area];
}

export interface Stage {
  id: string; name: string; short: string; flow: number; unit: string; tone: Tone; note: string;
  readings: { label: string; value: string; unit: string }[];
  equipment: { name: string; state: "Running" | "Standby" | "Alarm"; load: number }[];
}
/** the ids keep the order of the plant: intake, pre, hp, ro, erd, post, tank, net (the stage pictures are keyed by them; effluent & reuse comes before sludge & biogas) */
export function stages(f: Filters): Stage[] {
  const k = areaK(f.area);
  const fl = (n: number) => Math.round(n * k);
  return [
    { id: "intake", name: "Inlet works", short: "Pumping · screens", flow: fl(6250), unit: "m³/h", tone: "good", note: "Screens clear, inlet level normal",
      readings: [{ label: "Inlet level", value: "3.4", unit: "m" }, { label: "Screen Δlevel", value: "0.12", unit: "m" }, { label: "Sewage temp", value: "26.8", unit: "°C" }],
      equipment: [{ name: "Influent pump 1", state: "Running", load: 82 }, { name: "Influent pump 2", state: "Running", load: 80 }, { name: "Influent pump 3", state: "Running", load: 79 }, { name: "Influent pump 4", state: "Standby", load: 0 }] },
    { id: "pre", name: "Grit & grease", short: "Aerated grit · skimming", flow: fl(6230), unit: "m³/h", tone: "warn", note: "Grit classifier 2 needs emptying",
      readings: [{ label: "Grit removed", value: "2.4", unit: "m³/d" }, { label: "Grease removed", value: "0.8", unit: "m³/d" }, { label: "Grit air flow", value: "310", unit: "m³/h" }],
      equipment: [{ name: "Grit chamber 1", state: "Running", load: 71 }, { name: "Grit chamber 2", state: "Running", load: 74 }, { name: "Grit classifier 2", state: "Alarm", load: 95 }, { name: "Ferric dosing", state: "Running", load: 55 }] },
    { id: "hp", name: "Primary clarification", short: "Settling · primary sludge", flow: fl(6200), unit: "m³/h", tone: "good", note: "Removing 62% of suspended solids",
      readings: [{ label: "Sludge blanket", value: "0.9", unit: "m" }, { label: "Surface loading", value: "1.4", unit: "m/h" }, { label: "TSS removal", value: "62", unit: "%" }],
      equipment: [{ name: "Primary clarifier 1", state: "Running", load: 85 }, { name: "Primary clarifier 2", state: "Running", load: 87 }, { name: "Primary clarifier 3", state: "Running", load: 83 }, { name: "Primary sludge pump", state: "Running", load: 63 }] },
    { id: "ro", name: "Aeration", short: "3 lanes · blowers", flow: fl(6150), unit: "m³/h", tone: "bad", note: "Lane B oxygen low — diffuser clean in 6 days",
      readings: [{ label: "Dissolved oxygen", value: "1.8", unit: "mg/L" }, { label: "MLSS", value: "3,450", unit: "mg/L" }, { label: "Sludge age", value: "11.6", unit: "days" }],
      equipment: [{ name: "Lane A", state: "Running", load: 92 }, { name: "Lane B", state: "Alarm", load: 88 }, { name: "Lane C", state: "Running", load: 94 }, { name: "Standby blower", state: "Standby", load: 0 }] },
    { id: "erd", name: "Secondary clarifiers", short: "Settling · return sludge", flow: fl(6150), unit: "m³/h", tone: "good", note: "Return sludge steady at 55% of inflow",
      readings: [{ label: "Sludge blanket", value: "1.2", unit: "m" }, { label: "Return sludge rate", value: "55", unit: "%" }, { label: "Effluent TSS", value: "11", unit: "mg/L" }],
      equipment: [{ name: "Secondary clarifier A", state: "Running", load: 90 }, { name: "Secondary clarifier B", state: "Running", load: 89 }, { name: "Secondary clarifier C", state: "Running", load: 91 }] },
    { id: "post", name: "Tertiary & disinfection", short: "Disc filters · UV", flow: fl(6100), unit: "m³/h", tone: "warn", note: "UV transmittance 52%, sleeves need cleaning",
      readings: [{ label: "UV dose", value: "42", unit: "mJ/cm²" }, { label: "UV transmittance", value: "52", unit: "%" }, { label: "Turbidity", value: "1.6", unit: "NTU" }],
      equipment: [{ name: "Disc filter bank", state: "Running", load: 48 }, { name: "UV bank 1", state: "Running", load: 52 }, { name: "UV bank 2", state: "Running", load: 71 }] },
    { id: "net", name: "Effluent & reuse", short: "Irrigation pumps · outfall", flow: fl(6080), unit: "m³/h", tone: "good", note: "58% of the treated water goes to irrigation",
      readings: [{ label: "Reused", value: "58", unit: "%" }, { label: "Line pressure", value: "4.8", unit: "bar" }, { label: "Irrigated area", value: "4.2 k", unit: "feddan" }],
      equipment: [{ name: "Reuse pump 1", state: "Running", load: 77 }, { name: "Reuse pump 2", state: "Running", load: 75 }, { name: "Reuse pump 3", state: "Standby", load: 0 }] },
    { id: "tank", name: "Sludge & biogas", short: "Thickening · digesters · CHP", flow: fl(190), unit: "m³/h", tone: "good", note: "Producing 520 Nm³/h of biogas",
      readings: [{ label: "Digester temp", value: "37.2", unit: "°C" }, { label: "Biogas yield", value: "520", unit: "Nm³/h" }, { label: "Cake dryness", value: "24", unit: "%" }],
      equipment: [{ name: "Digester 1", state: "Running", load: 74 }, { name: "Digester 2", state: "Running", load: 70 }, { name: "CHP unit", state: "Running", load: 80 }] },
  ];
}
export function stageTrend(id: string, base: number) {
  const r = rng(id.length * 131 + id.charCodeAt(0));
  return Array.from({ length: 24 }, (_, i) => ({ t: `${String(i).padStart(2, "0")}:00`, v: Math.round(base * (0.97 + r() * 0.06)) }));
}

/** effluent quality against its limit; the limits are placeholders until a standard is chosen */
export interface Quality { name: string; value: number; unit: string; min: number; max: number; digits: number }
export const QUALITY: Quality[] = [
  { name: "BOD₅", value: 9, unit: "mg/L", min: 0, max: 20, digits: 0 },
  { name: "COD", value: 38, unit: "mg/L", min: 0, max: 80, digits: 0 },
  { name: "Suspended solids (TSS)", value: 11, unit: "mg/L", min: 0, max: 30, digits: 0 },
  { name: "Ammonia (NH₄-N)", value: 4.1, unit: "mg/L", min: 0, max: 5, digits: 1 },
  { name: "Total nitrogen", value: 11, unit: "mg/L", min: 0, max: 15, digits: 0 },
  { name: "Total phosphorus", value: 1.4, unit: "mg/L", min: 0, max: 2, digits: 1 },
  { name: "pH", value: 7.4, unit: "", min: 6.5, max: 8.5, digits: 1 },
  { name: "Turbidity", value: 1.6, unit: "NTU", min: 0, max: 5, digits: 1 },
  { name: "Faecal coliforms", value: 38, unit: "MPN/100 mL", min: 0, max: 1000, digits: 0 },
];
export const qualityOk = (q: Quality) => q.value >= q.min && q.value <= q.max;
