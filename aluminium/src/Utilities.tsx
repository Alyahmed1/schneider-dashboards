import { useMemo, useState } from "react";
import { Area, AreaChart, Bar as RBar, BarChart, CartesianGrid, Cell, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { power, rangeLabel, water, type Filters } from "./data";
import { Droplets, Zap } from "lucide-react";
import { useLiveKpis } from "./live";
import { axis, Bar, Card, Chip, downloadCsv, ExportButton, grid, KpiCard, Legend, SearchBox, Tip } from "./ui";

const UTILS = [
  { id: "Power", icon: Zap, sub: "Load · feeders · energy cost" },
  { id: "Water", icon: Droplets, sub: "Intake · tanks · pumps" },
] as const;

export default function Utilities({ f, initial = "Power" }: { f: Filters; initial?: "Power" | "Water" }) {
  const [tab, setTab] = useState<"Power" | "Water">(initial);
  return (
    <>
      <div className="util-tabs" role="tablist" aria-label="Utility">
        {UTILS.map((x) => (
          <button key={x.id} role="tab" aria-selected={tab === x.id} className={tab === x.id ? "on" : ""} onClick={() => setTab(x.id)}>
            <x.icon size={20} /><span><b>{x.id}</b><small>{x.sub}</small></span>
          </button>
        ))}
      </div>
      {tab === "Power" ? <Power f={f} /> : <Water f={f} />}
    </>
  );
}

export function Power({ f }: { f: Filters }) {
  const d = useMemo(() => power(f), [f]);
  const { kpis } = useLiveKpis(d.kpis);
  const [q, setQ] = useState("");
  const rows = d.feeders.filter((x) => x.name.toLowerCase().includes(q.toLowerCase()));
  const exportCsv = () => downloadCsv(`power-${f.area}-${f.range}`.replace(/\s+/g, "-").toLowerCase(), [
    { title: `Plant electrical load (MW) - ${f.area} - ${rangeLabel(f.range)}`, rows: d.trend.map((r) => ({ period: r.t, load_mw: r.load, capacity_mw: r.cap })) },
    { title: "Consumption by area (MW)", rows: d.byArea.map((a) => ({ area: a.name, mw: a.value })) },
    { title: "Substation feeders", rows: d.feeders.map((x) => ({ feeder: x.name, voltage_kv: x.volt, load_mw: x.mw, power_factor: x.pf, winding_c: x.temp, status: x.status })) },
    { title: "Key metrics", rows: kpis.map((k) => ({ metric: k.label, value: k.value, unit: k.unit })) },
  ]);
  return (
    <>
      <div className="toolbar"><ExportButton onClick={exportCsv} label="Export power data" /></div>
      <div className="grid g-kpi">{kpis.map((k, i) => <KpiCard key={k.label} k={k} i={i} />)}</div>
      <div className="grid g-21">
        <Card title="Plant electrical load" sub={`MW · ${rangeLabel(f.range)} · ${f.area}`} right={<Legend items={[{ name: "Load", color: "#ff7a1a" }, { name: "Capacity", color: "#8896a9" }]} />}>
          <div className="chart-h">
            <ResponsiveContainer>
              <AreaChart data={d.trend} margin={{ left: -8, right: 6, top: 8 }}>
                <defs><linearGradient id="pwG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff7a1a" stopOpacity={0.5} /><stop offset="100%" stopColor="#ff7a1a" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} domain={["auto", "auto"]} width={46} />
                <Tooltip content={<Tip unit=" MW" />} />
                <Area dataKey="load" stroke="#ff7a1a" strokeWidth={2.2} fill="url(#pwG)" />
                <Line dataKey="cap" stroke="#8896a9" strokeDasharray="5 5" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Consumption by area" sub="MW, current draw">
          <div className="chart-h">
            <ResponsiveContainer>
              <BarChart data={d.byArea} layout="vertical" margin={{ left: 10, right: 12 }}>
                <CartesianGrid {...grid} horizontal={false} vertical />
                <XAxis type="number" {...axis} />
                <YAxis type="category" dataKey="name" {...axis} width={86} />
                <Tooltip content={<Tip unit=" MW" />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <RBar dataKey="value" radius={[0, 6, 6, 0]}>{d.byArea.map((a) => <Cell key={a.name} fill={a.color} />)}</RBar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card title="Substation feeders" sub="220 kV incomers, rectifier transformers and distribution" right={<SearchBox value={q} onChange={setQ} placeholder="Search feeder" />}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Feeder</th><th className="num">Voltage kV</th><th className="num">Load MW</th><th className="num">Power factor</th><th className="num">Winding °C</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((x) => <tr key={x.name}><td>{x.name}</td><td className="num">{x.volt}</td><td className="num">{x.mw}</td><td className="num">{x.pf}</td><td className="num">{x.temp}</td><td><Chip tone={x.tone}>{x.status}</Chip></td></tr>)}
              {!rows.length && <tr><td colSpan={6} className="empty">No feeders match “{q}”.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export function Water({ f }: { f: Filters }) {
  const d = useMemo(() => water(f), [f]);
  const { kpis } = useLiveKpis(d.kpis);
  const exportCsv = () => downloadCsv(`water-${f.area}-${f.range}`.replace(/\s+/g, "-").toLowerCase(), [
    { title: `Intake vs recycled flow (m3/h) - ${f.area} - ${rangeLabel(f.range)}`, rows: d.trend.map((r) => ({ period: r.t, intake_m3h: r.intake, recycled_m3h: r.recycled })) },
    { title: "Usage by area (m3/h)", rows: d.byArea.map((a) => ({ area: a.name, m3h: a.value })) },
    { title: "Tank levels", rows: d.tanks.map((t) => ({ tank: t.name, level_pct: t.level })) },
    { title: "Pump stations", rows: d.pumps.map((p) => ({ tag: p.id, pump: p.name, flow_m3h: p.flow, pressure_bar: p.press, power_kw: p.kw, status: p.status })) },
    { title: "Key metrics", rows: kpis.map((k) => ({ metric: k.label, value: k.value, unit: k.unit })) },
  ]);
  return (
    <>
      <div className="toolbar"><ExportButton onClick={exportCsv} label="Export water data" /></div>
      <div className="grid g-kpi">{kpis.map((k, i) => <KpiCard key={k.label} k={k} i={i} />)}</div>
      <div className="grid g-21">
        <Card title="Intake vs recycled flow" sub={`m³/h · ${rangeLabel(f.range)} · ${f.area}`} right={<Legend items={[{ name: "Nile intake", color: "#3f8cff" }, { name: "Recycled loop", color: "#2dd4bf" }]} />}>
          <div className="chart-h">
            <ResponsiveContainer>
              <ComposedChart data={d.trend} margin={{ left: -8, right: 6, top: 8 }}>
                <defs><linearGradient id="waG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3f8cff" stopOpacity={0.45} /><stop offset="100%" stopColor="#3f8cff" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={52} />
                <Tooltip content={<Tip unit=" m³/h" />} />
                <Area dataKey="intake" stroke="#3f8cff" strokeWidth={2.2} fill="url(#waG)" />
                <Line dataKey="recycled" stroke="#2dd4bf" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Usage by area" sub="m³/h">
          <div className="chart-h">
            <ResponsiveContainer>
              <BarChart data={d.byArea} layout="vertical" margin={{ left: 10, right: 12 }}>
                <CartesianGrid {...grid} horizontal={false} vertical />
                <XAxis type="number" {...axis} />
                <YAxis type="category" dataKey="name" {...axis} width={96} />
                <Tooltip content={<Tip unit=" m³/h" />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <RBar dataKey="value" radius={[0, 6, 6, 0]}>{d.byArea.map((a) => <Cell key={a.name} fill={a.color} />)}</RBar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid g-12">
        <Card title="Tank levels" sub="Storage and basins">
          <div className="row-kv">
            {d.tanks.map((t) => (
              <div key={t.name}><div className="kv-line"><span>{t.name}</span><b>{t.level}%</b></div><Bar pct={t.level} color={t.color} /></div>
            ))}
          </div>
        </Card>
        <Card title="Pump stations" sub="Flow, pressure and motor power">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tag</th><th>Pump</th><th className="num">Flow m³/h</th><th className="num">Pressure bar</th><th className="num">Power kW</th><th>Status</th></tr></thead>
              <tbody>{d.pumps.map((p) => <tr key={p.id}><td className="mono">{p.id}</td><td>{p.name}</td><td className="num">{p.flow}</td><td className="num">{p.press}</td><td className="num">{p.kw}</td><td><Chip tone={p.tone}>{p.status}</Chip></td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
