/* ================= Smart Water Network: the data model (all numbers are sample data) =================
   One tree of pipes from the treatment plant, a few loops and closed ties between zones.
   Demand follows a 24-hour profile per zone; flow, pressure, water age and chlorine are worked out from it
   (Hazen-Williams head loss), so every map colour is consistent with every other number. */
import type { Tone } from "./data";

export type ZoneId = "Z1" | "Z3" | "Z4" | "Z5" | "Z6" | "Z7" | "Z8";
export type Profile = "residential" | "commercial" | "mixed";

export interface Zone {
  id: ZoneId; name: string; profile: Profile;
  /** average billed consumption, m³ per day */
  daily: number;
  /** share of what enters the zone that is lost (leaks, theft, unbilled): the non-revenue water */
  nrw: number;
  ground: number; // ground level, m
  label: { x: number; y: number };
}

export const ZONES: Zone[] = [
  { id: "Z1", name: "Banafseg", profile: "mixed", daily: 21000, nrw: 0.11, ground: 66, label: { x: 540, y: 90 } },
  { id: "Z3", name: "Rehab", profile: "residential", daily: 34000, nrw: 0.17, ground: 62, label: { x: 760, y: 280 } },
  { id: "Z4", name: "Lotus", profile: "residential", daily: 20000, nrw: 0.21, ground: 58, label: { x: 620, y: 560 } },
  { id: "Z5", name: "Police Academy", profile: "commercial", daily: 9000, nrw: 0.08, ground: 64, label: { x: 160, y: 120 } },
  { id: "Z6", name: "New Cairo", profile: "mixed", daily: 14000, nrw: 0.12, ground: 62, label: { x: 140, y: 220 } },
  { id: "Z7", name: "El Qahera El Gedida", profile: "residential", daily: 7000, nrw: 0.09, ground: 60, label: { x: 120, y: 330 } },
  { id: "Z8", name: "Mostakbal City", profile: "residential", daily: 11000, nrw: 0.14, ground: 58, label: { x: 260, y: 380 } },
];
export const zoneById = (id: ZoneId) => ZONES.find((z) => z.id === id)!;

/** hourly demand pattern, 0h to 23h (scaled so the average is exactly 1) */
const RAW: Record<Profile, number[]> = {
  residential: [0.45, 0.38, 0.35, 0.35, 0.45, 0.75, 1.25, 1.55, 1.4, 1.15, 1.05, 1.0, 1.05, 1.05, 1.0, 0.95, 1.0, 1.1, 1.3, 1.4, 1.3, 1.1, 0.8, 0.55],
  commercial: [0.3, 0.28, 0.27, 0.28, 0.32, 0.5, 0.85, 1.25, 1.55, 1.6, 1.55, 1.5, 1.45, 1.5, 1.5, 1.4, 1.2, 1.0, 0.8, 0.65, 0.55, 0.45, 0.38, 0.33],
  mixed: [0.4, 0.35, 0.32, 0.33, 0.42, 0.65, 1.05, 1.4, 1.5, 1.4, 1.3, 1.25, 1.25, 1.25, 1.25, 1.15, 1.1, 1.05, 1.05, 1.05, 0.95, 0.8, 0.6, 0.47],
};
export const PROFILES: Record<Profile, number[]> = Object.fromEntries(
  (Object.keys(RAW) as Profile[]).map((k) => { const m = RAW[k].reduce((a, b) => a + b, 0) / 24; return [k, RAW[k].map((v) => v / m)]; }),
) as Record<Profile, number[]>;

/** profile value at a fractional hour, wrapping around midnight */
export function factor(p: Profile, hour: number) {
  const h = ((hour % 24) + 24) % 24, i = Math.floor(h), f = h - i, a = PROFILES[p];
  return a[i] * (1 - f) + a[(i + 1) % 24] * f;
}

/* ---------- nodes ---------- */
export type NodeKind = "plant" | "pump" | "tank" | "junction" | "demand";
export interface WNode { id: string; x: number; y: number; kind: NodeKind; zone?: ZoneId; /** share of the zone demand taken here */ w: number; name?: string }

