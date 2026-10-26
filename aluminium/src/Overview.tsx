import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Info, MapPin } from "lucide-react";
import { bucketUnit, fmt, overview, rangeLabel, type Filters, type Severity, type Tone } from "./data";
import { axis, Card, Chip, grid, KpiCard, Legend, Tip, rise } from "./ui";
import { motion } from "framer-motion";
import { LIVE_MS, useAlerts, useLiveKpis, useLiveStats } from "./live";
import { CAT_COLOR, SEV_TONE } from "./Alerts";
import type { Go } from "./nav";

const TONE_ICON: Record<Tone, { I: typeof Info; c: string }> = {
  bad: { I: AlertTriangle, c: "var(--bad)" }, warn: { I: AlertTriangle, c: "var(--warn)" },
  info: { I: Info, c: "var(--blue)" }, good: { I: CheckCircle2, c: "var(--good)" }, mute: { I: Info, c: "var(--muted)" },
};
const SEV_ORDER: Record<Severity, number> = { Critical: 0, Info: 1, OK: 2 };

export default function Overview({ f, go, done, markDone }: { f: Filters; go: Go; done: Set<string>; markDone: (ids: string[]) => void }) {
  const d = useMemo(() => overview(f), [f]);
  const { kpis, updatedAt } = useLiveKpis(d.kpis);
  const allAlerts = useAlerts(f);
  const open = useMemo(() => allAlerts.filter((a) => !done.has(a.id)).sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev]), [allAlerts, done]);
  const urgent = open.filter((a) => a.sev === "Critical").length;
  const total = d.potlines.reduce((s, p) => s + p.value, 0);
  const baseLines = useMemo(() => [
    { name: "Potline 1", pots: 120, ka: 186, ce: 93.8, kwh: 13.3, tone: "good" as Tone, st: "Stable" },
    { name: "Potline 2", pots: 119, ka: 184, ce: 92.9, kwh: 13.6, tone: "warn" as Tone, st: "1 anode effect" },
    { name: "Potline 3", pots: 119, ka: 187, ce: 93.6, kwh: 13.4, tone: "good" as Tone, st: "Stable" },
  ].filter((l) => f.area === "All plant" || l.name === f.area), [f.area]);
  // potline table cells go through the same live engine: 3 stats per line (kA, CE %, kWh/kg)
  const liveCells = useLiveStats(useMemo(() => baseLines.flatMap((l) => [
    { label: `${l.name} kA`, value: String(l.ka), unit: "" },
    { label: `${l.name} CE`, value: l.ce.toFixed(1), unit: "%" },
    { label: `${l.name} kWh`, value: l.kwh.toFixed(1), unit: "" },
  ]), [baseLines]));
  const lines = baseLines.map((l, i) => ({ ...l, ka: liveCells[i * 3].value, ce: liveCells[i * 3 + 1].value, kwh: liveCells[i * 3 + 2].value }));

  return (
    <>
      <motion.div className="hero" {...rise(0)}>
        <img src="/factory.png" alt="Misr Aluminium smelter complex at sunset" />
        <Pin x={{ right: "34%", top: "40%" }} label="Casthouse" onClick={() => go("factory", { stage: "cast" })} />
        <Pin x={{ left: "47%", top: "17%" }} label="Potline 2 · 1 alert" warn onClick={() => go("alerts", { group: "Production" })} />
        <Pin x={{ right: "6%", top: "34%" }} label="Main substation" onClick={() => go("utilities", { util: "Power" })} />
        <Pin x={{ left: "20%", top: "34%" }} label="Nile intake" onClick={() => go("utilities", { util: "Water" })} />
        <Pin x={{ right: "22%", top: "12%" }} label="Alumina milling" onClick={() => go("process")} />
        <div className="hero-inner">
          <div>
            <div className="hero-tag"><MapPin size={13} /> Nag Hammadi · Upper Egypt</div>
            <h2>Misr <em>Aluminium</em><br />Smart Plant</h2>
            <p>Live view of reduction, casting, utilities and logistics across the complex. {rangeLabel(f.range)} · {f.area}.</p>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><b>{kpis[0].value}</b><span>t metal today</span></div>
            <div className="hero-stat"><b style={{ color: "var(--good)" }}>99.4%</b><span>plant availability</span></div>
            <button className="hero-stat" onClick={() => go("alerts")} style={{ textAlign: "left" }}><b style={{ color: "var(--molten)" }}>{urgent}</b><span>active alerts →</span></button>
          </div>
        </div>
      </motion.div>

      <div className="live-badge"><i />Live · refreshes every {LIVE_MS / 1000} s · updated {updatedAt.toLocaleTimeString("en-GB")}</div>
      <div className="grid g-kpi">{kpis.map((k, i) => <KpiCard key={k.label} k={k} i={i + 1} />)}</div>

      <div className="grid g-21">
        <Card title="Metal production" sub={`Tonnes ${bucketUnit(f.range)} vs target · ${rangeLabel(f.range)}`}
          right={<Legend items={[{ name: "Actual", color: "#ff7a1a" }, { name: "Target", color: "#8896a9" }]} />} i={2}>
          <div className="chart-h">
            <ResponsiveContainer>
              <AreaChart data={d.production} margin={{ left: -8, right: 6, top: 8 }}>
                <defs>
                  <linearGradient id="prodG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff7a1a" stopOpacity={0.5} /><stop offset="100%" stopColor="#ff7a1a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} domain={["auto", "auto"]} width={52} />
                <Tooltip content={<Tip unit=" t" />} />
                <Area dataKey="actual" stroke="#ff7a1a" strokeWidth={2.2} fill="url(#prodG)" />
                <Line dataKey="target" stroke="#8896a9" strokeDasharray="5 5" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Output by potline" sub="Share of today's metal" i={3}>
          <div style={{ height: 190, position: "relative" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={d.potlines} dataKey="value" innerRadius={58} outerRadius={80} paddingAngle={3} stroke="none">
                  {d.potlines.map((p) => <Cell key={p.name} fill={p.color} opacity={f.area === "All plant" || f.area === p.name ? 1 : 0.25} />)}
                </Pie>
                <Tooltip content={<Tip unit=" t" />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", textAlign: "center" }}>
              <div><b style={{ fontFamily: "var(--display)", fontSize: 30, display: "block", lineHeight: 1 }}>{fmt(total)}</b><span style={{ color: "var(--muted)", fontSize: 11 }}>t / day</span></div>
            </div>
          </div>
          <div className="row-kv" style={{ marginTop: 6 }}>
            {d.potlines.map((p) => (
              <div key={p.name} className="kv-line" style={{ margin: 0 }}>
                <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: p.color, marginRight: 8 }} />{p.name}</span>
                <b>{fmt(p.value)} t · {((p.value / total) * 100).toFixed(0)}%</b>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid g-21">
        <Card title="Potline status" sub="Reduction cells at a glance" i={4}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Line</th><th className="num">Pots</th><th className="num">Current kA</th><th className="num">CE %</th><th className="num">kWh/kg</th><th>Status</th></tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.name}><td>{l.name}</td><td className="num">{l.pots}</td><td className="num">{l.ka}</td><td className="num">{l.ce}</td><td className="num">{l.kwh}</td><td><Chip tone={l.tone}>{l.st}</Chip></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Live alerts" sub="Most urgent open events" i={5}
          right={<button className="link-btn" onClick={() => go("alerts")}>View all ({open.length})<ArrowRight size={14} /></button>}>
          {open.slice(0, 5).map((a) => {
            const { I, c } = TONE_ICON[SEV_TONE[a.sev]];
            return (
              <div className="alert" key={a.id}>
                <span className="alert-ico" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}><I size={16} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{a.title}</b>
                  <span><i style={{ color: CAT_COLOR[a.cat], fontStyle: "normal" }}>●</i> {a.cat} · {a.source} · {a.time}</span>
                </div>
                <button className="tick" title="Mark as done" aria-label={`Mark ${a.title} as done`} onClick={() => markDone([a.id])}><Check size={14} /></button>
              </div>
            );
          })}
          {!open.length && <p className="empty">All clear — no open alerts.</p>}
        </Card>
      </div>
    </>
  );
}

function Pin({ x, label, warn, onClick }: { x: React.CSSProperties; label: string; warn?: boolean; onClick: () => void }) {
  return (
    <button className={`pin ${warn ? "warn" : ""}`} style={x} onClick={onClick} aria-label={`Open ${label}`}>
      <i />{label}<ArrowRight size={13} />
    </button>
  );
}
