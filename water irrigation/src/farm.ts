/* ================= Smart Agriculture: the data model (all numbers are sample data) =================
   A desert farm at Wadi El Natrun: 1,200 feddan under 8 centre pivots, fed by 3 pump stations.
   Every screen reads from here, so the map, the charts, the pumps and the alarms agree with each other.
   Soil moisture is worked out hour by hour from the crop's water use (ET) and the pivot's irrigation window. */

export type Range = "24H" | "7D" | "30D" | "YTD";
export const RANGES: Range[] = ["24H", "7D", "30D", "YTD"];
export interface Filters { range: Range }

/** small seeded random so charts stay stable between renders */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
export const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const MOMENTS = [{ label: "Night", h: 3 }, { label: "Morning", h: 8 }, { label: "Midday", h: 13 }, { label: "Evening", h: 19 }] as const;
export type Moment = (typeof MOMENTS)[number]["label"];
export const MOMENT_LABELS: Moment[] = MOMENTS.map((m) => m.label);
export const momentHour = (m: Moment) => MOMENTS.find((x) => x.label === m)!.h;

export const M2 = 4200; // m² in one feddan
export const FARM = {
  name: "Wadi El Natrun Farm",
  tag: "Precision irrigation · Wadi El Natrun, Egypt",
  feddan: 1200,
  allocation: 12_000_000, // m³ per year
  et0: 4.6, // reference evapotranspiration today, mm/day
  efficiency: 87.4, // % of pumped water that the crop can use
};

/* ---------- crops ---------- */
export type Crop = "Wheat" | "Maize" | "Alfalfa" | "Potatoes";
export const CROPS: Crop[] = ["Wheat", "Maize", "Alfalfa", "Potatoes"];
export const KC: Record<Crop, number> = { Wheat: 1.05, Maize: 1.15, Alfalfa: 1.0, Potatoes: 1.1 }; // crop coefficient

/* ---------- pivots ---------- */
export type StationId = "PS-A" | "PS-B" | "PS-C";
export type PivotStatus = "Irrigating" | "Scheduled" | "Idle" | "Fault";
export interface Pivot {
  id: string; crop: Crop; stage: string; feddan: number;
  col: number; row: number; // place on the farm map
  station: StationId;
  base: number; // soil moisture at midnight, % of volume
  win: [number, number]; // irrigation window, start and end hour (the end may be past midnight)
  fault?: string;
}
export const PIVOTS: Pivot[] = [
  { id: "P1", crop: "Wheat", stage: "Emergence", feddan: 150, col: 0, row: 0, station: "PS-B", base: 38, win: [22, 4] },
  { id: "P2", crop: "Wheat", stage: "Emergence", feddan: 150, col: 1, row: 0, station: "PS-B", base: 37, win: [0, 6] },
  { id: "P3", crop: "Maize", stage: "Maturity", feddan: 150, col: 2, row: 0, station: "PS-A", base: 35, win: [20, 2] },
  { id: "P4", crop: "Maize", stage: "Maturity", feddan: 150, col: 3, row: 0, station: "PS-A", base: 34, win: [2, 8], fault: "Tower 7 drive tripped" },
  { id: "P5", crop: "Alfalfa", stage: "Regrowth", feddan: 150, col: 0, row: 1, station: "PS-A", base: 40, win: [4, 10] },
  { id: "P6", crop: "Alfalfa", stage: "Mid-cut", feddan: 150, col: 1, row: 1, station: "PS-C", base: 37, win: [18, 0] },
  { id: "P7", crop: "Potatoes", stage: "Tuber bulking", feddan: 150, col: 2, row: 1, station: "PS-C", base: 34, win: [5, 11] },
  { id: "P8", crop: "Potatoes", stage: "Tuber bulking", feddan: 150, col: 3, row: 1, station: "PS-C", base: 30, win: [16, 22] },
];
export const pivotById = (id: string) => PIVOTS.find((p) => p.id === id);

