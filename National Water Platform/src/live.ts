/**
 * "Go live": ONE shared simulated feed for the whole platform. A single timer ticks every 10 seconds and every page that calls
 * useLive() / useWob() re-renders from the same tick, so Home, Executive, Water Cycle, the bell, the ticker, the map and the Alerts grid always agree.
 *
 *  - numbers: wob(base, key, pct) moves a base number a little, the same way on every page for the same key, and is exactly the base at tick 0
 *  - alarms: the 10 stations that are not on track raise one alarm each (3 critical, 7 warning, so the counts tie to the map);
 *            new information events arrive over time; the user can acknowledge alarms (they turn blue) and undo
 * All of it is simulated.
 */
import { useSyncExternalStore } from "react";
import { MINISTRY_BY_ID, type MinistryId, type Sev } from "./data";
import { STATIONS, STATION_BY_ID, shortName } from "./stations";

export const TICK_MS = 10_000;

export type AlarmState = "UNACK" | "ACK_RTN" | "";
export interface Alarm {
  id: string; at: number; state: AlarmState; kind: "DSC" | "ANALOG" | "EVENT"; cls: string; priority: number;
  name: string; group: string; node: string; provider: string; limit: string; comment: string; detail: string;
  sev: Sev; ministry: MinistryId; stationId: string; doneAt?: number; by?: string;
}
interface Snap { tick: number; at: number; alarms: Alarm[] }

/** governorate of each station (the "Node" column) */
export const GOV: Record<string, string> = {
  aswan: "Aswan", toshka: "New Valley", esna: "Luxor", naga: "Qena", assiut: "Assiut", fayoum: "Fayoum", delta: "Qalyubia", mahmoudiya: "Beheira", damietta: "Damietta",
  rod: "Cairo", giza: "Giza", asfar: "Cairo", siouf: "Alexandria", alamein: "Matrouh", suez: "Suez", portsaid: "Port Said", luxor: "Luxor", hurghada: "Red Sea", sharm: "South Sinai",
  alexz: "Alexandria", mariut: "Alexandria", tenth: "Sharqia", october: "Giza", helwan: "Cairo", zayat: "Gharbia", gulf: "Suez", assiutq: "Assiut", aswanq: "Aswan",
  hamam: "Ismailia", minya: "Minya", nubaria: "Beheira", natrun: "Beheira", fayoumf: "Fayoum", farafra: "New Valley", owainat: "New Valley", "tosh-f": "New Valley", gharbia: "Gharbia",
};

/** the alarm each station that is not on track raises: class, kind, limit shown, minutes since it started */
const BASE: Record<string, { cls: string; kind: Alarm["kind"]; limit: string; mins: number; comment: string }> = {
  minya: { cls: "Pivot", kind: "DSC", limit: "ON", mins: 6, comment: "Pivot P4 drive fault, tower 7" },
  sharm: { cls: "Process", kind: "ANALOG", limit: "60 K", mins: 12, comment: "Membrane cleaning overdue" },
  helwan: { cls: "Quality", kind: "ANALOG", limit: "80 mg/L", mins: 25, comment: "Discharge above the COD limit" },
  giza: { cls: "Pressure", kind: "ANALOG", limit: "2.4 bar", mins: 31, comment: "Low pressure in Zone 4" },
  alexz: { cls: "Quality", kind: "ANALOG", limit: "80 mg/L", mins: 62, comment: "COD near the limit at a discharge point" },
  naga: { cls: "Gates", kind: "DSC", limit: "ON", mins: 125, comment: "One gate under repair" },
  mahmoudiya: { cls: "Pumps", kind: "DSC", limit: "OFF", mins: 190, comment: "Two pumps off for service" },
  suez: { cls: "Capacity", kind: "ANALOG", limit: "95 %", mins: 260, comment: "Running at 96% of capacity" },
  mariut: { cls: "Quality", kind: "ANALOG", limit: "5 mg/L", mins: 340, comment: "Dissolved oxygen low in the lake" },
  fayoumf: { cls: "Irrigation", kind: "ANALOG", limit: "35 %", mins: 480, comment: "Soil moisture low, plan under review" },
};

