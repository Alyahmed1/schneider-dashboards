import { useCallback, useEffect, useRef, useState } from "react";
import { PIVOTS, type PivotId } from "./pivots";
import { DAY0, conditions, seedAlarms, syncAlarms, isActive, type Alarm } from "./alarmdata";

/** simulated state of the four pivots (no backend). Everything on screen reads from here, so the tabs always agree. */
export type Nz = "on" | "off" | "fault";
export const NOZZLES = 16;
export const SENSORS = 8;
export type Status = "on" | "off" | "fault";

/* ---------- who may do what (simulated roles; real login comes with the backend) ---------- */
export type Role = "Operator" | "Supervisor" | "Admin";
export interface Who { name: string; role: Role }
export type Level = "operate" | "tune" | "configure";
const RANK: Record<Role, number> = { Operator: 0, Supervisor: 1, Admin: 2 };
const NEED: Record<Level, number> = { operate: 0, tune: 1, configure: 2 };
export const can = (r: Role, l: Level) => RANK[r] >= NEED[l];
export const needs = (l: Level): Role => (l === "tune" ? "Supervisor" : l === "configure" ? "Admin" : "Operator");

export interface PivotState {
  id: PivotId;
  running: boolean;
  speed: number;         // percentimeter, %
  angle: number;         // position of the span, degrees clockwise from north
  fieldWater: number;    // %
  wind: number;          // gusts, km/h
  moisture: number[];    // M1..M8, %
  nozzles: Nz[];         // V1..V16
  flow: number;          // m3/h with every nozzle open
  win: [number, number]; // irrigation window (start hour, end hour): the pivot starts and stops by itself
  usedToday: number;     // m3
  hist: number[];        // m3 per hour so far today
  fault?: string;        // a fault that stops the pivot until it is reset
  dryLimit: number;      // moisture % below which the soil is too dry
  skipRain: boolean;     // skip the irrigation of a day with rain expected
  link: "ok" | "lost";   // signal from the pivot controller; when lost the values stop updating
  lastSeen: number;      // last time the controller answered (day * 1440 + minute)
}
export interface Pumps { on: boolean[]; from: number; to: number }
export interface EventRec { id: string; at: number; who: string; role: Role | "System"; pivot: PivotId | null; text: string }
export interface Fleet { clock: number; sub: number; day: number; alarms: Alarm[]; events: EventRec[]; pivots: Record<PivotId, PivotState>; storage: number[]; pumps: Pumps }

const nz = (bad: Record<number, Nz> = {}): Nz[] => Array.from({ length: NOZZLES }, (_, i) => bad[i + 1] ?? "on");

type Seed = Omit<PivotState, "id" | "usedToday" | "hist" | "link" | "lastSeen">;
const SEED: Record<PivotId, Seed> = {
  P1: { running: true, speed: 16, angle: 128, fieldWater: 55, wind: 28, moisture: [14, 18, 25, 32, 37, 44, 56, 63], nozzles: nz({ 4: "fault" }), flow: 120, win: [22, 4], dryLimit: 28, skipRain: true },
  P2: { running: true, speed: 20, angle: 252, fieldWater: 52, wind: 26, moisture: [22, 26, 31, 35, 38, 41, 45, 49], nozzles: nz(), flow: 115, win: [0, 6], dryLimit: 28, skipRain: true },
  P3: { running: false, speed: 18, angle: 355, fieldWater: 61, wind: 24, moisture: [30, 34, 37, 40, 42, 45, 47, 50], nozzles: nz(), flow: 130, win: [20, 2], dryLimit: 28, skipRain: true },
  P4: { running: false, speed: 14, angle: 214, fieldWater: 47, wind: 31, moisture: [17, 19, 21, 23, 26, 27, 29, 31], nozzles: nz({ 10: "fault" }), flow: 125, win: [2, 8], dryLimit: 28, skipRain: true, fault: "Tower 7 drive tripped" },
};
const FAULT_AT: Partial<Record<PivotId, number>> = { P4: 192 }; // 03:12
export const START_CLOCK = 220; // 03:40, so P1 and P2 are inside their windows, P3 has finished and P4 has tripped

