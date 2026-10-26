import { useMemo, useState } from "react";
import { Bar as RBar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { quality, rangeLabel, type Filters } from "./data";
import { useLiveKpis } from "./live";
import { axis, Card, Chip, grid, KpiCard, Legend, SearchBox, Segmented, Tip } from "./ui";

const RESULT = ["All", "Pass", "Hold"] as const;

export default function Quality({ f }: { f: Filters }) {
  const d = useMemo(() => quality(f), [f]);
  const { kpis } = useLiveKpis(d.kpis);
  const [res, setRes] = useState<(typeof RESULT)[number]>("All");
  const [q, setQ] = useState("");
  const rows = d.lab.filter((x) => (res === "All" || x.result === res) && `${x.id} ${x.grade}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="grid g-kpi">{kpis.map((k, i) => <KpiCard key={k.label} k={k} i={i} />)}</div>
      <div className="grid g-21">
        <Card title="Impurity trend" sub={`Fe and Si in % · limit 0.10 % · ${rangeLabel(f.range)}`} right={<Legend items={[{ name: "Iron (Fe)", color: "#ff7a1a" }, { name: "Silicon (Si)", color: "#2dd4bf" }]} />}>
          <div className="chart-h">
            <ResponsiveContainer>
              <LineChart data={d.impurities} margin={{ left: -8, right: 6, top: 8 }}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} domain={[0.02, 0.12]} width={46} />
                <Tooltip content={<Tip unit=" %" />} />
                <ReferenceLine y={0.1} stroke="#f4506e" strokeDasharray="4 4" />
                <Line dataKey="fe" stroke="#ff7a1a" strokeWidth={2.2} dot={false} />
                <Line dataKey="si" stroke="#2dd4bf" strokeWidth={2.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Product grade mix" sub="Share of tonnes cast">
          <div style={{ height: 190 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={d.grades} dataKey="value" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="none">{d.grades.map((g) => <Cell key={g.name} fill={g.color} />)}</Pie>
                <Tooltip content={<Tip unit="%" />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <Legend items={d.grades.map((g) => ({ name: `${g.name} ${g.value}%`, color: g.color }))} />
        </Card>
      </div>
      <div className="grid g-12">
        <Card title="Defect Pareto" sub="Rejected pieces by cause">
          <div className="chart-h">
            <ResponsiveContainer>
              <BarChart data={d.defects} margin={{ left: -12, right: 6, top: 8 }}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="name" {...axis} interval={0} tick={{ fontSize: 10.5 }} />
                <YAxis {...axis} width={40} />
                <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <RBar dataKey="value" radius={[6, 6, 0, 0]} fill="#ff7a1a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Laboratory results" sub="Spectrometer analysis per lot"
          right={<div className="table-tools"><Segmented value={res} options={RESULT} onChange={setRes} /><SearchBox value={q} onChange={setQ} placeholder="Search lot or grade" /></div>}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Lot</th><th>Grade</th><th>Line</th><th className="num">Fe %</th><th className="num">Si %</th><th className="num">Purity %</th><th>Result</th></tr></thead>
              <tbody>
                {rows.map((x) => <tr key={x.id}><td className="mono">{x.id}</td><td>{x.grade}</td><td>{x.line}</td><td className="num">{x.fe}</td><td className="num">{x.si}</td><td className="num">{x.purity}</td><td><Chip tone={x.tone}>{x.result}</Chip></td></tr>)}
                {!rows.length && <tr><td colSpan={7} className="empty">No lots match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
