import type { PivotId } from "./pivots";
import type { PivotState } from "./model";

/** Alarm lifecycle, like the other water dashboards: raised when a condition becomes true, acknowledged by a person, and cleared by itself when the condition goes away.
 *  UNACK (red) -> ACK (blue, still active) -> ACK_RTN (back to normal). A condition that clears before anyone acknowledged it is closed by "System". */
export type Sev = "Critical" | "Warning" | "Info";
export type AlarmCls = "PROCESS" | "EQUIPMENT" | "COMMUNICATION";
export type AlarmState = "UNACK" | "ACK" | "ACK_RTN";

export interface Alarm {
  id: string;
  key: string;            // the condition, so the same condition never raises two open alarms
  pivot: PivotId | null;  // null = the tanks and pumps
  sev: Sev;
  cls: AlarmCls;
  name: string;           // tag name
  group: string;
  node: string;
  limit: string;
  text: string;
  at: number;             // raised, in simulated minutes (day * 1440 + minute of the day)
  ackAt?: number;
  ackBy?: string;
  rtnAt?: number;         // returned to normal
}
export type Cond = Omit<Alarm, "id" | "at" | "ackAt" | "ackBy" | "rtnAt">;

export const stateOf = (a: Alarm): AlarmState => (a.rtnAt != null ? "ACK_RTN" : a.ackAt != null ? "ACK" : "UNACK");
export const isActive = (a: Alarm) => a.rtnAt == null;

/** the first simulated day; everything before it is history */
export const DAY0 = 7;
export const WIND_LIMIT = 30;
export const TANK_LIMIT = 35;

const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

/** every alarm condition that is true right now */
export function conditions(pivots: Record<PivotId, PivotState>, storage: number[]): Cond[] {
  const out: Cond[] = [];
  for (const p of Object.values(pivots)) {
    const base = { pivot: p.id, group: "Centre pivots", node: "PIVOT-PLC" };
    if (p.fault) out.push({ ...base, key: `${p.id}:fault`, sev: "Critical", cls: "EQUIPMENT", name: `${p.id}_DriveTrip`, limit: "ON", text: `${p.fault}, the pivot is stopped` });
    p.nozzles.forEach((n, i) => {
      if (n === "fault") out.push({ ...base, key: `${p.id}:nz:${i}`, sev: "Warning", cls: "EQUIPMENT", name: `${p.id}_V${i + 1}_Blocked`, limit: "", text: `Nozzle V${i + 1} is blocked, its ring is under-applied` });
    });
    const m = avg(p.moisture);
    if (m < p.dryLimit) out.push({ ...base, key: `${p.id}:dry`, sev: "Warning", cls: "PROCESS", name: `${p.id}_Moisture`, limit: `${p.dryLimit} %`, text: `Soil moisture is low, average ${Math.round(m)}%` });
    if (p.link === "lost") out.push({ ...base, key: `${p.id}:comms`, sev: "Warning", cls: "COMMUNICATION", name: `${p.id}_Link`, limit: "", text: "No signal from the pivot, the values shown may be out of date" });
    if (p.wind >= WIND_LIMIT) out.push({ ...base, key: `${p.id}:wind`, sev: "Info", cls: "PROCESS", name: `${p.id}_Wind`, limit: `${WIND_LIMIT} km/h`, text: `Wind gusts ${p.wind} km/h, spray drift risk` });
  }
  storage.forEach((s, i) => {
    if (s < TANK_LIMIT) out.push({ pivot: null, key: `T${i + 1}:low`, sev: "Warning", cls: "PROCESS", name: `Tank${i + 1}_Level`, group: "Storage tanks", node: "PUMP-PLC", limit: `${TANK_LIMIT} %`, text: `Tank ${i + 1} is low at ${Math.round(s)}%` });
  });
  return out;
}

/** raise what is new, close what has gone away; returns the same array when nothing changed */
export function syncAlarms(list: Alarm[], conds: Cond[], now: number): Alarm[] {
  const keys = new Set(conds.map((c) => c.key));
  const open = new Set(list.filter(isActive).map((a) => a.key));
  let changed = false;
  const next = list.map((a) => {
    if (isActive(a) && !keys.has(a.key)) { changed = true; return { ...a, rtnAt: now, ackAt: a.ackAt ?? now, ackBy: a.ackBy ?? "System" }; }
    return a;
  });
  for (const c of conds) {
    if (!open.has(c.key)) { changed = true; next.push({ ...c, id: `a${next.length + 1}`, at: now }); }
  }
  return changed ? next : list;
}

