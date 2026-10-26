// Deterministic simulated data: the same filters always give the same numbers.

export type Tone = "good" | "warn" | "bad" | "info" | "mute";
export const RANGES = ["24H", "7D", "30D", "YTD"] as const;
export type Range = (typeof RANGES)[number];
export const LINES = ["All lines", "Decorative", "Marine", "Protective", "Powder"] as const;
export type Line = (typeof LINES)[number];
export const SHIFTS = ["All shifts", "A · 06–14", "B · 14–22", "C · 22–06"] as const;
export type Shift = (typeof SHIFTS)[number];
export interface Filters { range: Range; line: Line; shift: Shift }

export const C = {
  yellow: "#ffc20e", red: "#e0303a", blue: "#4d8dff", teal: "#2dd4bf", violet: "#a78bfa",
  good: "#34d399", warn: "#ff9f43", bad: "#ff5d73", mute: "#93a1c6",
} as const;

export const TONE_COLOR: Record<Tone, string> = { good: C.good, warn: C.warn, bad: C.bad, info: C.blue, mute: C.mute };

/* ---------- seeded randomness ---------- */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(key: string) {
  let a = hash(key);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const fmt = (n: number, dp = 0) => n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const fk = (f: Filters) => `${f.range}|${f.line}|${f.shift}`;

const LINE_SHARE: Record<Line, number> = { "All lines": 1, Decorative: 0.44, Marine: 0.2, Protective: 0.24, Powder: 0.12 };
const SHIFT_SHARE: Record<string, number> = { A: 0.36, B: 0.34, C: 0.3 };
const scaleOf = (f: Filters) => LINE_SHARE[f.line] * (f.shift === "All shifts" ? 1 : SHIFT_SHARE[f.shift[0]]);
export const DAILY_L = 118000; // plant output, litres per day

/* ---------- time buckets ---------- */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function labels(r: Range): string[] {
  const now = new Date();
  if (r === "24H") return Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
  if (r === "YTD") return MONTHS.slice(0, now.getMonth() + 1);
  const n = r === "7D" ? 7 : 30;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now); d.setDate(now.getDate() - (n - 1 - i));
    return r === "7D" ? d.toLocaleDateString("en-GB", { weekday: "short" }) : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  });
}
export const bucketUnit = (r: Range) => (r === "24H" ? "per hour" : r === "YTD" ? "per month" : "per day");
export const rangeLabel = (r: Range) => ({ "24H": "last 24 hours", "7D": "last 7 days", "30D": "last 30 days", YTD: "year to date" })[r];
const bucketL = (r: Range) => (r === "24H" ? DAILY_L / 24 : r === "YTD" ? DAILY_L * 30 : DAILY_L);
const periodDays = (r: Range) => ({ "24H": 1, "7D": 7, "30D": 30, YTD: new Date().getMonth() * 30 + new Date().getDate() })[r];

function wave(key: string, n: number, base: number, amp: number, drift = 0) {
  const r = rng(key);
  return Array.from({ length: n }, (_, i) => base * (1 + (drift * i) / n) + (r() - 0.5) * 2 * amp * base + Math.sin((i / n) * Math.PI * 3) * amp * base * 0.5);
}
const spark = (key: string, base: number, amp: number, drift = 0) => wave(key, 14, base, amp, drift);

/* ---------- KPIs ---------- */
export interface Kpi {
  id: string; label: string; num: number; dp: number; unit: string;
  delta: number; good?: "up" | "down"; note: string; spark: number[]; color: string; icon: string;
}

export function overviewKpis(f: Filters): Kpi[] {
  const s = scaleOf(f), r = rng(`kpi|${fk(f)}`), k = fk(f);
  const litres = DAILY_L * periodDays(f.range) * s * (0.97 + r() * 0.05);
  const big = litres >= 1e6;
  const downMin = (f.range === "24H" ? 46 : 46 * periodDays(f.range)) * s * (0.8 + r() * 0.4);
  const downH = downMin >= 180;
  return [
    { id: "oee", label: "OEE", num: 81 + r() * 5, dp: 1, unit: "%", delta: 1.4 + r(), note: "target 85%", spark: spark(k + "oee", 82, 0.03, 0.04), color: C.yellow, icon: "gauge" },
    { id: "out", label: "Output", num: big ? litres / 1e6 : litres / 1000, dp: big ? 2 : 1, unit: big ? "M L" : "k L", delta: 2.1 + r() * 2, note: rangeLabel(f.range), spark: spark(k + "out", 100, 0.06, 0.05), color: C.blue, icon: "factory" },
    { id: "fpy", label: "First-pass yield", num: 93.6 + r() * 2.2, dp: 1, unit: "%", delta: 0.6 + r(), note: "right first time", spark: spark(k + "fpy", 94, 0.012, 0.01), color: C.good, icon: "check" },
    { id: "down", label: "Unplanned downtime", num: downH ? downMin / 60 : downMin, dp: downH ? 1 : 0, unit: downH ? "h" : "min", delta: -(3 + r() * 6), good: "down", note: "vs previous period", spark: spark(k + "down", 40, 0.35, -0.2), color: C.warn, icon: "pause" },
    { id: "kwh", label: "Energy", num: 142 + r() * 12, dp: 0, unit: "kWh/kL", delta: -(1 + r() * 2), good: "down", note: "per 1,000 L filled", spark: spark(k + "kwh", 145, 0.04, -0.04), color: C.violet, icon: "zap" },
    { id: "otif", label: "OTIF", num: 95 + r() * 2.6, dp: 1, unit: "%", delta: 0.4 + r() * 0.8, note: "on time, in full", spark: spark(k + "otif", 96, 0.012, 0.01), color: C.teal, icon: "truck" },
  ];
}

export function productionSeries(f: Filters) {
  const L = labels(f.range), s = scaleOf(f), r = rng(`prod|${fk(f)}`);
  return L.map((t, i) => {
    const night = f.range === "24H" && (i < 6 || i >= 22) ? 0.86 : 1;
    const plan = bucketL(f.range) * s * (f.range === "7D" && /Sat|Sun/.test(t) ? 0.6 : 1);
    return { t, plan: Math.round(plan * night), actual: Math.round(plan * night * (0.9 + r() * 0.16)) };
  });
}