const area = (p: Pivot) => p.feddan * M2; // m²
export const etDaily = (p: Pivot) => FARM.et0 * KC[p.crop]; // mm per day the crop uses
const planDaily = (p: Pivot) => etDaily(p) * 1.06; // mm per day the schedule puts on (a little extra for losses)
const winLen = (p: Pivot) => (p.win[1] - p.win[0] + 24) % 24;
const inWindow = (p: Pivot, h: number) => (p.win[0] < p.win[1] ? h >= p.win[0] && h < p.win[1] : h >= p.win[0] || h < p.win[1]);
/** share of a day's crop water use that happens in this hour: none at night, a peak at 12:00 */
export const etShare = (h: number) => (h >= 6 && h < 18 ? (Math.sin((Math.PI * (h - 6)) / 12) * Math.PI) / 24 : 0);
/** mm per hour the pivot is putting on at hour h */
const irrRate = (p: Pivot, h: number) => (p.fault || !inWindow(p, h) ? 0 : planDaily(p) / winLen(p));
const etRate = (p: Pivot, h: number) => etDaily(p) * etShare(h);
function integ(f: (t: number) => number, to: number) {
  let s = 0;
  for (let t = 0; t < to; t += 0.25) { const dt = Math.min(0.25, to - t); s += f(t + dt / 2) * dt; }
  return s;
}
const MOIST_PER_MM = 0.9; // % of soil volume per mm of water

/** soil moisture (% of volume) at hour h: the midnight value, plus what was put on, minus what the crop used */
export const moistAt = (p: Pivot, h: number) => Math.min(55, Math.max(12, p.base + MOIST_PER_MM * (integ((t) => irrRate(p, t), h) - integ((t) => etRate(p, t), h))));
export const planMm = planDaily;
export const winHours = winLen;
export const inIrrigationWindow = inWindow;
export const areaM2 = area;

export interface PivotNow { p: Pivot; status: PivotStatus; moist: number; applied: number; stress: number; rate: number }
/** every pivot at hour h of today (0 to 24) */
export function pivotsAt(h: number): PivotNow[] {
  return PIVOTS.map((p) => {
    const applied = integ((t) => irrRate(p, t), h);
    const moist = moistAt(p, h);
    const status: PivotStatus = p.fault ? "Fault" : inWindow(p, h) ? "Irrigating" : (p.win[0] - h + 24) % 24 <= 8 ? "Scheduled" : "Idle";
    const stress = moist >= 33 ? 0 : Math.min(1, (33 - moist) / 10);
    return { p, status, moist, applied, stress, rate: irrRate(p, h) };
  });
}
export const moistClass = (m: number) => (m < 28 ? "dry" : m < 33 ? "low" : m <= 45 ? "ok" : "wet") as "dry" | "low" | "ok" | "wet";

/** m³ per hour the pivots draw from the pumps at hour h */
export const farmFlow = (h: number) => PIVOTS.reduce((s, p) => s + (irrRate(p, h) * area(p)) / 1000, 0);
export const stationFlow = (id: StationId, h: number) => PIVOTS.filter((p) => p.station === id).reduce((s, p) => s + (irrRate(p, h) * area(p)) / 1000, 0);

/* ---------- time series ---------- */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const MONTH_ET0 = [2.1, 2.9, 4.1, 5.4, 6.6, 7.5, 7.9, 7.2, 5.8, 4.6];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const RANGE_LABEL: Record<Range, string> = { "24H": "last 24 hours", "7D": "last 7 days", "30D": "last 30 days", YTD: "year to date" };

export function labels(range: Range): string[] {
  const today = new Date().getDay();
  if (range === "24H") return Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
  if (range === "7D") return Array.from({ length: 7 }, (_, i) => DAY_NAMES[(today - 6 + i + 7) % 7]);
  if (range === "30D") return Array.from({ length: 30 }, (_, i) => String(i + 1));
  return MONTHS;
}

export const KC_AREA = PIVOTS.reduce((s, p) => s + (KC[p.crop] * area(p)) / 1000, 0); // m³ of crop water use per mm of ET0
export interface Pt { t: string; applied: number; demand: number } // m³ in one bucket
/** water put on the fields against what the crops used */
export function series(f: Filters): Pt[] {
  const lab = labels(f.range);
  const todayApplied = Array.from({ length: 24 }, (_, h) => farmFlow(h + 0.5)).reduce((a, b) => a + b, 0);
  if (f.range === "24H") {
    return lab.map((t, h) => ({ t, applied: Math.round(farmFlow(h + 0.5)), demand: Math.round(PIVOTS.reduce((s, p) => s + (etRate(p, h + 0.5) * area(p)) / 1000, 0)) }));
  }
  const r = rng(70 + RANGES.indexOf(f.range));
  if (f.range === "YTD") {
    return lab.map((t, i) => {
      const demand = MONTH_ET0[i] * MONTH_DAYS[i] * KC_AREA;
      return { t, demand: Math.round(demand), applied: Math.round(demand * 1.06 * (0.98 + r() * 0.04)) };
    });
  }
  return lab.map((t, i) => {
    const last = i === lab.length - 1;
    const et0 = last ? FARM.et0 : FARM.et0 * (0.88 + r() * 0.24);
    const demand = et0 * KC_AREA;
    return { t, demand: Math.round(demand), applied: Math.round(last ? todayApplied : demand * 1.06 * (0.97 + r() * 0.06)) };
  });
}