const n = (id: string, x: number, y: number, kind: NodeKind, zone?: ZoneId, w = 0, name?: string): WNode => ({ id, x, y, kind, zone, w, name });
export const NODES: WNode[] = [
  n("wtp", 60, 300, "plant", undefined, 0, "New Cairo Water Treatment Plant"),
  n("ps1", 170, 300, "pump", undefined, 0, "Pump station PS-1"),
  n("j0", 290, 300, "junction", undefined, 0, "Distribution hub"),
  n("res", 290, 200, "tank", undefined, 0, "Elevated reservoir"),
  n("ps2", 290, 420, "pump", undefined, 0, "Booster station PS-2"),
  n("j1", 420, 300, "junction", undefined, 0, "East hub"),
  // Z1 Banafseg
  n("a1", 500, 210, "demand", "Z1", 2), n("a2", 590, 160, "demand", "Z1", 3), n("a3", 500, 120, "demand", "Z1", 2), n("a4", 660, 230, "demand", "Z1", 3), n("a5", 600, 250, "demand", "Z1", 3),
  // Z3 Rehab
  n("c1", 540, 310, "demand", "Z3", 2), n("c2", 640, 300, "demand", "Z3", 3), n("c3", 740, 310, "demand", "Z3", 3), n("c4", 640, 380, "demand", "Z3", 3), n("c5", 760, 400, "demand", "Z3", 3), n("c6", 860, 330, "demand", "Z3", 3),
  // Z4 Lotus
  n("d1", 520, 420, "demand", "Z4", 2), n("d2", 620, 470, "demand", "Z4", 3), n("d3", 520, 510, "demand", "Z4", 3), n("d4", 720, 460, "demand", "Z4", 3), n("d5", 730, 540, "demand", "Z4", 2),
  // the four districts west of the reservoir
  n("pa1", 80, 80, "demand", "Z5", 1), n("nc1", 70, 170, "demand", "Z6", 1), n("qg1", 50, 260, "demand", "Z7", 1), n("mc1", 150, 300, "demand", "Z8", 1),
];
export const nodeById = (id: string) => NODES.find((x) => x.id === id)!;

/* ---------- pipes ---------- */
export type PipeKind = "tree" | "loop" | "tie";
export interface Pipe {
  id: string; from: string; to: string; zone: ZoneId | "trunk"; kind: PipeKind;
  /** pump head added along this pipe, m */
  boost: number;
  /** length in m (the map is about 4 km wide) */
  length: number;
  /** nominal diameter in mm, picked so the peak velocity stays under 2 m/s */
  dn: number;
}

const PX = 4; // metres per map unit
let seq = 0;
const pipe = (from: string, to: string, zone: ZoneId | "trunk", kind: PipeKind = "tree", boost = 0): Pipe => {
  const a = nodeById(from), b = nodeById(to);
  return { id: `P${String(++seq).padStart(2, "0")}`, from, to, zone, kind, boost, length: Math.round(Math.hypot(a.x - b.x, a.y - b.y) * PX), dn: 0 };
};
export const PIPES: Pipe[] = [
  // trunk: plant, pumps, reservoir and the two hubs
  pipe("wtp", "ps1", "trunk"), pipe("ps1", "j0", "trunk", "tree", 0), pipe("j0", "res", "trunk"), pipe("j0", "j1", "trunk"), pipe("j0", "ps2", "trunk", "tree", 14), 
  // Z1
  pipe("j1", "a1", "Z1"), pipe("a1", "a2", "Z1"), pipe("a1", "a3", "Z1"), pipe("a2", "a4", "Z1"), pipe("a1", "a5", "Z1"), pipe("a5", "a4", "Z1", "loop"),
  // Z3
  pipe("j1", "c1", "Z3"), pipe("c1", "c2", "Z3"), pipe("c2", "c3", "Z3"), pipe("c2", "c4", "Z3"), pipe("c3", "c6", "Z3"), pipe("c4", "c5", "Z3"), pipe("c5", "c6", "Z3", "loop"),
  // Z4
  pipe("ps2", "d1", "Z4"), pipe("d1", "d2", "Z4"), pipe("d1", "d3", "Z4"), pipe("d2", "d4", "Z4"), pipe("d4", "d5", "Z4"), pipe("d3", "d2", "Z4", "loop"),
  // west districts, each a single feeder from the hub, with no known leak
  pipe("j0", "pa1", "Z5"), pipe("j0", "nc1", "Z6"), pipe("j0", "qg1", "Z7"), pipe("j0", "mc1", "Z8"),
  // closed ties between zones (isolation valves, no flow)
  pipe("a5", "c2", "Z1", "tie"), pipe("d2", "c4", "Z4", "tie"),
];
export const pipeById = (id: string) => PIPES.find((p) => p.id === id)!;
export const pipeBetween = (a: string, b: string) => PIPES.find((p) => (p.from === a && p.to === b) || (p.from === b && p.to === a))!;

