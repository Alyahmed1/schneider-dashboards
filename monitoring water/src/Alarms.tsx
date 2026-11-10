import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Bell, BellRing, Check, CircleCheck, Cpu, History, Info, List, OctagonAlert, ScrollText, Search, TriangleAlert, UserRound, type LucideIcon } from "lucide-react";
import { ClsIcon, SevIcon, StateIcon } from "./alarmicons";
import type { ReactNode } from "react";
import { activeAlarms, nowMin, type Actions, type Fleet } from "./model";
import { clockOf, dur, isActive, stamp, stateOf, type Alarm, type AlarmCls, type Sev } from "./alarmdata";
import { Num } from "./Overview";
import type { PivotId } from "./pivots";

/** the bell in the header and the full alarm list: the same layout as the alarm client of the other water dashboards */
const SEV_CLASS: Record<Sev, string> = { Critical: "bad", Warning: "warn", Info: "info" };
const PRIORITY: Record<Sev, number> = { Critical: 1, Warning: 500, Info: 999 };
const KIND: Record<Sev, string> = { Critical: "HIHI", Warning: "HI", Info: "EVENT" };
const source = (a: Alarm) => a.pivot ?? "Tanks";

export function AlarmBell({ fleet, onOpenAll }: { fleet: Fleet; onOpenAll: () => void }) {
  const waiting = activeAlarms(fleet).filter((a) => stateOf(a) === "UNACK").sort((x, y) => y.at - x.at);
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
      <button className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={`${waiting.length} alarms waiting`} aria-expanded={show}>
        <Bell size={20} />{waiting.length > 0 && <i>{waiting.length}</i>}
      </button>
      {show && (
        <div className="bell-pop" role="dialog" aria-label="Alarms">
          <ul>
            {waiting.slice(0, 4).map((a) => (
              <li key={a.id}><span className={`sev ${SEV_CLASS[a.sev]}`}><SevIcon sev={a.sev} size={14} />{a.sev}</span><b>{source(a)}</b><em>{clockOf(a.at)}</em><p>{a.text}</p></li>
            ))}
            {waiting.length === 0 && <li className="none">No alarms waiting</li>}
          </ul>
          <button className="btn" onClick={() => { setShow(false); onOpenAll(); }}>Open all alarms</button>
        </div>
      )}
    </div>
  );
}

const CLASSES: AlarmCls[] = ["PROCESS", "EQUIPMENT", "COMMUNICATION"];
interface Row { a: Alarm; state: string; at: number; kind: string; priority: number; unack: number; length: number }
type Key = "time" | "state" | "kind" | "cls" | "priority" | "name" | "group" | "node" | "provider" | "limit" | "comment" | "unack" | "dur" | "utc" | "quality";
const COLS: { key: Key; label: string; w: number; cell: (r: Row) => ReactNode }[] = [
  { key: "time", label: "TimeLCT", w: 168, cell: (r) => stamp(r.at) },
  { key: "state", label: "State", w: 122, cell: (r) => <span className="cell-i"><StateIcon state={r.a.rtnAt != null ? "ACK_RTN" : r.a.ackAt != null ? "ACK" : "UNACK"} />{r.state}</span> },
  { key: "kind", label: "Type", w: 104, cell: (r) => <span className="cell-i"><SevIcon sev={r.a.sev} />{r.kind}</span> },
  { key: "cls", label: "Class", w: 176, cell: (r) => <span className="cell-i"><ClsIcon cls={r.a.cls} />{r.a.cls}</span> },
  { key: "priority", label: "Priority", w: 78, cell: (r) => String(r.priority) },
  { key: "name", label: "Name", w: 150, cell: (r) => r.a.name },
  { key: "group", label: "Group", w: 130, cell: (r) => r.a.group },
  { key: "node", label: "Node", w: 116, cell: (r) => r.a.node },
  { key: "provider", label: "Provider", w: 86, cell: () => "Modbus" },
  { key: "limit", label: "Limit", w: 92, cell: (r) => r.a.limit },
  { key: "comment", label: "AlarmComment", w: 440, cell: (r) => `${source(r.a)}: ${r.a.text}` },
  { key: "unack", label: "UnAckDuration", w: 128, cell: (r) => dur(r.unack) },
  { key: "dur", label: "AlarmDuration", w: 128, cell: (r) => dur(r.length) },
  { key: "utc", label: "UTCTime", w: 168, cell: (r) => stamp(r.at, true) },
  { key: "quality", label: "Quality", w: 78, cell: () => "Good" },
];
const sortVal = (r: Row, k: Key): string | number => (k === "time" || k === "utc" ? r.at : k === "unack" ? r.unack : k === "dur" ? r.length : k === "priority" ? r.priority : k === "comment" ? r.a.text.toLowerCase() : k === "provider" ? "modbus" : k === "quality" ? "good" : k === "kind" ? r.kind : k === "state" ? r.state : String(r.a[k]).toLowerCase());