/** the year so far: used against the yearly allocation */
export function budget() {
  const used = series({ range: "YTD" }).reduce((s, p) => s + p.applied, 0);
  return { used, left: FARM.allocation - used, pct: (used / FARM.allocation) * 100, yearGone: 83 };
}

/* ---------- alarms ---------- */
export type Sev = "Critical" | "Warning" | "Info";
export interface Alarm { id: string; sev: Sev; source: string; text: string; time: string }
export const ALARMS: Alarm[] = [
  { id: "a1", sev: "Critical", source: "Pivot P4", text: "Tower 7 drive tripped, the pivot stopped at 03:12 and the field is not being irrigated", time: "03:12" },
  { id: "a2", sev: "Warning", source: "Pivot P8", text: "Soil moisture fell below 28% at midday, bring the evening irrigation forward", time: "12:40" },
  { id: "a3", sev: "Warning", source: "PS-A well 3", text: "Water level in the well is dropping faster than usual, check the draw-down", time: "09:05" },
  { id: "a4", sev: "Info", source: "PS-B canal lift", text: "Intake screen pressure drop is rising, schedule a clean this week", time: "07:30" },
  { id: "a5", sev: "Info", source: "Water budget", text: "Use is 4 points behind the year's plan, no action needed", time: "06:00" },
  { id: "a6", sev: "Warning", source: "Landscape Z9", text: "Villas lawn B valve will not open and its soil probe S-09 is offline: the lawn is not being watered", time: "02:55" },
  { id: "a7", sev: "Info", source: "Landscape S-04", text: "Soil probe battery is at 12%, replace it this week", time: "08:20" },
  { id: "a8", sev: "Warning", source: "Grey water", text: "Free chlorine fell under 0.5 mg/L at 14:00, the dose was raised and it recovered", time: "14:00" },
];

/* ---------- pump stations ---------- */
export const STATIONS: { id: StationId; name: string; kind: string; source: string }[] = [
  { id: "PS-A", name: "Boreholes", kind: "Submersible well pumps", source: "Wells" },
  { id: "PS-B", name: "Canal lift", kind: "Horizontal centrifugal pumps", source: "Irrigation canal" },
  { id: "PS-C", name: "Booster", kind: "Booster pumps", source: "Storage pond" },
];
export interface PumpDef { id: string; station: StationId; flow: number; head: number; eta: number; hours: number; vib: number; temp: number; health: number }
const pd = (id: string, station: StationId, flow: number, head: number, eta: number, hours: number, vib: number, temp: number, health: number): PumpDef => ({ id, station, flow, head, eta, hours, vib, temp, health });
export const PUMPS: PumpDef[] = [
  pd("A1", "PS-A", 250, 95, 0.72, 18420, 2.4, 64, 92), pd("A2", "PS-A", 250, 95, 0.72, 17980, 2.6, 66, 90),
  pd("A3", "PS-A", 250, 95, 0.70, 21250, 3.9, 71, 68), pd("A4", "PS-A", 250, 95, 0.72, 9120, 2.1, 60, 96),
  pd("B1", "PS-B", 500, 32, 0.78, 24310, 2.8, 62, 88), pd("B2", "PS-B", 500, 32, 0.78, 26880, 3.4, 67, 74), pd("B3", "PS-B", 500, 32, 0.78, 15240, 2.3, 60, 94),
  pd("C1", "PS-C", 450, 42, 0.76, 12760, 2.5, 63, 91), pd("C2", "PS-C", 450, 42, 0.76, 12190, 2.7, 64, 89), pd("C3", "PS-C", 450, 42, 0.76, 6840, 2.2, 59, 97),
];
/** pump curve: head falls as flow rises; efficiency peaks a little below the rated flow */
export const headAt = (d: PumpDef, q: number) => { const h0 = d.head * 1.25; return h0 - ((h0 - d.head) / (d.flow * d.flow)) * q * q; };
export const effAt = (d: PumpDef, q: number) => Math.max(0.2, d.eta * (1 - 0.8 * ((q - d.flow * 0.95) / (d.flow * 0.95)) ** 2));
export const powerAt = (d: PumpDef, q: number) => (q <= 0 ? 0 : (9.81 * headAt(d, q) * q) / 3600 / effAt(d, q));
export const curve = (d: PumpDef) => Array.from({ length: 14 }, (_, i) => { const q = (d.flow * 1.4 * i) / 13; return { q: Math.round(q), head: +headAt(d, q).toFixed(1), eff: +(effAt(d, q) * 100).toFixed(1) }; });

