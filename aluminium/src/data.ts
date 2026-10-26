// Dummy data for the Misr Aluminium dashboard. Everything is deterministic:
// the same filters always give the same numbers, and every tab has its own data.

export type Range = "24H" | "7D" | "30D" | "YTD";
export type Area = "All plant" | "Potline 1" | "Potline 2" | "Potline 3";
export interface Filters { range: Range; area: Area }

export const RANGES: Range[] = ["24H", "7D", "30D", "YTD"];
export const AREAS: Area[] = ["All plant", "Potline 1", "Potline 2", "Potline 3"];

export const C = {
  molten: "#ff7a1a", ember: "#ffb454", blue: "#3f8cff", teal: "#2dd4bf",
  good: "#34d399", warn: "#fbbf24", bad: "#f4506e", slate: "#64748b", violet: "#a78bfa",
};

/* ---------- helpers ---------- */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const seedOf = (f: Filters, salt: string) => hash(`${f.range}|${f.area}|${salt}`);

function series(seed: number, n: number, base: number, amp: number, drift = 0) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) =>
    base * (1 + drift * (i / Math.max(n - 1, 1))) + (r() - 0.5) * 2 * amp * base);
}

const AREA_SHARE: Record<Area, number> = { "All plant": 1, "Potline 1": 0.35, "Potline 2": 0.34, "Potline 3": 0.31 };
const COUNT: Record<Range, number> = { "24H": 24, "7D": 7, "30D": 30, YTD: 10 };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];

export function labels(range: Range): string[] {
  const n = COUNT[range];
  if (range === "24H") return Array.from({ length: n }, (_, i) => `${String(i).padStart(2, "0")}:00`);
  if (range === "7D") return DAYS;
  if (range === "30D") return Array.from({ length: n }, (_, i) => `${i + 1}`);
  return MONTHS;
}
/** multiplier that turns a per-day quantity into a per-bucket quantity */
const BUCKET: Record<Range, number> = { "24H": 1 / 24, "7D": 1, "30D": 1, YTD: 30 };
export const bucketUnit = (r: Range) => ({ "24H": "per hour", "7D": "per day", "30D": "per day", YTD: "per month" }[r]);
export const rangeLabel = (r: Range) => ({ "24H": "Last 24 hours", "7D": "Last 7 days", "30D": "Last 30 days", YTD: "Year to date" }[r]);

export const fmt = (n: number, d = 0) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export type Tone = "good" | "warn" | "bad" | "info" | "mute";

export interface Kpi {
  label: string; value: string; unit: string; delta: number; good?: "up" | "down";
  spark: number[]; color: string; icon: string; note: string;
}
function kpi(f: Filters, salt: string, label: string, base: number, unit: string, d: number,
  icon: string, color: string, note: string, good: "up" | "down" = "up", scaled = true): Kpi {
  const r = rng(seedOf(f, salt));
  const v = base * (scaled ? AREA_SHARE[f.area] : 1) * (0.97 + r() * 0.06);
  const delta = (r() - 0.42) * 7;
  return { label, value: fmt(v, d), unit, delta, good, spark: series(seedOf(f, salt + "s"), 14, 1, 0.12, 0.06), color, icon, note };
}

/* ---------- Overview ---------- */
export function overview(f: Filters) {
  const n = COUNT[f.range], lab = labels(f.range), k = AREA_SHARE[f.area] * BUCKET[f.range];
  const actual = series(seedOf(f, "ov-a"), n, 880 * k, 0.05, 0.02);
  const target = Array(n).fill(880 * k);
  const production = lab.map((l, i) => ({ t: l, actual: +actual[i].toFixed(1), target: +target[i].toFixed(1) }));
  const potlines = [
    { name: "Potline 1", value: 312, color: C.molten },
    { name: "Potline 2", value: 298, color: C.blue },
    { name: "Potline 3", value: 270, color: C.teal },
  ];
  const kpis: Kpi[] = [
    kpi(f, "k1", "Metal output", 880, "t/day", 0, "factory", C.molten, "Target 900 t/day"),
    kpi(f, "k2", "Pots online", 358, "of 360", 0, "zap", C.blue, "2 pots in restart"),
    kpi(f, "k3", "Current efficiency", 93.4, "%", 1, "gauge", C.teal, "Target 93.0 %", "up", false),
    kpi(f, "k4", "Specific energy", 13.4, "kWh/kg", 2, "bolt", C.ember, "Lower is better", "down", false),
    kpi(f, "k5", "Power draw", 468, "MW", 0, "plug", C.violet, "Peak 491 MW"),
    kpi(f, "k6", "Water intake", 930, "m³/h", 0, "droplets", C.blue, "78 % recycled", "down"),
  ];
  const pots = { "All plant": [358, 360], "Potline 1": [120, 120], "Potline 2": [118, 120], "Potline 3": [119, 120] }[f.area];
  kpis[1].value = String(pots[0]); kpis[1].unit = `of ${pots[1]}`;
  return { production, potlines, kpis };
}