export const FAMILIES: { name: Exclude<Line, "All lines">; color: string; share: number }[] = [
  { name: "Decorative", color: C.yellow, share: 0.44 },
  { name: "Protective", color: C.blue, share: 0.24 },
  { name: "Marine", color: C.teal, share: 0.2 },
  { name: "Powder", color: C.violet, share: 0.12 },
];
export function familyMix(f: Filters) {
  const total = DAILY_L * periodDays(f.range) * (f.shift === "All shifts" ? 1 : SHIFT_SHARE[f.shift[0]]);
  return FAMILIES.map((x) => ({ ...x, value: Math.round(total * x.share) }));
}

/* ---------- production lines ---------- */
export interface ProdLine { id: string; family: Exclude<Line, "All lines">; name: string; product: string; speed: number; oee: number; batch: string; tone: Tone; st: string }
const LINE_ROWS: ProdLine[] = [
  { id: "DEC-1", family: "Decorative", name: "Decorative 1 · Water-based", product: "Jotashield Extreme", speed: 62, oee: 86.4, batch: "B-26-4412", tone: "good", st: "Running" },
  { id: "DEC-2", family: "Decorative", name: "Decorative 2 · Water-based", product: "Majestic True Beauty", speed: 58, oee: 83.1, batch: "B-26-4415", tone: "good", st: "Running" },
  { id: "PRO-1", family: "Protective", name: "Protective 1 · Epoxy", product: "Penguard Express", speed: 24, oee: 79.8, batch: "B-26-4409", tone: "warn", st: "Slow" },
  { id: "PRO-2", family: "Protective", name: "Protective 2 · Zinc", product: "Barrier 77", speed: 22, oee: 84.9, batch: "B-26-4417", tone: "good", st: "Running" },
  { id: "MAR-1", family: "Marine", name: "Marine 1 · Antifouling", product: "SeaQuantum X200", speed: 18, oee: 81.2, batch: "B-26-4411", tone: "info", st: "Changeover" },
  { id: "PWD-1", family: "Powder", name: "Powder 1 · Extrusion", product: "Resicoat polyester", speed: 0, oee: 0, batch: "—", tone: "bad", st: "Stopped" },
];
export const prodLines = (f: Filters) => LINE_ROWS.filter((l) => f.line === "All lines" || l.family === f.line);

/* ---------- alerts ---------- */
export type Sev = "Critical" | "Warning" | "Info";
export type Cat = "Production" | "Quality" | "Equipment" | "Utilities" | "Safety" | "Logistics";
export interface Alert { id: string; sev: Sev; cat: Cat; title: string; source: string; time: string; line: Line; fresh?: boolean }
export const CATS: Cat[] = ["Production", "Quality", "Equipment", "Utilities", "Safety", "Logistics"];
export const SEVS: Sev[] = ["Critical", "Warning", "Info"];
export const CAT_COLOR: Record<Cat, string> = { Production: C.yellow, Quality: C.good, Equipment: C.warn, Utilities: C.violet, Safety: C.bad, Logistics: C.blue };
export const SEV_TONE: Record<Sev, Tone> = { Critical: "bad", Warning: "warn", Info: "info" };