export type PumpState = "Running" | "Standby" | "Off";
export type Override = Record<string, "on" | "off">;
export interface PumpNow { def: PumpDef; state: PumpState; q: number; speed: number; kw: number; eta: number; head: number; vib: number; temp: number }
export interface StationNow { id: StationId; pumps: PumpNow[]; demand: number; flow: number; kw: number; bar: number; kwhPerM3: number; running: number; short: boolean }
/** one station at hour h: the pumps the schedule would run, unless the operator has started or stopped one */
export function stationNow(id: StationId, h: number, ov: Override = {}): StationNow {
  const defs = PUMPS.filter((p) => p.station === id);
  const demand = stationFlow(id, h);
  const nAuto = demand <= 0 ? 0 : Math.min(defs.length, Math.ceil(demand / (0.9 * defs[0].flow)));
  const run = defs.map((d, i) => (ov[d.id] === "on" ? true : ov[d.id] === "off" ? false : i < nAuto));
  const n = run.filter(Boolean).length;
  const q = n ? Math.min(defs[0].flow * 1.15, Math.max(demand / n, defs[0].flow * 0.3)) : 0; // a pump never runs below 30% of its flow
  const pumps: PumpNow[] = defs.map((d, i) => {
    const on = run[i];
    const r = on ? q / d.flow : 0;
    return {
      def: d, state: on ? "Running" : ov[d.id] === "off" ? "Off" : "Standby", q: on ? q : 0,
      speed: on ? Math.min(100, 55 + 45 * r) : 0, kw: on ? powerAt(d, q) : 0, eta: on ? effAt(d, q) : 0, head: on ? headAt(d, q) : 0,
      vib: on ? d.vib + 0.8 * r : 0.3, temp: on ? d.temp + 6 * r : 34,
    };
  });
  const flow = Math.min(demand, n * q);
  const kw = pumps.reduce((a, p) => a + p.kw, 0);
  return { id, pumps, demand, flow, kw, bar: n ? headAt(defs[0], q) / 10.2 : 0, kwhPerM3: flow > 0 ? kw / flow : 0, running: n, short: demand > flow + 1 };
}
function stationDay(id: StationId) {
  let kwh = 0, m3 = 0;
  for (let h = 0; h < 24; h++) { const s = stationNow(id, h + 0.5); kwh += s.kw; m3 += s.flow; }
  return { kwh, m3 };
}
const DAY = STATIONS.map((s) => stationDay(s.id));
/** average power drawn by each part of the farm over a day, kW (the pumps come from the pump model) */
export const LOADS = [
  ...STATIONS.map((s, i) => ({ id: s.id as string, name: `${s.id} ${s.id === "PS-A" ? "wells" : s.id === "PS-B" ? "lift" : "booster"}`, kw: DAY[i].kwh / 24 })),
  { id: "D", name: "Pivot drives", kw: 18 },
  { id: "E", name: "Buildings", kw: 13 },
];
/** kWh of pumping for every m³ delivered, over today */
export const SPECIFIC_ENERGY = DAY.reduce((a, d) => a + d.kwh, 0) / DAY.reduce((a, d) => a + d.m3, 0);