/* ---------- bursts and leaks that are known today ---------- */
export interface Leak { id: string; pipe: string; rate: number; since: string; status: "Suspected" | "Confirmed" | "Crew assigned"; note: string }
export const LEAKS: Leak[] = [
  { id: "LK-A", pipe: pipeBetween("c2", "c4").id, rate: 12, since: "3 days", status: "Crew assigned", note: "DN300 main, Rehab, joint failure" },
  { id: "LK-C", pipe: pipeBetween("d1", "d3").id, rate: 9, since: "6 days", status: "Confirmed", note: "Corroded cast iron, Lotus" },
];

/* ---------- the solver ---------- */
const HW_C = 100;
const TANK_VOL = 45000; // m³
export interface PipeState { flow: number; velocity: number; /** velocity against the 2 m/s design limit, 0 to 1+ */ load: number; headloss: number; pressure: number; leak: number; closed: boolean; reverse: boolean }
export interface NodeState { demand: number; head: number; pressure: number; age: number; chlorine: number }
export interface ZoneState { demand: number; loss: number; supplied: number; nrw: number; pressure: number; minPressure: number; minChlorine: number; leaks: number }
export interface Snapshot {
  hour: number; nodes: Record<string, NodeState>; pipes: Record<string, PipeState>; zones: Record<ZoneId, ZoneState>;
  supplied: number; plant: number; billed: number; loss: number; tank: number; tankFlow: number;
}

/** parent pipe of every node in the tree, and a parents-first order */
const ORDER: string[] = [];
const PARENT = new Map<string, Pipe>();
{
  const kids = new Map<string, Pipe[]>();
  for (const p of PIPES.filter((x) => x.kind === "tree")) (kids.get(p.from) ?? kids.set(p.from, []).get(p.from)!).push(p);
  const walk = (id: string) => { ORDER.push(id); for (const p of kids.get(id) ?? []) { PARENT.set(p.to, p); walk(p.to); } };
  walk("j0");
  // the plant side hangs off the hub the other way round: wtp -> ps1 -> j0
}
const LEAK_BY_PIPE = new Map(LEAKS.map((l) => [l.pipe, l]));

/** node demand (L/s) for a zone at an hour: billed use plus the background loss that comes with it */
function zoneDemand(z: Zone, hour: number) {
  const billed = (z.daily * 1000) / 86400 * factor(z.profile, hour);
  const loss = billed * (z.nrw / (1 - z.nrw));
  return { billed, loss };
}