/* ---------- Process ---------- */
export interface Stage {
  id: string; name: string; short: string; throughput: string; unit: string; tone: Tone; status: string;
  kpis: { label: string; value: string; unit: string }[];
  unitName: string; base: number; blurb: string;
}
export const STAGES: Stage[] = [
  { id: "mill", name: "Alumina Milling", short: "Alumina preparation", throughput: "1,720", unit: "t/day", tone: "good", status: "Running", unitName: "t/h", base: 71.7,
    blurb: "Ball mills grind and condition alumina before it is conveyed to the potline dry-scrubbing system.",
    kpis: [{ label: "Mill load", value: "78", unit: "%" }, { label: "Fineness −45 µm", value: "94.2", unit: "%" }, { label: "Motor current", value: "412", unit: "A" }, { label: "Moisture", value: "0.31", unit: "%" }] },
  { id: "carbon", name: "Carbon Plant", short: "Anode baking", throughput: "486", unit: "anodes/day", tone: "good", status: "Running", unitName: "anodes/h", base: 20.2,
    blurb: "Green anodes are formed, baked in ring furnaces and rodded before they are set in the pots.",
    kpis: [{ label: "Baking temp", value: "1,142", unit: "°C" }, { label: "Anode density", value: "1.58", unit: "g/cm³" }, { label: "Green scrap", value: "1.8", unit: "%" }, { label: "Fire cycle", value: "28", unit: "h" }] },
  { id: "pot", name: "Electrolysis Potlines", short: "Hall-Héroult cells", throughput: "880", unit: "t/day", tone: "warn", status: "1 alert", unitName: "t/h", base: 36.7,
    blurb: "Alumina dissolved in molten cryolite is reduced at ~960 °C in 360 reduction pots across three potlines.",
    kpis: [{ label: "Line current", value: "186", unit: "kA" }, { label: "Bath temp", value: "961", unit: "°C" }, { label: "Cell voltage", value: "4.12", unit: "V" }, { label: "Anode effects", value: "0.07", unit: "/pot/day" }] },
  { id: "cast", name: "Casthouse", short: "Casting & alloying", throughput: "868", unit: "t/day", tone: "good", status: "Running", unitName: "t/h", base: 36.2,
    blurb: "Molten metal is transferred, held, alloyed and cast into ingots, T-bars, sows and billets.",
    kpis: [{ label: "Holding temp", value: "742", unit: "°C" }, { label: "Cast speed", value: "9.6", unit: "cm/min" }, { label: "Dross rate", value: "1.2", unit: "%" }, { label: "Furnaces hot", value: "5", unit: "of 6" }] },
  { id: "dispatch", name: "Product Dispatch", short: "Storage & loading", throughput: "840", unit: "t/day", tone: "info", status: "Loading", unitName: "t/h", base: 35,
    blurb: "Finished metal is stacked, weighed, bundled and loaded onto trucks and rail wagons for dispatch.",
    kpis: [{ label: "Bundles ready", value: "1,214", unit: "pcs" }, { label: "Trucks today", value: "38", unit: "" }, { label: "Dock wait", value: "22", unit: "min" }, { label: "Yard stock", value: "6,420", unit: "t" }] },
];

