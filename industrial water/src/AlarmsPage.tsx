import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Search, Undo2 } from "lucide-react";
import { fmtGrid, useStore, type AlarmItem } from "./store";
import { CountUp } from "./ui";
import Backdrop from "./Backdrop";
import type { Go } from "./App";

const STATUS = ["Active", "Done", "All"] as const;
type Status = (typeof STATUS)[number];
const SEV = ["All", "Critical", "Warning", "Info"] as const;
type SevF = (typeof SEV)[number];
const sevOf = (a: AlarmItem): SevF => (a.sev === "bad" ? "Critical" : a.sev === "warn" ? "Warning" : "Info");

type Key = "time" | "state" | "kind" | "cls" | "priority" | "name" | "group" | "node" | "provider" | "limit" | "comment";
const COLS: { key: Key; label: string; cell: (a: AlarmItem) => string }[] = [
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
  { key: "comment", label: "AlarmComment", cell: (a) => a.comment },
];
const sortVal = (a: AlarmItem, k: Key): string | number => (k === "time" ? a.at : k === "priority" ? a.priority : String(COLS.find((c) => c.key === k)!.cell(a)).toLowerCase());

const ROW_H = 34;

/** how many table rows fit the space the table has, so the list never needs a scrollbar */
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

export default function AlarmsPage({ go, focus: focusId }: { go: Go; focus?: string }) {
  const { alarms, done, all, markDone, undo } = useStore();
  const [note, setNote] = useState<string | null>(null);
  const pendingFocus = useRef<string | undefined>(focusId);
  const [status, setStatus] = useState<Status>("Active");
  const [sev, setSev] = useState<SevF>("All");
  const [cls, setCls] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "time", dir: -1 });
  const [focus, setFocus] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [bodyRef, perPage] = useRowsThatFit();

  const critical = alarms.filter((a) => a.sev === "bad").length;
  const doneToday = done.filter((a) => a.doneAt && Date.now() - a.doneAt < 24 * 3600 * 1000).length;
  const classes = useMemo(() => [...new Set(all.map((a) => a.cls))].sort(), [all]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = all.filter((a) => (status === "All" || (status === "Done") === (a.state === "ACK_RTN"))
      && (sev === "All" || sevOf(a) === sev) && (cls === "All" || a.cls === cls)
      && (!needle || `${a.comment} ${a.detail} ${a.where} ${a.name} ${a.node} ${a.cls}`.toLowerCase().includes(needle)));
    return list.sort((x, y) => {
      const a = sortVal(x, sort.key), b = sortVal(y, sort.key);
      return (a < b ? -1 : a > b ? 1 : 0) * sort.dir || y.at - x.at;
    });
  }, [all, status, sev, cls, q, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  useEffect(() => { setPage((p) => Math.min(p, pages - 1)); }, [pages]);
  useEffect(() => { setPage(0); }, [status, sev, cls, q, sort]);
  const shown = rows.slice(page * perPage, page * perPage + perPage);
  const from = rows.length ? page * perPage + 1 : 0;
  const to = Math.min(rows.length, (page + 1) * perPage);

  // arriving from a work order: show that alarm, on the right page, selected
  const wantPage = useRef<string | undefined>(undefined);
  useEffect(() => { // step 1: clear the filters and select the alarm
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = undefined;
    if (!all.some((a) => a.id === id)) return;
    setStatus("All"); setSev("All"); setCls("All"); setQ(""); setSort({ key: "time", dir: -1 });
    setFocus(id);
    wantPage.current = id;
  }, [all]);
  useEffect(() => { // step 2: once the filters have settled, show the page the alarm is on
    const id = wantPage.current;
    if (!id || status !== "All" || sev !== "All" || cls !== "All" || q) return;
    const i = rows.findIndex((a) => a.id === id);
    if (i < 0) return;
    setPage(Math.floor(i / perPage));
    wantPage.current = undefined;
  }, [rows, perPage, status, sev, cls, q]);
  useEffect(() => { if (!note) return; const t = window.setTimeout(() => setNote(null), 3200); return () => window.clearTimeout(t); }, [note]);

  const chosen = all.find((a) => a.id === focus) ?? null;
  const isDone = (a: AlarmItem) => a.state === "ACK_RTN";
  const reopen = (a: AlarmItem) => { undo(a.id); setNote(`"${a.comment}" is back in Active`); };
  const toggleSort = (key: Key) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "time" ? -1 : 1 }));
  const toggle = (id: string) => setChecked((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const activeShown = shown.filter((a) => !isDone(a));
  const onlyDone = shown.length > 0 && activeShown.length === 0;
  const allOnPage = onlyDone || (activeShown.length > 0 && activeShown.every((a) => checked.has(a.id)));
  const toggleAll = () => setChecked((c) => { const n = new Set(c); activeShown.forEach((a) => (allOnPage ? n.delete(a.id) : n.add(a.id))); return n; });
  const todo = [...checked].filter((id) => alarms.some((a) => a.id === id));
  const doMark = () => { markDone(todo); setChecked(new Set()); };

  const cards = [
    { label: "Active alarms", value: alarms.length, note: "waiting for action", tone: "warn" },
    { label: "Critical", value: critical, note: "need attention now", tone: "bad" },
    { label: "Done in the last 24 h", value: doneToday, note: "marked as done", tone: "good" },
    { label: "Total this week", value: all.length, note: "all alarms listed", tone: "info" },
  ];

  return (
    <div className="al">
      <Backdrop src="/mmm.jpg" />
      <div className="al-in">
        <div className="al-head">
          <h1>Alarms</h1>
          <p>The full alarm list. Red rows are waiting, blue rows are done.</p>
        </div>

        <div className="al-cards">
          {cards.map((c, i) => (
            <motion.div key={c.label} className={`al-card ${c.tone}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4 }}>
              <b><CountUp value={c.value} /></b>
              <div><strong>{c.label}</strong><span>{c.note}</span></div>
            </motion.div>
          ))}
        </div>

        <section className="card al-panel">
          <div className="al-filters">
            <div className="seg" role="tablist" aria-label="Alarm status">
              {STATUS.map((s) => <button key={s} role="tab" aria-selected={status === s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>{s}{s === "Active" ? ` ${alarms.length}` : ""}</button>)}
            </div>
            <div className="fchips">
              {SEV.map((x) => <button key={x} className={`fchip ${sev === x ? "on" : ""}`} onClick={() => setSev(x)}>{x}</button>)}
            </div>
            <label className="fselect"><span className="sr">Class</span>
              <select value={cls} onChange={(e) => setCls(e.target.value)}>
                <option value="All">All classes</option>
                {classes.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label className="fsearch"><Search size={15} /><span className="sr">Search alarms</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search alarms" /></label>
          </div>

          <div className="gt" role="table" aria-label="Alarm grid">
            <div className="gt-row gt-head" role="row">
              <span className="c-chk"><input type="checkbox" aria-label="Select all on this page" title={onlyDone ? "These are done. Untick a row to undo it." : "Select all on this page"} checked={allOnPage} disabled={onlyDone} onChange={toggleAll} /></span>
              {COLS.map((c) => (
                <button key={c.key} className={`c-${c.key}`} role="columnheader" onClick={() => toggleSort(c.key)} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  {c.label}{sort.key === c.key && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                </button>
              ))}
            </div>
            <div className="gt-body" ref={bodyRef}>
              {shown.map((a) => (
                <div key={a.id} role="row" className={`gt-row ${a.state === "ACK_RTN" ? "ack" : "unack"} ${focus === a.id ? "sel" : ""}`} onClick={() => setFocus(a.id)}>
                  <span className="c-chk" onClick={(e) => e.stopPropagation()}>
                    {isDone(a)
                      ? <input type="checkbox" className="done-chk" aria-label={`${a.name} is done. Untick to undo`} title="Done. Untick to undo" checked onChange={() => reopen(a)} />
                      : <input type="checkbox" aria-label={`Select ${a.name}`} title="Select, then mark as done" checked={checked.has(a.id)} onChange={() => toggle(a.id)} />}
                  </span>
                  {COLS.map((c) => <span key={c.key} className={`c-${c.key}`} title={c.key === "comment" ? a.detail : undefined}>{c.cell(a)}</span>)}
                </div>
              ))}
              {!shown.length && <div className="gt-none">{status === "Active" && !alarms.length ? "No active alarms. Open Process, MMM or CPG and pick a scenario to see alarms appear here." : "No alarms match these filters."}</div>}
            </div>
          </div>

          <div className={`al-detail ${chosen ? "" : "empty"}`} aria-live="polite">
            {chosen ? (
              <>
                <div className="al-d-main">
                  <b>{chosen.comment}</b>
                  <p>{chosen.detail}</p>
                  <div className="al-d-meta">
                    <span><i>Where</i>{chosen.where}</span>
                    <span><i>Since</i>{fmtGrid(chosen.at)}</span>
                    <span><i>Class</i>{chosen.cls}</span>
                    {chosen.doneAt && <span><i>Done</i>{fmtGrid(chosen.doneAt)} by {chosen.by}</span>}
                    <button className="al-link" onClick={() => go(chosen.area)}>Open {chosen.area === "process" ? "Process" : chosen.area === "mmm" ? "MMM" : "CPG"} tab</button>
                  </div>
                </div>
                {isDone(chosen)
                  ? <button className="al-btn" onClick={() => reopen(chosen)}><Undo2 size={14} /> Undo</button>
                  : <button className="al-btn go" onClick={() => markDone([chosen.id])}><Check size={14} /> Mark as done</button>}
              </>
            ) : <span>Select an alarm to read its full description.</span>}
            {todo.length > 0 && <button className="al-btn go many" onClick={doMark}><Check size={14} /> Mark {todo.length} as done</button>}
          </div>

          {note && <div className="al-note" role="status"><Undo2 size={14} /> {note}</div>}
          <div className="al-status" role="status">
            <span>Displaying {rows.length ? `${from} to ${to}` : "0"} of {all.length} alarms</span>
            <span>Query: Default</span>
            <span>Filter: {status}{sev !== "All" ? ` / ${sev}` : ""}{cls !== "All" ? ` / ${cls}` : ""}</span>
            <span>100% Complete</span>
            <span className="pager">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page"><ChevronLeft size={14} /></button>
              <em>{page + 1} / {pages}</em>
              <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Next page"><ChevronRight size={14} /></button>
            </span>
            <span className="loc">Cairo</span>
          </div>
        </section>
      </div>
    </div>
  );
}
