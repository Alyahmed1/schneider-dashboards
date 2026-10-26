import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, Search, Undo2 } from "lucide-react";
import { ALARM_TYPES, atOf, fmtDur, fmtGrid, type AlarmSev, type AlarmType, type LogAlarm } from "./alarmLog";
import { activeAlarms, useAlarmLog, type DoneInfo } from "./AlarmsContext";
import { CountUp, rise } from "./ui";
import { useTick } from "./live";
import type { Go } from "./App";

const STATUS = ["Active", "Done", "All"] as const;
type Status = (typeof STATUS)[number];

const PRIORITY: Record<AlarmSev, number> = { Critical: 1, Warning: 500, Info: 999 };
const KIND: Record<AlarmSev, string> = { Critical: "HIHI", Warning: "HI", Info: "EVENT" };
const NODE: Record<string, string> = {
  "Inlet works": "INLET-PLC", "Grit & grease": "GRIT-PLC", "Primary clarification": "PRIMARY-PLC", Aeration: "AERATION-PLC", Chemicals: "DOSING-PLC",
  Electrical: "ELEC-PLC", "Secondary clarifiers": "SECOND-PLC", "Tertiary & disinfection": "TERTIARY-PLC", "Sludge & biogas": "SLUDGE-PLC", "Effluent & reuse": "REUSE-PLC", "Sea outfall": "OUTFALL-PLC",
};

/** one line of the alarm grid, with the same columns as the alarm client */
interface Row {
  a: LogAlarm; d?: DoneInfo; at: number;
  state: "UNACK" | "ACK_RTN"; kind: string; cls: string; priority: number; name: string; group: string; node: string; provider: string;
  limit: string; comment: string; unack: number; dur: number; utc: string; time: string; value: string; quality: string;
}

type Key = "time" | "state" | "kind" | "cls" | "priority" | "name" | "group" | "node" | "provider" | "limit" | "comment" | "unack" | "dur" | "utc" | "value" | "quality";
const COLS: { key: Key; label: string; w: number; cell: (r: Row) => string }[] = [
  { key: "time", label: "TimeLCT", w: 168, cell: (r) => r.time },
  { key: "state", label: "State", w: 88, cell: (r) => r.state },
  { key: "kind", label: "Type", w: 76, cell: (r) => r.kind },
  { key: "cls", label: "Class", w: 128, cell: (r) => r.cls },
  { key: "priority", label: "Priority", w: 76, cell: (r) => String(r.priority) },
  { key: "name", label: "Name", w: 108, cell: (r) => r.name },
  { key: "group", label: "Group", w: 126, cell: (r) => r.group },
  { key: "node", label: "Node", w: 128, cell: (r) => r.node },
  { key: "provider", label: "Provider", w: 84, cell: (r) => r.provider },
  { key: "limit", label: "Limit", w: 96, cell: (r) => r.limit },
  { key: "comment", label: "AlarmComment", w: 360, cell: (r) => r.comment },
  { key: "unack", label: "UnAckDuration", w: 124, cell: (r) => fmtDur(r.unack) },
  { key: "dur", label: "AlarmDuration", w: 124, cell: (r) => fmtDur(r.dur) },
  { key: "utc", label: "UTCTime", w: 168, cell: (r) => r.utc },
  { key: "value", label: "CurrentValue", w: 104, cell: (r) => r.value },
  { key: "quality", label: "Quality", w: 74, cell: (r) => r.quality },
];
const sortVal = (r: Row, k: Key): string | number => (k === "time" || k === "utc" ? r.at : k === "unack" ? r.unack : k === "dur" ? r.dur : k === "priority" ? r.priority : String(r[k]).toLowerCase());