export interface MillStep {
  id: string; name: string; desc: string; img: string; pos: string; base: number;
  kpis: { label: string; value: string; unit: string }[]; equipment: string[];
}
/** The six photographed steps of the alumina milling line (Production Process > Alumina Milling) */
export const MILL_STEPS: MillStep[] = [
  { id: "ball", name: "Ball milling", img: "/milling/step-1.jpg", pos: "6% 50%", base: 71.7,
    desc: "Ball mills grind and condition alumina before it is conveyed to the potline dry-scrubbing system.",
    kpis: [{ label: "Mill load", value: "78", unit: "%" }, { label: "Fineness −45 µm", value: "94.2", unit: "%" }, { label: "Motor current", value: "412", unit: "A" }, { label: "Moisture", value: "0.31", unit: "%" }],
    equipment: ["Ball mill M-01", "Ball mill M-02", "Main gearbox GB-1", "Lube unit LU-1", "Mill drive motor MD-1", "Girth gear guard"] },
  { id: "convey", name: "Alumina conveying", img: "/milling/step-2.jpg", pos: "60% 55%", base: 68.4,
    desc: "Milled alumina rides inclined belt conveyors up to the transfer tower and on to the next process area.",
    kpis: [{ label: "Belt load", value: "86", unit: "%" }, { label: "Belt speed", value: "2.4", unit: "m/s" }, { label: "Conveyed today", value: "1,640", unit: "t" }, { label: "Belt scale error", value: "0.4", unit: "%" }],
    equipment: ["Belt conveyor BC-12", "Belt conveyor BC-13", "Bucket elevator BE-3", "Belt scale BS-2", "Tail pulley TP-4", "Pull-cord switch loop"] },
  { id: "classify", name: "Processing equipment", img: "/milling/step-3.jpg", pos: "45% 50%", base: 64.9,
    desc: "Cyclones, classifiers and ducting separate fines from oversize and return coarse material to the mill.",
    kpis: [{ label: "Cut size", value: "45", unit: "µm" }, { label: "Cyclone ΔP", value: "4.1", unit: "kPa" }, { label: "Recirculating load", value: "210", unit: "%" }, { label: "Air flow", value: "38", unit: "k m³/h" }],
    equipment: ["Cyclone CY-1", "Cyclone CY-2", "Classifier C-01", "Dust filter DF-2", "Process fan F-4", "Screw conveyor SC-3"] },
  { id: "feed", name: "Feed & discharge", img: "/milling/step-4.jpg", pos: "50% 50%", base: 72.2,
    desc: "Chutes and feeders meter alumina into the mill circuit and discharge it onto the outgoing belt.",
    kpis: [{ label: "Feed rate", value: "72", unit: "t/h" }, { label: "Chute level", value: "64", unit: "%" }, { label: "Feeder speed", value: "31", unit: "rpm" }, { label: "Spillage", value: "0.02", unit: "%" }],
    equipment: ["Feed screw FS-7", "Rotary valve RV-2", "Weigh feeder WF-1", "Chute level sensor LS-9", "Discharge hopper DH-1", "Dust seal DS-2"] },
  { id: "control", name: "Control room", img: "/milling/step-5.jpg", pos: "50% 50%", base: 70.0,
    desc: "Operators supervise the whole milling line from the control room on AVEVA supervisory screens.",
    kpis: [{ label: "Active control loops", value: "148", unit: "" }, { label: "Loops in auto", value: "92", unit: "%" }, { label: "Alarms active", value: "5", unit: "" }, { label: "Operators on shift", value: "4", unit: "" }],
    equipment: ["AVEVA System Platform node", "PLC MIL-01", "Operator HMI-01", "Historian server", "Network switch SW-3", "UPS-2 control power"] },
  { id: "silo", name: "Storage & stockpile", img: "/milling/step-6.jpg", pos: "50% 50%", base: 71.0,
    desc: "Conditioned alumina is conveyed to storage and stockpile, then loaded out by belt to the potlines and dry scrubbers.",
    kpis: [{ label: "Stock on hand", value: "38,400", unit: "t" }, { label: "Silo fill", value: "77", unit: "%" }, { label: "Days of cover", value: "11.2", unit: "d" }, { label: "Outloading", value: "71", unit: "t/h" }],
    equipment: ["Silo S-1", "Silo S-2", "Silo S-3", "Silo S-4", "Level radar LR-4", "Aeration blower AB-2"] },
];