function solve(hour: number): Snapshot {
  const nodes: Record<string, NodeState> = {};
  const wsum = new Map<ZoneId, number>();
  for (const x of NODES) if (x.zone) wsum.set(x.zone, (wsum.get(x.zone) ?? 0) + x.w);
  const zd = new Map(ZONES.map((z) => [z.id, zoneDemand(z, hour)]));
  const demand = new Map<string, number>();
  for (const x of NODES) {
    const base = x.zone && x.w ? ((zd.get(x.zone)!.billed + zd.get(x.zone)!.loss) * x.w) / wsum.get(x.zone)! : 0;
    demand.set(x.id, base);
  }
  // known bursts take their water at the pipe's far end
  for (const l of LEAKS) { const p = pipeById(l.pipe); demand.set(p.to, (demand.get(p.to) ?? 0) + l.rate); }

  // flow in a tree pipe = demand of everything below it
  const sub = new Map<string, number>();
  for (const id of [...ORDER].reverse()) {
    let s = demand.get(id) ?? 0;
    for (const p of PIPES) if (p.kind === "tree" && p.from === id && PARENT.get(p.to) === p) s += sub.get(p.to) ?? 0;
    sub.set(id, s);
  }
  const totalDemand = sub.get("j0")!;
  // the plant runs flat out all day at the average; the reservoir covers the difference
  const avgDemand = ZONES.reduce((a, z) => { const d = zoneDemand(z, 0); return a + (d.billed + d.loss) / factor(z.profile, 0); }, 0) + LEAKS.reduce((a, l) => a + l.rate, 0);
  const plant = avgDemand;
  const tankFlow = plant - totalDemand; // + fills, - empties

  // reservoir level: the day's net flow, centred so the swing sits around 60 %
  const tank = tankLevel(hour);
  const hgl0 = 96 + tank * 0.12;

  const pipes: Record<string, PipeState> = {};
  const head = new Map<string, number>([["j0", hgl0]]);
  const age = new Map<string, number>([["j0", 4]]);
  const area = (dn: number) => Math.PI * (dn / 2000) ** 2;
  const hf = (p: Pipe, q: number) => (10.67 * p.length * Math.pow(Math.abs(q) / 1000, 1.852)) / (Math.pow(HW_C, 1.852) * Math.pow(p.dn / 1000, 4.87));
  const flowOf = (p: Pipe) => {
    if (p.to === "res") return tankFlow;
    if (p.id === PIPES[0].id || p.id === PIPES[1].id) return plant;
    return sub.get(p.to) ?? 0;
  };

  for (const id of ORDER) {
    const p = PARENT.get(id);
    if (!p) continue;
    const q = flowOf(p);
    const loss = hf(p, q);
    head.set(id, head.get(p.from)! - loss + p.boost);
    const v = Math.abs(q) / 1000 / area(p.dn);
    age.set(id, age.get(p.from)! + (p.length / Math.max(v, 0.08)) / 3600);
  }
  // plant side: wtp and ps1 sit behind the hub
  head.set("ps1", hgl0 + 6); head.set("wtp", hgl0 + 10); age.set("ps1", 0); age.set("wtp", 0);

  for (const x of NODES) {
    const h = head.get(x.id) ?? hgl0;
    const ground = x.zone ? zoneById(x.zone).ground : x.id === "res" ? 60 : x.id === "wtp" ? 50 : 60;
    const a = age.get(x.id) ?? 0;
    // the reservoir level is a tank, not a pressure point
    nodes[x.id] = { demand: demand.get(x.id) ?? 0, head: h, pressure: Math.max(0, (h - ground) / 10.2), age: a, chlorine: 0.9 * Math.exp(-0.04 * a) };
  }

  for (const p of PIPES) {
    let q = 0, loss = 0;
    if (p.kind === "tree") { q = flowOf(p); loss = hf(p, q); }
    else if (p.kind === "loop") q = 0.1 * (sub.get(p.to) ?? 0);
    const v = Math.abs(q) / 1000 / area(p.dn);
    const pa = nodes[p.from].pressure, pb = nodes[p.to].pressure;
    pipes[p.id] = { flow: Math.abs(q), velocity: v, load: v / 2, headloss: loss, pressure: (pa + pb) / 2, leak: LEAK_BY_PIPE.get(p.id)?.rate ?? 0, closed: p.kind === "tie", reverse: q < 0 };
  }

  const zones = {} as Record<ZoneId, ZoneState>;
  for (const z of ZONES) {
    const d = zd.get(z.id)!;
    const burst = LEAKS.filter((l) => pipeById(l.pipe).zone === z.id).reduce((a, l) => a + l.rate, 0);
    const mine = NODES.filter((x) => x.zone === z.id);
    const ps = mine.map((x) => nodes[x.id].pressure);
    const supplied = d.billed + d.loss + burst;
    zones[z.id] = {
      demand: d.billed, loss: d.loss + burst, supplied, nrw: (d.loss + burst) / supplied,
      pressure: ps.reduce((a, b) => a + b, 0) / ps.length, minPressure: Math.min(...ps),
      minChlorine: Math.min(...mine.map((x) => nodes[x.id].chlorine)), leaks: LEAKS.filter((l) => pipeById(l.pipe).zone === z.id).length,
    };
  }
  const billed = ZONES.reduce((a, z) => a + zones[z.id].demand, 0);
  return { hour, nodes, pipes, zones, supplied: totalDemand, plant, billed, loss: totalDemand - billed, tank, tankFlow };
}

