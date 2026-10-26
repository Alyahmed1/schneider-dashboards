import { useMemo, useState } from "react";
import { Bar as RBar, CartesianGrid, Cell, Line, ComposedChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { bucketUnit, fmt, logistics, rangeLabel, type Filters } from "./data";
import { useLiveKpis, useLiveShipments } from "./live";
import { axis, Bar, Card, Chip, grid, KpiCard, Legend, SearchBox, Segmented, Tip } from "./ui";

const STATUS = ["All", "Scheduled", "Loading", "In transit", "Delivered", "Delayed"] as const;

export default function Logistics({ f }: { f: Filters }) {
  const d = useMemo(() => logistics(f), [f]);
  const { kpis } = useLiveKpis(d.kpis);
  const { rows: shipments, fresh } = useLiveShipments(d.shipments);
  const [st, setSt] = useState<(typeof STATUS)[number]>("All");
  const [q, setQ] = useState("");
  const rows = shipments.filter((s) => (st === "All" || s.status === st) && `${s.id} ${s.customer} ${s.dest} ${s.product}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="grid g-kpi">{kpis.map((k, i) => <KpiCard key={k.label} k={k} i={i} />)}</div>
      <div className="grid g-21">
        <Card title="Shipments vs orders" sub={`Tonnes ${bucketUnit(f.range)} · ${rangeLabel(f.range)}`} right={<Legend items={[{ name: "Shipped", color: "#ff7a1a" }, { name: "Ordered", color: "#3f8cff" }]} />}>
          <div className="chart-h">
            <ResponsiveContainer>
              <ComposedChart data={d.shipped} margin={{ left: -8, right: 6, top: 8 }}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={52} />
                <Tooltip content={<Tip unit=" t" />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <RBar dataKey="shipped" fill="#ff7a1a" radius={[4, 4, 0, 0]} />
                <Line dataKey="ordered" stroke="#3f8cff" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Destinations" sub="Share of tonnes shipped">
          <div style={{ height: 190 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={d.destinations} dataKey="value" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="none">{d.destinations.map((x) => <Cell key={x.name} fill={x.color} />)}</Pie>
                <Tooltip content={<Tip unit="%" />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <Legend items={d.destinations.map((x) => ({ name: `${x.name} ${x.value}%`, color: x.color }))} />
        </Card>
      </div>
      <Card title="Raw material & stock" sub="On-hand tonnes and days of cover">
        <div className="row-kv" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", columnGap: 28 }}>
          {d.inventory.map((x) => (
            <div key={x.name}>
              <div className="kv-line"><span>{x.name}</span><b>{fmt(x.tonnes)} / {fmt(x.cap)} {x.unit} · {x.days} d</b></div>
              <Bar pct={(x.tonnes / x.cap) * 100} color={x.days < 8 ? "var(--warn)" : x.color} />
            </div>
          ))}
        </div>
      </Card>
      <Card title="Shipment register" sub="Domestic and export dispatches"
        right={<div className="table-tools"><Segmented value={st} options={STATUS} onChange={setSt} /><SearchBox value={q} onChange={setQ} placeholder="Search customer, product" /></div>}>
        <div className="table-wrap" style={{ overflowX: "visible" }}>
          <table style={{ minWidth: 0, width: "100%" }}>
            <thead><tr><th>Shipment</th><th>Customer</th><th>Destination</th><th>Product</th><th className="num">Tonnes</th><th>Mode</th><th>ETA</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={fresh.has(s.id) ? "row-new" : undefined}>
                  <td className="mono">{s.id}</td>
                  <td style={{ whiteSpace: "normal" }}>{s.customer}</td>
                  <td style={{ whiteSpace: "normal" }}>{s.dest}</td>
                  <td>{s.product}</td><td className="num">{fmt(s.tonnes)}</td><td>{s.mode}</td><td className="mono">{s.eta}</td>
                  <td><Chip tone={s.tone}>{s.status}</Chip></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="empty">No shipments match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