/* ---------- one pivot in detail ---------- */
export interface PivotDetail { sectors: number[]; depths: number[]; towers: { n: number; ok: boolean; err: number }[]; uniformity: number }
export function pivotDetail(n: PivotNow): PivotDetail {
  const r = rng(n.p.id.charCodeAt(1) * 131 + 17);
  const sectors = Array.from({ length: 12 }, (_, i) => Math.min(55, Math.max(15, n.moist + (r() - 0.5) * 9 - (n.p.fault && i >= 9 ? 4 : 0))));
  const depths = [n.moist - 3.5 + (r() - 0.5) * 2, n.moist, n.moist + 2 + (r() - 0.5) * 2];
  const towers = Array.from({ length: 7 }, (_, i) => ({ n: i + 1, ok: !(n.p.fault && i === 6), err: +((r() - 0.5) * 1.6).toFixed(1) }));
  return { sectors, depths, towers, uniformity: 91 + r() * 4 - (n.p.fault ? 6 : 0) };
}
export interface Plan { day: string; start: string; hours: number; depth: number; m3: number; state: string }
/** today and the next three days: the plan follows the forecast crop water use */
export function pivotPlan(p: Pivot): Plan[] {
  const r = rng(p.id.charCodeAt(1) * 57 + 3);
  const today = new Date().getDay();
  return [0, 1, 2, 3].map((d) => {
    const depth = planMm(p) * (d === 0 ? 1 : 0.9 + r() * 0.2);
    return { day: d === 0 ? "Today" : DAY_NAMES[(today + d) % 7], start: `${String(p.win[0]).padStart(2, "0")}:00`, hours: winLen(p), depth, m3: (depth * area(p)) / 1000, state: d === 0 ? (p.fault ? "Blocked" : "Running") : "Planned" };
  });
}

/* ---------- maintenance ---------- */
export type WoStatus = "Open" | "In progress" | "Delayed" | "Closed";
export type Priority = "High" | "Medium" | "Low";
export type AssetStatus = "Running" | "Standby" | "Fault";
export interface Asset { id: string; name: string; kind: "Pump" | "Pivot"; place: string; status: AssetStatus; last: string; next: string; overdue?: boolean; wo?: { status: WoStatus; priority: Priority; text: string } }
const LAST = ["03 Sep", "11 Jul", "21 Aug", "30 Aug", "14 Sep", "16 Oct", "12 Oct", "05 Jun"];
const NEXT = ["03 Dec", "06 Nov", "21 Nov", "30 Nov", "14 Dec", "16 Jan", "12 Jan", "05 Dec"];
const WO: Record<string, Asset["wo"]> = {
  A3: { status: "Open", priority: "Medium", text: "Check the well draw-down and the pump bearing" },
  A4: { status: "Closed", priority: "Low", text: "Annual service done" },
  B2: { status: "Delayed", priority: "Medium", text: "Bearing grease and alignment, service overdue" },
  C1: { status: "Open", priority: "Low", text: "Replace the discharge pressure gauge" },
  P2: { status: "Closed", priority: "Low", text: "Sprinkler package checked" },
  P4: { status: "In progress", priority: "High", text: "Tower 7 drive tripped: replace the gearbox motor" },
  P8: { status: "Open", priority: "Medium", text: "Check three clogged sprinklers on span 5" },
  P5: { status: "In progress", priority: "Low", text: "Replace worn tower wheel tyres" },
};
export const ASSETS: Asset[] = [
  ...PUMPS.map((d, i): Asset => ({ id: d.id, name: `Pump ${d.id}`, kind: "Pump", place: d.station, status: d.id === "A4" || d.id === "B3" || d.id === "C3" ? "Standby" : "Running", last: LAST[i % 8], next: d.id === "B2" ? "Overdue" : NEXT[i % 8], overdue: d.id === "B2", wo: WO[d.id] })),
  ...PIVOTS.map((p, i): Asset => ({ id: p.id, name: `Pivot ${p.id} (${p.crop})`, kind: "Pivot", place: "Field", status: p.fault ? "Fault" : "Running", last: LAST[(i + 3) % 8], next: NEXT[(i + 5) % 8], wo: WO[p.id] })),
];
export const PM_ON_TIME = [86, 88, 87, 90, 91, 89, 93, 92, 94, 95];
export const COST_BY_QUARTER = [212, 188, 236, 201]; // k LE
export const DOWNTIME_HOURS = [{ n: "Bearing", v: 14 }, { n: "Tower drive", v: 11 }, { n: "Power dip", v: 6 }, { n: "Screen", v: 5 }, { n: "Sensor", v: 3 }];

