import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CalendarClock, Check, Clock, RotateCcw, Search, Undo2, User, Wrench, X } from "lucide-react";
import { BUCKET, RANGE_LABEL, rng, type Filters, type Kpi } from "./data";
import { assetsIn, maintenanceHours, woInArea, type WorkOrder, type WoStatus } from "./cmms";
import { axis, C, Card, Chip, CountUp, gridProps, KpiCard, Replay, Tip } from "./ui";


const COLS: { id: WoStatus; label: string; hint: string }[] = [
  { id: "Open", label: "Open", hint: "Waiting to start" },
  { id: "In progress", label: "In progress", hint: "Crew on site" },
  { id: "Done", label: "Done", hint: "Completed" },
];
const initials = (s: string) => s.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
type WoKind = WorkOrder["type"];
const KINDS: WoKind[] = ["Planned", "Unplanned"];
const HEALTH_FILTERS =["All", "Needs attention", "Healthy"] as const;
type HealthFilter = (typeof HEALTH_FILTERS)[number];
const healthTone = (h: number) => (h >= 80 ? C.good : h >= 65 ? C.warn : C.bad);

export default function Maintenance({ f, wos, setWos }: { f: Filters; wos: WorkOrder[]; setWos: (fn: (w: WorkOrder[]) => WorkOrder[]) => void }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<WoStatus | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [hf, setHf] = useState<HealthFilter>("All");
  const [kind, setKind] = useState<WoKind>("Planned");

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
  const sp = (seed: number, base: number) => { const r = rng(seed); return Array.from({ length: 14 }, () => base * (0.88 + r() * 0.24)); };
  const kpis: Kpi[] = [
    { id: "open", label: "Open work orders", value: open.length, decimals: 0, unit: "", delta: -3, goodWhenDown: true, note: `${list.filter((w) => w.status === "In progress").length} in progress`, spark: sp(1, 10) },
    { id: "late", label: "Overdue", value: late, decimals: 0, unit: "", delta: late ? 50 : -100, goodWhenDown: true, note: "need action today", spark: sp(2, 2) },
    { id: "pm", label: "PM compliance", value: 94.2, decimals: 1, unit: "%", delta: 1.3, note: "target 95%", spark: sp(3, 94) },
    { id: "mttr", label: "Repair time (MTTR)", value: 3.4, decimals: 1, unit: "hours", delta: -6.2, goodWhenDown: true, note: "per breakdown", spark: sp(4, 3.4) },
    { id: "plan", label: "Planned work", value: list.length ? (planned / list.length) * 100 : 0, decimals: 0, unit: "%", delta: 4.0, note: `${done} finished`, spark: sp(5, 70) },
  ];

  const hours = useMemo(() => maintenanceHours(f), [f]);
  const kindKey = kind === "Planned" ? "planned" : "unplanned";
  const kindHours = hours.reduce((s, h) => s + h[kindKey], 0);
  const kindOrders = list.filter((w) => w.type === kind).length;
  const assets = useMemo(() => assetsIn(f).filter((a) => (hf === "All" || (hf === "Healthy" ? a.health >= 80 : a.health < 80)) && (!q || a.name.toLowerCase().includes(q.toLowerCase()))), [f, hf, q]);

  return (
    <>
      <div className="grid g-kpi">
        {kpis.map((k, i) => <KpiCard key={k.id} k={k} i={i} hero={i === 0} />)}
      </div>

      <Card title="Work order board" sub="Drag a card to another column, or use the buttons on the card. Everything updates the Command Center too." i={1}
        right={<span className="hint-pill"><Wrench size={13} /> {RANGE_LABEL[f.range]} · {f.area}</span>}>
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
      </Card>

      <div className="grid g-12">
        <Card title="Maintenance hours" sub={`Hours ${BUCKET[f.range]} · ${kind === "Planned" ? "scheduled work, done on a calendar" : "breakdowns and faults, done as they happen"}`} i={2}>
          <div className="kind-tabs" role="tablist" aria-label="Maintenance type">
            {KINDS.map((k) => (
              <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>
                {k === "Planned" ? <CalendarClock size={15} /> : <AlertTriangle size={15} />}{k}
                {kind === k && <motion.i layoutId="kind-pill" className="kind-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              </button>
            ))}
          </div>
          <div className="kind-stats">
            <div><span>Total hours</span><b><CountUp value={kindHours} /></b></div>
            <div><span>Work orders</span><b><CountUp value={kindOrders} /></b></div>
            <div><span>Average per order</span><b><CountUp value={kindOrders ? kindHours / kindOrders : 0} decimals={1} /> h</b></div>
          </div>
          <Replay className="chart-h" key={kind}>
            <ResponsiveContainer>
              <BarChart data={hours} margin={{ left: -10, right: 6, top: 8 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={40} />
                <Tooltip content={<Tip unit="h" />} cursor={{ fill: "rgba(14,143,138,.06)" }} />
                <Bar dataKey={kind === "Planned" ? "planned" : "unplanned"} name={kind} fill={kind === "Planned" ? C.teal : C.warn} radius={[6, 6, 0, 0]} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </Replay>
        </Card>

        <Card title="Asset health" sub="Lowest health needs attention first" i={3} className="scroll-x"
          right={<label className="search"><Search size={14} /><span className="sr">Search assets</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assets" /></label>}>
          <div className="chips">
            {HEALTH_FILTERS.map((x) => <button key={x} className={`fchip ${hf === x ? "on" : ""}`} onClick={() => setHf(x)}>{x}</button>)}
          </div>
          <table className="tbl assets">
            <thead><tr><th>Asset</th><th>Health</th><th>Life left</th><th>Next PM</th></tr></thead>
            <tbody>
              <AnimatePresence initial={false}>
                {[...assets].sort((a, b) => a.health - b.health).map((a, n) => (
                  <motion.tr key={a.name} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: n * 0.02 }}>
                    <td><b>{a.name}</b><small>{a.area} · class {a.crit}</small></td>
                    <td className="hcell"><div className="bar"><motion.i initial={{ width: 0 }} whileInView={{ width: `${a.health}%` }} viewport={{ once: false }} transition={{ duration: 0.8 }} style={{ background: healthTone(a.health) }} /></div><span>{a.health}</span></td>
                    <td>{a.rul} d</td>
                    <td className={a.nextPm === "Overdue" ? "late" : ""}>{a.nextPm === "Overdue" ? <><AlertTriangle size={12} /> Overdue</> : a.nextPm}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {!assets.length && <tr><td colSpan={4} className="col-empty">No assets match</td></tr>}
            </tbody>
          </table>
        </Card>
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
    </>
  );
}
