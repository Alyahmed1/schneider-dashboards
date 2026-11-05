import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { PAGES } from "./pages";

/**
 * Shared state: the scenario picked on each tab, and the alarms and work orders that follow from it.
 * Home, Alarms, the bell, the account menu and the Work orders window all read from here.
 */
export type Area = "process" | "mmm" | "cpg";
export const AREAS: Area[] = ["process", "mmm", "cpg"];
export const AREA_NAME: Record<Area, string> = { process: "Process", mmm: "MMM", cpg: "CPG" };
const NODE: Record<Area, string> = { process: "PROC-PLC", mmm: "MINE-RTU", cpg: "PLANT-PLC" };

export type Sev = "bad" | "warn" | "info";
export type AlarmItem = {
  id: string; area: Area; equip: string; sev: Sev;
  title: string; where: string; value: string; ago: string;
  at: number; state: "UNACK" | "ACK_RTN"; kind: string; cls: string; priority: number;
  name: string; group: string; node: string; provider: string; limit: string; comment: string; detail: string;
  doneAt?: number; by?: string;
};
export type WoStatus = "Open" | "In progress" | "Done";
export type WorkOrder = {
  id: string; title: string; where: string; area: Area; equip: string; priority: "High" | "Medium" | "Low"; due: string;
  status: WoStatus; detail: string; steps: string[]; alarmId?: string; alarmValue?: string; alarmLimit?: string; tag?: string;
};

export const NOW = Date.now();
const MIN = 60000;
const H = 60;
const D = 24 * 60;
const pad = (n: number) => String(n).padStart(2, "0");

/** MM/DD/YYYY HH:MM:SS, the way an alarm client shows time */
export function fmtGrid(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
export function agoText(ms: number) {
  const m = Math.max(0, Math.round((NOW - ms) / MIN));
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 48 * H) return `${Math.round(m / H)} h ago`;
  return `${Math.round(m / D)} days ago`;
}

const QUALITY = /turbid|conductiv|\bph\b|chlorine|hardness|copper|cod|sulphate|bacteria|oxygen|clarity|tss|sdi|rejection|grade|moisture|dust/i;
const EQUIPMENT = /pressure|power|torque|wear|seal|pump|flux|energy|tmp|speed|temperature|lamp|vibration/i;
const classOf = (label: string) => (QUALITY.test(label) ? "WATER QUALITY" : EQUIPMENT.test(label) ? "EQUIPMENT" : "PROCESS");
const prefixOf = (label: string) => (/flow|water use|make-up|inflow|demand|output|return/i.test(label) ? "FT" : /pressure|drop|tmp/i.test(label) ? "PT" : /level|freeboard|sump|blanket/i.test(label) ? "LT" : /temp/i.test(label) ? "TT" : QUALITY.test(label) ? "AT" : "XT");
const fmtVal = (v: number, dec: number, unit: string) => `${v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })} ${unit}`.trim();

const MINS_AGO = [1, 3, 6, 11, 17, 25, 36, 52, 74, 105, 150, 210, 300, 420];

/** the alarms that are active for the chosen scenarios: one per equipment, showing its worst reading */
export function buildActive(scn: Record<Area, string>): AlarmItem[] {
  const out: AlarmItem[] = [];
  AREAS.forEach((area, ai) => {
    const cfg = PAGES[area];
    cfg.equip.forEach((e) => {
      const off = cfg.metrics(e.id, scn[area]).filter((m) => m.tone !== "good");
      if (!off.length) return;
      const m = off.find((x) => x.tone === "bad") ?? off[0];
      const normal = cfg.metrics(e.id, "normal").find((x) => x.k === m.k) ?? m;
      const value = fmtVal(m.v, m.dec, m.unit);
      const limit = fmtVal(normal.v, normal.dec, normal.unit);
      const crit = m.tone === "bad";
      const more = off.length > 1 ? ` (+${off.length - 1} more)` : "";
      const comment = `${m.label} ${crit ? "critical" : "high"}: ${value}`;
      out.push({
        id: `${area}.${e.id}`, area, equip: e.id, sev: crit ? "bad" : "warn",
        title: `${m.label} ${crit ? "critical" : "out of range"}`, where: `${AREA_NAME[area]} · ${e.name}${more}`, value, ago: "", at: 0,
        state: "UNACK", kind: crit ? "HIHI" : "HI", cls: classOf(m.label), priority: crit ? 1 : 500,
        name: `${prefixOf(m.label)}-${(ai + 1) * 100 + e.n}`, group: e.name, node: NODE[area], provider: "InTouch", limit, comment,
        detail: `${e.name}: ${m.label.toLowerCase()} is ${value}, normal is ${limit}. ${e.why}`,
      });
    });
  });
  out.sort((a, b) => (a.sev === b.sev ? 0 : a.sev === "bad" ? -1 : 1));
  return out.map((a, i) => { const at = NOW - MINS_AGO[i % MINS_AGO.length] * MIN; return { ...a, at, ago: agoText(at) }; });
}

