import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Bell, Search } from "lucide-react";
import { ALARMS, FARM, type Alarm, type Sev } from "./farm";
import { useTick } from "./live";
import { CountUp } from "./ui";
import type { Go, ViewId } from "./App";

/* ---------- who has marked what as done ---------- */
export interface DoneInfo { at: number; by: string }
interface Ctx { done: Record<string, DoneInfo>; markDone: (id: string) => void; undo: (id: string) => void; toggle: (id: string) => void }
const AlarmsCtx = createContext<Ctx>({ done: {}, markDone: () => {}, undo: () => {}, toggle: () => {} });
export const useAlarms = () => useContext(AlarmsCtx);

const DAY = 86_400_000;
const midnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** when the alarm was raised: its day and time, plus a few seconds so rows differ like a real log (never in the future) */
export function alarmAt(a: Alarm) {
  const [h, m] = a.time.split(":").map(Number);
  const i = ALARMS.indexOf(a);
  const t = midnight() - a.day * DAY + h * 3_600_000 + m * 60_000 + ((i * 7) % 60) * 1000;
  return a.day === 0 ? Math.min(t, Date.now() - 60_000 * (1 + i)) : t;
}

export function AlarmsProvider({ children }: { children: ReactNode }) {
  const [done, setDone] = useState<Record<string, DoneInfo>>(() => Object.fromEntries(ALARMS.filter((a) => a.done).map((a) => [a.id, { at: alarmAt(a) + 35 * 60_000, by: "Administrator" }])));
  const markDone = (id: string) => setDone((d) => ({ ...d, [id]: { at: Date.now(), by: "Administrator" } }));
  const undo = (id: string) => setDone((d) => { const n = { ...d }; delete n[id]; return n; });
  return <AlarmsCtx.Provider value={{ done, markDone, undo, toggle: (id) => (done[id] ? undo(id) : markDone(id)) }}>{children}</AlarmsCtx.Provider>;
}

/** alarms nobody has marked done yet */
export const useOpenAlarms = () => {
  const { done } = useAlarms();
  return ALARMS.filter((a) => !done[a.id]);
};

const SEV_CLASS: Record<Alarm["sev"], string> = { Critical: "bad", Warning: "warn", Info: "info" };

/** the bell in the top bar: a count, and a short list that opens under it */
export function AlertsBell({ go }: { go: Go }) {
  const open = useOpenAlarms();
  const [show, setShow] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!show) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setShow(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setShow(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [show]);
  return (
    <div className="bell" ref={box}>
      <button className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={`${open.length} open alarms`} aria-expanded={show}>
        <Bell size={16} />{open.length > 0 && <i>{open.length}</i>}
      </button>
      {show && (
        <div className="bell-pop" role="dialog" aria-label="Alarms">
          <ul>
            {open.slice(0, 4).map((a) => (
              <li key={a.id}><span className={`sev ${SEV_CLASS[a.sev]}`}>{a.sev}</span><b>{a.source}</b><em>{a.time}</em><p>{a.text}</p></li>
            ))}
            {open.length === 0 && <li className="none">No open alarms</li>}
          </ul>
          <button className="btn" onClick={() => { setShow(false); go("alarms"); }}>Open all alarms</button>
        </div>
      )}
    </div>
  );
}