export function process(f: Filters, stage: Stage, step?: MillStep) {
  const n = COUNT[f.range], lab = labels(f.range), k = AREA_SHARE[f.area];
  const salt = "pr-" + stage.id + (step ? step.id : "");
  const base = step ? step.base : stage.base;
  const bucket = f.range === "24H" ? 1 : f.range === "YTD" ? 720 : 24;
  const a = series(seedOf(f, salt), n, base * k * bucket, 0.06, 0.015);
  const chart = lab.map((l, i) => ({ t: l, actual: +a[i].toFixed(1), target: +(base * k * bucket).toFixed(1) }));
  const r = rng(seedOf(f, salt + "e"));
  const names: Record<string, string[]> = {
    mill: ["Ball mill M-01", "Ball mill M-02", "Classifier C-01", "Bucket elevator BE-3", "Belt conveyor BC-12", "Dust filter DF-2", "Alumina silo S-4", "Feed screw FS-7"],
    carbon: ["Paste kneader K-1", "Vibro-compactor V-2", "Ring furnace RF-1", "Ring furnace RF-2", "Rodding shop robot", "Anode cooler AC-3", "Fume treatment FT-1", "Pitch melter PM-1"],
    pot: ["Rectifier R-1", "Rectifier R-2", "Pot tending machine PTM-4", "Gas treatment GTC-2", "Anode change crane AC-1", "Tapping vehicle TV-3", "Potline 1 busbar", "Potline 3 busbar"],
    cast: ["Holding furnace F-1", "Holding furnace F-2", "Casting machine CM-1", "Casting machine CM-2", "Alloy mixer AM-1", "Metal degasser DG-2", "Stacker ST-1", "Bundling line BL-1"],
    dispatch: ["Weighbridge WB-1", "Weighbridge WB-2", "Overhead crane OC-3", "Strapping line SL-1", "Forklift fleet", "Rail loader RL-1", "Yard camera mesh", "Dock scheduler"],
  };
  const eq = (step ? step.equipment : names[stage.id]).map((name, i) => {
    const load = Math.round(55 + r() * 42);
    const tone: Tone = load > 92 ? "bad" : load > 85 ? "warn" : "good";
    return { id: `${(step ? step.id : stage.id).toUpperCase().slice(0, 3)}-${String(i + 1).padStart(2, "0")}`, name, load, temp: Math.round(40 + r() * 55), hours: Math.round(2000 + r() * 6200), tone, status: tone === "good" ? "Normal" : tone === "warn" ? "Watch" : "High load" };
  });
  const idle = 12 + Math.round(r() * 4), fault = 3 + Math.round(r() * 3);
  const dist = [
    { name: "Normal", value: 100 - idle - fault, color: C.good },
    { name: "Idle", value: idle, color: C.slate },
    { name: "Fault", value: fault, color: C.bad },
  ];
  return { chart, eq, dist };
}

/* ---------- Utilities: Power ---------- */
export function power(f: Filters) {
  const n = COUNT[f.range], lab = labels(f.range), k = AREA_SHARE[f.area];
  const load = series(seedOf(f, "pw"), n, 468 * k, 0.04, 0.01);
  const trend = lab.map((l, i) => ({ t: l, load: +load[i].toFixed(1), cap: +(500 * k).toFixed(0) }));
  const byArea = [
    { name: "Potlines", value: 438, color: C.molten }, { name: "Carbon plant", value: 14.2, color: C.ember },
    { name: "Casthouse", value: 9.6, color: C.blue }, { name: "Milling", value: 6.1, color: C.teal }, { name: "Auxiliaries", value: 8.4, color: C.violet },
  ].map((a) => ({ ...a, value: +(a.value * (f.area === "All plant" ? 1 : AREA_SHARE[f.area])).toFixed(1) }));
  const kpis: Kpi[] = [
    kpi(f, "p1", "Total load", 468, "MW", 1, "plug", C.molten, "Capacity 500 MW"),
    kpi(f, "p2", "Energy today", 11.2, "GWh", 2, "bolt", C.ember, "Since 00:00"),
    kpi(f, "p3", "Power factor", 0.973, "", 3, "gauge", C.teal, "Target ≥ 0.95", "up", false),
    kpi(f, "p4", "Grid frequency", 50.01, "Hz", 2, "activity", C.blue, "Stable", "up", false),
    kpi(f, "p5", "Peak demand", 491, "MW", 0, "trending", C.violet, "at 14:20"),
    kpi(f, "p6", "Energy cost", 2.84, "M EGP", 2, "coins", C.bad, "Today", "down"),
  ];
  const r = rng(seedOf(f, "fd"));
  const feeders = ["Incomer 220 kV A", "Incomer 220 kV B", "Rectifier R-1", "Rectifier R-2", "Rectifier R-3", "Carbon plant 33 kV", "Casthouse 11 kV", "Auxiliaries 6.6 kV"].map((name, i) => {
    const volt = i < 2 ? 220 : i < 5 ? 33 : i === 5 ? 33 : i === 6 ? 11 : 6.6;
    const mw = i < 2 ? 220 + r() * 30 : i < 5 ? 110 + r() * 20 : 6 + r() * 9;
    const temp = Math.round(48 + r() * 30);
    const tone: Tone = temp > 72 ? "warn" : "good";
    return { name, volt, mw: +(mw * (f.area === "All plant" ? 1 : AREA_SHARE[f.area] + .2)).toFixed(1), pf: +(0.95 + r() * 0.04).toFixed(3), temp, tone, status: tone === "good" ? "Healthy" : "Warm" };
  });
  return { trend, byArea, kpis, feeders };
}