/** alarms that were already acknowledged earlier (they show in blue) */
const HISTORY: { id: string; cls: string; comment: string; hoursAgo: number; limit: string; kind: Alarm["kind"] }[] = [
  { id: "aswan", cls: "Level", comment: "Reservoir level high, back to normal", hoursAgo: 5, limit: "ON", kind: "DSC" },
  { id: "rod", cls: "Quality", comment: "Turbidity above 1 NTU, back to normal", hoursAgo: 9, limit: "1 NTU", kind: "ANALOG" },
  { id: "tenth", cls: "Quality", comment: "COD above 70 mg/L, back to normal", hoursAgo: 14, limit: "70 mg/L", kind: "ANALOG" },
  { id: "owainat", cls: "Pivot", comment: "Pivot P2 stopped by wind, restarted", hoursAgo: 21, limit: "ON", kind: "DSC" },
  { id: "asfar", cls: "Power", comment: "Grid dip, standby generator started", hoursAgo: 30, limit: "ON", kind: "DSC" },
  { id: "hurghada", cls: "Process", comment: "High pressure on the membranes, cleared", hoursAgo: 38, limit: "62 bar", kind: "ANALOG" },
  { id: "esna", cls: "Gates", comment: "Gate 3 position error, reset", hoursAgo: 52, limit: "ON", kind: "DSC" },
  { id: "nubaria", cls: "Irrigation", comment: "Drip line pressure low, flushed", hoursAgo: 70, limit: "1.2 bar", kind: "ANALOG" },
  { id: "siouf", cls: "Pressure", comment: "Pressure drop in Zone 2, valve reset", hoursAgo: 96, limit: "2.4 bar", kind: "ANALOG" },
  { id: "zayat", cls: "Quality", comment: "Ammonia above the limit, back to normal", hoursAgo: 120, limit: "0.5 mg/L", kind: "ANALOG" },
];

/** information events that arrive while the page is open */
const EVENTS = [
  "Pump started on schedule", "Pump stopped on schedule", "Set point changed by the operator", "Flow report sent", "Sample taken for the lab",
  "Chlorine dose adjusted", "Backwash cycle finished", "Level back inside the band", "Shift handover recorded", "Link to the station restored",
];