/* ---------- the full alarm list, laid out like the alarm client used on the water dashboards ---------- */
type Cls = "PROCESS" | "EQUIPMENT" | "WATER QUALITY";
const CLASSES: Cls[] = ["PROCESS", "EQUIPMENT", "WATER QUALITY"];
// class, tag name, group, node, limit, and where to look (view and item)
const META: Record<string, [Cls, string, string, string, string, ViewId, string?]> = {
  a1: ["EQUIPMENT", "P4_DriveTrip", "Centre pivots", "PIVOT-PLC", "ON", "pivots", "P4"],
  a2: ["PROCESS", "P8_Moisture", "Centre pivots", "PIVOT-PLC", "28 %", "pivots", "P8"],
  a3: ["PROCESS", "PSA_Well3_Level", "Pump station PS-A", "PUMP-PLC", "LOW", "pumps", "PS-A"],
  a4: ["EQUIPMENT", "PSB_ScreenDP", "Pump station PS-B", "PUMP-PLC", "HIGH", "pumps", "PS-B"],
  a5: ["PROCESS", "BUDGET_Pace", "Water budget", "FARM-HMI", "-4 %", "energy"],
  a6: ["EQUIPMENT", "Z9_Valve", "Landscape zones", "LAND-RTU", "ON", "zones", "Z9"],
  a7: ["EQUIPMENT", "S04_Battery", "Landscape sensors", "LAND-RTU", "15 %", "sensors", "S-04"],
  a8: ["WATER QUALITY", "GW_Chlorine", "Grey water plant", "GREY-PLC", "0.5 mg/L", "process"],
  a9: ["PROCESS", "P2_EndGunP", "Centre pivots", "PIVOT-PLC", "1.5 bar", "pivots", "P2"],
  a10: ["PROCESS", "PSC_Pump2", "Pump station PS-C", "PUMP-PLC", "", "pumps", "PS-C"],
  a11: ["EQUIPMENT", "PSA_Well1_Trip", "Pump station PS-A", "PUMP-PLC", "ON", "pumps", "PS-A"],
  a12: ["PROCESS", "Z12_Runtime", "Landscape zones", "LAND-RTU", "", "zones", "Z12"],
  a13: ["PROCESS", "ET0_Forecast", "Weather", "FARM-HMI", "", "weather"],
  a14: ["EQUIPMENT", "P7_Uniformity", "Centre pivots", "PIVOT-PLC", "90 %", "pivots", "P7"],
  a15: ["WATER QUALITY", "GW_Turbidity", "Grey water plant", "GREY-PLC", "4 NTU", "process"],
  a16: ["EQUIPMENT", "S11_Rain", "Landscape sensors", "LAND-RTU", "", "sensors", "S-11"],
  a17: ["PROCESS", "PSB_CanalLevel", "Pump station PS-B", "PUMP-PLC", "", "pumps", "PS-B"],
  a18: ["PROCESS", "BUDGET_Week", "Water budget", "FARM-HMI", "+3 %", "energy"],
  a19: ["PROCESS", "P5_Moisture", "Centre pivots", "PIVOT-PLC", "30 %", "pivots", "P5"],
  a20: ["EQUIPMENT", "C2_Link", "Landscape controllers", "LAND-RTU", "", "controllers", "C2"],
};
const WHERE: Partial<Record<ViewId, string>> = { pivots: "Open the pivot", pumps: "Open the pump station", energy: "Open Water & energy", zones: "Open the zone", sensors: "Open the sensor", controllers: "Open the controller", process: "Open Grey water", weather: "Open Weather & ET" };
const PRIORITY: Record<Sev, number> = { Critical: 1, Warning: 500, Info: 999 };
const KIND: Record<Sev, string> = { Critical: "HIHI", Warning: "HI", Info: "EVENT" };