/* ---------- Utilities: Water ---------- */
export function water(f: Filters) {
  const n = COUNT[f.range], lab = labels(f.range), k = AREA_SHARE[f.area];
  const intake = series(seedOf(f, "wa"), n, 930 * k, 0.07, -0.02);
  const trend = lab.map((l, i) => ({ t: l, intake: +intake[i].toFixed(0), recycled: +(intake[i] * (3.2 + Math.sin(i) * 0.1)).toFixed(0) }));
  const byArea = [
    { name: "Cooling towers", value: 540, color: C.blue }, { name: "Gas treatment", value: 160, color: C.teal },
    { name: "Casthouse", value: 120, color: C.ember }, { name: "Carbon plant", value: 70, color: C.molten }, { name: "Domestic", value: 40, color: C.violet },
  ].map((a) => ({ ...a, value: Math.round(a.value * k) }));
  const kpis: Kpi[] = [
    kpi(f, "w1", "Nile intake", 930, "m³/h", 0, "droplets", C.blue, "Permit 1,200 m³/h"),
    kpi(f, "w2", "Recycled water", 78, "%", 1, "recycle", C.teal, "Target 75 %", "up", false),
    kpi(f, "w3", "Cooling supply temp", 31.6, "°C", 1, "thermo", C.ember, "Limit 34 °C", "down", false),
    kpi(f, "w4", "Discharge pH", 7.4, "", 1, "flask", C.good, "Range 6.5 – 8.5", "up", false),
    kpi(f, "w5", "Water per tonne", 25.1, "m³/t", 1, "factory", C.violet, "Lower is better", "down", false),
    kpi(f, "w6", "Treated today", 22.3, "k m³", 1, "gauge", C.molten, "Since 00:00"),
  ];
  const tanks = [
    { name: "Raw water tank T-01", level: 82, color: C.blue }, { name: "Cooling basin CB-2", level: 67, color: C.teal },
    { name: "Demin water T-04", level: 91, color: C.good }, { name: "Fire water T-07", level: 98, color: C.good }, { name: "Clarifier overflow", level: 38, color: C.warn },
  ];
  const r = rng(seedOf(f, "pu"));
  const pumps = ["Intake pump P-101", "Intake pump P-102", "Cooling circ. P-201", "Cooling circ. P-202", "Booster P-301", "Fire jockey P-401", "Demin feed P-501"].map((name, i) => {
    const run = r() > 0.12;
    return { id: `WP-${100 + i * 11}`, name, flow: run ? Math.round(180 + r() * 420) : 0, press: run ? +(2.4 + r() * 3.6).toFixed(1) : 0, kw: run ? Math.round(55 + r() * 190) : 0, tone: (run ? "good" : "mute") as Tone, status: run ? "Running" : "Standby" };
  });
  return { trend, byArea, kpis, tanks, pumps };
}