/** every alarm in one grid: when, state, class, where, what, and whether it is done (acknowledged and returned to normal) */
export default function AlarmsPage({ go, focus }: { go: Go; focus?: string }) {
  const tick = useTick();
  const { log, done, markDone, undo } = useAlarmLog();
  const [status, setStatus] = useState<Status>(focus && done[focus] ? "All" : "Active");
  const [sev, setSev] = useState<"All" | AlarmSev>("All");
  const [cls, setCls] = useState<"All" | AlarmType>("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "time", dir: -1 });
  const [sel, setSel] = useState<string | null>(focus ?? null);
  const [flash, setFlash] = useState<string | null>(focus ?? null);

  // coming from the bell: select that alarm, scroll to it and highlight it for a moment
  useEffect(() => {
    if (!focus) return;
    setSel(focus);
    const id = window.setTimeout(() => document.getElementById(`ax-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 450);
    const off = window.setTimeout(() => setFlash(null), 3200);
    return () => { window.clearTimeout(id); window.clearTimeout(off); };
  }, [focus]);

  const all = useMemo<Row[]>(() => {
    const now = Date.now();
    return log.map((a) => {
      const d = done[a.id];
      const at = atOf(a);
      const end = d ? d.at : now;
      return {
        a, d, at, state: d ? "ACK_RTN" : "UNACK", kind: KIND[a.sev], cls: a.type.toUpperCase(), priority: PRIORITY[a.sev],
        name: a.where, group: a.stage, node: NODE[a.stage] ?? "WWTP-HMI", provider: "InTouch", limit: a.limit ?? "", comment: a.text,
        unack: end - at, dur: end - at, utc: fmtGrid(at, true), time: fmtGrid(at), value: a.value ?? "", quality: a.quality ?? "Good",
      } as Row;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, done, tick]);

  const active = activeAlarms(log, done);
  const critical = active.filter((a) => a.sev === "Critical").length;
  const doneToday = log.filter((a) => done[a.id] && Date.now() - done[a.id].at < 24 * 3600 * 1000).length;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = all.filter((r) => (status === "All" || (status === "Done") === !!r.d) && (sev === "All" || r.a.sev === sev) && (cls === "All" || r.a.type === cls)
      && (!needle || `${r.a.text} ${r.a.detail} ${r.a.where} ${r.a.stage} ${r.a.wo ?? ""} ${r.node}`.toLowerCase().includes(needle)));
    return out.sort((x, y) => {
      const a = sortVal(x, sort.key), b = sortVal(y, sort.key);
      return (a < b ? -1 : a > b ? 1 : 0) * sort.dir || y.at - x.at;
    });
  }, [all, status, sev, cls, q, sort]);

  const chosen = rows.find((r) => r.a.id === sel) ?? null;
  const toggleSort = (key: Key) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "time" || key === "utc" ? -1 : 1 }));

  const cards = [
    { label: "Active alarms", value: active.length, note: "waiting for action", tone: active.length ? "warn" : "good" },
    { label: "Critical", value: critical, note: "need attention now", tone: critical ? "bad" : "good" },
    { label: "Done in the last 24 h", value: doneToday, note: "marked as done", tone: "good" },
    { label: "Total this week", value: log.length, note: "all alarms listed", tone: "info" },
  ] as const;

  const act = (r: Row, compact = false) => (r.d
    ? <button className={`ax-btn ${compact ? "icon" : ""}`} title="Undo" aria-label="Undo" onClick={(e) => { e.stopPropagation(); undo(r.a.id); }}><Undo2 size={13} />{!compact && " Undo"}</button>
    : <button className={`ax-btn go ${compact ? "icon" : ""}`} title="Mark as done" aria-label="Mark as done" onClick={(e) => { e.stopPropagation(); markDone(r.a.id); }}><Check size={13} />{!compact && " Mark as done"}</button>);

  return (
    <div className="al-screen">
      <div className="al-head">
        <h1>Alarms</h1>
        <p>The full alarm list. Red rows are waiting, blue rows are done.</p>
      </div>

      <div className="grid al-cards">
        {cards.map((c, i) => (
          <motion.div key={c.label} className={`mini-kpi tone-${c.tone}`} {...rise(i)}>
            <span>{c.label}</span>
            <b><CountUp value={c.value} /></b>
            <em>{c.note}</em>
          </motion.div>
        ))}
      </div>

      <motion.section className="card al-card" {...rise(2)}>
        <div className="al-filters">
          <div className="seg" role="tablist" aria-label="Alarm status">
            {STATUS.map((s) => <button key={s} role="tab" aria-selected={status === s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>{s}{s === "Active" ? ` ${active.length}` : ""}</button>)}
          </div>
          <div className="chips">
            {(["All", "Critical", "Warning", "Info"] as const).map((x) => <button key={x} className={`fchip ${sev === x ? "on" : ""}`} onClick={() => setSev(x)}>{x}</button>)}
          </div>
          <label className="select"><span className="sr">Class</span>
            <select value={cls} onChange={(e) => setCls(e.target.value as "All" | AlarmType)}>
              <option value="All">All classes</option>
              {ALARM_TYPES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="search"><Search size={14} /><span className="sr">Search alarms</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search alarms" /></label>
        </div>

        <div className="ax-wrap" tabIndex={0} aria-label="Alarm grid">
          <table className="ax">
            <thead>
              <tr>
                <th className="ax-act" style={{ minWidth: 46 }} title="Mark as done or undo">✓</th>
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
                <tr key={r.a.id} id={`ax-${r.a.id}`} className={`${r.d ? "ack" : "unack"} ${sel === r.a.id ? "sel" : ""} ${flash === r.a.id ? "flash" : ""}`} onClick={() => setSel(r.a.id)}>
                  <td className="ax-act">{act(r, true)}</td>
                  {COLS.map((c) => <td key={c.key} title={c.key === "comment" ? r.a.detail : undefined} className={c.key === "comment" ? "cm" : ""}>{c.cell(r)}</td>)}
                </tr>
              ))}
              {!rows.length && <tr className="none"><td colSpan={COLS.length + 1}>No alarms match these filters.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className={`ax-detail ${chosen ? "" : "empty"}`} aria-live="polite">
          {chosen ? (
            <>
              <div className="ax-d-main">
                <b>{chosen.a.text}</b>
                <p>{chosen.a.detail}</p>
                <div className="ax-d-meta">
                  <span><i>Where</i>{chosen.name} · {chosen.group}</span>
                  <span><i>Since</i>{chosen.time}</span>
                  <span><i>Class</i>{chosen.cls}</span>
                  {chosen.d && <span><i>Done</i>{fmtGrid(chosen.d.at)} by {chosen.d.by}</span>}
                  {chosen.a.wo && <button className="wo-link" onClick={() => go("maintenance")}>{chosen.a.wo}</button>}
                </div>
              </div>
              <div className="ax-d-act">{act(chosen)}</div>
            </>
          ) : "Select an alarm to read its full description."}
        </div>

        <div className="ax-status" role="status">
          <span>Displaying {rows.length ? `1 to ${rows.length}` : "0"} of {all.length} alarms</span>
          <span>Query: Default</span>
          <span>Filter: {status}{sev !== "All" ? ` / ${sev}` : ""}{cls !== "All" ? ` / ${cls}` : ""}</span>
          <span>100% Complete</span>
          <span>Cairo</span>
        </div>
      </motion.section>
    </div>
  );
}
