import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, Cell, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, ArrowUpRight, Check, MapPin } from "lucide-react";
import { bucketUnit, C, maintenanceData, familyMix, fmt, overviewKpis, productionSeries, prodLines, rangeLabel, SEV_TONE, CAT_COLOR, type Alert, type Filters } from "./data";
import { axis, Card, chartAnim, Chip, CountUp, grid, KpiCard, Legend, rise, Tip, Replay } from "./ui";
import { jitter, LIVE_MS, useAlerts, useLiveKpis, useLiveRows, useTick } from "./live";
import { AlertDetail, SEV_ORDER, TONE_ICON, type AlertStatus } from "./Alerts";
import type { Go } from "./nav";

function Tile({ tone, label, title, big, note, onClick, i }:
  { tone: "navy" | "orange" | "green" | "yellow"; label: string; title: string; big: string; note: string; onClick: () => void; i: number }) {
  return (
    <motion.button className={`tile ${tone}`} onClick={onClick} {...rise(i)}>
      <div>
        <div className="tile-top"><span>{label}</span><span className="tile-go"><ArrowUpRight size={14} /></span></div>
        <span className="t">{title}</span>
      </div>
      <div className="tile-big">{big}<small>{note}</small></div>
    </motion.button>
  );
}

export default function Overview({ f, go, done, setStatus }: { f: Filters; go: Go; done: Set<string>; setStatus: (ids: string[], s: AlertStatus) => void }) {
  const [sel, setSel] = useState<Alert | null>(null);
  const base = useMemo(() => overviewKpis(f), [f]);
  const { kpis, updatedAt } = useLiveKpis(base);
  const prod = useMemo(() => productionSeries(f), [f]);
  const mix = useMemo(() => familyMix(f), [f]);
  const prodLive = useLiveRows(prod, "actual", "prod", 0.012, 0);
  const mixLive = useLiveRows(mix, "value", "mix", 0.012, 0);
  const total = mix.reduce((s, p) => s + p.value, 0);
  const { tick } = useTick();
  const lines = prodLines(f).map((l) => ({ ...l, speed: Math.round(jitter(l.id + "s", tick, l.speed, 0.02)), oee: jitter(l.id + "o", tick, l.oee, 0.008) }));
  const all = useAlerts(f);
  const open = useMemo(() => all.filter((a) => !done.has(a.id)).sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev]), [all, done]);
  const urgent = open.filter((a) => a.sev === "Critical").length;
  const out = kpis.find((k) => k.id === "out")!;
  const oee = kpis.find((k) => k.id === "oee")!;
  const wo = useMemo(() => maintenanceData(f).workOrders.find((w) => w.status === "Scheduled"), [f]);
  const crit = open.find((a) => a.sev === "Critical");
  const warn = open.find((a) => a.sev === "Warning");
  const best = [...lines].filter((l) => l.oee > 0).sort((a, b) => b.oee - a.oee)[0];

  return (
    <>
      <motion.div className="hero" {...rise(0)}>
        <img src="/factory.jpg" alt="Jotun factory entrance at sunset" />
        <Pin x={{ left: "6%", top: "36%" }} label="Dispatch bays" onClick={() => go("process", { stage: "dispatch" })} />
        <Pin x={{ left: "36%", top: "24%" }} label="Production hall" onClick={() => go("process", { stage: "dispersion" })} />
        <Pin x={{ left: "55%", top: "57%" }} label="Raw intake" onClick={() => go("process", { stage: "intake" })} />
        <Pin x={{ right: "22%", top: "16%" }} label="Silos and tank farm" warn onClick={() => go("logistics")} />
        <Pin x={{ right: "6%", top: "46%" }} label="Powder 1 · stopped" bad onClick={() => go("alerts", { sev: "Critical" })} />
        <div className="hero-inner">
          <div>
            <div className="hero-tag"><MapPin size={13} /> Simulated plant · 6 lines</div>
            <h2>Jotun <em>Smart Factory</em></h2>
            <p>Live view of production, quality, utilities and dispatch across the plant. {rangeLabel(f.range)} · {f.line.toLowerCase()} · {f.shift.toLowerCase()}.</p>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><b><CountUp value={out.num} dp={out.dp} /></b><span>{out.unit} produced</span></div>
            <div className="hero-stat"><b style={{ color: "var(--accent)" }}><CountUp value={oee.num} dp={1} />%</b><span>OEE</span></div>
            <button className="hero-stat" onClick={() => go("alerts", { sev: "Critical" })}><b style={{ color: "var(--bad)" }}>{urgent}</b><span>critical alerts →</span></button>
          </div>
        </div>
      </motion.div>

      <div className="live-badge"><i />Live · refreshes every {LIVE_MS / 1000} s · updated {updatedAt.toLocaleTimeString("en-GB")}</div>
      <div className="grid g-kpi">{kpis.map((k, i) => <KpiCard key={k.id} k={k} i={i + 1} />)}</div>

      <div className="hot">
        {crit && <Tile i={2} tone="navy" label="Critical alert" title={crit.title} big={crit.time} note={crit.source} onClick={() => setSel(crit)} />}
        {warn && <Tile i={3} tone="orange" label="Needs a look" title={warn.title} big={warn.time} note={warn.cat} onClick={() => setSel(warn)} />}
        {best && <Tile i={4} tone="green" label="Top line right now" title={best.name} big={`${best.oee.toFixed(1)}%`} note="OEE" onClick={() => go("process")} />}
        {wo && <Tile i={5} tone="yellow" label="Next planned service" title={wo.asset} big={wo.due} note={wo.id} onClick={() => go("maintenance")} />}
      </div>

      <div className="grid g-21">
        <Card title="Production output" sub={`Litres ${bucketUnit(f.range)} vs plan · ${rangeLabel(f.range)}`}
          right={<Legend items={[{ name: "Actual", color: C.yellow }, { name: "Plan", color: C.mute }]} />} i={2}>
          <Replay className="chart-h" style={{ height: 340 }}>
            <ResponsiveContainer>
              <AreaChart data={prodLive} margin={{ left: -4, right: 6, top: 8 }}>
                <defs>
                  <linearGradient id="prodG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.yellow} stopOpacity={0.45} /><stop offset="100%" stopColor={C.yellow} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={50} tickFormatter={(v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip content={<Tip unit=" L" />} />
                <Area dataKey="actual" stroke={C.yellow} strokeWidth={2.2} fill="url(#prodG)" {...chartAnim} />
                <Line dataKey="plan" stroke={C.mute} strokeDasharray="5 5" dot={false} {...chartAnim} />
              </AreaChart>
            </ResponsiveContainer>
          </Replay>
        </Card>

        <Card title="Output by product family" sub="Share of litres produced" i={3}>
          <Replay className="donut-wrap">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={mixLive} dataKey="value" nameKey="name" innerRadius={58} outerRadius={80} paddingAngle={3} stroke="none" {...chartAnim}>
                  {mix.map((p) => <Cell key={p.name} fill={p.color} opacity={f.line === "All lines" || f.line === p.name ? 1 : 0.25} />)}
                </Pie>
                <Tooltip content={<Tip unit=" L" />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center"><div><b>{total >= 1e6 ? `${(total / 1e6).toFixed(1)}M` : `${Math.round(total / 1000)}k`}</b><span>litres</span></div></div></Replay>
          <div className="row-kv" style={{ marginTop: 6 }}>
            {mix.map((p) => (
              <div key={p.name} className="kv-line" style={{ margin: 0 }}>
                <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: p.color, marginRight: 8 }} />{p.name}</span>
                <b>{fmt(p.value)} L · {((p.value / total) * 100).toFixed(0)}%</b>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid g-21">
        <Card title="Production lines" sub="Live line status" i={4}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Line</th><th>Running</th><th>Batch</th><th className="num">Cans/min</th><th className="num">OEE %</th><th>Status</th></tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="strong">{l.name}</td><td>{l.product}</td><td className="mono">{l.batch}</td>
                    <td className="num">{l.speed}</td><td className="num">{l.oee ? l.oee.toFixed(1) : "—"}</td><td><Chip tone={l.tone}>{l.st}</Chip></td>
                  </tr>
                ))}
                {!lines.length && <tr><td colSpan={6} className="empty">No lines match.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Live alerts" sub="Most urgent open events" i={5}
          right={<button className="link-btn" onClick={() => go("alerts")}>View all ({open.length})<ArrowRight size={14} /></button>}>
          {open.slice(0, 5).map((a) => {
            const { I, c } = TONE_ICON[SEV_TONE[a.sev]];
            return (
              <div className="alert clickable" key={a.id} onClick={() => setSel(a)}>
                <span className="alert-ico" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}><I size={16} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{a.title}</b>
                  <span><i style={{ color: CAT_COLOR[a.cat], fontStyle: "normal" }}>●</i> {a.cat} · {a.source} · {a.time}</span>
                </div>
                <button className="tick-btn" title="Mark as done" aria-label={`Mark ${a.id} as done`} onClick={(e) => { e.stopPropagation(); setStatus([a.id], "done"); }}><Check size={14} /></button>
              </div>
            );
          })}
          {!open.length && <p className="empty">All clear. No open alerts.</p>}
        </Card>
      </div>
      <AlertDetail alert={sel} isDone={sel ? done.has(sel.id) : false} onClose={() => setSel(null)} setStatus={setStatus} go={go} />
    </>
  );
}

function Pin({ x, label, warn, bad, onClick }: { x: React.CSSProperties; label: string; warn?: boolean; bad?: boolean; onClick: () => void }) {
  return (
    <button className={`pin ${warn ? "warn" : ""} ${bad ? "bad" : ""}`} style={x} onClick={onClick} aria-label={`Open ${label}`}>
      <i /><span>{label}</span><ArrowRight size={13} />
    </button>
  );
}