/* ---------- Quality ---------- */
export function quality(f: Filters) {
  const n = COUNT[f.range], lab = labels(f.range);
  const fe = series(seedOf(f, "fe"), n, 0.085, 0.14, -0.04);
  const si = series(seedOf(f, "si"), n, 0.048, 0.16, -0.03);
  const impurities = lab.map((l, i) => ({ t: l, fe: +fe[i].toFixed(3), si: +si[i].toFixed(3), limit: 0.1 }));
  const grades = [
    { name: "P1020A ingot", value: 48, color: C.molten }, { name: "P0610 high purity", value: 21, color: C.blue },
    { name: "T-bar", value: 14, color: C.teal }, { name: "Sow", value: 10, color: C.ember }, { name: "Billet", value: 7, color: C.violet },
  ];
  const defects = [
    { name: "Surface oxide", value: 38 }, { name: "Cold shut", value: 27 }, { name: "Porosity", value: 19 },
    { name: "Dimension", value: 11 }, { name: "Inclusion", value: 5 },
  ].map((d, i) => ({ ...d, value: Math.round(d.value * (0.85 + rng(seedOf(f, "df" + i))() * 0.3)) }));
  const kpis: Kpi[] = [
    kpi(f, "q1", "Metal purity", 99.78, "%", 2, "shield", C.teal, "P1020A ≥ 99.70 %", "up", false),
    kpi(f, "q2", "First-pass yield", 97.6, "%", 1, "check", C.good, "Target 97 %", "up", false),
    kpi(f, "q3", "Lots on hold", 4, "", 0, "pause", C.warn, "Awaiting retest", "down", false),
    kpi(f, "q4", "Customer claims", 0.6, "per 1k t", 1, "flag", C.bad, "Rolling 90 days", "down", false),
  ];
  const r = rng(seedOf(f, "lab"));
  const gradeNames = ["P1020A", "P0610", "P1020A", "T-bar", "P1020A", "Sow", "P0610", "Billet", "P1020A", "T-bar", "P1020A", "P0610"];
  const lab2 = gradeNames.map((g, i) => {
    const feV = +(0.05 + r() * 0.07).toFixed(3), siV = +(0.03 + r() * 0.05).toFixed(3);
    const pass = feV <= 0.1 && siV <= 0.07 && !(g === "P0610" && feV > 0.06);
    return { id: `LOT-${24610 + i * 7}`, grade: g, line: ["Potline 1", "Potline 2", "Potline 3"][i % 3], fe: feV, si: siV, purity: +(100 - feV - siV - 0.07 - r() * 0.04).toFixed(2), result: pass ? "Pass" : "Hold", tone: (pass ? "good" : "warn") as Tone };
  }).filter((x) => f.area === "All plant" || x.line === f.area);
  return { impurities, grades, defects, kpis, lab: lab2 };
}

/* ---------- Equipment ---------- */
export function equipment(f: Filters) {
  const r = rng(seedOf(f, "eq"));
  const names = [
    ["Ball mill M-01", "Milling"], ["Ball mill M-02", "Milling"], ["Rectifier R-1", "Potline 1"], ["Rectifier R-3", "Potline 3"],
    ["Pot tending PTM-4", "Potline 2"], ["Gas treatment GTC-2", "Potline 2"], ["Ring furnace RF-1", "Carbon"], ["Holding furnace F-2", "Casthouse"],
    ["Casting machine CM-1", "Casthouse"], ["Cooling tower CT-3", "Utilities"], ["Transformer TR-5", "Substation"], ["Intake pump P-101", "Utilities"],
  ];
  const assets = names.map(([name, area], i) => {
    const health = Math.round(58 + r() * 41);
    const tone: Tone = health < 70 ? "bad" : health < 82 ? "warn" : "good";
    return { id: `AST-${300 + i * 13}`, name, area, health, vib: +(1 + r() * 5).toFixed(1), temp: Math.round(45 + r() * 50), rul: Math.round(8 + r() * 140), tone };
  });
  const people = ["M. Hassan", "A. Farouk", "S. Ibrahim", "N. Adel", "K. Mansour", "R. Gamal"];
  const types = ["Preventive", "Corrective", "Predictive", "Inspection"];
  const prios = ["Low", "Medium", "High", "Critical"];
  const states = ["Open", "In progress", "Done", "Blocked"];
  const orders = Array.from({ length: 14 }, (_, i) => {
    const st = states[Math.floor(r() * 4)];
    return {
      id: `WO-${5120 + i * 3}`, asset: assets[Math.floor(r() * assets.length)].name, type: types[Math.floor(r() * 4)],
      prio: prios[Math.floor(r() * 4)], owner: people[Math.floor(r() * people.length)], shift: ["A", "B", "C"][i % 3], due: `Oct ${13 + Math.floor(r() * 12)}`,
      status: st, tone: (st === "Done" ? "good" : st === "Blocked" ? "bad" : st === "In progress" ? "info" : "mute") as Tone,
    };
  });
  const downtime = [
    { name: "Mechanical", value: 34 }, { name: "Electrical", value: 26 }, { name: "Process", value: 19 },
    { name: "Instrumentation", value: 12 }, { name: "Utilities", value: 9 },
  ].map((d, i) => ({ ...d, value: Math.round(d.value * (0.8 + rng(seedOf(f, "dt" + i))() * 0.4)) }));
  const n = COUNT[f.range], lab = labels(f.range);
  const oee = series(seedOf(f, "oee"), n, 86, 0.03, 0.01);
  const oeeTrend = lab.map((l, i) => ({ t: l, oee: +oee[i].toFixed(1) }));
  const kpis: Kpi[] = [
    kpi(f, "e1", "OEE", 86.4, "%", 1, "gauge", C.molten, "Target 85 %", "up", false),
    kpi(f, "e2", "MTBF", 612, "h", 0, "clock", C.teal, "Mean time between failures", "up", false),
    kpi(f, "e3", "MTTR", 3.8, "h", 1, "wrench", C.ember, "Mean time to repair", "down", false),
    kpi(f, "e4", "Open work orders", 37, "", 0, "list", C.blue, "6 overdue", "down", false),
  ];
  return { assets, orders, downtime, oeeTrend, kpis };
}

