import { useMemo, useState } from "react";
import { Area, AreaChart, Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { equipment, rangeLabel, type Filters, type Tone } from "./data";
import { useLiveKpis } from "./live";
import { axis, Bar, Card, Chip, grid, KpiCard, SearchBox, Segmented, Tip } from "./ui";

const STATUS = ["All", "Open", "In progress", "Blocked", "Done"] as const;
const SHIFT = ["All", "A", "B", "C"] as const;
const healthColor = (t: Tone) => (t === "bad" ? "var(--bad)" : t === "warn" ? "var(--warn)" : "var(--good)");

export default function Equipment({ f }: { f: Filters }) {
  const d = useMemo(() => equipment(f), [f]);
  const { kpis } = useLiveKpis(d.kpis);
  const [st, setSt] = useState<(typeof STATUS)[number]>("All");
  const [shift, setShift] = useState<(typeof SHIFT)[number]>("All");
  const [q, setQ] = useState("");
  const rows = d.orders.filter((o) => (st === "All" || o.status === st) && (shift === "All" || o.shift === shift) && `${o.id} ${o.asset} ${o.owner}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="grid g-kpi">{kpis.map((k, i) => <KpiCard key={k.label} k={k} i={i} />)}</div>
      <div className="grid g-21">
        <Card title="Overall equipment effectiveness" sub={`% · ${rangeLabel(f.range)}`}>
          <div className="chart-h">
            <ResponsiveContainer>
              <AreaChart data={d.oeeTrend} margin={{ left: -8, right: 6, top: 8 }}>
                <defs><linearGradient id="oeeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.45} /><stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} domain={[70, 100]} width={40} />
                <Tooltip content={<Tip unit="%" />} />
                <Area dataKey="oee" stroke="#2dd4bf" strokeWidth={2.2} fill="url(#oeeG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Downtime by cause" sub="Hours">
          <div className="chart-h">
            <ResponsiveContainer>
              <BarChart data={d.downtime} layout="vertical" margin={{ left: 10, right: 12 }}>
                <CartesianGrid {...grid} horizontal={false} vertical />
                <XAxis type="number" {...axis} />
                <YAxis type="category" dataKey="name" {...axis} width={96} />
                <Tooltip content={<Tip unit=" h" />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <RBar dataKey="value" radius={[0, 6, 6, 0]} fill="#ffb454" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Asset health" sub="Condition score from vibration, temperature and run-hours · remaining useful life (RUL) estimated">
        <div className="grid g-assets">
          {d.assets.map((a) => (
            <div key={a.id} className="card asset" style={{ background: "var(--bg-2)" }}>
              <div className="asset-top"><div><h4>{a.name}</h4><small>{a.id} · {a.area}</small></div><Chip tone={a.tone}>{a.tone === "good" ? "Good" : a.tone === "warn" ? "Watch" : "Act"}</Chip></div>
              <div className="big" style={{ color: healthColor(a.tone) }}>{a.health}<small style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--body)", marginLeft: 4 }}>/ 100</small></div>
              <Bar pct={a.health} color={healthColor(a.tone)} />
              <div className="kv-line" style={{ marginTop: 10, marginBottom: 0 }}><span>Vib {a.vib} mm/s · {a.temp} °C</span><b>RUL {a.rul} d</b></div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Maintenance work orders" sub="Filter by status, shift or search"
        right={<div className="table-tools"><Segmented value={st} options={STATUS} onChange={setSt} />
          <select className="select" value={shift} onChange={(e) => setShift(e.target.value as (typeof SHIFT)[number])} aria-label="Shift">
            {SHIFT.map((s) => <option key={s} value={s}>{s === "All" ? "All shifts" : `Shift ${s}`}</option>)}
          </select><SearchBox value={q} onChange={setQ} placeholder="Search order, asset, owner" /></div>}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Asset</th><th>Type</th><th>Priority</th><th>Owner</th><th>Shift</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}><td className="mono">{o.id}</td><td>{o.asset}</td><td>{o.type}</td>
                  <td><Chip tone={o.prio === "Critical" ? "bad" : o.prio === "High" ? "warn" : "mute"}>{o.prio}</Chip></td>
                  <td>{o.owner}</td><td>{o.shift}</td><td className="mono">{o.due}</td><td><Chip tone={o.tone}>{o.status}</Chip></td></tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="empty">No work orders match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