/** reservoir level in % through the day (a closed loop: it ends where it starts) */
let LEVELS: number[] | null = null;
function tankLevel(hour: number) {
  if (!LEVELS) {
    let avg = 0;
    const tot = (h: number) => ZONES.reduce((a, z) => { const d = zoneDemand(z, h); return a + d.billed + d.loss; }, 0) + LEAKS.reduce((a, l) => a + l.rate, 0);
    for (let h = 0; h < 24; h++) avg += tot(h) / 24;
    let acc = 0;
    const raw: number[] = [];
    for (let h = 0; h < 24; h++) { raw.push(acc); acc += (avg - tot(h)) * 3600; } // L over the hour
    const lo = Math.min(...raw), hi = Math.max(...raw), mid = (lo + hi) / 2;
    LEVELS = raw.map((v) => 60 + ((v - mid) / 1000 / TANK_VOL) * 100);
  }
  const h = ((hour % 24) + 24) % 24, i = Math.floor(h), f = h - i;
  return LEVELS[i] * (1 - f) + LEVELS[(i + 1) % 24] * f;
}

const CACHE = new Map<number, Snapshot>();
/** the whole network at an hour of the day (0 to 24); results are cached by quarter-hour */
export function networkAt(hour: number): Snapshot {
  const k = Math.round((((hour % 24) + 24) % 24) * 4) % 96;
  let s = CACHE.get(k);
  if (!s) { s = solve(k / 4); CACHE.set(k, s); }
  return s;
}

// size every pipe once, from its peak flow over the day
{
  const peak = new Map<string, number>();
  let totalSum = 0;
  for (let k = 0; k < 96; k++) {
    // diameters are still zero here, so only flows are read (they do not depend on diameter)
    const s = solveFlowsOnly(k / 4);
    for (const [id, q] of Object.entries(s)) peak.set(id, Math.max(peak.get(id) ?? 0, q));
    totalSum += PIPES.filter((p) => p.from === "j0" && p.to !== "res" && p.kind === "tree").reduce((a, p) => a + s[p.id], 0);
  }
  // the plant runs flat at the daily average, so its two pipes are sized for that, not for the peak
  peak.set(PIPES[0].id, totalSum / 96); peak.set(PIPES[1].id, totalSum / 96);
  const SIZES = [150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200];
  for (const p of PIPES) {
    const q = (peak.get(p.id) ?? 0) / 1000;
    const need = Math.sqrt((4 * q) / (Math.PI * 2)) * 1000; // mm for 2 m/s
    p.dn = SIZES.find((d) => d >= need) ?? 1200;
    if (p.dn < 150) p.dn = 150;
  }
  CACHE.clear();
}