/* ---------- Alerts ---------- */
export type AlertCat = "Production" | "Power" | "Water" | "Quality" | "Equipment";
export type Severity = "Critical" | "Info" | "OK";
export const ALERT_CATS: AlertCat[] = ["Production", "Power", "Water", "Quality", "Equipment"];
export interface PlantAlert {
  id: string; cat: AlertCat; sev: Severity; title: string; source: string; value: string; time: string; area: Area | "Plant-wide";
  born?: number; // epoch ms, set on alerts raised live
}
const ALERT_SEED: Omit<PlantAlert, "id">[] = [
  { cat: "Production", sev: "Critical", title: "Anode effect on pot 2-47", source: "Potline 2", value: "Cell voltage 8.4 V", time: "4 min ago", area: "Potline 2" },
  { cat: "Production", sev: "Critical", title: "Ball mill M-02 motor current high", source: "Alumina milling", value: "431 A (limit 420)", time: "18 min ago", area: "Plant-wide" },
  { cat: "Production", sev: "Info", title: "Bath temperature drifting up on pot 3-12", source: "Potline 3", value: "974 °C", time: "1 h ago", area: "Potline 3" },
  { cat: "Production", sev: "OK", title: "Furnace F-2 tapped on schedule", source: "Casthouse", value: "41.2 t", time: "1 h ago", area: "Plant-wide" },
  { cat: "Power", sev: "Critical", title: "Rectifier R-3 transformer oil temperature high", source: "Substation", value: "86 °C (limit 85)", time: "9 min ago", area: "Potline 3" },
  { cat: "Power", sev: "Info", title: "Power factor below target on 33 kV bus", source: "Substation", value: "0.944 (target 0.95)", time: "37 min ago", area: "Plant-wide" },
  { cat: "Power", sev: "Info", title: "Peak demand within 3 % of contract limit", source: "Incomer 220 kV A", value: "491 MW", time: "2 h ago", area: "Plant-wide" },
  { cat: "Power", sev: "OK", title: "Rectifier R-6 returned to service", source: "Potline 1", value: "Load 112 MW", time: "2 h ago", area: "Potline 1" },
  { cat: "Water", sev: "Info", title: "Cooling tower CT-3 conductivity rising", source: "Cooling circuit", value: "1,840 µS/cm", time: "42 min ago", area: "Plant-wide" },
  { cat: "Water", sev: "Critical", title: "Clarifier overflow level high", source: "Water treatment", value: "Level 94 %", time: "26 min ago", area: "Plant-wide" },
  { cat: "Water", sev: "Info", title: "Intake pump P-102 vibration above normal", source: "Nile intake", value: "5.1 mm/s", time: "3 h ago", area: "Plant-wide" },
  { cat: "Water", sev: "OK", title: "Discharge pH back in range", source: "Effluent", value: "pH 7.6", time: "4 h ago", area: "Plant-wide" },
  { cat: "Quality", sev: "Critical", title: "Lot 24638 iron above internal limit", source: "Laboratory", value: "Fe 0.102 %", time: "55 min ago", area: "Potline 2" },
  { cat: "Quality", sev: "OK", title: "P0610 lot released after retest", source: "Laboratory", value: "Purity 99.87 %", time: "3 h ago", area: "Potline 1" },
  { cat: "Equipment", sev: "Info", title: "Gas treatment GTC-2 differential pressure rising", source: "Potline 2", value: "2.9 kPa", time: "1 h ago", area: "Potline 2" },
  { cat: "Equipment", sev: "Info", title: "Pot tending machine PTM-4 service due in 3 days", source: "Potline 2", value: "Run 4,980 h", time: "5 h ago", area: "Potline 2" },
];
export function alerts(f: Filters): PlantAlert[] {
  return ALERT_SEED.filter((a) => f.area === "All plant" || a.area === f.area || a.area === "Plant-wide")
    .map((a, i) => ({ ...a, id: `ALM-${7400 + i * 7}` }));
}
export function alertTrend(f: Filters) {
  const n = COUNT[f.range], lab = labels(f.range), k = f.range === "YTD" ? 30 : f.range === "24H" ? 0.1 : 1;
  const c = series(seedOf(f, "al-c"), n, 2 * k, 0.5), i = series(seedOf(f, "al-i"), n, 6 * k, 0.4), o = series(seedOf(f, "al-o"), n, 5 * k, 0.4);
  return lab.map((t, x) => ({ t, critical: Math.round(c[x]), info: Math.round(i[x]), ok: Math.round(o[x]) }));
}