export const onCount = (p: PivotState) => p.nozzles.filter((n) => n === "on").length;
export const flowNow = (p: PivotState) => (p.running && !p.fault ? (p.flow * onCount(p)) / NOZZLES : 0);
/** alarms that are still active (not yet back to normal), for one pivot or all */
export const activeAlarms = (f: Fleet, id?: PivotId) => f.alarms.filter((a) => isActive(a) && (id === undefined || a.pivot === id));
export const nowMin = (f: Fleet) => f.day * 1440 + f.clock;
export const statusOf = (p: PivotState): Status => (p.fault ? "fault" : p.running ? "on" : "off");
export const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
/** application depth in mm: slower span, deeper pass */
export const applicationOf = (p: PivotState) => Math.round((2.4 / (p.speed / 100)) * 10) / 10;
export const pressureOf = (p: PivotState) => (p.running && !p.fault ? 3.2 : 0);

export const inWindow = (h: number, w: [number, number]) => (w[0] === w[1] ? false : w[0] < w[1] ? h >= w[0] && h < w[1] : h >= w[0] || h < w[1]);
export const windowHours = (w: [number, number]) => (w[1] - w[0] + 24) % 24;
/** hourly planned flow (m3/h) for the 24 hours of today */
export const planned = (p: PivotState) => Array.from({ length: 24 }, (_, h) => (inWindow(h, p.win) ? p.flow : 0));
/** hourly flow so far today: past hours as run, the current hour live, the rest null */
export function actual(p: PivotState, clock: number): (number | null)[] {
  const now = Math.floor(clock / 60);
  return p.hist.map((v, h) => (h > now ? null : h === now ? Math.round(flowNow(p)) : Math.round(v)));
}

/** what must be true before a pivot may start */
export interface Check { ok: boolean; label: string }
export const WIND_STOP = 45;
export const TANK_MIN = 30;
export function startChecks(f: Fleet, id: PivotId): Check[] {
  const p = f.pivots[id];
  return [
    { ok: !p.fault, label: "No active fault" },
    { ok: p.link === "ok", label: "Signal from the pivot" },
    { ok: Math.min(...f.storage) >= TANK_MIN, label: `Every tank above ${TANK_MIN}%` },
    { ok: p.wind < WIND_STOP, label: `Wind gusts below ${WIND_STOP} km/h` },
    { ok: onCount(p) > 0, label: "At least one nozzle open" },
  ];
}

/** what the pivot already did today at the start time (the faulted one stopped when it tripped) */
function history(s: Seed, id: PivotId): number[] {
  const now = Math.floor(START_CLOCK / 60), frac = (START_CLOCK % 60) / 60;
  const at = FAULT_AT[id];
  const tmp = { ...s, id } as PivotState;
  return Array.from({ length: 24 }, (_, h) => {
    if (h > now || !inWindow(h, s.win)) return 0;
    let share = h === now ? frac : 1;
    if (at != null) share = Math.max(0, Math.min(share, (at - h * 60) / 60));
    return flowFull(tmp) * share;
  });
}
const flowFull = (p: PivotState) => (p.flow * onCount(p)) / NOZZLES;

const ev = (d: number, h: number, m: number, who: string, role: Role | "System", pivot: PivotId | null, text: string): Omit<EventRec, "id"> => ({ at: (DAY0 - d) * 1440 + h * 60 + m, who, role, pivot, text });
const SEED_EVENTS: Omit<EventRec, "id">[] = [
  ev(0, 3, 12, "System", "System", "P4", "Stopped: Tower 7 drive tripped"),
  ev(0, 2, 0, "System", "System", "P4", "Started by its irrigation window"),
  ev(0, 2, 0, "System", "System", "P3", "Stopped: irrigation window ended"),
  ev(0, 0, 0, "System", "System", "P2", "Started by its irrigation window"),
  ev(1, 22, 0, "System", "System", "P1", "Started by its irrigation window"),
  ev(1, 20, 0, "System", "System", "P3", "Started by its irrigation window"),
  ev(1, 15, 5, "Administrator", "Supervisor", "P1", "Changed the irrigation window to 22:00 to 04:00"),
  ev(1, 14, 25, "Administrator", "Operator", "P4", "Closed nozzle V10 (blocked)"),
  ev(2, 9, 12, "Administrator", "Operator", "P1", "Closed nozzle V4 (blocked)"),
  ev(3, 11, 25, "Administrator", "Supervisor", null, "Set the pumping window to 22:00 to 06:00"),
];