/* ---------- weather and the forecast ---------- */
export const WEATHER_NOW = { temp: 29, rh: 31, wind: 14, solar: 612, pressure: 1012 };
export interface Day { d: string; hi: number; lo: number; wind: number; rh: number; rain: number; et0: number }
/** today and the next six days (sample forecast: a hot windy day, then one showery day) */
export function forecast(): Day[] {
  const r = rng(909);
  const today = new Date().getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const rain = i === 4 ? 2.4 : 0;
    const hot = i === 2 ? 1.2 : 1;
    const et0 = i === 0 ? FARM.et0 : rain ? FARM.et0 * 0.7 : FARM.et0 * (0.94 + r() * 0.1) * hot;
    return { d: i === 0 ? "Today" : DAY_NAMES[(today + i) % 7], hi: Math.round((rain ? 22 : 30 + r() * 3) + (i === 2 ? 4 : 0)), lo: Math.round(14 + r() * 3), wind: Math.round(10 + r() * 10 + (i === 2 ? 14 : 0)), rh: Math.round(28 + r() * 10 + (rain ? 25 : 0)), rain, et0: +et0.toFixed(1) };
  });
}
/** crop water use per day for today's ET0 */
export const cropDemand = () => CROPS.map((c) => ({ crop: c, mm: +(FARM.et0 * KC[c]).toFixed(1) }));
export const hourlyEt0 = () => Array.from({ length: 24 }, (_, h) => ({ h, et: +(FARM.et0 * etShare(h + 0.5)).toFixed(2), temp: Math.round(21 + 9 * Math.max(0, Math.sin((Math.PI * (h - 8)) / 12))) }));
export interface Advice { tone: "good" | "warn" | "info"; day: string; text: string }
/** what to do with the irrigation plan, worked out from the forecast */
export function advice(): Advice[] {
  const out: Advice[] = [];
  forecast().forEach((x) => {
    if (x.rain >= 1) out.push({ tone: "good", day: x.d, text: `Skip the night irrigation on ${x.d}: ${x.rain} mm of rain is forecast, about ${fmt(Math.round(x.rain * 0.8 * FARM.feddan * M2 / 1000))} m³ saved` });
    else if (x.et0 > FARM.et0 * 1.12) out.push({ tone: "warn", day: x.d, text: `Hot and windy on ${x.d} (ET ${x.et0} mm): add about ${Math.round((x.et0 / FARM.et0 - 1) * 100)}% to the plan` });
  });
  out.push({ tone: "warn", day: "Today", text: "P4 is not being irrigated (tower 7 tripped): repair it or move its water to tonight's window" });
  out.push({ tone: "info", day: "Today", text: "Potatoes on P8 use the most water per day: keep the evening window on schedule" });
  return out;
}

/* ---------- electricity: sample time-of-use tariff, LE per kWh ---------- */
export const TARIFF = [
  { from: 0, to: 6, name: "Off-peak", rate: 0.9 }, { from: 6, to: 17, name: "Standard", rate: 1.35 },
  { from: 17, to: 22, name: "Peak", rate: 1.9 }, { from: 22, to: 24, name: "Off-peak", rate: 0.9 },
];
export const bandAt = (h: number) => TARIFF.find((b) => h >= b.from && h < b.to)!;
export interface LoadPt { h: number; kw: number; pump: number; rate: number; band: string }
/** the farm's power draw hour by hour today: the pumps, plus drives and buildings */
export function loadProfile(): LoadPt[] {
  return Array.from({ length: 24 }, (_, h) => {
    const pump = STATIONS.reduce((s, x) => s + stationNow(x.id, h + 0.5).kw, 0);
    return { h, pump: Math.round(pump), kw: Math.round(pump + 31), rate: bandAt(h).rate, band: bandAt(h).name };
  });
}
export function energyToday() {
  const lp = loadProfile();
  const kwh = lp.reduce((s, p) => s + p.kw, 0);
  const cost = lp.reduce((s, p) => s + p.kw * p.rate, 0);
  const peakPump = lp.filter((p) => p.band === "Peak").reduce((s, p) => s + p.pump, 0);
  return { kwh, cost, avgRate: cost / kwh, peakShare: peakPump / lp.reduce((s, p) => s + p.pump, 0), shiftSaving: peakPump * 0.5 * (1.9 - 0.9) };
}
/** the year so far, month by month: water used against plan, and the pumping energy that took */
export const monthly = () => series({ range: "YTD" }).map((p) => ({ t: p.t, used: Math.round(p.applied / 1000), plan: Math.round((p.demand * 1.08) / 1000), mwh: +((p.applied * SPECIFIC_ENERGY) / 1000).toFixed(0) }));
