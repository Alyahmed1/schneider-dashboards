import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, Check, Clock, Minus, RotateCcw, Search, Sparkles, Undo2, User, X } from "lucide-react";
import { PLANT, type Filters } from "./data";
import { predictive, woInArea, type PredRow, type WorkOrder, type WoStatus } from "./cmms";
import { C, Chip, CountUp, rise } from "./ui";
import ExportMenu from "./ExportMenu";
import { downloadCsv, downloadPdf, type ReportSpec } from "./exportReport";


const COLS: { id: WoStatus; label: string; hint: string }[] = [
  { id: "Open", label: "Open", hint: "Waiting to start" },
  { id: "In progress", label: "In progress", hint: "Crew on site" },
  { id: "Done", label: "Done", hint: "Completed" },
];
const initials = (s: string) => s.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const RISK_FILTERS = ["All", "High risk", "Watch", "Healthy"] as const;
type RiskFilter = (typeof RISK_FILTERS)[number];
const riskTone = (r: number) => (r >= 50 ? C.bad : r >= 25 ? C.warn : C.good);
const riskBand = (r: number): Exclude<RiskFilter, "All"> => (r >= 50 ? "High risk" : r >= 25 ? "Watch" : "Healthy");
const TREND = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus } as const;

export default function Maintenance({ f, wos, setWos }: { f: Filters; wos: WorkOrder[]; setWos: (fn: (w: WorkOrder[]) => WorkOrder[]) => void }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<WoStatus | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [hf, setHf] = useState<RiskFilter>("All");
  const [pick, setPick] = useState<string | null>(null);
  const [made, setMade] = useState<Record<string, string>>({});

  const list = useMemo(() => wos.filter((w) => woInArea(w, f)), [wos, f]);
  const sel = wos.find((w) => w.id === selId) ?? null;
  const move = (id: string, status: WoStatus) => setWos((all) => all.map((w) => (w.id === id ? { ...w, status } : w)));

  useEffect(() => {
    if (!sel) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setSelId(null); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [sel]);

  const open = list.filter((w) => w.status !== "Done");
  const late = open.filter((w) => w.late).length;
  const done = list.filter((w) => w.status === "Done").length;
  const planned = list.filter((w) => w.type === "Planned").length;
  const tiles = [
    { label: "Open work orders", value: open.length, dec: 0, unit: "", note: `${list.filter((w) => w.status === "In progress").length} in progress`, tone: "info" },
    { label: "Overdue", value: late, dec: 0, unit: "", note: "need action today", tone: late ? "bad" : "good" },
    { label: "PM compliance", value: 94.2, dec: 1, unit: "%", note: "target 95%", tone: "warn" },
    { label: "Repair time (MTTR)", value: 3.4, dec: 1, unit: "h", note: "per breakdown", tone: "good" },
    { label: "Planned work", value: list.length ? (planned / list.length) * 100 : 0, dec: 0, unit: "%", note: `${done} finished`, tone: "info" },
  ] as const;

  const all = useMemo(() => predictive(f).sort((a, b) => b.risk - a.risk), [f]);
  const rows = useMemo(() => all.filter((a) => (hf === "All" || riskBand(a.risk) === hf) && (!q || a.name.toLowerCase().includes(q.toLowerCase()))), [all, hf, q]);
  const atRisk = all.filter((a) => a.risk >= 50).length;
  const soon = [...all].sort((a, b) => a.failIn - b.failIn)[0];
  const sel2: PredRow | undefined = rows.find((a) => a.name === pick) ?? rows[0];
  const createWo = (a: PredRow) => {
    const id = `WO-${2450 + Object.keys(made).length}`;
    setMade((m) => ({ ...m, [a.name]: id }));
    setWos((w) => [...w, { id, title: a.pred.action.split(".")[0], asset: a.name, area: a.area === "All plant" ? "All plant" : a.area, prio: a.risk >= 50 ? "High" : "Medium", due: `by ${a.failDate}`, status: "Open", type: "Planned", crew: "Predictive team", hours: 4, note: `Created from predictive maintenance. ${a.pred.signal} is ${a.pred.value} and rising. Estimated failure in ${a.failIn} days (${a.pred.confidence}% confidence).` }]);
  };

  /** what the predictive table shows right now, as a report: the same filter, the same search, the same rows */
  const buildReport = (): ReportSpec => {
    const when = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    const filterText = `${hf === "All" ? "All assets" : hf}${q ? `, search "${q}"` : ""}`;
    return {
      file: "predictive-maintenance",
      title: "Predictive maintenance",
      subtitle: `${PLANT.name}  |  generated ${when}  |  sample data`,
      summary: [
        ["Assets at risk", String(atRisk)],
        ["Next predicted failure", soon.name],
        ["Expected in", `${soon.failIn} days`],
        ["Downtime avoided", "46 h this quarter"],
        ["Assets in this report", String(rows.length)],
      ],
      note: `Showing: ${filterText} (${rows.length} of ${all.length})`,
      columns: ["Asset", "Area", "Class", "Failure risk, 30 d (%)", "Fails in (days)", "Expected date", "Signal", "Reading", "Confidence (%)", "Recommended action"],
      rows: rows.map((a) => [a.name, a.area, a.crit, String(a.risk), String(a.failIn), a.failDate, a.pred.signal, `${a.pred.value} (${a.pred.trend === "up" ? "rising" : a.pred.trend === "down" ? "falling" : "steady"})`, String(a.pred.confidence), a.pred.action]),
      widths: [2.1, 1.1, 0.8, 1.2, 1, 1.1, 1.3, 1.5, 1.3, 3.6],
      tone: (_r, c, t) => (c === 3 ? (Number(t) >= 50 ? "bad" : Number(t) >= 25 ? "warn" : "good") : undefined),
    };
  };

  return (
    <div className="mt">
      <motion.div className="mt-head" {...rise(0)}><h1>Maintenance</h1><p>Work orders and predictive maintenance. Drag a card to another column, or use its buttons.</p></motion.div>

      <div className="mt-tiles">
        {tiles.map((x, i) => (
          <motion.div key={x.label} className={`mini-kpi tone-${x.tone}`} {...rise(i)}>
            <span>{x.label}</span>
            <b><CountUp value={x.value} decimals={x.dec} />{x.unit && <small>{x.unit}</small>}</b>
            <em>{x.note}</em>
          </motion.div>
        ))}
      </div>

      <div className="mt-main">
        <motion.section className="card ins-card mt-board" {...rise(1)}>
          <header className="ins-ch"><div><h3>Work order board</h3><p>Updates the Overview too</p></div></header>
          <div className="board">
          {COLS.map((c) => {
            const items = list.filter((w) => w.status === c.id);
            return (
              <div key={c.id} className={`col ${over === c.id ? "over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); if (over !== c.id) setOver(c.id); }}
                onDragLeave={() => setOver((o) => (o === c.id ? null : o))}
                onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain") || dragId; if (id) move(id, c.id); setOver(null); setDragId(null); }}>
                <header><b>{c.label}</b><span className="count"><CountUp value={items.length} /></span><em>{c.hint}</em></header>
                <div className="col-body">
                  <AnimatePresence initial={false}>
                    {items.map((w, n) => (
                      <motion.article key={w.id} layout draggable
                        onDragStart={(e) => { (e as unknown as DragEvent).dataTransfer?.setData("text/plain", w.id); setDragId(w.id); }}
                        onDragEnd={() => { setDragId(null); setOver(null); }}
                        className={`wo prio-${w.status === "Done" ? "done" : w.prio.toLowerCase()} ${dragId === w.id ? "dragging" : ""}`}
                        initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ type: "spring", stiffness: 380, damping: 32, delay: n * 0.03 }}
                        onClick={() => setSelId(w.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setSelId(w.id); }}>
                        <div className="wo-top"><span className="wo-id">{w.id}</span><span className="wo-asset">{w.asset}</span><span className={`wo-type ${w.type.toLowerCase()}`}>{w.type}</span><span className="av" title={w.crew}>{initials(w.crew)}</span></div>
                        <b>{w.title}</b>
                        <div className="wo-meta">
                          <span className={w.late && w.status !== "Done" ? "late" : ""}><CalendarClock size={13} /> {w.late && w.status !== "Done" ? "Overdue · " : ""}{w.due}</span>
                          <span><Clock size={13} /> {w.hours} h</span>
                          <div className="wo-act" onClick={(e) => e.stopPropagation()}>
                            {w.status === "Open" && <button onClick={() => move(w.id, "In progress")}>Start</button>}
                            {w.status === "In progress" && <button onClick={() => move(w.id, "Done")}><Check size={13} /> Complete</button>}
                            {w.status === "Done" && <button onClick={() => move(w.id, "Open")}><Undo2 size={13} /> Reopen</button>}
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                  {!items.length && <div className="col-empty">Drop a work order here</div>}
                </div>
              </div>
            );
          })}
          </div>
        </motion.section>

        <div className="mt-side">
          <motion.section className="card ins-card mt-assets" {...rise(3)}>
            <header className="ins-ch">
              <div><h3>Predictive maintenance</h3><p>Which assets will fail next, and what to do about it</p></div>
              <div className="mt-tools">
                <label className="search"><Search size={14} /><span className="sr">Search assets</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assets" /></label>
                <ExportMenu onPdf={() => downloadPdf(buildReport())} onCsv={() => downloadCsv(buildReport())} />
              </div>
            </header>
            <div className="pm-stats">
              <div className="bad"><span>Assets at risk</span><b><CountUp value={atRisk} /></b></div>
              <div><span>Next predicted failure</span><b>{soon.name}</b><small>in {soon.failIn} days</small></div>
              <div className="good"><span>Downtime avoided</span><b><CountUp value={46} /><em> h</em></b><small>this quarter</small></div>
            </div>
            <div className="chips">
              {RISK_FILTERS.map((x) => <button key={x} className={`fchip ${hf === x ? "on" : ""}`} onClick={() => setHf(x)}>{x}</button>)}
            </div>
            <div className="mt-assets-scroll">
              <table className="tbl assets">
                <thead><tr><th>Asset</th><th>Failure risk, 30 d</th><th>Fails in</th><th>Signal</th></tr></thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {rows.map((a, n) => {
                      const T = TREND[a.pred.trend];
                      return (
                        <motion.tr key={a.name} layout className={sel2?.name === a.name ? "sel" : ""} onClick={() => setPick(a.name)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: n * 0.02 }}>
                          <td><b>{a.name}</b><small>{a.area} · class {a.crit}</small></td>
                          <td className="hcell"><div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${a.risk}%` }} transition={{ duration: 0.8 }} style={{ background: riskTone(a.risk) }} /></div><span>{a.risk}%</span></td>
                          <td className={a.risk >= 50 ? "late" : ""}>{a.failIn} d<small>{a.failDate}</small></td>
                          <td><b className="sg">{a.pred.value}<T size={12} className={`tr-${a.pred.trend}`} /></b><small>{a.pred.signal}</small></td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  {!rows.length && <tr><td colSpan={4} className="col-empty">No assets match</td></tr>}
                </tbody>
              </table>
            </div>
            {sel2 && (
              <div className="pm-detail">
                <div>
                  <b><Sparkles size={13} /> {sel2.name}<em>{riskBand(sel2.risk)} · {sel2.pred.confidence}% confidence</em></b>
                  <p>{sel2.pred.action}</p>
                </div>
                {made[sel2.name]
                  ? <span className="pm-made"><Check size={13} /> {made[sel2.name]} created</span>
                  : <button className="btn on" onClick={() => createWo(sel2)}>Create work order <ArrowRight size={13} /></button>}
              </div>
            )}
          </motion.section>
        </div>
      </div>

      <AnimatePresence>
        {sel && (
          <motion.div className="modal-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelId(null)}>
            <motion.div className="modal" role="dialog" aria-modal="true" aria-label={sel.title} onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} transition={{ type: "spring", stiffness: 340, damping: 30 }}>
              <button className="x" onClick={() => setSelId(null)} aria-label="Close"><X size={16} /></button>
              <span className="wo-id">{sel.id}</span>
              <h3>{sel.title}</h3>
              <div className="modal-chips">
                <Chip tone={sel.status === "Done" ? "good" : sel.status === "In progress" ? "info" : "warn"}>{sel.status}</Chip>
                <Chip tone={sel.prio === "High" ? "bad" : sel.prio === "Medium" ? "warn" : "good"}>{sel.prio} priority</Chip>
                <Chip tone="mute">{sel.type}</Chip>
                {sel.late && sel.status !== "Done" && <Chip tone="bad">Overdue</Chip>}
              </div>
              <p className="modal-note">{sel.note}</p>
              <dl className="d-grid">
                <div><dt>Asset</dt><dd>{sel.asset}</dd></div>
                <div><dt>Area</dt><dd>{sel.area}</dd></div>
                <div><dt>Due</dt><dd>{sel.due}</dd></div>
                <div><dt>Estimated time</dt><dd>{sel.hours} h</dd></div>
                <div><dt>Crew</dt><dd><User size={12} /> {sel.crew}</dd></div>
              </dl>
              <div className="modal-act">
                {sel.status === "Open" && <button className="btn on" onClick={() => move(sel.id, "In progress")}>Start work</button>}
                {sel.status === "In progress" && <button className="btn on" onClick={() => { move(sel.id, "Done"); setSelId(null); }}><Check size={14} /> Mark complete</button>}
                {sel.status === "Done" && <button className="btn" onClick={() => move(sel.id, "Open")}><RotateCcw size={14} /> Reopen</button>}
                <button className="btn" onClick={() => setSelId(null)}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