type Hist = { area: Area; equip: string; sev: Sev; name: string; cls: string; limit: string; comment: string; detail: string; mins: number; doneMins: number };
const HIST: Hist[] = [
  { area: "process", equip: "tank", sev: "info", name: "LT-206", cls: "PROCESS", limit: "", comment: "Treated water tank refilled to 74% on the night tariff", detail: "The tank filled during the low-demand hours and will cover the morning peak.", mins: 5 * H, doneMins: 4 * H },
  { area: "mmm", equip: "pond", sev: "warn", name: "AT-206", cls: "WATER QUALITY", limit: "2,400 µS/cm", comment: "Return pond conductivity 2,950 µS/cm after a dry spell", detail: "Salts built up in the recycled water. Fresh make-up was raised for two hours.", mins: 1 * D + 6 * H, doneMins: 1 * D + 2 * H },
  { area: "cpg", equip: "cip", sev: "bad", name: "AT-308", cls: "WATER QUALITY", limit: "5 µS/cm", comment: "CIP rinse conductivity 31 µS/cm, rinse repeated", detail: "Caustic was still in the rinse water. The cycle was repeated and the valve checked.", mins: 1 * D + 22 * H, doneMins: 1 * D + 20 * H },
  { area: "process", equip: "filter", sev: "warn", name: "PT-103", cls: "EQUIPMENT", limit: "0.45 bar", comment: "Sand filter pressure drop 1.0 bar, backwash started", detail: "The filter was dirty after the rain. A backwash brought it back to 0.4 bar.", mins: 2 * D + 4 * H, doneMins: 2 * D + 3 * H },
  { area: "mmm", equip: "pit", sev: "info", name: "FT-201", cls: "PROCESS", limit: "", comment: "Pit dewatering restarted after the shift change", detail: "The sump pumps were restarted by the new shift. Flow is back to 540 m³/h.", mins: 2 * D + 9 * H, doneMins: 2 * D + 8 * H },
  { area: "cpg", equip: "soft", sev: "warn", name: "AT-303", cls: "WATER QUALITY", limit: "0.5 mg/L", comment: "Softener hardness out 0.9 mg/L, regeneration started", detail: "The resin was nearly used up. A regeneration cycle was started early.", mins: 3 * D, doneMins: 3 * D - 1 * H },
  { area: "process", equip: "ro", sev: "bad", name: "PT-105", cls: "EQUIPMENT", limit: "1.4 bar", comment: "RO pressure drop 3.1 bar, chemical clean done", detail: "The membranes were fouling. A chemical clean (CIP) restored the pressure drop.", mins: 4 * D + 3 * H, doneMins: 4 * D },
  { area: "cpg", equip: "fill", sev: "info", name: "FT-307", cls: "PROCESS", limit: "", comment: "Line 2 changeover to 0.5 L bottles finished", detail: "Planned changeover. Water use returned to 1.9 L per litre of product.", mins: 5 * D, doneMins: 5 * D - 1 * H },
  { area: "mmm", equip: "thick", sev: "warn", name: "AT-204", cls: "EQUIPMENT", limit: "38 %", comment: "Thickener rake torque 63%, flocculant dose raised", detail: "The slurry was thick. The flocculant dose was raised and the torque fell.", mins: 5 * D + 7 * H, doneMins: 5 * D + 5 * H },
  { area: "process", equip: "intake", sev: "info", name: "AT-101", cls: "WATER QUALITY", limit: "25 NTU", comment: "Raw water turbidity back under 30 NTU after the rain", detail: "The river cleared up. The coagulant dose returned to normal.", mins: 6 * D, doneMins: 6 * D - 2 * H },
];