function initial(): Fleet {
  const pivots = {} as Record<PivotId, PivotState>;
  for (const p of PIVOTS) {
    const s = SEED[p.id];
    const hist = history(s, p.id);
    pivots[p.id] = { ...s, id: p.id, hist, usedToday: hist.reduce((a, b) => a + b, 0), link: "ok", lastSeen: DAY0 * 1440 + START_CLOCK };
  }
  const storage = [78, 86, 93];
  const events = SEED_EVENTS.sort((a, b) => b.at - a.at).map((e, i) => ({ ...e, id: `e${i + 1}` }));
  return { clock: START_CLOCK, sub: 0, day: DAY0, alarms: seedAlarms(conditions(pivots, storage)), events, pivots, storage, pumps: { on: [true, true, true], from: 22, to: 6 } };
}

export interface Actions {
  toggle: (id: PivotId) => void;
  setSpeed: (id: PivotId, v: number) => void;
  toggleNozzle: (id: PivotId, i: number) => void;
  setWindow: (id: PivotId, w: [number, number]) => void;
  setForecast: (id: PivotId, dryLimit: number, skipRain: boolean) => void;
  setPumps: (p: Pumps) => void;
  resetFault: (id: PivotId) => void;
  repairNozzle: (id: PivotId, i: number) => void;
  ack: (alarmId: string) => void;
  unack: (alarmId: string) => void;
  /** demo tool: cut or restore the signal from a pivot */
  setLink: (id: PivotId, lost: boolean) => void;
}