type AlertSeed = Omit<Alert, "id" | "time">;
const ALERT_SEEDS: AlertSeed[] = [
  { sev: "Critical", cat: "Production", title: "Powder 1 extruder feeder stopped", source: "PWD-1 · Extruder", line: "Powder" },
  { sev: "Critical", cat: "Quality", title: "Batch B-26-4398 colour ΔE 1.9 · above 1.0 limit", source: "QC lab · Spectro 2", line: "Decorative" },
  { sev: "Warning", cat: "Equipment", title: "Bead mill M-03 outlet temperature 61 °C", source: "PRO-1 · Bead mill M-03", line: "Protective" },
  { sev: "Warning", cat: "Utilities", title: "VOC stack reading 68 mg/Nm³ · 91% of limit", source: "Thermal oxidiser 1", line: "All lines" },
  { sev: "Warning", cat: "Logistics", title: "Truck T-212 waiting 52 min at bay 3", source: "Dispatch · Bay 3", line: "All lines" },
  { sev: "Critical", cat: "Safety", title: "Solvent vapour sensor high · tinting room", source: "Tinting · Gas sensor G-07", line: "Marine" },
  { sev: "Warning", cat: "Production", title: "Changeover on MAR-1 running 18 min over plan", source: "MAR-1 · Changeover", line: "Marine" },
  { sev: "Info", cat: "Equipment", title: "Dissolver D-02 preventive maintenance due Thu", source: "Maintenance · WO-7710", line: "Decorative" },
  { sev: "Warning", cat: "Quality", title: "Viscosity trending high · Majestic base (+4 KU)", source: "DEC-2 · In-line viscometer", line: "Decorative" },
  { sev: "Info", cat: "Utilities", title: "Compressed air pressure dip to 6.4 bar for 40 s", source: "Compressor room · C-2", line: "All lines" },
  { sev: "Warning", cat: "Logistics", title: "TiO₂ pigment cover 4.2 days · below 5 day minimum", source: "Raw materials · Silo S-1", line: "All lines" },
  { sev: "Info", cat: "Production", title: "Batch B-26-4417 released to filling", source: "PRO-2 · Let-down", line: "Protective" },
  { sev: "Critical", cat: "Equipment", title: "Palletiser P-01 robot arm fault E-214", source: "Packing · P-01", line: "Decorative" },
  { sev: "Info", cat: "Safety", title: "Permit-to-work PTW-338 closed · mill cleaning", source: "HSE · Permit desk", line: "Protective" },
];
const EXTRA: AlertSeed[] = [
  { sev: "Warning", cat: "Production", title: "Filling line F-02 reject rate 2.3%", source: "Filling · F-02", line: "Decorative" },
  { sev: "Info", cat: "Logistics", title: "Inbound tanker T-219 checked in at gate", source: "Gate · Weighbridge", line: "All lines" },
  { sev: "Warning", cat: "Quality", title: "Fineness of grind 28 µm on B-26-4421 · target 25", source: "QC lab · Grindometer", line: "Protective" },
  { sev: "Info", cat: "Utilities", title: "Chiller 2 switched to standby", source: "Utilities · Chiller 2", line: "All lines" },
];
const agoText = (m: number) => (m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`);
export function buildAlerts(f: Filters, tick: number): Alert[] {
  const base = ALERT_SEEDS.map((a, i) => ({ ...a, id: `AL-${1100 + i}`, time: agoText(6 + i * 17) }));
  const injected = Array.from({ length: Math.floor(tick / 4) }, (_, k) => {
    const a = EXTRA[k % EXTRA.length];
    return { ...a, id: `AL-${1200 + k}`, time: k === Math.floor(tick / 4) - 1 ? "just now" : agoText(1 + (Math.floor(tick / 4) - 1 - k) * 3), fresh: true };
  }).reverse();
  return [...injected, ...base].filter((a) => f.line === "All lines" || a.line === "All lines" || a.line === f.line);
}

/* ---------- process stages ---------- */
export interface Stage { id: string; n: number; name: string; short: string; img: string; blurb: string; flow: string; unit: string; params: { name: string; target: number; unit: string; dp: number }[] }
export const STAGES: Stage[] = [
  { id: "intake", n: 1, name: "Raw material intake", short: "Intake", img: "raw-intake", blurb: "Resins, solvents, pigments and additives arrive by tanker and truck. Each load is weighed, sampled and released before unloading.", flow: "Receiving rate", unit: "t/h", params: [{ name: "Unloading rate", target: 28, unit: "t/h", dp: 1 }, { name: "Trucks in yard", target: 4, unit: "", dp: 0 }, { name: "Lab release time", target: 35, unit: "min", dp: 0 }] },
  { id: "storage", n: 2, name: "Silos and tank farm", short: "Storage", img: "tank-farm", blurb: "Bulk powders sit in silos and liquid resins and solvents in tanks, with level and temperature monitored around the clock.", flow: "Transfer rate", unit: "t/h", params: [{ name: "Silo S-1 level", target: 70, unit: "%", dp: 0 }, { name: "Tank temperature", target: 24, unit: "°C", dp: 1 }, { name: "Transfer pressure", target: 3.2, unit: "bar", dp: 1 }] },
  { id: "dosing", n: 3, name: "Weighing and dosing", short: "Dosing", img: "dosing", blurb: "Every batch is dosed to its recipe. Load cells and flow meters check each ingredient against tolerance.", flow: "Batches dosed", unit: "per h", params: [{ name: "Dosing accuracy", target: 99.6, unit: "%", dp: 1 }, { name: "Recipe deviation", target: 0.3, unit: "%", dp: 2 }, { name: "Cycle time", target: 14, unit: "min", dp: 0 }] },
  { id: "dispersion", n: 4, name: "Dispersion", short: "Dispersion", img: "dispersion", blurb: "High-speed dissolvers wet out and disperse pigment into the resin to form a mill base.", flow: "Mill base made", unit: "kL/h", params: [{ name: "Dissolver speed", target: 1450, unit: "rpm", dp: 0 }, { name: "Mix temperature", target: 38, unit: "°C", dp: 1 }, { name: "Power draw", target: 62, unit: "kW", dp: 0 }] },
  { id: "milling", n: 5, name: "Milling", short: "Milling", img: "milling", blurb: "Bead mills grind the mill base down to the target fineness. Temperature and pass count decide the grade.", flow: "Mill throughput", unit: "kL/h", params: [{ name: "Fineness of grind", target: 25, unit: "µm", dp: 0 }, { name: "Mill outlet temp", target: 52, unit: "°C", dp: 0 }, { name: "Passes", target: 2, unit: "", dp: 0 }] },
  { id: "tinting", n: 6, name: "Let-down and tinting", short: "Let-down", img: "tinting", blurb: "Resin, solvent and additives are added and the shade is matched against the standard.", flow: "Let-down rate", unit: "kL/h", params: [{ name: "Solids content", target: 58, unit: "%", dp: 1 }, { name: "Viscosity", target: 98, unit: "KU", dp: 0 }, { name: "Shade ΔE", target: 0.6, unit: "", dp: 2 }] },
  { id: "qc", n: 7, name: "QC lab", short: "QC lab", img: "qc-lab", blurb: "Samples are tested for viscosity, density, solids, fineness, colour and gloss. A failed batch is reworked.", flow: "Samples tested", unit: "per h", params: [{ name: "Test turnaround", target: 22, unit: "min", dp: 0 }, { name: "Pass rate", target: 95, unit: "%", dp: 1 }, { name: "Open holds", target: 2, unit: "", dp: 0 }] },
  { id: "filling", n: 8, name: "Filtration and filling", short: "Filling", img: "filling", blurb: "Approved paint is filtered and filled into cans and pails at up to 60 cans per minute per line.", flow: "Line speed", unit: "cans/min", params: [{ name: "Fill accuracy", target: 99.8, unit: "%", dp: 1 }, { name: "Reject rate", target: 0.8, unit: "%", dp: 1 }, { name: "Changeover", target: 28, unit: "min", dp: 0 }] },
  { id: "packing", n: 9, name: "Labelling and packing", short: "Packing", img: "packing", blurb: "Cans are labelled, coded, case-packed and palletised by robots, then wrapped for storage.", flow: "Pallets built", unit: "per h", params: [{ name: "Label accuracy", target: 99.9, unit: "%", dp: 1 }, { name: "Pallet cycle", target: 4.5, unit: "min", dp: 1 }, { name: "Wrap faults", target: 1, unit: "", dp: 0 }] },
  { id: "dispatch", n: 10, name: "Warehouse and dispatch", short: "Dispatch", img: "dispatch", blurb: "Finished pallets are stored, picked against orders and loaded at the bays for delivery.", flow: "Pallets shipped", unit: "per h", params: [{ name: "Dock turnaround", target: 38, unit: "min", dp: 0 }, { name: "Pick accuracy", target: 99.7, unit: "%", dp: 1 }, { name: "Trucks at bays", target: 3, unit: "", dp: 0 }] },
];

export function stageStatus(id: string, f: Filters): { tone: Tone; st: string } {
  const v = rng(`stg|${id}|${f.line}`)();
  if (id === "milling" && (f.line === "All lines" || f.line === "Protective")) return { tone: "warn", st: "Watch" };
  if (id === "packing" && f.line !== "Marine") return { tone: "bad", st: "Fault" };
  return v > 0.93 ? { tone: "info", st: "Idle" } : { tone: "good", st: "Running" };
}

export function stageData(st: Stage, f: Filters) {
  const s = scaleOf(f), key = `${st.id}|${fk(f)}`, r = rng(key);
  const base = ({ intake: 26, storage: 31, dosing: 11, dispersion: 14, milling: 12, tinting: 13, qc: 18, filling: 44, packing: 21, dispatch: 17 } as Record<string, number>)[st.id] * (0.55 + s * 0.45);
  const L = labels(f.range);
  const series = L.map((t, i) => ({ t, v: +(base * (0.9 + r() * 0.2 + Math.sin(i / 2) * 0.03)).toFixed(1), plan: +base.toFixed(1) }));
  const cur = series[series.length - 1].v;
  const util = 70 + r() * 22, wip = Math.round(4 + r() * 14), yld = 97 + r() * 2.6;
  const params = st.params.map((p) => {
    const v = p.target * (1 + (r() - 0.5) * 0.08);
    const dev = Math.abs(v - p.target) / p.target;
    return { ...p, value: v, tone: (dev > 0.035 ? "warn" : "good") as Tone };
  });
  return { series, cur, util, wip, yld, params };
}

/* ---------- quality ---------- */
export type Result = "Pass" | "Rework" | "Hold" | "In QC";
export interface Batch { id: string; product: string; family: Exclude<Line, "All lines">; line: string; stage: string; de: number; visc: number; solids: number; result: Result; time: string }
const PRODUCTS: { p: string; fam: Exclude<Line, "All lines">; line: string }[] = [
  { p: "Jotashield Extreme", fam: "Decorative", line: "DEC-1" }, { p: "Majestic True Beauty", fam: "Decorative", line: "DEC-2" },
  { p: "Fenomastic Pure Colours", fam: "Decorative", line: "DEC-1" }, { p: "Lady Pure Color", fam: "Decorative", line: "DEC-2" },
  { p: "Penguard Express", fam: "Protective", line: "PRO-1" }, { p: "Jotamastic 90", fam: "Protective", line: "PRO-1" },
  { p: "Barrier 77", fam: "Protective", line: "PRO-2" }, { p: "Hardtop XP", fam: "Protective", line: "PRO-2" },
  { p: "SeaQuantum X200", fam: "Marine", line: "MAR-1" }, { p: "SeaForce 90", fam: "Marine", line: "MAR-1" },
  { p: "Resicoat polyester", fam: "Powder", line: "PWD-1" }, { p: "Easycoat", fam: "Powder", line: "PWD-1" },
];
const STAGE_NAMES = ["Dispersion", "Milling", "Let-down", "QC lab", "Filling", "Released"];
export function batches(f: Filters): Batch[] {
  const r = rng(`batch|${fk(f)}`);
  const all = Array.from({ length: 30 }, (_, i) => {
    const p = PRODUCTS[Math.floor(r() * PRODUCTS.length)];
    const x = r();
    const result: Result = x < 0.72 ? "Pass" : x < 0.84 ? "Rework" : x < 0.92 ? "Hold" : "In QC";
    const de = result === "Rework" ? 0.9 + r() * 1.1 : 0.2 + r() * 0.6;
    return {
      id: `B-26-${4430 - i}`, product: p.p, family: p.fam, line: p.line,
      stage: result === "In QC" ? "QC lab" : STAGE_NAMES[Math.floor(r() * STAGE_NAMES.length)],
      de: +de.toFixed(2), visc: Math.round(92 + r() * 14), solids: +(52 + r() * 12).toFixed(1), result,
      time: `${String(Math.floor(r() * 24)).padStart(2, "0")}:${String(Math.floor(r() * 60)).padStart(2, "0")}`,
    };
  });
  return all.filter((b) => f.line === "All lines" || b.family === f.line);
}

export function qualityData(f: Filters) {
  const r = rng(`q|${fk(f)}`), L = labels(f.range), k = fk(f);
  const kpis: Kpi[] = [
    { id: "fpy", label: "First-pass yield", num: 93.8 + r() * 2, dp: 1, unit: "%", delta: 0.7 + r(), note: "target 95%", spark: spark(k + "f", 94, 0.012, 0.01), color: C.good, icon: "check" },
    { id: "pass", label: "QC pass rate", num: 96.4 + r() * 1.6, dp: 1, unit: "%", delta: 0.3 + r() * 0.5, note: "all tests", spark: spark(k + "p", 96.8, 0.008, 0.005), color: C.teal, icon: "flask" },
    { id: "rew", label: "Rework", num: 4.2 + r() * 1.4, dp: 1, unit: "%", delta: -(0.2 + r() * 0.6), good: "down", note: "of batches", spark: spark(k + "r", 5, 0.2, -0.12), color: C.warn, icon: "recycle" },
    { id: "de", label: "Avg colour ΔE", num: 0.42 + r() * 0.15, dp: 2, unit: "", delta: -(1 + r() * 3), good: "down", note: "limit 1.00", spark: spark(k + "d", 0.45, 0.12, -0.05), color: C.yellow, icon: "palette" },
    { id: "cmp", label: "Complaints", num: Math.round((f.range === "24H" ? 0 : periodDays(f.range) * 0.18) * scaleOf(f) + r() * 2), dp: 0, unit: "", delta: -(2 + r() * 5), good: "down", note: rangeLabel(f.range), spark: spark(k + "c", 3, 0.5, -0.3), color: C.bad, icon: "flag" },
  ];
  const fpy = L.map((t) => ({ t, fpy: +(93.4 + r() * 3.4).toFixed(1), target: 95 }));
  const pareto = [
    { cause: "Viscosity out of range", n: 34 }, { cause: "Colour ΔE high", n: 26 }, { cause: "Fineness of grind", n: 18 },
    { cause: "Solids content", n: 11 }, { cause: "Gloss / sheen", n: 7 }, { cause: "Contamination", n: 4 },
  ].map((x) => ({ ...x, n: Math.round(x.n * (0.7 + r() * 0.6) * (0.4 + scaleOf(f) * 0.6)) }));
  const gauges = [
    { name: "Viscosity", pct: 96.1 + r() * 2.5 }, { name: "Density", pct: 98.4 + r() * 1.4 }, { name: "Solids content", pct: 97.3 + r() * 2 },
    { name: "Fineness of grind", pct: 94.2 + r() * 3 }, { name: "Colour ΔE", pct: 93.1 + r() * 4 }, { name: "Gloss", pct: 97.8 + r() * 1.8 },
  ];
  return { kpis, fpy, pareto, gauges };
}

/* ---------- equipment ---------- */
export type AssetStatus = "Running" | "Idle" | "Maintenance" | "Fault";
export interface Asset { id: string; name: string; kind: string; family: Exclude<Line, "All lines">; health: number; oee: number; status: AssetStatus; service: string }
const ASSET_SEEDS: { id: string; name: string; kind: string; family: Exclude<Line, "All lines"> }[] = [
  { id: "D-01", name: "Dissolver D-01", kind: "Dispersion", family: "Decorative" }, { id: "D-02", name: "Dissolver D-02", kind: "Dispersion", family: "Decorative" },
  { id: "D-03", name: "Dissolver D-03", kind: "Dispersion", family: "Protective" }, { id: "M-01", name: "Bead mill M-01", kind: "Milling", family: "Decorative" },
  { id: "M-02", name: "Bead mill M-02", kind: "Milling", family: "Decorative" }, { id: "M-03", name: "Bead mill M-03", kind: "Milling", family: "Protective" },
  { id: "M-04", name: "Bead mill M-04", kind: "Milling", family: "Marine" }, { id: "T-01", name: "Tinting tank T-01", kind: "Let-down", family: "Decorative" },
  { id: "T-02", name: "Tinting tank T-02", kind: "Let-down", family: "Marine" }, { id: "F-01", name: "Filling line F-01", kind: "Filling", family: "Decorative" },
  { id: "F-02", name: "Filling line F-02", kind: "Filling", family: "Decorative" }, { id: "F-03", name: "Filling line F-03", kind: "Filling", family: "Protective" },
  { id: "F-04", name: "Filling line F-04", kind: "Filling", family: "Marine" }, { id: "P-01", name: "Palletiser P-01", kind: "Packing", family: "Decorative" },
  { id: "P-02", name: "Palletiser P-02", kind: "Packing", family: "Protective" }, { id: "E-01", name: "Powder extruder E-01", kind: "Extrusion", family: "Powder" },
];
export function assets(f: Filters): Asset[] {
  return ASSET_SEEDS.filter((a) => f.line === "All lines" || a.family === f.line).map((a) => {
    const r = rng(`asset|${a.id}|${f.shift}`);
    let status: AssetStatus = r() > 0.88 ? "Idle" : "Running";
    if (a.id === "P-01" || a.id === "E-01") status = "Fault";
    if (a.id === "D-02") status = "Maintenance";
    const down = status === "Fault" || status === "Maintenance";
    return { ...a, health: Math.round(down ? 48 + r() * 14 : a.id === "M-03" ? 66 : 78 + r() * 20), oee: down ? 0 : +(76 + r() * 14).toFixed(1), status, service: `${Math.floor(3 + r() * 40)} d ago` };
  });
}
export const ASSET_TONE: Record<AssetStatus, Tone> = { Running: "good", Idle: "info", Maintenance: "warn", Fault: "bad" };

export function equipmentData(f: Filters) {
  const r = rng(`eq|${fk(f)}`), s = scaleOf(f), k = fk(f);
  const kpis: Kpi[] = [
    { id: "av", label: "Availability", num: 91.5 + r() * 3, dp: 1, unit: "%", delta: 0.8 + r(), note: "all assets", spark: spark(k + "a", 92, 0.015, 0.01), color: C.good, icon: "check" },
    { id: "mtbf", label: "MTBF", num: 212 + r() * 40, dp: 0, unit: "h", delta: 3 + r() * 4, note: "mean time between failures", spark: spark(k + "m", 220, 0.06, 0.05), color: C.blue, icon: "clock" },
    { id: "mttr", label: "MTTR", num: 38 + r() * 12, dp: 0, unit: "min", delta: -(2 + r() * 5), good: "down", note: "mean time to repair", spark: spark(k + "t", 42, 0.1, -0.1), color: C.yellow, icon: "wrench" },
    { id: "unpl", label: "Unplanned share", num: 22 + r() * 8, dp: 0, unit: "%", delta: -(1 + r() * 3), good: "down", note: "of maintenance hours", spark: spark(k + "u", 26, 0.12, -0.1), color: C.warn, icon: "pause" },
    { id: "wo", label: "Open work orders", num: Math.round(9 + s * 12 + r() * 4), dp: 0, unit: "", delta: -(1 + r() * 4), good: "down", note: "3 overdue", spark: spark(k + "w", 16, 0.15, -0.1), color: C.violet, icon: "list" },
  ];
  const causes = [
    { cause: "Changeover", min: 410 }, { cause: "Material wait", min: 290 }, { cause: "Mechanical", min: 240 },
    { cause: "Cleaning", min: 190 }, { cause: "Quality hold", min: 140 }, { cause: "Planned maint.", min: 120 }, { cause: "Utilities", min: 60 },
  ].map((x) => ({ ...x, min: Math.round(x.min * (0.8 + r() * 0.4) * s * (f.range === "24H" ? 1 : f.range === "7D" ? 7 : f.range === "30D" ? 30 : 270) / 4) }));
  return { kpis, causes };
}

/* ---------- utilities ---------- */
export const UTIL_TABS = ["Power", "Water", "Air & steam", "Emissions"] as const;
export type UtilTab = (typeof UTIL_TABS)[number];
export interface Trend { title: string; sub: string; unit: string; color: string; limit?: number; data: { t: string; v: number }[] }
export function utilityData(tab: UtilTab, f: Filters): { kpis: Kpi[]; a: Trend; b: Trend } {
  const L = labels(f.range), s = scaleOf(f), r = rng(`u|${tab}|${fk(f)}`), k = `${tab}${fk(f)}`;
  const series = (base: number, amp: number) => L.map((t) => ({ t, v: +(base * (1 + (r() - 0.5) * 2 * amp)).toFixed(1) }));
  if (tab === "Power") return {
    kpis: [
      { id: "kw", label: "Plant load", num: 2380 * (0.4 + s * 0.6), dp: 0, unit: "kW", delta: 1.2, note: "demand limit 3,200 kW", spark: spark(k + "1", 2300, 0.05), color: C.violet, icon: "zap" },
      { id: "kwh", label: "Energy intensity", num: 142 + r() * 10, dp: 0, unit: "kWh/kL", delta: -1.8, good: "down", note: "per 1,000 L filled", spark: spark(k + "2", 145, 0.04, -0.04), color: C.yellow, icon: "gauge" },
      { id: "pf", label: "Power factor", num: 0.94 + r() * 0.03, dp: 2, unit: "", delta: 0.6, note: "target 0.95", spark: spark(k + "3", 0.95, 0.015), color: C.teal, icon: "activity" },
      { id: "cost", label: "Energy cost", num: 38 + r() * 6, dp: 1, unit: "k EGP/day", delta: -2.1, good: "down", note: "simulated tariff", spark: spark(k + "4", 40, 0.06, -0.05), color: C.warn, icon: "coins" },
    ],
    a: { title: "Plant load", sub: "kW vs contracted demand limit", unit: " kW", color: C.violet, limit: 3200, data: series(2380 * (0.4 + s * 0.6), 0.1) },
    b: { title: "Energy intensity", sub: "kWh per 1,000 litres filled", unit: " kWh", color: C.yellow, data: series(145, 0.07) },
  };
  if (tab === "Water") return {
    kpis: [
      { id: "m3", label: "Water use", num: 96 * (0.4 + s * 0.6), dp: 0, unit: "m³/day", delta: -1.4, good: "down", note: "process + cleaning", spark: spark(k + "1", 96, 0.06), color: C.blue, icon: "droplets" },
      { id: "lpl", label: "Water intensity", num: 0.62 + r() * 0.05, dp: 2, unit: "L/L", delta: -2.2, good: "down", note: "per litre of paint", spark: spark(k + "2", 0.63, 0.05, -0.05), color: C.teal, icon: "gauge" },
      { id: "rec", label: "Recycled", num: 41 + r() * 5, dp: 0, unit: "%", delta: 3.1, note: "wash water reuse", spark: spark(k + "3", 42, 0.05, 0.06), color: C.good, icon: "recycle" },
      { id: "ww", label: "Wastewater", num: 24 * (0.4 + s * 0.6), dp: 0, unit: "m³/day", delta: -3.4, good: "down", note: "to treatment", spark: spark(k + "4", 24, 0.08, -0.05), color: C.warn, icon: "droplets" },
    ],
    a: { title: "Water use", sub: "m³ per bucket", unit: " m³", color: C.blue, data: series(96 * (0.4 + s * 0.6) / (f.range === "24H" ? 24 : 1), 0.1) },
    b: { title: "Recycled share", sub: "% of wash water reused", unit: " %", color: C.good, data: series(42, 0.1) },
  };
  if (tab === "Air & steam") return {
    kpis: [
      { id: "bar", label: "Compressed air", num: 6.9 + r() * 0.2, dp: 1, unit: "bar", delta: -0.4, note: "setpoint 7.0 bar", spark: spark(k + "1", 6.9, 0.02), color: C.blue, icon: "gauge" },
      { id: "st", label: "Steam", num: 3.4 * (0.4 + s * 0.6), dp: 1, unit: "t/h", delta: 1.1, note: "boiler 1 online", spark: spark(k + "2", 3.4, 0.05), color: C.violet, icon: "thermo" },
      { id: "cmp", label: "Compressor load", num: 68 + r() * 8, dp: 0, unit: "%", delta: 2.2, note: "2 of 3 running", spark: spark(k + "3", 70, 0.05), color: C.yellow, icon: "activity" },
      { id: "leak", label: "Air leakage", num: 14 + r() * 3, dp: 0, unit: "%", delta: -1.5, good: "down", note: "survey estimate", spark: spark(k + "4", 15, 0.08, -0.05), color: C.warn, icon: "flag" },
    ],
    a: { title: "Compressed air pressure", sub: "bar at header", unit: " bar", color: C.blue, limit: 7.5, data: series(6.9, 0.03) },
    b: { title: "Steam flow", sub: "tonnes per hour", unit: " t/h", color: C.violet, data: series(3.4 * (0.4 + s * 0.6), 0.1) },
  };
  return {
    kpis: [
      { id: "voc", label: "VOC at stack", num: 61 + r() * 8, dp: 0, unit: "mg/Nm³", delta: -2.3, good: "down", note: "limit 75 mg/Nm³", spark: spark(k + "1", 62, 0.08, -0.04), color: C.warn, icon: "thermo" },
      { id: "sol", label: "Solvent use", num: 7.4 * (0.4 + s * 0.6), dp: 1, unit: "t/day", delta: -1.7, good: "down", note: "of total input", spark: spark(k + "2", 7.4, 0.06, -0.05), color: C.violet, icon: "flask" },
      { id: "wst", label: "Waste to landfill", num: 2.1 + r() * 0.5, dp: 1, unit: "%", delta: -4.2, good: "down", note: "of material input", spark: spark(k + "3", 2.2, 0.1, -0.1), color: C.good, icon: "recycle" },
      { id: "co2", label: "CO₂e intensity", num: 118 + r() * 8, dp: 0, unit: "kg/kL", delta: -2.0, good: "down", note: "scope 1 + 2", spark: spark(k + "4", 120, 0.04, -0.04), color: C.teal, icon: "globe" },
    ],
    a: { title: "VOC at stack", sub: "mg/Nm³ vs permit limit", unit: " mg", color: C.warn, limit: 75, data: series(62, 0.1) },
    b: { title: "Solvent consumption", sub: "tonnes per bucket", unit: " t", color: C.violet, data: series(7.4 * (0.4 + s * 0.6) / (f.range === "24H" ? 24 : 1), 0.12) },
  };
}

/* ---------- inventory and logistics ---------- */
export const MATERIALS = [
  { name: "TiO₂ pigment", id: "S-1", level: 38, cap: 120, cover: 4.2, kind: "Silo" },
  { name: "Extender (CaCO₃)", id: "S-2", level: 72, cap: 200, cover: 12.5, kind: "Silo" },
  { name: "Acrylic resin", id: "TK-1", level: 64, cap: 90, cover: 8.1, kind: "Tank" },
  { name: "Alkyd resin", id: "TK-2", level: 55, cap: 70, cover: 7.2, kind: "Tank" },
  { name: "Epoxy resin", id: "TK-3", level: 47, cap: 60, cover: 6.0, kind: "Tank" },
  { name: "Xylene solvent", id: "TK-4", level: 81, cap: 80, cover: 11.4, kind: "Tank" },
  { name: "Additives drum store", id: "DS-1", level: 69, cap: 40, cover: 14.0, kind: "Store" },
];
export function logisticsData(f: Filters) {
  const r = rng(`log|${fk(f)}`), L = labels(f.range), k = fk(f);
  const kpis: Kpi[] = [
    { id: "otif", label: "OTIF", num: 95 + r() * 2.6, dp: 1, unit: "%", delta: 0.5 + r(), note: "on time, in full", spark: spark(k + "o", 96, 0.012, 0.01), color: C.teal, icon: "truck" },
    { id: "back", label: "Order backlog", num: Math.round(38 + r() * 20), dp: 0, unit: "orders", delta: -(2 + r() * 6), good: "down", note: "open, due ≤ 3 days", spark: spark(k + "b", 45, 0.15, -0.1), color: C.yellow, icon: "list" },
    { id: "bay", label: "Trucks at bays", num: 3 + Math.round(r() * 3), dp: 0, unit: "", delta: 0, note: "of 8 bays", spark: spark(k + "t", 4, 0.3), color: C.blue, icon: "truck" },
    { id: "dock", label: "Dock turnaround", num: 36 + r() * 10, dp: 0, unit: "min", delta: -(1 + r() * 4), good: "down", note: "gate in → gate out", spark: spark(k + "d", 40, 0.1, -0.08), color: C.warn, icon: "clock" },
    { id: "wh", label: "Warehouse fill", num: 74 + r() * 8, dp: 0, unit: "%", delta: 1.1, note: "finished goods", spark: spark(k + "w", 76, 0.04), color: C.violet, icon: "box" },
  ];
  const otif = L.map((t) => ({ t, otif: +(93.4 + r() * 4.8).toFixed(1), target: 95 }));
  const zones = [
    { name: "Decorative", value: 46, color: C.yellow }, { name: "Protective", value: 24, color: C.blue },
    { name: "Marine", value: 18, color: C.teal }, { name: "Powder", value: 12, color: C.violet },
  ];
  const trucks = [
    { id: "T-212", carrier: "Delta Haulage", dir: "Outbound", bay: "3", eta: "Waiting 52 min", status: "Delayed", tone: "bad" as Tone, load: "Decorative · 24 pallets" },
    { id: "T-214", carrier: "Nile Logistics", dir: "Outbound", bay: "1", eta: "Loading", status: "Loading", tone: "info" as Tone, load: "Protective · 18 pallets" },
    { id: "T-216", carrier: "Cairo Freight", dir: "Inbound", bay: "6", eta: "Unloading", status: "Unloading", tone: "info" as Tone, load: "Acrylic resin · 22 t" },
    { id: "T-217", carrier: "Port Tankers", dir: "Inbound", bay: "7", eta: "In 15 min", status: "On time", tone: "good" as Tone, load: "Xylene · 20 t" },
    { id: "T-219", carrier: "Port Tankers", dir: "Inbound", bay: "—", eta: "At gate", status: "Checked in", tone: "good" as Tone, load: "Epoxy resin · 18 t" },
    { id: "T-220", carrier: "Delta Haulage", dir: "Outbound", bay: "2", eta: "In 25 min", status: "On time", tone: "good" as Tone, load: "Marine · 12 pallets" },
    { id: "T-221", carrier: "Red Sea Cargo", dir: "Inbound", bay: "5", eta: "In 40 min", status: "On time", tone: "good" as Tone, load: "TiO₂ bags · 16 t" },
    { id: "T-223", carrier: "Nile Logistics", dir: "Outbound", bay: "4", eta: "In 1 h 10", status: "Scheduled", tone: "mute" as Tone, load: "Powder · 20 pallets" },
  ];
  return { kpis, otif, zones, trucks };
}

/* ---------- maintenance ---------- */
export type WoStatus = "Open" | "In progress" | "Scheduled" | "Overdue";
export type Priority = "High" | "Medium" | "Low";
export interface WorkOrder { id: string; asset: string; family: Exclude<Line, "All lines">; type: "Planned" | "Unplanned"; priority: Priority; crew: string; due: string; status: WoStatus }
const WORK_ORDERS: WorkOrder[] = [
  { id: "WO-7710", asset: "Dissolver D-02", family: "Decorative", type: "Planned", priority: "Medium", crew: "Mechanical A", due: "Thu", status: "Scheduled" },
  { id: "WO-7704", asset: "Palletiser P-01", family: "Decorative", type: "Unplanned", priority: "High", crew: "Electrical", due: "Today", status: "In progress" },
  { id: "WO-7701", asset: "Bead mill M-03", family: "Protective", type: "Unplanned", priority: "High", crew: "Mechanical B", due: "Today", status: "Open" },
  { id: "WO-7698", asset: "Powder extruder E-01", family: "Powder", type: "Unplanned", priority: "High", crew: "Mechanical A", due: "Today", status: "In progress" },
  { id: "WO-7690", asset: "Filling line F-02", family: "Decorative", type: "Planned", priority: "Medium", crew: "Instrumentation", due: "Fri", status: "Scheduled" },
  { id: "WO-7686", asset: "Tinting tank T-02", family: "Marine", type: "Planned", priority: "Low", crew: "Mechanical B", due: "Sat", status: "Scheduled" },
  { id: "WO-7679", asset: "Bead mill M-01", family: "Decorative", type: "Planned", priority: "Medium", crew: "Mechanical A", due: "Mon", status: "Scheduled" },
  { id: "WO-7672", asset: "Filling line F-04", family: "Marine", type: "Unplanned", priority: "High", crew: "Electrical", due: "Yesterday", status: "Overdue" },
  { id: "WO-7668", asset: "Air compressor C-2", family: "Decorative", type: "Planned", priority: "Medium", crew: "Utilities", due: "Tue", status: "Scheduled" },
  { id: "WO-7661", asset: "Dissolver D-03", family: "Protective", type: "Planned", priority: "Low", crew: "Mechanical B", due: "Wed", status: "Scheduled" },
  { id: "WO-7655", asset: "Palletiser P-02", family: "Protective", type: "Planned", priority: "Low", crew: "Electrical", due: "Next week", status: "Scheduled" },
  { id: "WO-7648", asset: "Tinting tank T-01", family: "Decorative", type: "Unplanned", priority: "Medium", crew: "Instrumentation", due: "2 days ago", status: "Overdue" },
];
export const PRIORITY_TONE: Record<Priority, Tone> = { High: "bad", Medium: "warn", Low: "info" };
export const WO_TONE: Record<WoStatus, Tone> = { Open: "bad", "In progress": "warn", Scheduled: "info", Overdue: "bad" };

const PARTS = [
  { part: "Bead mill seal kit", asset: "Bead mills", stock: 2, min: 4 },
  { part: "Dissolver gearbox oil, 20 L", asset: "Dissolvers", stock: 9, min: 6 },
  { part: "Filling nozzle O-rings", asset: "Filling lines", stock: 14, min: 20 },
  { part: "Palletiser robot encoder", asset: "Palletisers", stock: 0, min: 1 },
  { part: "Extruder feeder screw", asset: "Powder extruder", stock: 1, min: 1 },
  { part: "Dust filter cartridges", asset: "Dust collection", stock: 6, min: 8 },
  { part: "Transfer pump diaphragms", asset: "Pumps", stock: 10, min: 6 },
  { part: "Pressure transmitters", asset: "Instrumentation", stock: 3, min: 2 },
];

export function maintenanceData(f: Filters) {
  const r = rng(`mt|${fk(f)}`), s = scaleOf(f);
  const workOrders = WORK_ORDERS.filter((w) => f.line === "All lines" || w.family === f.line);
  const buckets = f.range === "24H" ? ["00–04", "04–08", "08–12", "12–16", "16–20", "20–24"] : labels(f.range);
  const per = f.range === "24H" ? 1 : f.range === "YTD" ? 20 : 1;
  const hours = buckets.map((t) => ({
    t,
    planned: +((f.range === "24H" ? 3 : 14) * per * s * (0.7 + r() * 0.6)).toFixed(1),
    unplanned: +((f.range === "24H" ? 1.2 : 5) * per * s * (0.5 + r())).toFixed(1),
  }));
  const predicted = assets(f)
    .filter((a) => a.status !== "Fault" && a.status !== "Maintenance")
    .map((a) => {
      const days = Math.max(2, Math.round((a.health - 40) * 1.4 + r() * 4));
      const risk: Priority = days <= 10 ? "High" : days <= 30 ? "Medium" : "Low";
      return { id: a.id, name: a.name, kind: a.kind, health: a.health, days, risk };
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);
  const parts = PARTS.map((p) => ({ ...p, tone: (p.stock === 0 ? "bad" : p.stock < p.min ? "warn" : "good") as Tone, label: p.stock === 0 ? "Out of stock" : p.stock < p.min ? "Low" : "OK" }));
  return { workOrders, hours, predicted, parts };
}

export function maintenanceKpis(f: Filters, open: number, overdue: number): Kpi[] {
  const r = rng(`mk|${fk(f)}`), k = `mk${fk(f)}`, s = scaleOf(f);
  return [
    { id: "open", label: "Open work orders", num: open, dp: 0, unit: "", delta: -(1 + r() * 4), good: "down", note: "not yet done", spark: spark(k + "o", 12, 0.2, -0.1), color: C.blue, icon: "list" },
    { id: "over", label: "Overdue", num: overdue, dp: 0, unit: "", delta: -(2 + r() * 5), good: "down", note: "past due date", spark: spark(k + "v", 3, 0.4, -0.2), color: C.bad, icon: "flag" },
    { id: "pm", label: "PM compliance", num: 90 + r() * 6, dp: 1, unit: "%", delta: 0.8 + r(), note: "target 95%", spark: spark(k + "p", 92, 0.02, 0.02), color: C.good, icon: "check" },
    { id: "plan", label: "Planned work", num: 71 + r() * 6, dp: 0, unit: "%", delta: 1.5 + r() * 2, note: "of maintenance hours", spark: spark(k + "l", 72, 0.05, 0.05), color: C.yellow, icon: "wrench" },
    { id: "mttr", label: "MTTR", num: 38 + r() * 12, dp: 0, unit: "min", delta: -(2 + r() * 5), good: "down", note: "mean time to repair", spark: spark(k + "t", 42, 0.1, -0.1), color: C.violet, icon: "clock" },
    { id: "cost", label: "Maintenance cost", num: (f.range === "24H" ? 6 : f.range === "7D" ? 41 : f.range === "30D" ? 170 : 1500) * (0.4 + s * 0.6) * (0.9 + r() * 0.2), dp: 0, unit: "k EGP", delta: -(1 + r() * 3), good: "down", note: "simulated spend", spark: spark(k + "c", 40, 0.1, -0.05), color: C.warn, icon: "coins" },
  ];
}