function history(): AlarmItem[] {
  return HIST.map((h, i) => {
    const e = PAGES[h.area].equip.find((x) => x.id === h.equip)!;
    const at = NOW - h.mins * MIN;
    return {
      id: `h${i}`, area: h.area, equip: h.equip, sev: h.sev, title: h.comment, where: `${AREA_NAME[h.area]} · ${e.name}`, value: "", ago: agoText(at), at,
      state: "ACK_RTN", kind: h.sev === "bad" ? "HIHI" : h.sev === "warn" ? "HI" : "EVENT", cls: h.cls, priority: h.sev === "bad" ? 1 : h.sev === "warn" ? 500 : 999,
      name: h.name, group: e.name, node: NODE[h.area], provider: "InTouch", limit: h.limit, comment: h.comment, detail: h.detail,
      doneAt: NOW - h.doneMins * MIN, by: "A",
    };
  });
}
const HISTORY = history();
const isHist = (id: string) => id.startsWith("h");

const STEPS: Record<string, string[]> = {
  "WATER QUALITY": ["Check the analyser and take a manual sample", "Adjust the dose or run a flush", "Confirm the reading is back in range"],
  EQUIPMENT: ["Inspect the unit on site", "Repair or replace the faulty part", "Test run and confirm normal readings"],
  PROCESS: ["Review the set-point and the flows", "Adjust the process", "Confirm the trend is back to normal"],
};

const BASE_WO: WorkOrder[] = [
  { id: "WO-4102", title: "Calibrate the raw water turbidity analyser", where: "Process · Intake", area: "process", equip: "intake", priority: "Low", due: "Today 16:00", status: "In progress", detail: "The analyser has drifted about 3% over the last month. Calibrate it with the standard solution.", steps: ["Isolate the sample line", "Run the two-point calibration", "Compare the reading with a lab sample"] },
  { id: "WO-4105", title: "Replace the UV lamp in train 2", where: "CPG · UV disinfection", area: "cpg", equip: "uv", priority: "Medium", due: "Tomorrow", status: "Open", detail: "The lamp is near the end of its life and the UV dose is slowly falling. Replace it at the next planned stop.", steps: ["Switch off and lock out the UV unit", "Fit the new lamp and clean the quartz sleeve", "Check the UV dose after restart"] },
  { id: "WO-4108", title: "Inspect the cooling tower fan gearbox", where: "Process · Cooling tower", area: "process", equip: "cooling", priority: "Medium", due: "Tomorrow", status: "Open", detail: "Routine check of the gearbox oil level and the fan vibration.", steps: ["Check the oil level and colour", "Measure the vibration at the fan", "Record the readings"] },
  { id: "WO-4111", title: "Check the tailings dam piezometers", where: "MMM · Tailings dam", area: "mmm", equip: "tail", priority: "High", due: "Today 18:00", status: "Open", detail: "Read the piezometers around the embankment to confirm the water pressure inside the dam wall is stable.", steps: ["Read all piezometers on the embankment", "Compare with last week's readings", "Report any rise to the dam engineer"] },
  { id: "WO-4114", title: "Service the dust-suppression water truck", where: "MMM · Dust suppression", area: "mmm", equip: "dust", priority: "Low", due: "Friday", status: "Open", detail: "Planned service of the spray pump and nozzles on the water truck.", steps: ["Clean or replace the spray nozzles", "Check the pump and the hoses", "Test spray the haul road"] },
];

type Store = {
  scn: Record<Area, string>; setScn: (a: Area, s: string) => void; reset: () => void;
  alarms: AlarmItem[]; done: AlarmItem[]; all: AlarmItem[];
  markDone: (ids: string[]) => void; undo: (id: string) => void;
  workOrders: WorkOrder[]; openWorkOrders: WorkOrder[]; setWoStatus: (id: string, s: WoStatus) => void;
};
const Ctx = createContext<Store | null>(null);