const h2 = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** one tick per real second; one simulated minute every TICKS_PER_MIN ticks, so the day lasts 96 real minutes */
const TICKS_PER_MIN = 4;
export function useFleet(who: Who): [Fleet, Actions] {
  const [fleet, setFleet] = useState<Fleet>(initial);
  const whoRef = useRef(who);
  whoRef.current = who;

  useEffect(() => {
    const id = window.setInterval(() => {
      setFleet((f) => {
        const sub = (f.sub + 1) % TICKS_PER_MIN;
        const next = sub !== 0 ? f.clock : f.clock + 1 >= 1440 ? 0 : f.clock + 1;
        const wrap = next === 0 && sub === 0;
        const day = wrap ? f.day + 1 : f.day;
        const abs = day * 1440 + next;
        const h0 = Math.floor(f.clock / 60), h1 = Math.floor(next / 60);
        const pivots = {} as Record<PivotId, PivotState>;
        const events: EventRec[] = [];
        const note = (pivot: PivotId, text: string) => events.push({ id: `e${f.events.length + events.length + 1}`, at: abs, who: "System", role: "System", pivot, text });
        let runCount = 0;
        for (const k of Object.keys(f.pivots) as PivotId[]) {
          let p = f.pivots[k];
          // no signal: the dashboard keeps showing the last values it received
          if (p.link === "lost") { pivots[k] = p; continue; }
          p = { ...p, lastSeen: abs };
          if (wrap) p = { ...p, usedToday: 0, hist: Array(24).fill(0), angle: 0 };
          // the pivot starts and stops by itself with its irrigation window
          const was = inWindow(h0, p.win), is = inWindow(h1, p.win);
          if (!p.fault && !was && is) { p = { ...p, running: true, angle: 0 }; note(k, "Started by its irrigation window"); }
          if (was && !is && p.running) { p = { ...p, running: false }; note(k, "Stopped: irrigation window ended"); }
          if (!(p.running && !p.fault)) {
            pivots[k] = { ...p, moisture: p.moisture.map((m) => Math.max(8, m - 0.004)) };
            continue;
          }
          runCount++;
          const q = flowNow(p) / 60 / TICKS_PER_MIN;
          const hist = p.hist.slice();
          hist[h1] += q;
          pivots[k] = {
            ...p,
            angle: (p.angle + p.speed * 0.2) % 360,
            usedToday: p.usedToday + q,
            hist,
            moisture: p.moisture.map((m) => Math.min(60, m + 0.02)),
            fieldWater: Math.min(80, p.fieldWater + 0.008),
          };
        }
        const pumping = inWindow(h1, [f.pumps.from, f.pumps.to]);
        const storage = f.storage.map((s, i) => Math.min(100, Math.max(20, s - runCount * 0.004 * (1 + i * 0.1) + (pumping && f.pumps.on[i] ? 0.05 : 0))));
        return {
          clock: next,
          sub,
          day,
          pivots,
          pumps: f.pumps,
          storage,
          alarms: syncAlarms(f.alarms, conditions(pivots, storage), abs),
          events: events.length ? [...events.reverse(), ...f.events].slice(0, 300) : f.events,
        };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  /** one change: checked against the role, applied, and written to the events log */
  const run = useCallback((level: Level, pivot: PivotId | null, text: string | ((f: Fleet) => string), fn: (f: Fleet) => Fleet | null) => setFleet((f) => {
    const w = whoRef.current;
    if (!can(w.role, level)) return f;
    const n = fn(f);
    if (!n) return f;
    return { ...n, events: [{ id: `e${f.events.length + 1}`, at: nowMin(f), who: w.name, role: w.role, pivot, text: typeof text === "string" ? text : text(f) }, ...n.events].slice(0, 300) };
  }), []);
  const on = (f: Fleet, id: PivotId, fn: (p: PivotState) => PivotState): Fleet => ({ ...f, pivots: { ...f.pivots, [id]: fn(f.pivots[id]) } });

  const actions: Actions = {
    toggle: (id) => run("operate", id, (f) => (f.pivots[id].running ? "Stopped the pivot" : "Started the pivot"), (f) => {
      const p = f.pivots[id];
      if (p.link === "lost") return null;
      if (!p.running && startChecks(f, id).some((c) => !c.ok)) return null;
      return on(f, id, (q) => ({ ...q, running: !q.running }));
    }),
    setSpeed: (id, v) => run("tune", id, `Set the speed to ${Math.max(4, Math.min(60, v))}%`, (f) => (f.pivots[id].link === "lost" ? null : on(f, id, (p) => ({ ...p, speed: Math.max(4, Math.min(60, v)) })))),
    toggleNozzle: (id, i) => run("operate", id, (f) => `${f.pivots[id].nozzles[i] === "on" ? "Closed" : "Opened"} nozzle V${i + 1}`, (f) => {
      const p = f.pivots[id];
      if (p.link === "lost" || p.nozzles[i] === "fault") return null;
      return on(f, id, (q) => ({ ...q, nozzles: q.nozzles.map((n, j) => (j !== i ? n : n === "on" ? "off" : "on")) }));
    }),
    setWindow: (id, w) => run("tune", id, `Changed the irrigation window to ${h2(w[0])} to ${h2(w[1])}`, (f) => on(f, id, (p) => ({ ...p, win: w }))),
    setForecast: (id, dryLimit, skipRain) => run("configure", id, `Set the dry soil limit to ${dryLimit}%, skip on rain ${skipRain ? "on" : "off"}`, (f) => on(f, id, (p) => ({ ...p, dryLimit, skipRain }))),
    setPumps: (pumps) => run("configure", null, `Set the pumping window to ${h2(pumps.from)} to ${h2(pumps.to)}, tanks ${pumps.on.map((o, i) => (o ? i + 1 : "")).filter(Boolean).join(", ") || "none"}`, (f) => ({ ...f, pumps })),
    resetFault: (id) => run("tune", id, "Reset the fault", (f) => (f.pivots[id].link === "lost" ? null : on(f, id, (p) => ({ ...p, fault: undefined, running: false })))),
    repairNozzle: (id, i) => run("tune", id, `Marked nozzle V${i + 1} as repaired`, (f) => on(f, id, (p) => ({ ...p, nozzles: p.nozzles.map((n, j) => (j === i && n === "fault" ? "on" : n)) }))),
    ack: (aid) => setFleet((f) => {
      const w = whoRef.current, a = f.alarms.find((x) => x.id === aid);
      if (!a || a.ackAt != null || !can(w.role, "operate")) return f;
      return { ...f, alarms: f.alarms.map((x) => (x.id === aid ? { ...x, ackAt: nowMin(f), ackBy: w.name } : x)), events: [{ id: `e${f.events.length + 1}`, at: nowMin(f), who: w.name, role: w.role, pivot: a.pivot, text: `Acknowledged ${a.name}` }, ...f.events].slice(0, 300) };
    }),
    unack: (aid) => setFleet((f) => ({ ...f, alarms: f.alarms.map((a) => (a.id === aid && a.rtnAt == null ? { ...a, ackAt: undefined, ackBy: undefined } : a)) })),
    setLink: (id, lost) => setFleet((f) => ({ ...on(f, id, (p) => ({ ...p, link: lost ? "lost" : "ok" })), events: [{ id: `e${f.events.length + 1}`, at: nowMin(f), who: "System", role: "System" as const, pivot: id, text: lost ? "Lost the signal from the pivot controller" : "Signal from the pivot controller restored" }, ...f.events].slice(0, 300) })),
  };
  return [fleet, actions];
}

export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(Math.floor(min % 60)).padStart(2, "0")}`;
export const hour = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