const pad = (n: number) => String(n).padStart(2, "0");
const grid = (t: number, utc = false) => {
  const d = new Date(t);
  return utc
    ? `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
    : `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const dur = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(s / 86400)).padStart(3, "0")} ${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`; };

interface Row { a: Alarm; d?: DoneInfo; at: number; state: "UNACK" | "ACK_RTN"; kind: string; cls: Cls; priority: number; name: string; group: string; node: string; limit: string; unack: number; view: ViewId; item?: string }
type Key = "time" | "state" | "kind" | "cls" | "priority" | "name" | "group" | "node" | "provider" | "limit" | "comment" | "unack" | "dur" | "utc" | "quality";
const COLS: { key: Key; label: string; w: number; cell: (r: Row) => string }[] = [
  { key: "time", label: "TimeLCT", w: 168, cell: (r) => grid(r.at) },
  { key: "state", label: "State", w: 92, cell: (r) => r.state },
  { key: "kind", label: "Type", w: 76, cell: (r) => r.kind },
  { key: "cls", label: "Class", w: 128, cell: (r) => r.cls },
  { key: "priority", label: "Priority", w: 78, cell: (r) => String(r.priority) },
  { key: "name", label: "Name", w: 142, cell: (r) => r.name },
  { key: "group", label: "Group", w: 172, cell: (r) => r.group },
  { key: "node", label: "Node", w: 116, cell: (r) => r.node },
  { key: "provider", label: "Provider", w: 86, cell: () => "Modbus" },
  { key: "limit", label: "Limit", w: 92, cell: (r) => r.limit },
  { key: "comment", label: "AlarmComment", w: 520, cell: (r) => `${r.a.source}: ${r.a.text}` },
  { key: "unack", label: "UnAckDuration", w: 128, cell: (r) => dur(r.unack) },
  { key: "dur", label: "AlarmDuration", w: 128, cell: (r) => dur(r.unack) },
  { key: "utc", label: "UTCTime", w: 168, cell: (r) => grid(r.at, true) },
  { key: "quality", label: "Quality", w: 78, cell: () => "Good" },
];
const sortVal = (r: Row, k: Key): string | number => (k === "time" || k === "utc" ? r.at : k === "unack" || k === "dur" ? r.unack : k === "priority" ? r.priority : k === "comment" ? r.a.text.toLowerCase() : k === "provider" ? "modbus" : k === "quality" ? "good" : String(r[k]).toLowerCase());

const STATUS = ["Active", "Done", "All"] as const;
type Status = (typeof STATUS)[number];

export function AlarmsPage({ go }: { go: Go }) {
  const tick = useTick();
  const { done, markDone, undo } = useAlarms();
  const [status, setStatus] = useState<Status>("Active");
  const [sev, setSev] = useState<"All" | Sev>("All");
  const [cls, setCls] = useState<"All" | Cls>("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "time", dir: -1 });
  const [sel, setSel] = useState<string | null>(null);
  const headBox = useRef<HTMLInputElement>(null);

  const all = useMemo<Row[]>(() => {
    const now = Date.now();
    return ALARMS.map((a) => {
      const d = done[a.id], m = META[a.id], at = alarmAt(a);
      return { a, d, at, state: d ? "ACK_RTN" : "UNACK", kind: KIND[a.sev], cls: m[0], priority: PRIORITY[a.sev], name: m[1], group: m[2], node: m[3], limit: m[4], unack: (d ? d.at : now) - at, view: m[5], item: m[6] } as Row;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, tick]);

  const active = all.filter((r) => !r.d);
  const critical = active.filter((r) => r.a.sev === "Critical").length;
  const doneToday = all.filter((r) => r.d && Date.now() - r.d.at < DAY).length;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all
      .filter((r) => (status === "All" || (status === "Done") === !!r.d) && (sev === "All" || r.a.sev === sev) && (cls === "All" || r.cls === cls)
        && (!needle || `${r.a.text} ${r.a.source} ${r.name} ${r.group} ${r.node}`.toLowerCase().includes(needle)))
      .sort((x, y) => {
        const a = sortVal(x, sort.key), b = sortVal(y, sort.key);
        return (a < b ? -1 : a > b ? 1 : 0) * sort.dir || y.at - x.at;
      });
  }, [all, status, sev, cls, q, sort]);

  const chosen = rows.find((r) => r.a.id === sel) ?? null;
  const doneInView = rows.filter((r) => r.d).length;
  const allTicked = rows.length > 0 && doneInView === rows.length;
  useEffect(() => { if (headBox.current) headBox.current.indeterminate = doneInView > 0 && doneInView < rows.length; }, [doneInView, rows.length]);
  const toggleSort = (key: Key) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "time" || key === "utc" ? -1 : 1 }));
  const tickAll = () => rows.forEach((r) => (allTicked ? (r.d && undo(r.a.id)) : (!r.d && markDone(r.a.id))));

  const cards = [
    { label: "Active alarms", value: active.length, note: "waiting for action", tone: active.length ? "warn" : "good" },
    { label: "Critical", value: critical, note: "need attention now", tone: critical ? "bad" : "good" },
    { label: "Done in the last 24 h", value: doneToday, note: "marked as done", tone: "good" },
    { label: "Total this week", value: all.length, note: "all alarms listed", tone: "info" },
  ] as const;

  return (
    <div className="alx">
      <div className="alx-head">
        <h1>Alarms</h1>
        <p>The full alarm list. Red rows are waiting, blue rows are done. Tick the box to mark an alarm done.</p>
      </div>

      <div className="alx-cards">
        {cards.map((c) => (
          <div key={c.label} className={`alx-card tone-${c.tone}`}>
            <b><CountUp value={c.value} /></b>
            <div><span>{c.label}</span><em>{c.note}</em></div>
          </div>
        ))}
      </div>

      <section className="pn alx-main">
        <div className="alx-filters">
          <div className="seg" role="tablist" aria-label="Alarm status">
            {STATUS.map((s) => <button key={s} role="tab" aria-selected={status === s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>{s}{s === "Active" ? ` ${active.length}` : ""}</button>)}
          </div>
          <div className="alx-chips">
            {(["All", "Critical", "Warning", "Info"] as const).map((x) => <button key={x} className={`alx-chip ${sev === x ? "on" : ""}`} onClick={() => setSev(x)}>{x}</button>)}
          </div>
          <label className="select"><span className="sr">Class</span>
            <select value={cls} onChange={(e) => setCls(e.target.value as "All" | Cls)}>
              <option value="All">All classes</option>
              {CLASSES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="alx-search"><Search size={14} /><span className="sr">Search alarms</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search alarms" /></label>
        </div>

        <div className="alx-wrap" tabIndex={0} aria-label="Alarm grid">
          <table className="alx-tbl">
            <thead>
              <tr>
                <th className="chk" style={{ minWidth: 46 }} title="Mark all shown as done, or undo them">
                  <input ref={headBox} type="checkbox" checked={allTicked} onChange={tickAll} aria-label="Mark all shown alarms done" />
                </th>
                {COLS.map((c) => (
                  <th key={c.key} style={{ minWidth: c.w }} onClick={() => toggleSort(c.key)} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                    <span>{c.label}</span>
                    {sort.key === c.key && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.a.id} className={`${r.d ? "ack" : "unack"} ${sel === r.a.id ? "sel" : ""}`} onClick={() => setSel(r.a.id)}>
                  <td className="chk"><input type="checkbox" checked={!!r.d} onChange={() => (r.d ? undo(r.a.id) : markDone(r.a.id))} onClick={(e) => e.stopPropagation()} aria-label={`${r.d ? "Undo" : "Mark done"}: ${r.name}`} title={r.d ? "Done. Untick to undo" : "Tick to mark as done"} /></td>
                  {COLS.map((c) => <td key={c.key} className={c.key === "comment" ? "cm" : ""}>{c.cell(r)}</td>)}
                </tr>
              ))}
              {!rows.length && <tr className="none"><td colSpan={COLS.length + 1}>No alarms match these filters.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className={`alx-detail ${chosen ? "" : "empty"}`} aria-live="polite">
          {chosen ? (
            <>
              <div className="alx-d-main">
                <b>{chosen.a.source}: {chosen.a.text}</b>
                <div className="alx-d-meta">
                  <span><i>Where</i>{chosen.name} · {chosen.group}</span>
                  <span><i>Since</i>{grid(chosen.at)}</span>
                  <span><i>Class</i>{chosen.cls}</span>
                  {chosen.d && <span><i>Done</i>{grid(chosen.d.at)} by {chosen.d.by}</span>}
                </div>
              </div>
              <div className="alx-d-act">
                {WHERE[chosen.view] && <button className="btn" onClick={() => go(chosen.view, chosen.item)}>{WHERE[chosen.view]}</button>}
              </div>
            </>
          ) : "Select an alarm to read its full description."}
        </div>

        <div className="alx-status" role="status">
          <span>Displaying {rows.length ? `1 to ${rows.length}` : "0"} of {all.length} alarms</span>
          <span>Query: Default</span>
          <span>Filter: {status}{sev !== "All" ? ` / ${sev}` : ""}{cls !== "All" ? ` / ${cls}` : ""}</span>
          <span>100% Complete</span>
          <span>{FARM.name.replace(" Farm", "")}</span>
        </div>
      </section>
    </div>
  );
}