const STATUS = ["Active", "History", "All"] as const;
const STATUS_ICON: Record<(typeof STATUS)[number], LucideIcon> = { Active: BellRing, History, All: List };
const SEV_ICON: Record<"All" | Sev, LucideIcon> = { All: List, Critical: OctagonAlert, Warning: TriangleAlert, Info };
type Status = (typeof STATUS)[number];

export function AlarmsPage({ fleet, act, onOpenPivot }: { fleet: Fleet; act: Actions; onOpenPivot: (id: PivotId) => void }) {
  const [mode, setMode] = useState<"alarms" | "events">("alarms");
  const now = nowMin(fleet);
  const [status, setStatus] = useState<Status>("Active");
  const [sev, setSev] = useState<"All" | Sev>("All");
  const [cls, setCls] = useState<"All" | AlarmCls>("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "time", dir: -1 });
  const [sel, setSel] = useState<string | null>(null);
  const headBox = useRef<HTMLInputElement>(null);

  const all = useMemo<Row[]>(() => fleet.alarms.map((a) => ({
    a, state: stateOf(a), at: a.at, kind: KIND[a.sev], priority: PRIORITY[a.sev],
    unack: (a.ackAt ?? now) - a.at, length: (a.rtnAt ?? now) - a.at,
  })), [fleet.alarms, now]);

  const active = all.filter((r) => isActive(r.a));
  const critical = active.filter((r) => r.a.sev === "Critical").length;
  const backRecently = all.filter((r) => r.a.rtnAt != null && now - r.a.rtnAt < 1440).length;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all
      .filter((r) => (status === "All" || (status === "Active") === isActive(r.a)) && (sev === "All" || r.a.sev === sev) && (cls === "All" || r.a.cls === cls)
        && (!needle || `${r.a.text} ${source(r.a)} ${r.a.name} ${r.a.group} ${r.a.node}`.toLowerCase().includes(needle)))
      .sort((x, y) => {
        const a = sortVal(x, sort.key), b = sortVal(y, sort.key);
        return (a < b ? -1 : a > b ? 1 : 0) * sort.dir || y.at - x.at;
      });
  }, [all, status, sev, cls, q, sort]);

  const chosen = rows.find((r) => r.a.id === sel) ?? null;
  const open = rows.filter((r) => isActive(r.a));
  const ackedOpen = open.filter((r) => r.a.ackAt != null).length;
  const allTicked = open.length > 0 && ackedOpen === open.length;
  useEffect(() => { if (headBox.current) headBox.current.indeterminate = ackedOpen > 0 && ackedOpen < open.length; }, [ackedOpen, open.length]);
  const toggleSort = (key: Key) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "time" || key === "utc" ? -1 : 1 }));
  const tickAll = () => open.forEach((r) => (allTicked ? act.unack(r.a.id) : r.a.ackAt == null && act.ack(r.a.id)));
  const toggle = (r: Row) => { if (!isActive(r.a)) return; if (r.a.ackAt != null) act.unack(r.a.id); else act.ack(r.a.id); };

  const cards = [
    { label: "Active alarms", value: active.length, note: "still present", tone: active.length ? "warn" : "good", icon: BellRing },
    { label: "Critical", value: critical, note: "need attention now", tone: critical ? "bad" : "good", icon: OctagonAlert },
    { label: "Back to normal, 24 h", value: backRecently, note: "cleared", tone: "good", icon: CircleCheck },
    { label: "Total this week", value: all.length, note: "all alarms listed", tone: "info", icon: List },
  ] as const;

  return (
    <div className={`alx ${mode}`}>
      <div className="alx-head">
        <h1>{mode === "alarms" ? <Bell size={26} className="sym" /> : <ScrollText size={26} className="sym" />}{mode === "alarms" ? "Alarms" : "Events log"}</h1>
        <p>{mode === "alarms" ? "Red rows are waiting for you, blue rows are acknowledged. Tick the box to acknowledge an alarm." : "Who did what, and what the system did by itself."}</p>
        <div className="seg alx-mode" role="tablist" aria-label="View">
          <button role="tab" aria-selected={mode === "alarms"} className={mode === "alarms" ? "on" : ""} onClick={() => setMode("alarms")}><Bell size={16} />Alarms</button>
          <button role="tab" aria-selected={mode === "events"} className={mode === "events" ? "on" : ""} onClick={() => setMode("events")}><ScrollText size={16} />Events log</button>
        </div>
      </div>

      {mode === "events" ? <EventsPanel fleet={fleet} /> : (<>
      <div className="alx-cards">
        {cards.map((c) => (
          <div key={c.label} className={`alx-card tone-${c.tone}`}>
            <c.icon size={28} className="alx-ic" />
            <b><Num v={c.value} /></b>
            <div><span>{c.label}</span><em>{c.note}</em></div>
          </div>
        ))}
      </div>

      <section className="pn alx-main">
        <div className="alx-filters">
          <div className="seg" role="tablist" aria-label="Alarm status">
            {STATUS.map((s) => <button key={s} role="tab" aria-selected={status === s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>{(() => { const I = STATUS_ICON[s]; return <I size={16} />; })()}{s}{s === "Active" ? ` ${active.length}` : ""}</button>)}
          </div>
          <div className="alx-chips">
            {(["All", "Critical", "Warning", "Info"] as const).map((x) => <button key={x} className={`alx-chip ${sev === x ? "on" : ""}`} onClick={() => setSev(x)}>{(() => { const I = SEV_ICON[x]; return <I size={16} />; })()}{x}</button>)}
          </div>
          <label className="select"><span className="sr">Class</span>
            <select value={cls} onChange={(e) => setCls(e.target.value as "All" | AlarmCls)}>
              <option value="All">All classes</option>
              {CLASSES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="alx-search"><Search size={16} /><span className="sr">Search alarms</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search alarms" /></label>
        </div>

        <div className="alx-wrap" tabIndex={0} aria-label="Alarm grid">
          <table className="alx-tbl">
            <thead>
              <tr>
                <th className="chk" style={{ minWidth: 52 }} title="Acknowledge all shown, or undo">
                  <input ref={headBox} type="checkbox" checked={allTicked} onChange={tickAll} aria-label="Acknowledge all shown alarms" />
                </th>
                {COLS.map((c) => (
                  <th key={c.key} style={{ minWidth: c.w }} onClick={() => toggleSort(c.key)} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                    <span>{c.label}</span>
                    {sort.key === c.key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.a.id} className={`${r.a.ackAt != null ? "ack" : "unack"} ${sel === r.a.id ? "sel" : ""}`} onClick={() => setSel(r.a.id)}>
                  <td className="chk"><input type="checkbox" checked={r.a.ackAt != null} disabled={!isActive(r.a)} onChange={() => toggle(r)} onClick={(e) => e.stopPropagation()} aria-label={`${r.a.ackAt != null ? "Undo" : "Acknowledge"}: ${r.a.name}`} title={!isActive(r.a) ? "Back to normal" : r.a.ackAt != null ? "Acknowledged. Untick to undo" : "Tick to acknowledge"} /></td>
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
                <b>{source(chosen.a)}: {chosen.a.text}</b>
                <div className="alx-d-meta">
                  <span><i>Where</i>{chosen.a.name} · {chosen.a.group}</span>
                  <span><i>Since</i>{stamp(chosen.at)}</span>
                  <span><i>Class</i>{chosen.a.cls}</span>
                  {chosen.a.ackAt != null && <span><i>Acknowledged</i>{stamp(chosen.a.ackAt)} by {chosen.a.ackBy}</span>}
                  {chosen.a.rtnAt != null && <span><i>Back to normal</i>{stamp(chosen.a.rtnAt)}</span>}
                </div>
              </div>
              <div className="alx-d-act">
                {isActive(chosen.a) && chosen.a.ackAt == null && <button className="btn pri" onClick={() => act.ack(chosen.a.id)}><Check size={16} />Acknowledge</button>}
                {chosen.a.pivot && <button className="btn" onClick={() => onOpenPivot(chosen.a.pivot!)}><ArrowUpRight size={16} />Open pivot {chosen.a.pivot}</button>}
              </div>
            </>
          ) : "Select an alarm to read its full description."}
        </div>

        <div className="alx-status" role="status">
          <span>Displaying {rows.length ? `1 to ${rows.length}` : "0"} of {all.length} alarms</span>
          <span>Query: Default</span>
          <span>Filter: {status}{sev !== "All" ? ` / ${sev}` : ""}{cls !== "All" ? ` / ${cls}` : ""}</span>
          <span>100% Complete</span>
        </div>
      </section>
      </>)}
    </div>
  );
}

function EventsPanel({ fleet }: { fleet: Fleet }) {
  const [q, setQ] = useState("");
  const [pv, setPv] = useState<"All" | PivotId | "Farm">("All");
  const rows = fleet.events.filter((e) => (pv === "All" || (pv === "Farm" ? e.pivot === null : e.pivot === pv)) && (!q.trim() || `${e.text} ${e.who} ${e.role} ${e.pivot ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <section className="pn alx-main">
      <div className="alx-filters">
        <div className="alx-chips">
          {(["All", "P1", "P2", "P3", "P4", "Farm"] as const).map((x) => <button key={x} className={`alx-chip ${pv === x ? "on" : ""}`} onClick={() => setPv(x)}>{x}</button>)}
        </div>
        <label className="alx-search"><Search size={16} /><span className="sr">Search events</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events" /></label>
      </div>
      <div className="alx-wrap" tabIndex={0} aria-label="Events">
        <table className="alx-tbl ev">
          <thead><tr><th style={{ minWidth: 168 }}>Time</th><th style={{ minWidth: 130 }}>User</th><th style={{ minWidth: 110 }}>Role</th><th style={{ minWidth: 80 }}>Pivot</th><th style={{ minWidth: 420 }}>Action</th></tr></thead>
          <tbody>
            {rows.map((e) => <tr key={e.id} className={e.role === "System" ? "ack" : ""}><td>{stamp(e.at)}</td><td><span className="cell-i">{e.role === "System" ? <Cpu size={16} /> : <UserRound size={16} />}{e.who}</span></td><td>{e.role}</td><td>{e.pivot ?? "Farm"}</td><td>{e.text}</td></tr>)}
            {!rows.length && <tr className="none"><td colSpan={5}>No events match.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="alx-status" role="status"><span>Displaying {rows.length} of {fleet.events.length} events</span><span>Newest first</span></div>
    </section>
  );
}
