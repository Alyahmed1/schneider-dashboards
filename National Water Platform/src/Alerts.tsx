import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowDown, ArrowUp, Bell, Check, CheckCircle2, ChevronLeft, ChevronRight, ListChecks, Lock, OctagonAlert, Radio, Search, Undo2 } from "lucide-react";
import { MINISTRIES, MINISTRY_BY_ID, type Go, type MinistryId, type Role } from "./data";
import { STATION_PAGES } from "./stations";
import { acknowledge, fmtDur, fmtGrid, reopen, useLive, waiting, type Alarm } from "./live";
import { CountUp } from "./ui";
import "./alerts.css";

const STATUS = ["Active", "Done", "All"] as const;
type Status = (typeof STATUS)[number];
const SEV = ["All", "Critical", "Warning", "Info"] as const;
type SevF = (typeof SEV)[number];
const sevOf = (a: Alarm): SevF => (a.sev === "critical" ? "Critical" : a.sev === "warning" ? "Warning" : "Info");

type Key = "time" | "state" | "kind" | "cls" | "priority" | "name" | "group" | "node" | "provider" | "limit" | "dur" | "comment";
const COLS: { key: Key; label: string; cell: (a: Alarm, now: number) => string }[] = [
  { key: "time", label: "TimeLCT", cell: (a) => fmtGrid(a.at) },
  { key: "state", label: "State", cell: (a) => a.state },
  { key: "kind", label: "Type", cell: (a) => a.kind },
  { key: "cls", label: "Class", cell: (a) => a.cls },
  { key: "priority", label: "Priority", cell: (a) => String(a.priority) },
  { key: "name", label: "Name", cell: (a) => a.name },
  { key: "group", label: "Group", cell: (a) => a.group },
  { key: "node", label: "Node", cell: (a) => a.node },
  { key: "provider", label: "Provider", cell: (a) => a.provider },
  { key: "limit", label: "Limit", cell: (a) => a.limit },
  { key: "dur", label: "UnAckDura", cell: (a, now) => (a.state === "UNACK" ? fmtDur(now - a.at) : a.doneAt ? fmtDur(a.doneAt - a.at) : "") },
  { key: "comment", label: "AlarmComment", cell: (a) => a.comment },
];
const sortVal = (a: Alarm, k: Key): string | number => (k === "time" ? a.at : k === "priority" ? a.priority : k === "dur" ? (a.doneAt ?? Date.now()) - a.at : String(COLS.find((c) => c.key === k)!.cell(a, Date.now())).toLowerCase());

const ROW_H = 32;
function useRowsThatFit() {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(8);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setN(Math.max(1, Math.floor(el.clientHeight / ROW_H)));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, n] as const;
}

