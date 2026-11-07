/* The irrigation plan as a thing you can change: one run window per pivot, and what that plan costs.
   Everything is worked out from farm.ts (pivots, pumps, tariff), so it agrees with Farm map, Pivots, Pump stations and Water & energy. */
import { areaM2, bandAt, forecast, loadProfile, moistAt, PIVOTS, planMm, PUMPS, SPECIFIC_ENERGY, STATIONS, type Pivot, type StationId } from "./farm";

export interface Win { start: number; len: number } // hour of day the run starts (0 to 23.5) and how many hours it lasts
export type Plan = Record<string, Win>;
export const SLOTS = 48; // half-hour steps in a day
export const MIN_LEN = 2, MAX_LEN = 12;
export const FIXED_KW = 31; // drives and buildings, as in the Water & energy load profile

export const winOf = (p: Pivot): Win => ({ start: p.win[0], len: (p.win[1] - p.win[0] + 24) % 24 || 24 });
export const appliedPlan = (): Plan => Object.fromEntries(PIVOTS.map((p) => [p.id, winOf(p)]));
/** send the plan to the farm: every other screen reads these windows */
export function applyPlan(plan: Plan) {
  for (const p of PIVOTS) { const w = plan[p.id]; if (w) p.win = [w.start % 24, (w.start + w.len) % 24]; }
}
export const same = (a: Win, b: Win) => a.start === b.start && a.len === b.len;
export const changed = (plan: Plan, ref: Plan) => PIVOTS.filter((p) => !same(plan[p.id], ref[p.id])).map((p) => p.id);