/** the demo opens with a rainy mine and a CIP fault in the factory, so the alarms page has something to show */
const START: Record<Area, string> = { process: "normal", mmm: "rain", cpg: "cip" };
const NORMAL: Record<Area, string> = { process: "normal", mmm: "normal", cpg: "normal" };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [scn, setAll] = useState<Record<Area, string>>(START);
  const [acked, setAcked] = useState<Record<string, AlarmItem>>({});
  const [reopened, setReopened] = useState<Record<string, true>>({});
  const [woStat, setWoStat] = useState<Record<string, WoStatus>>({});
  const setScn = useCallback((a: Area, s: string) => setAll((cur) => ({ ...cur, [a]: s })), []);
  const reset = useCallback(() => { setAll(NORMAL); setAcked({}); setReopened({}); setWoStat({}); }, []);

  const built = useMemo(() => buildActive(scn), [scn]);
  const reopenedItems = useMemo<AlarmItem[]>(() => HISTORY.filter((h) => reopened[h.id]).map((h) => {
    const at = NOW - 30 * 1000;
    return { ...h, state: "UNACK" as const, at, ago: "just now", value: h.limit || "reopened", doneAt: undefined, by: undefined };
  }), [reopened]);
  const alarms = useMemo(() => [...built.filter((a) => !acked[a.id]), ...reopenedItems].sort((a, b) => b.at - a.at), [built, acked, reopenedItems]);
  const done = useMemo(() => [...Object.values(acked), ...HISTORY.filter((h) => !reopened[h.id])].sort((a, b) => b.at - a.at), [acked, reopened]);
  const all = useMemo(() => [...alarms, ...done].sort((a, b) => b.at - a.at), [alarms, done]);

  /** mark alarms as done: scenario alarms are acknowledged, reopened history entries go back to the done list */
  const markDone = useCallback((ids: string[]) => {
    setAcked((cur) => {
      const next = { ...cur };
      ids.forEach((id) => { const a = built.find((x) => x.id === id); if (a && !next[id]) next[id] = { ...a, state: "ACK_RTN", doneAt: Date.now(), by: "A" }; });
      return next;
    });
    setReopened((cur) => { const next = { ...cur }; ids.forEach((id) => { if (isHist(id)) delete next[id]; }); return next; });
  }, [built]);
  /** undo a done alarm: it goes back to the active list (this works for the older history entries too) */
  const undo = useCallback((id: string) => {
    if (isHist(id)) setReopened((cur) => ({ ...cur, [id]: true }));
    else setAcked((cur) => { const next = { ...cur }; delete next[id]; return next; });
  }, []);

  const workOrders = useMemo<WorkOrder[]>(() => {
    const fromAlarms = built.filter((a) => a.sev === "bad").map((a, i): WorkOrder => {
      const ai = AREAS.indexOf(a.area);
      const ei = PAGES[a.area].equip.findIndex((e) => e.id === a.equip);
      const id = `WO-${4130 + ai * 10 + ei}`;
      return {
        id, title: `Fix: ${a.title}`, where: a.where, area: a.area, equip: a.equip, priority: "High", due: "Today",
        status: woStat[id] ?? (acked[a.id] ? "Done" : i === 0 ? "In progress" : "Open"),
        detail: a.detail, steps: STEPS[a.cls] ?? STEPS.PROCESS, alarmId: a.id, alarmValue: a.value, alarmLimit: a.limit, tag: a.name,
      };
    });
    return [...fromAlarms, ...BASE_WO.map((w) => ({ ...w, status: woStat[w.id] ?? w.status }))];
  }, [built, acked, woStat]);
  const openWorkOrders = useMemo(() => workOrders.filter((w) => w.status !== "Done"), [workOrders]);

  /** change a work order's status; finishing one also marks its alarm as done, reopening one brings the alarm back */
  const setWoStatus = useCallback((id: string, status: WoStatus) => {
    setWoStat((cur) => ({ ...cur, [id]: status }));
    const wo = workOrders.find((w) => w.id === id);
    if (wo?.alarmId) {
      if (status === "Done") markDone([wo.alarmId]);
      else if (acked[wo.alarmId]) undo(wo.alarmId);
    }
  }, [workOrders, acked, markDone, undo]);

  const value = useMemo(() => ({ scn, setScn, reset, alarms, done, all, markDone, undo, workOrders, openWorkOrders, setWoStatus }), [scn, setScn, reset, alarms, done, all, markDone, undo, workOrders, openWorkOrders, setWoStatus]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