export default function Alerts({ go, role, focus: focusId }: { go: Go; role: Role; focus?: string }) {
  const { alarms: all, tick, at } = useLive();
  const canAck = role !== "cabinet";
  const [note, setNote] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("Active");
  const [sev, setSev] = useState<SevF>("All");
  const [cls, setCls] = useState("All");
  const [min, setMin] = useState<"All" | MinistryId>(role === "minister" ? "mhuuc" : "All"); // the Minister view starts on its own ministry
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "time", dir: -1 });
  const [focus, setFocus] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [bodyRef, perPage] = useRowsThatFit();
  const now = at + 0 * tick;

  const active = waiting(all);
  const critical = active.filter((a) => a.sev === "critical").length;
  const doneToday = all.filter((a) => a.state === "ACK_RTN" && a.doneAt && Date.now() - a.doneAt < 24 * 3600 * 1000).length;
  const classes = useMemo(() => [...new Set(all.map((a) => a.cls))].sort(), [all]);

  // alarms per hour over the last 24 hours, for the small chart
  const byHour = useMemo(() => {
    const out = Array.from({ length: 12 }, (_, i) => ({ h: `${(new Date(now - (11 - i) * 2 * 3600e3).getHours()).toString().padStart(2, "0")}h`, n: 0 }));
    all.forEach((a) => { const i = 11 - Math.floor((now - a.at) / (2 * 3600e3)); if (i >= 0 && i < 12 && a.sev !== "info") out[i].n += 1; });
    return out;
  }, [all, now]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = all.filter((a) => (status === "All" || (status === "Done" ? a.state === "ACK_RTN" : a.state === "UNACK"))
      && (sev === "All" || sevOf(a) === sev) && (cls === "All" || a.cls === cls) && (min === "All" || a.ministry === min)
      && (!needle || `${a.comment} ${a.detail} ${a.name} ${a.node} ${a.cls} ${a.group}`.toLowerCase().includes(needle)));
    return list.sort((x, y) => {
      const a = sortVal(x, sort.key), b = sortVal(y, sort.key);
      return (a < b ? -1 : a > b ? 1 : 0) * sort.dir || y.at - x.at;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, status, sev, cls, min, q, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  useEffect(() => { setPage((p) => Math.min(p, pages - 1)); }, [pages]);
  useEffect(() => { setPage(0); }, [status, sev, cls, min, q, sort]);
  const shown = rows.slice(page * perPage, page * perPage + perPage);
  const from = rows.length ? page * perPage + 1 : 0;
  const to = Math.min(rows.length, (page + 1) * perPage);

  // arriving from the Executive list or a station: show that alarm, on its page, selected
  const pending = useRef<string | undefined>(focusId);
  useEffect(() => {
    const id = pending.current;
    if (!id || !all.some((a) => a.id === id)) return;
    pending.current = undefined;
    setStatus("All"); setSev("All"); setCls("All"); setMin("All"); setQ(""); setSort({ key: "time", dir: -1 });
    setFocus(id);
    const i = [...all].sort((x, y) => y.at - x.at).findIndex((a) => a.id === id);
    if (i >= 0) window.setTimeout(() => setPage(Math.floor(i / perPage)), 60);
  }, [all, perPage]);
  useEffect(() => { if (!note) return; const t = window.setTimeout(() => setNote(null), 3200); return () => window.clearTimeout(t); }, [note]);

  const chosen = all.find((a) => a.id === focus) ?? null;
  const toggleSort = (key: Key) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "time" ? -1 : 1 }));
  const toggle = (id: string) => setChecked((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const canTick = (a: Alarm) => a.state === "UNACK" && canAck;
  const tickable = shown.filter(canTick);
  const allOnPage = tickable.length > 0 && tickable.every((a) => checked.has(a.id));
  const toggleAll = () => setChecked((c) => { const n = new Set(c); tickable.forEach((a) => (allOnPage ? n.delete(a.id) : n.add(a.id))); return n; });
  const todo = [...checked].filter((id) => active.some((a) => a.id === id));
  const doAck = (ids: string[]) => { acknowledge(ids); setChecked(new Set()); setNote(`${ids.length} acknowledged`); };
  const openWhere = (a: Alarm) => (STATION_PAGES.has(a.stationId) ? go("station", a.stationId) : go("ministry", a.ministry));

  const cards = [
    { label: "Waiting for action", value: active.length, note: "not yet acknowledged", tone: "warn", Icon: Bell },
    { label: "Critical", value: critical, note: "need attention now", tone: "bad", Icon: OctagonAlert },
    { label: "Acknowledged, 24 h", value: doneToday, note: "turned blue", tone: "good", Icon: CheckCircle2 },
    { label: "Listed in total", value: all.length, note: "alarms and events", tone: "info", Icon: ListChecks },
  ];

  return (
    <motion.div className="al" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <div className="al-head">
        <div><h2>Alerts &amp; Events</h2><p>Every alarm in the country, one list. <b className="r">Red</b> rows are waiting, <b className="b">blue</b> rows are acknowledged.</p></div>
        <span className="al-live"><Radio size={14} /> LIVE · updates every 10 s · last {new Date(at).toLocaleTimeString("en-GB")}</span>
      </div>

      <div className="al-cards">
        {cards.map((c, i) => (
          <motion.div key={c.label} className={`al-card ${c.tone}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4 }}>
            <i className="al-ico"><c.Icon size={20} /></i>
            <b><CountUp value={c.value} /></b>
            <div><strong>{c.label}</strong><span>{c.note}</span></div>
          </motion.div>
        ))}
        <motion.div className="al-card chart" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
          <strong>Alarms in the last 24 h</strong>
          <div className="al-mini">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 260, height: 40 }}>
              <BarChart data={byHour} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="h" tick={{ fill: "var(--muted)", fontSize: 9 }} tickLine={false} axisLine={false} interval={2} height={14} />
                <Tooltip cursor={{ fill: "rgba(var(--ac-rgb),0.12)" }} contentStyle={{ background: "rgb(var(--n1-rgb))", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, padding: "3px 8px" }} labelStyle={{ color: "var(--text-2)" }} itemStyle={{ color: "var(--ink)" }} formatter={(v) => [String(v), "Alarms"]} />
                <Bar dataKey="n" fill="var(--ac)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <section className="al-panel">
        <div className="al-filters">
          <div className="al-seg" role="tablist" aria-label="Alarm status">
            {STATUS.map((s) => <button key={s} role="tab" aria-selected={status === s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>{s}{s === "Active" ? ` ${active.length}` : ""}</button>)}
          </div>
          <div className="al-chips">
            {SEV.map((x) => <button key={x} className={`al-chip ${sev === x ? "on" : ""}`} onClick={() => setSev(x)}>{x}</button>)}
          </div>
          <label className="al-select"><span className="sr">Class</span>
            <select value={cls} onChange={(e) => setCls(e.target.value)}>
              <option value="All">All classes</option>
              {classes.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="al-select"><span className="sr">Ministry</span>
            <select value={min} onChange={(e) => setMin(e.target.value as "All" | MinistryId)}>
              <option value="All">All ministries</option>
              {MINISTRIES.map((m) => <option key={m.id} value={m.id}>{m.short}</option>)}
            </select>
          </label>
          <label className="al-search"><Search size={15} /><span className="sr">Search alarms</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search alarms" /></label>
        </div>

        <div className="gt" role="table" aria-label="Alarm grid">
          <div className="gt-row gt-head" role="row">
            <span className="c-chk">{canAck ? <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} disabled={!tickable.length} onChange={toggleAll} /> : <Lock size={13} aria-label="Read only" />}</span>
            {COLS.map((c) => (
              <button key={c.key} className={`c-${c.key}`} role="columnheader" onClick={() => toggleSort(c.key)} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                {c.label}{sort.key === c.key && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
              </button>
            ))}
          </div>
          <div className="gt-body" ref={bodyRef}>
            {shown.map((a) => (
              <div key={a.id} role="row" className={`gt-row ${a.state === "ACK_RTN" ? "ack" : a.state === "UNACK" ? "unack" : "evt"} ${focus === a.id ? "sel" : ""}`} onClick={() => setFocus(a.id)}>
                <span className="c-chk" onClick={(e) => e.stopPropagation()}>
                  {a.state === "ACK_RTN" ? <input type="checkbox" className="done-chk" checked disabled={!canAck} aria-label={`${a.name} is acknowledged. Untick to undo`} title={canAck ? "Acknowledged. Untick to undo" : "Acknowledged"} onChange={() => { reopen(a.id); setNote(`"${a.comment}" is back in Active`); }} />
                    : a.state === "UNACK" ? <input type="checkbox" disabled={!canAck} aria-label={`Select ${a.name}`} title={canAck ? "Select, then acknowledge" : "Read only view"} checked={checked.has(a.id)} onChange={() => toggle(a.id)} />
                    : null}
                </span>
                {COLS.map((c) => <span key={c.key} className={`c-${c.key}`} title={c.key === "comment" ? a.detail : undefined}>{c.cell(a, now)}</span>)}
              </div>
            ))}
            {!shown.length && <div className="gt-none">No alarms match these filters.</div>}
          </div>
        </div>

        <div className={`al-detail ${chosen ? "" : "empty"}`} aria-live="polite">
          {chosen ? (
            <>
              <div className="al-d-main">
                <b>{chosen.comment}</b>
                <p>{chosen.detail}</p>
                <div className="al-d-meta">
                  <span><i>Where</i>{chosen.name}, {chosen.node}</span>
                  <span><i>Ministry</i>{MINISTRY_BY_ID[chosen.ministry].short}</span>
                  <span><i>Since</i>{fmtGrid(chosen.at)}</span>
                  {chosen.doneAt && <span><i>Acknowledged</i>{fmtGrid(chosen.doneAt)} by {chosen.by}</span>}
                  <button className="al-link" onClick={() => openWhere(chosen)}>{STATION_PAGES.has(chosen.stationId) ? "Open station page" : "Open ministry page"}</button>
                </div>
              </div>
              {chosen.state === "UNACK" && <button className="al-btn go" disabled={!canAck} title={canAck ? "" : "Switch to the Operator view to acknowledge"} onClick={() => doAck([chosen.id])}><Check size={14} /> Acknowledge</button>}
              {chosen.state === "ACK_RTN" && <button className="al-btn" disabled={!canAck} onClick={() => { reopen(chosen.id); setNote("Back in Active"); }}><Undo2 size={14} /> Undo</button>}
            </>
          ) : <span>Select an alarm to read its full description.{!canAck && " You are in the Cabinet view (read only). Switch to the Operator view in the account menu to acknowledge."}</span>}
          {todo.length > 0 && <button className="al-btn go many" onClick={() => doAck(todo)}><Check size={14} /> Acknowledge {todo.length}</button>}
        </div>

        {note && <div className="al-note" role="status"><Undo2 size={14} /> {note}</div>}
        <div className="al-status" role="status">
          <span>Displaying {rows.length ? `${from} to ${to}` : "0"} of {all.length} alarms</span>
          <span>Query: Default</span>
          <span>Filter: {status}{sev !== "All" ? ` / ${sev}` : ""}{cls !== "All" ? ` / ${cls}` : ""}{min !== "All" ? ` / ${MINISTRY_BY_ID[min].short}` : ""}</span>
          <span className="pager">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page"><ChevronLeft size={14} /></button>
            <em>{page + 1} / {pages}</em>
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Next page"><ChevronRight size={14} /></button>
          </span>
          <span className="loc">Cairo · simulated data</span>
        </div>
      </section>
    </motion.div>
  );
}