/* ---------- the first list: what is true at the start, plus a week of earlier alarms ---------- */
const at = (daysAgo: number, h: number, m: number) => (DAY0 - daysAgo) * 1440 + h * 60 + m;
const RAISED: Record<string, number> = {
  "P4:fault": at(0, 3, 12), "P4:wind": at(0, 2, 40), "P4:dry": at(1, 22, 5), "P4:nz:9": at(1, 14, 20), "P1:nz:3": at(2, 9, 10),
};
// key, severity, class, tag, group, node, limit, text, pivot, [days ago, hour, minute, minutes until normal, acknowledged by]
type Past = [string, Sev, AlarmCls, string, string, string, string, string, PivotId | null, [number, number, number, number, string]];
const PAST: Past[] = [
  ["P3:dry", "Warning", "PROCESS", "P3_Moisture", "Centre pivots", "PIVOT-PLC", "28 %", "Soil moisture is low, average 26%", "P3", [1, 6, 30, 95, "A"]],
  ["T3:low", "Warning", "PROCESS", "Tank3_Level", "Storage tanks", "PUMP-PLC", "35 %", "Tank 3 is low at 33%", null, [2, 17, 45, 320, "System"]],
  ["P2:nz:5", "Warning", "EQUIPMENT", "P2_V6_Blocked", "Centre pivots", "PIVOT-PLC", "", "Nozzle V6 is blocked, its ring is under-applied", "P2", [3, 11, 20, 410, "A"]],
  ["P1:wind", "Info", "PROCESS", "P1_Wind", "Centre pivots", "PIVOT-PLC", "30 km/h", "Wind gusts 33 km/h, spray drift risk", "P1", [3, 15, 5, 70, "System"]],
  ["P3:fault", "Critical", "EQUIPMENT", "P3_DriveTrip", "Centre pivots", "PIVOT-PLC", "ON", "Tower 3 drive tripped, the pivot is stopped", "P3", [4, 1, 50, 140, "A"]],
  ["P2:dry", "Warning", "PROCESS", "P2_Moisture", "Centre pivots", "PIVOT-PLC", "28 %", "Soil moisture is low, average 27%", "P2", [5, 13, 15, 180, "System"]],
  ["T1:low", "Warning", "PROCESS", "Tank1_Level", "Storage tanks", "PUMP-PLC", "35 %", "Tank 1 is low at 34%", null, [6, 8, 40, 260, "A"]],
];

export function seedAlarms(conds: Cond[]): Alarm[] {
  const past: Alarm[] = PAST.map(([key, sev, cls, name, group, node, limit, text, pivot, [d, h, m, len, by]], i) => {
    const t = at(d, h, m);
    return { id: `h${i + 1}`, key, pivot, sev, cls, name, group, node, limit, text, at: t, rtnAt: t + len, ackAt: t + Math.min(len, 12), ackBy: by };
  });
  const open: Alarm[] = conds.map((c, i) => ({ ...c, id: `o${i + 1}`, at: RAISED[c.key] ?? at(0, 1, 0) }));
  return [...past, ...open].sort((a, b) => a.at - b.at).map((a, i) => ({ ...a, id: `a${i + 1}` }));
}

/* ---------- how the grid shows them ---------- */
const BASE = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
const pad = (n: number) => String(n).padStart(2, "0");
const ms = (t: number) => BASE + (t - DAY0 * 1440) * 60_000 + ((t * 7) % 60) * 1000;
export const stamp = (t: number, utc = false) => {
  const d = new Date(ms(t));
  return utc
    ? `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
    : `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
/** minutes as "days hh:mm:ss" like the alarm client of the other dashboards */
export const dur = (min: number) => { const s = Math.max(0, Math.round(min * 60)); return `${String(Math.floor(s / 86400)).padStart(3, "0")} ${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`; };
export const clockOf = (t: number) => `${pad(Math.floor((t % 1440) / 60))}:${pad(t % 60)}`;