/** flows only (no head loss): used once, to size the pipes */
function solveFlowsOnly(hour: number): Record<string, number> {
  const wsum = new Map<ZoneId, number>();
  for (const x of NODES) if (x.zone) wsum.set(x.zone, (wsum.get(x.zone) ?? 0) + x.w);
  const demand = new Map<string, number>();
  for (const x of NODES) {
    const d = x.zone && x.w ? zoneDemand(zoneById(x.zone), hour) : null;
    demand.set(x.id, d ? ((d.billed + d.loss) * x.w) / wsum.get(x.zone!)! : 0);
  }
  for (const l of LEAKS) { const p = pipeById(l.pipe); demand.set(p.to, (demand.get(p.to) ?? 0) + l.rate); }
  const sub = new Map<string, number>();
  for (const id of [...ORDER].reverse()) {
    let s = demand.get(id) ?? 0;
    for (const p of PIPES) if (p.kind === "tree" && p.from === id && PARENT.get(p.to) === p) s += sub.get(p.to) ?? 0;
    sub.set(id, s);
  }
  const out: Record<string, number> = {};
  const total = sub.get("j0")!;
  for (const p of PIPES) {
    if (p.kind === "tree") out[p.id] = p.to === "res" ? 800 : p.id === PIPES[0].id || p.id === PIPES[1].id ? total : sub.get(p.to) ?? 0;
    else if (p.kind === "loop") out[p.id] = 0.1 * (sub.get(p.to) ?? 0);
    else out[p.id] = 0;
  }
  return out;
}

/** one point per hour: what the plant sends, what customers use, what is lost */
export function dayCurve() {
  return Array.from({ length: 24 }, (_, h) => {
    const s = networkAt(h);
    return { h, label: `${String(h).padStart(2, "0")}:00`, supplied: Math.round(s.supplied), billed: Math.round(s.billed), loss: Math.round(s.loss), tank: Math.round(s.tank), plant: Math.round(s.plant) };
  });
}

/* ---------- instruments ---------- */
export type InstrumentType = "flow" | "pressure" | "quality" | "level" | "pump" | "leak" | "prv";
export interface Instrument { id: string; type: InstrumentType; name: string; /** a node id, or a pipe id (the icon sits mid-pipe) */ at: { node?: string; pipe?: string }; /** a fault set by hand for the demo */ forced?: "offline" }

const onPipe = (a: string, b: string) => ({ pipe: pipeBetween(a, b).id });
export const INSTRUMENTS: Instrument[] = [
  { id: "FT-01", type: "flow", name: "Plant outlet flow", at: onPipe("ps1", "j0") },
  { id: "FT-02", type: "flow", name: "Z1 inlet flow", at: onPipe("j1", "a1") },
  { id: "FT-04", type: "flow", name: "Z3 inlet flow", at: onPipe("j1", "c1") },
  { id: "FT-05", type: "flow", name: "Z4 inlet flow", at: onPipe("ps2", "d1") },
  { id: "FT-06", type: "flow", name: "Police Academy inlet flow", at: onPipe("j0", "pa1") },
  { id: "FT-07", type: "flow", name: "New Cairo inlet flow", at: onPipe("j0", "nc1") },
  { id: "FT-08", type: "flow", name: "El Qahera El Gedida inlet flow", at: onPipe("j0", "qg1") },
  { id: "FT-09", type: "flow", name: "Mostakbal City inlet flow", at: onPipe("j0", "mc1") },
  { id: "PT-01", type: "pressure", name: "PS-1 discharge pressure", at: { node: "j0" } },
  { id: "PT-02", type: "pressure", name: "Banafseg pressure", at: { node: "a4" } },
  { id: "PT-03", type: "pressure", name: "Rehab pressure", at: { node: "c6" } },
  { id: "PT-04", type: "pressure", name: "Lotus pressure", at: { node: "d5" } },
  { id: "PT-05", type: "pressure", name: "Police Academy pressure", at: { node: "pa1" } },
  { id: "PT-06", type: "pressure", name: "New Cairo pressure", at: { node: "nc1" } },
  { id: "PT-07", type: "pressure", name: "El Qahera El Gedida pressure", at: { node: "qg1" } },
  { id: "PT-08", type: "pressure", name: "Mostakbal City pressure", at: { node: "mc1" } },
  { id: "AT-01", type: "quality", name: "Chlorine after reservoir", at: { node: "j0" } },
  { id: "AT-02", type: "quality", name: "Chlorine, Rehab", at: { node: "c6" } },
  { id: "LT-01", type: "level", name: "Reservoir level", at: { node: "res" } },
  { id: "PU-01", type: "pump", name: "PS-1 duty pump", at: { node: "ps1" } },
  { id: "PU-02", type: "pump", name: "PS-2 booster pump", at: { node: "ps2" } },
  { id: "LK-02", type: "leak", name: "Acoustic logger, Rehab", at: onPipe("c2", "c4") },
  { id: "LK-03", type: "leak", name: "Acoustic logger, Lotus", at: onPipe("d1", "d3") },
  { id: "PRV-01", type: "prv", name: "PRV, Lotus inlet", at: onPipe("ps2", "d1") },
];