const hash = (t: string) => { let h = 2166136261; for (const c of t) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

let seq = 0;
function make(stationId: string, p: Partial<Alarm> & { comment: string; sev: Sev; at: number }): Alarm {
  const s = STATION_BY_ID[stationId];
  const info = p.sev === "info";
  return {
    id: `al-${++seq}`, state: info ? "" : "UNACK", kind: "EVENT", cls: "System", priority: p.sev === "critical" ? 1 : p.sev === "warning" ? 2 : 999,
    name: shortName(s), group: MINISTRY_BY_ID[s.ministry].short, node: GOV[stationId] ?? "Egypt", provider: "SCADA (simulated)", limit: "", detail: s.issue ?? p.comment,
    ministry: s.ministry, stationId, ...p,
  };
}

function init(): Snap {
  const now = Date.now();
  const alarms: Alarm[] = [];
  for (const s of STATIONS) {
    if (s.status === "good") continue;
    const b = BASE[s.id] ?? { cls: "Process", kind: "DSC" as const, limit: "ON", mins: 100, comment: s.issue ?? "Check the station" };
    alarms.push(make(s.id, { sev: s.status === "bad" ? "critical" : "warning", kind: b.kind, cls: b.cls, limit: b.limit, comment: b.comment, detail: s.issue ?? b.comment, at: now - b.mins * 60_000 }));
  }
  for (const h of HISTORY) {
    const at = now - h.hoursAgo * 3_600_000;
    alarms.push(make(h.id, { sev: "warning", state: "ACK_RTN", kind: h.kind, cls: h.cls, limit: h.limit, comment: h.comment, detail: h.comment, at, doneAt: at + 22 * 60_000, by: "Operator" }));
  }
  for (let n = 0; n < 8; n++) {
    const s = STATIONS[(n * 5 + 3) % STATIONS.length];
    alarms.push(make(s.id, { sev: "info", comment: EVENTS[n % EVENTS.length], at: now - (n + 1) * 47 * 60_000 }));
  }
  return { tick: 0, at: now, alarms };
}

let snap: Snap = init();
const subs = new Set<() => void>();
let timer: number | undefined;

function step() {
  const tick = snap.tick + 1;
  let alarms = snap.alarms;
  // a new information event most ticks
  if (Math.random() < 0.7) {
    const s = STATIONS[Math.floor(Math.random() * STATIONS.length)];
    alarms = [make(s.id, { sev: "info", comment: EVENTS[Math.floor(Math.random() * EVENTS.length)], at: Date.now() }), ...alarms].slice(0, 150);
  }
  snap = { tick, at: Date.now(), alarms };
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => {
  subs.add(f);
  if (timer === undefined) timer = window.setInterval(step, TICK_MS);
  return () => { subs.delete(f); if (!subs.size && timer !== undefined) { window.clearInterval(timer); timer = undefined; } };
};

/** the shared live state; re-renders the caller every tick and whenever an alarm changes */
export const useLive = () => useSyncExternalStore(subscribe, () => snap, () => snap);

function setAlarms(fn: (a: Alarm[]) => Alarm[]) { snap = { ...snap, alarms: fn(snap.alarms) }; subs.forEach((f) => f()); }
export const acknowledge = (ids: string[], by = "Administrator") =>
  setAlarms((all) => all.map((a) => (ids.includes(a.id) && a.state === "UNACK" ? { ...a, state: "ACK_RTN", doneAt: Date.now(), by } : a)));
export const reopen = (id: string) => setAlarms((all) => all.map((a) => (a.id === id && a.state === "ACK_RTN" ? { ...a, state: "UNACK", doneAt: undefined, by: undefined } : a)));

/** alarms that still wait for action (events have no state and never count) */
export const waiting = (alarms: Alarm[]) => alarms.filter((a) => a.state === "UNACK");

/* ---------- live numbers ---------- */
const wave = (key: string, tick: number) => { const p = (hash(key) % 628) / 100; return Math.sin(tick * 0.9 + p) * 0.6 + Math.sin(tick * 0.37 + p * 2.1) * 0.4; };
/** base number moved a little; the same key gives the same number on every page; exactly `base` at tick 0 */
export const wob = (base: number, key: string, pct: number, tick: number) => base * (1 + pct * (wave(key, tick) - wave(key, 0)));
export function useWob(base: number, key: string, pct = 0.004, decimals = 1) {
  const { tick } = useLive();
  return Number(wob(base, key, pct, tick).toFixed(decimals));
}

/** "M/D/YYYY HH:MM:SS" like the alarm client */
export const fmtGrid = (ms: number) => {
  const d = new Date(ms); const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
/** "000 HH:MM:SS" (days, then hours, minutes, seconds) */
export const fmtDur = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000)); const p = (n: number) => String(n).padStart(2, "0");
  return `${String(Math.floor(s / 86400)).padStart(3, "0")} ${p(Math.floor((s % 86400) / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
};
export const ago = (ms: number) => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

/** live national supply and its three sources; they always add up exactly (wells = the rest) and equal the Home KPI */
export function useSupply() {
  const total = useWob(17.5, "h-supply", 0.006, 1);
  const sea = Number((total * (1.6 / 17.5)).toFixed(1));
  const river = Number((total * (7.5 / 17.5)).toFixed(1));
  const wells = Number((total - sea - river).toFixed(1));
  return { total, sea, river, wells, network: Number((total - 2).toFixed(1)) };
}

/** the current snapshot, for plain functions; a component that uses it should also call useLive() so it re-renders on every tick */
export const liveSnap = () => snap;