/** the parts of a run inside 0 to 24 (a run that crosses midnight comes in two parts) */
export const segs = (w: Win): [number, number][] => { const e = w.start + w.len; return e <= 24 ? [[w.start, e]] : [[w.start, 24], [0, e - 24]]; };
export const runsAt = (w: Win, h: number) => segs(w).some(([a, b]) => h >= a && h < b);
export type RunState = "running" | "queued" | "done" | "fault";
export function stateAt(p: Pivot, w: Win, h: number): RunState {
  if (p.fault) return "fault";
  if (runsAt(w, h)) return "running";
  return segs(w).some(([a]) => a > h) ? "queued" : "done";
}
export const hh = (h: number) => { const m = Math.round(h * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
export const dailyM3 = (p: Pivot) => (planMm(p) * areaM2(p)) / 1000; // m³ the plan puts on in a day
export const flowOf = (p: Pivot, w: Win) => (p.fault ? 0 : dailyM3(p) / w.len); // m³/h while the pivot runs

export const CAP: Record<StationId, number> = Object.fromEntries(STATIONS.map((s) => [s.id, PUMPS.filter((x) => x.station === s.id).reduce((a, x) => a + x.flow, 0)])) as Record<StationId, number>;

export function slotFlows(plan: Plan): Record<StationId, number[]> {
  const out = { "PS-A": Array(SLOTS).fill(0), "PS-B": Array(SLOTS).fill(0), "PS-C": Array(SLOTS).fill(0) } as Record<StationId, number[]>;
  for (const p of PIVOTS) {
    const w = plan[p.id]; if (!w || p.fault) continue;
    const f = flowOf(p, w);
    for (let s = 0; s < SLOTS; s++) if (runsAt(w, (s + 0.5) / 2)) out[p.station][s] += f;
  }
  return out;
}

export interface Over { station: StationId; from: number; to: number; peak: number }
export interface Metrics { water: number; kwh: number; cost: number; kw: number[]; peakKw: number; peakShare: number; worst: number; worstStation: StationId; over: Over[]; cum: number[] }
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** what a plan costs: pump power follows the flow it asks for, priced by the time-of-use tariff */
export function metrics(plan: Plan, ref: Plan): Metrics {
  const lp = loadProfile(); // today's load as the farm runs it now (the applied plan)
  const f = slotFlows(plan), g = slotFlows(ref);
  const ids = STATIONS.map((s) => s.id);
  const kw = Array.from({ length: SLOTS }, (_, s) => {
    const d = sum(ids.map((i) => f[i][s] - g[i][s]));
    return Math.max(FIXED_KW, lp[Math.floor(s / 2)].kw + d * SPECIFIC_ENERGY);
  });
  const rate = (s: number) => bandAt(Math.floor(s / 2)).rate;
  const cost = kw.reduce((a, v, s) => a + v * 0.5 * rate(s), 0);
  const pump = kw.map((v) => v - FIXED_KW);
  const peakP = pump.reduce((a, v, s) => a + (bandAt(Math.floor(s / 2)).name === "Peak" ? v : 0), 0);
  let worst = 0, worstStation: StationId = "PS-A";
  const over: Over[] = [];
  for (const id of ids) {
    let from = -1, peak = 0;
    for (let s = 0; s <= SLOTS; s++) {
      const v = s < SLOTS ? f[id][s] : 0;
      if (s < SLOTS && v / CAP[id] > worst) { worst = v / CAP[id]; worstStation = id; }
      if (v > CAP[id] + 1) { if (from < 0) from = s; peak = Math.max(peak, v); }
      else if (from >= 0) { over.push({ station: id, from: from / 2, to: s / 2, peak }); from = -1; peak = 0; }
    }
  }
  let run = 0;
  const cum = Array.from({ length: SLOTS }, (_, s) => (run += sum(ids.map((i) => f[i][s])) * 0.5));
  return { water: sum(PIVOTS.filter((p) => !p.fault).map(dailyM3)), kwh: sum(kw) * 0.5, cost, kw, peakKw: Math.max(...kw), peakShare: sum(pump) ? peakP / sum(pump) : 0, worst, worstStation, over, cum };
}

/** soil moisture of a pivot at hour h if it followed this window */
export const moistWith = (p: Pivot, w: Win, h: number) => moistAt({ ...p, win: [w.start % 24, (w.start + w.len) % 24] } as Pivot, h);
const moistMin = (p: Pivot, w: Win) => { let m = 99; for (let h = 0.5; h <= 24; h += 1) m = Math.min(m, moistWith(p, w, h)); return m; };

export interface Sug {
  id: string; tone: "good" | "warn" | "info"; title: string; text: string;
  action?: { label: string; plan?: Plan; week?: number };
}
const withWin = (plan: Plan, id: string, w: Win): Plan => ({ ...plan, [id]: w });
const slotCost = (p: Pivot, w: Win) => { let c = 0; const f = flowOf(p, w); for (let s = 0; s < SLOTS; s++) if (runsAt(w, (s + 0.5) / 2)) c += f * SPECIFIC_ENERGY * 0.5 * bandAt(Math.floor(s / 2)).rate; return c; };
const overloads = (plan: Plan) => { const f = slotFlows(plan); return STATIONS.some((s) => f[s.id].some((v) => v > CAP[s.id] + 1)); };

/** what to change, worked out from the plan as it stands now, the soil, the tariff and the forecast */
export function suggest(plan: Plan, hour: number, m: Metrics): Sug[] {
  const out: Sug[] = [];
  // 1. a station asked for more water than its pumps can give
  for (const o of m.over.slice(0, 1)) {
    const mates = PIVOTS.filter((p) => p.station === o.station && !p.fault && runsAt(plan[p.id], (o.from + 0.25)));
    const later = mates.sort((a, b) => plan[b.id].start - plan[a.id].start)[0];
    if (later) {
      for (let d = 0.5; d <= 12; d += 0.5) {
        const w = { ...plan[later.id], start: (plan[later.id].start + d) % 24 };
        if (!overloads(withWin(plan, later.id, w))) { out.push({ id: `over-${later.id}`, tone: "warn", title: `${o.station} is asked for too much`, text: `${mates.map((x) => x.id).join(" and ")} run together from ${hh(o.from)} to ${hh(o.to)}: ${Math.round(o.peak)} m³/h against ${CAP[o.station]} m³/h of pumps. Start ${later.id} ${d} h later.`, action: { label: `Move ${later.id}`, plan: withWin(plan, later.id, w) } }); break; }
      }
    }
  }
  // 2. soil that is already dry and is not being watered
  for (const p of PIVOTS) {
    const w = plan[p.id];
    if (p.fault || runsAt(w, hour)) continue;
    const now = moistWith(p, w, hour);
    if (now < 33) {
      const start = Math.ceil(hour * 2) / 2 % 24;
      out.push({ id: `dry-${p.id}`, tone: "warn", title: `${p.id} soil is ${now.toFixed(1)}% and low`, text: `${p.crop}, ${p.stage.toLowerCase()}. Not due to run until ${hh(w.start)}. Start it at ${hh(start)} and keep ${w.len} hours.`, action: { label: `Start ${p.id} now`, plan: withWin(plan, p.id, { start, len: w.len }) } });
    }
  }
  // 3. the same water costs less in the cheap hours
  const best: { p: Pivot; w: Win; save: number }[] = [];
  for (const p of PIVOTS) {
    if (p.fault) continue;
    const cur = plan[p.id], now = slotCost(p, cur), floor = moistMin(p, cur);
    const cands = Array.from({ length: SLOTS }, (_, s) => ({ start: s / 2, len: cur.len })).map((w) => ({ w, c: slotCost(p, w) })).filter((x) => now - x.c > 30).sort((a, b) => a.c - b.c);
    for (const x of cands.slice(0, 6)) {
      if (overloads(withWin(plan, p.id, x.w))) continue;
      if (moistMin(p, x.w) < Math.min(28.5, floor)) continue;
      best.push({ p, w: x.w, save: now - x.c });
      break;
    }
  }
  for (const b of best.sort((a, c) => c.save - a.save).slice(0, 2)) {
    out.push({ id: `cost-${b.p.id}`, tone: "good", title: `Run ${b.p.id} at ${hh(b.w.start)}`, text: `Same ${b.w.len} hours, same water, cheaper power: ${hh(plan[b.p.id].start)} → ${hh(b.w.start)} saves about ${Math.round(b.save).toLocaleString("en-US")} LE a day. The soil stays above 28%.`, action: { label: "Move it", plan: withWin(plan, b.p.id, b.w) } });
  }
  // 4. rain in the forecast
  const rainDay = forecast().findIndex((d, i) => i > 0 && d.rain >= 1);
  if (rainDay > 0) {
    const d = forecast()[rainDay];
    out.push({ id: "rain", tone: "info", title: `${d.d}: ${d.rain} mm of rain`, text: "Skip that night's run in the week plan and keep the water.", action: { label: "Open the week", week: rainDay } });
  }
  // 5. a pivot that cannot water
  for (const p of PIVOTS.filter((x) => x.fault)) out.push({ id: `fault-${p.id}`, tone: "info", title: `${p.id} cannot irrigate`, text: `${p.fault}. Its ${plan[p.id].len} hour run is not putting water on the ${p.crop.toLowerCase()}.` });
  const rank = { warn: 0, good: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

/** the week: planned depth in mm for each pivot and day, from the forecast crop water use */
export function weekPlan(plan: Plan) {
  const days = forecast();
  const et0 = days[0].et0;
  return {
    days,
    cell: (p: Pivot, d: number) => ({ mm: planMm(p) * (days[d].et0 / et0), start: plan[p.id].start, m3: (planMm(p) * (days[d].et0 / et0) * areaM2(p)) / 1000 }),
  };
}