export interface Reading { value: number; unit: string; text: string; tone: Tone; detail: string }

/** what an instrument shows at an hour of the day */
export function readInstrument(inst: Instrument, hour: number): Reading {
  const s = networkAt(hour);
  const nd = inst.at.node ? s.nodes[inst.at.node] : undefined;
  const pp = inst.at.pipe ? s.pipes[inst.at.pipe] : undefined;
  const off: Reading = { value: 0, unit: "", text: "Offline", tone: "bad", detail: "No signal for 2 hours" };
  if (inst.forced === "offline") return off;
  switch (inst.type) {
    case "flow": {
      const q = pp!.flow;
      return { value: q, unit: "L/s", text: `${q.toFixed(0)} L/s`, tone: pp!.load > 0.95 ? "warn" : "good", detail: `${(pp!.velocity).toFixed(2)} m/s in DN${pipeById(inst.at.pipe!).dn}` };
    }
    case "pressure": {
      const b = nd!.pressure;
      return { value: b, unit: "bar", text: `${b.toFixed(1)} bar`, tone: b < 1.5 ? "bad" : b < 2.5 || b > 7 ? "warn" : "good", detail: b < 2.5 ? "Below the 2.5 bar service minimum" : "Within 2.5 to 7 bar" };
    }
    case "quality": {
      const c = nd!.chlorine;
      return { value: c, unit: "mg/L", text: `${c.toFixed(2)} mg/L`, tone: c < 0.2 ? "bad" : c < 0.35 ? "warn" : "good", detail: `Water age ${nd!.age.toFixed(1)} h` };
    }
    case "level": {
      const l = s.tank;
      return { value: l, unit: "%", text: `${l.toFixed(0)} %`, tone: l < 25 ? "bad" : l < 35 ? "warn" : "good", detail: s.tankFlow >= 0 ? `Filling at ${s.tankFlow.toFixed(0)} L/s` : `Emptying at ${(-s.tankFlow).toFixed(0)} L/s` };
    }
    case "pump": {
      const run = inst.id === "PU-01" ? s.plant : s.zones.Z4.supplied;
      return { value: run, unit: "L/s", text: "Running", tone: "good", detail: `${run.toFixed(0)} L/s delivered` };
    }
    case "leak": {
      const l = LEAK_BY_PIPE.get(inst.at.pipe!);
      const db = l ? 52 + l.rate * 1.6 : 33 + (inst.id.charCodeAt(4) % 4);
      return { value: db, unit: "dB", text: `${db.toFixed(0)} dB`, tone: l ? "bad" : "good", detail: l ? `Leak of about ${l.rate} L/s` : "No leak noise" };
    }
    case "prv": {
      const out = pp!.pressure;
      return { value: out, unit: "bar", text: `${out.toFixed(1)} bar`, tone: "good", detail: "Holding the downstream set point" };
    }
  }
}

/* ---------- numbers the other screens quote ---------- */
export const NET = (() => {
  const d = dayCurve();
  const supplied = d.reduce((a, x) => a + x.supplied, 0) * 3.6; // L/s each hour -> m³
  const billed = d.reduce((a, x) => a + x.billed, 0) * 3.6;
  return { supplied: Math.round(supplied), billed: Math.round(billed), nrw: (supplied - billed) / supplied, pipes: PIPES.length, km: Math.round(PIPES.reduce((a, p) => a + p.length, 0) / 100) / 10, instruments: INSTRUMENTS.length };
})();