/* ---------- Logistics ---------- */
export function logistics(f: Filters) {
  const r = rng(seedOf(f, "lg"));
  const inventory = [
    { name: "Alumina", tonnes: 38400, cap: 50000, days: 11.2, unit: "t", color: C.molten },
    { name: "Petroleum coke", tonnes: 9100, cap: 14000, days: 14.6, unit: "t", color: C.ember },
    { name: "Coal-tar pitch", tonnes: 2850, cap: 5000, days: 9.8, unit: "t", color: C.violet },
    { name: "Aluminium fluoride", tonnes: 410, cap: 900, days: 7.1, unit: "t", color: C.teal },
    { name: "Cryolite", tonnes: 320, cap: 800, days: 21, unit: "t", color: C.blue },
    { name: "Finished metal", tonnes: 6420, cap: 9000, days: 7.3, unit: "t", color: C.good },
  ].map((x) => ({ ...x, tonnes: Math.round(x.tonnes * (0.94 + r() * 0.12)) }));
  const n = COUNT[f.range], lab = labels(f.range), k = BUCKET[f.range];
  const sh = series(seedOf(f, "sh"), n, 840 * k, 0.12);
  const ord = series(seedOf(f, "or"), n, 860 * k, 0.1);
  const shipped = lab.map((l, i) => ({ t: l, shipped: +sh[i].toFixed(0), ordered: +ord[i].toFixed(0) }));
  const destinations = [
    { name: "Egypt domestic", value: 46, color: C.molten }, { name: "Europe", value: 27, color: C.blue },
    { name: "Middle East", value: 15, color: C.teal }, { name: "Asia", value: 8, color: C.ember }, { name: "Africa", value: 4, color: C.violet },
  ];
  const customers = [
    ["Alexandria Extrusions", "Alexandria, EG", "P1020A ingot"], ["Nile Cables Co.", "Cairo, EG", "T-bar"], ["Rhein Metals GmbH", "Hamburg, DE", "P0610"],
    ["Gulf Alloys LLC", "Jebel Ali, AE", "Sow"], ["Delta Profiles", "Mansoura, EG", "Billet"], ["Tecnomet SpA", "Genoa, IT", "P1020A ingot"],
    ["Pacific Rolling", "Singapore, SG", "P1020A ingot"], ["Suez Foundry", "Suez, EG", "Sow"], ["Iberalu SA", "Valencia, ES", "T-bar"], ["Cairo Castings", "Cairo, EG", "P1020A ingot"],
  ];
  const sts = ["Scheduled", "Loading", "In transit", "Delivered", "Delayed"];
  const shipments = customers.map(([customer, dest, product], i) => {
    const st = sts[Math.floor(r() * 5)];
    return {
      id: `SH-${88100 + i * 17}`, customer, dest, product, tonnes: Math.round(120 + r() * 900), mode: dest.endsWith("EG") ? "Truck" : r() > 0.4 ? "Vessel" : "Rail + vessel",
      eta: `Oct ${13 + Math.floor(r() * 14)}`, status: st,
      tone: (st === "Delivered" ? "good" : st === "Delayed" ? "bad" : st === "Loading" ? "warn" : st === "In transit" ? "info" : "mute") as Tone,
    };
  });
  const kpis: Kpi[] = [
    kpi(f, "l1", "Shipped today", 840, "t", 0, "truck", C.molten, "38 trucks · 2 wagons"),
    kpi(f, "l2", "Order backlog", 6.9, "k t", 1, "box", C.blue, "≈ 8 days of output", "down"),
    kpi(f, "l3", "On-time delivery", 94.2, "%", 1, "clock", C.good, "Target 95 %", "up", false),
    kpi(f, "l4", "Export share", 54, "%", 0, "globe", C.teal, "Of total tonnes", "up", false),
  ];
  return { inventory, shipped, destinations, shipments, kpis };
}
