import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CalendarCheck, Check, Undo2 } from "lucide-react";
import { C, maintenanceData, maintenanceKpis, PRIORITY_TONE, rangeLabel, WO_TONE, type Filters, type Priority, type WorkOrder } from "./data";
import { axis, Bar, Card, chartAnim, Chip, CountUp, Detail, grid, KpiCard, Replay, SearchBox, Segmented, Tip, useLast, usePersisted, type ModalTone } from "./ui";
import { useLiveKpis, useLiveRows } from "./live";
import type { Go } from "./nav";

const FILTERS = ["All", "Open", "In progress", "Scheduled", "Overdue", "Done"] as const;
type Filter = (typeof FILTERS)[number];
const PRIO_MODAL: Record<Priority, ModalTone> = { High: "orange", Medium: "yellow", Low: "green" };
const KINDS = { Planned: { color: C.blue, key: "planned", icon: CalendarCheck }, Unplanned: { color: C.warn, key: "unplanned", icon: AlertTriangle } } as const;
type Kind = keyof typeof KINDS;

export default function Maintenance({ f, go }: { f: Filters; go: Go }) {
  const d = useMemo(() => maintenanceData(f), [f]);
  const [done, setDone] = usePersisted<Record<string, boolean>>("jotun-wo-done", {});
  const [flt, setFlt] = useState<Filter>("All");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<WorkOrder | null>(null);
  const w0 = useLast(sel);

  const isDone = (w: WorkOrder) => !!done[w.id];
  const statusOf = (w: WorkOrder) => (isDone(w) ? "Done" : w.status);
  const setWo = (id: string, v: boolean) => setDone((p) => { const n = { ...p }; if (v) n[id] = true; else delete n[id]; return n; });

  const open = d.workOrders.filter((w) => !isDone(w)).length;
  const overdue = d.workOrders.filter((w) => !isDone(w) && w.status === "Overdue").length;
  const base = useMemo(() => maintenanceKpis(f, open, overdue), [f, open, overdue]);
  const { kpis } = useLiveKpis(base);
  const [kind, setKind] = useState<Kind>("Planned");
  const hoursP = useLiveRows(d.hours, "planned", "mhp", 0.04, 1);
  const hours = useLiveRows(hoursP, "unplanned", "mhu", 0.06, 1);
  const totals = { Planned: hours.reduce((a, x) => a + x.planned, 0), Unplanned: hours.reduce((a, x) => a + x.unplanned, 0) };
  const allHours = totals.Planned + totals.Unplanned;
  const kc = KINDS[kind];
  const ofType = d.workOrders.filter((w) => w.type === kind);
  const openOfType = ofType.filter((w) => !isDone(w));
  const bucketName = f.range === "24H" ? "4-hour block" : f.range === "YTD" ? "month" : "day";

  const rows = d.workOrders.filter((w) => (flt === "All" || statusOf(w) === flt) && (!q || `${w.id} ${w.asset} ${w.crew}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <div className="grid g-kpi">{kpis.map((k, i) => <KpiCard key={k.id} k={k} i={i} />)}</div>

      <div className="grid g-21">
        <Card title="Planned vs unplanned" sub={`Maintenance hours · ${rangeLabel(f.range)}`} i={1}>
          <div className="tabs" role="tablist" aria-label="Maintenance type" style={{ marginBottom: 12 }}>
            {(Object.keys(KINDS) as Kind[]).map((k) => {
              const K = KINDS[k], I = K.icon;
              return (
                <button key={k} role="tab" aria-selected={k === kind} className={`tab ${k === kind ? "on" : ""}`} style={{ "--tc": K.color } as React.CSSProperties} onClick={() => setKind(k)}>
                  <I size={18} style={{ color: K.color }} />
                  <div><b>{k}</b><div className="card-sub" style={{ margin: 0 }}>{totals[k].toFixed(0)} h · {allHours ? ((totals[k] / allHours) * 100).toFixed(0) : 0}% of hours</div></div>
                </button>
              );
            })}
          </div>

          <div className="mini-stats" key={kind + "-stats"}>
            <div className="mini"><b style={{ color: kc.color }}><CountUp value={totals[kind]} dp={0} /> h</b><span>Total {kind.toLowerCase()} hours</span></div>
            <div className="mini"><b style={{ color: kc.color }}><CountUp value={allHours ? (totals[kind] / allHours) * 100 : 0} dp={0} />%</b><span>Share of all hours</span></div>
            <div className="mini"><b style={{ color: kc.color }}>{openOfType.length}<small style={{ fontSize: 13, fontWeight: 500, opacity: 0.7 }}> of {ofType.length}</small></b><span>Orders still open</span></div>
            <div className="mini"><b style={{ color: kc.color }}><CountUp value={totals[kind] / Math.max(1, hours.length)} dp={1} /> h</b><span>Average per {bucketName}</span></div>
          </div>

          <Replay key={kind} className="chart-h" style={{ marginTop: 12 }}>
            <ResponsiveContainer>
              <BarChart data={hours} margin={{ left: -10, right: 6, top: 8 }}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={14} />
                <YAxis {...axis} width={40} />
                <Tooltip content={<Tip unit=" h" />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <RBar dataKey={kc.key} name={kind.toLowerCase()} fill={kc.color} radius={[6, 6, 0, 0]} {...chartAnim} />
              </BarChart>
            </ResponsiveContainer>
          </Replay>

          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>Open {kind.toLowerCase()} orders</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {openOfType.slice(0, 4).map((w) => (
                  <tr key={w.id} className="clickable" tabIndex={0} onClick={() => setSel(w)} onKeyDown={(e) => { if (e.key === "Enter") setSel(w); }}>
                    <td><span className="strong">{w.asset}</span><div className="kpi-note">{w.id} · {w.crew}</div></td>
                    <td className="mono">{w.due}</td><td><Chip tone={WO_TONE[w.status]}>{w.status}</Chip></td>
                  </tr>
                ))}
                {!openOfType.length && <tr><td colSpan={3} className="empty">All {kind.toLowerCase()} orders are done.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Predicted service" sub="Assets expected to need attention first" i={2}>
          <div className="row-kv">
            {d.predicted.map((p) => {
              const c = p.health >= 80 ? C.good : p.health >= 65 ? C.yellow : C.bad;
              return (
                <div key={p.id} className="silo">
                  <span className="silo-name">{p.name}<small>{p.id}</small></span>
                  <span className="silo-val">in ~{p.days} d · <Chip tone={PRIORITY_TONE[p.risk]}>{p.risk} risk</Chip></span>
                  <Bar pct={p.health} color={c} />
                </div>
              );
            })}
            {!d.predicted.length && <p className="empty">No assets to forecast for this line.</p>}
          </div>
        </Card>
      </div>

      <Card title="Work orders" sub={`${rows.length} shown · click a row for details`} i={3}
        right={
          <div className="table-tools">
            <Segmented value={flt} options={FILTERS} onChange={setFlt} label="Work order status" />
            <SearchBox value={q} onChange={setQ} placeholder="Search order, asset or crew…" />
          </div>
        }>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Asset</th><th>Type</th><th>Priority</th><th>Crew</th><th>Due</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((w) => {
                const st = statusOf(w);
                return (
                  <motion.tr layout key={w.id} className="clickable" tabIndex={0} style={{ opacity: isDone(w) ? 0.55 : 1 }}
                    onClick={() => setSel(w)} onKeyDown={(e) => { if (e.key === "Enter") setSel(w); }}>
                    <td className="mono">{w.id}</td><td className="strong">{w.asset}</td><td>{w.type}</td>
                    <td><Chip tone={PRIORITY_TONE[w.priority]}>{w.priority}</Chip></td><td>{w.crew}</td><td className="mono">{w.due}</td>
                    <td><Chip tone={st === "Done" ? "good" : WO_TONE[w.status]}>{st}</Chip></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {isDone(w)
                        ? <button className="tick-btn undo" title="Undo: reopen this order" aria-label={`Reopen ${w.id}`} onClick={() => setWo(w.id, false)}><Undo2 size={14} /></button>
                        : <button className="tick-btn" title="Mark as done" aria-label={`Mark ${w.id} as done`} onClick={() => setWo(w.id, true)}><Check size={14} /></button>}
                    </td>
                  </motion.tr>
                );
              })}
              {!rows.length && <tr><td colSpan={8} className="empty">No work orders match.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Spare parts" sub="Stock against the minimum level" i={4}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Part</th><th>For</th><th className="num">In stock</th><th className="num">Minimum</th><th style={{ width: 160 }}>Level</th><th>Status</th></tr></thead>
            <tbody>
              {d.parts.map((p) => (
                <tr key={p.part}>
                  <td className="strong">{p.part}</td><td>{p.asset}</td><td className="num">{p.stock}</td><td className="num">{p.min}</td>
                  <td><Bar pct={p.min ? (p.stock / (p.min * 2)) * 100 : 100} color={p.tone === "bad" ? C.bad : p.tone === "warn" ? C.warn : C.good} /></td>
                  <td><Chip tone={p.tone}>{p.label}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {w0 && (
        <Detail open={!!sel} onClose={() => setSel(null)} tone={PRIO_MODAL[w0.priority]} eyebrow={`${w0.id} · ${w0.type}`} title={w0.asset}
          big={w0.priority} bigNote="priority"
          rows={[["Crew", w0.crew], ["Due", w0.due], ["Status", statusOf(w0)], ["Product family", w0.family]]}
          actions={
            <>
              {isDone(w0)
                ? <button className="mbtn" onClick={() => { setWo(w0.id, false); setSel(null); }}>Reopen order</button>
                : <button className="mbtn" onClick={() => { setWo(w0.id, true); setSel(null); }}>Mark done</button>}
              <button className="mbtn ghost" onClick={() => { setSel(null); go("equipment"); }}>Open equipment</button>
            </>
          } />
      )}
    </>
  );
}
