import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";
import { alarms, complianceScore, overviewKpis, PRICE, productionSeries, RANGES, rng, stages, type Filters, type Kpi, type Range } from "./data";
import { LOADS, type WorkOrder } from "./cmms";
import { useAlarmLog } from "./AlarmsContext";
import { C, CountUp, Segmented, Tip } from "./ui";
import CatchmentMap, { type Region } from "./CatchmentMap";
import { useTick, wobble } from "./live";
import { useGrow } from "./anim";
import { Bars, niceMax, Panel, tick } from "./charts";
import type { Go, TabId } from "./App";

const KPI_WOBBLE: Record<string, number> = { water: 0.0015, energy: 0.004, cost: 0.004, avail: 0.0008, wo: 0, mem: 0 };
const KPI_TO: Record<string, TabId> = { water: "production", energy: "electrical", cost: "overview", avail: "maintenance", wo: "maintenance", mem: "overview" };

/** the four pumping stations (in) and four reuse zones (out) on the map, and what each ring can show */
const ZONES = [
  { id: "p1", name: "New Cairo PS-1", side: "in" }, { id: "p2", name: "Rehab PS-2", side: "in" }, { id: "p3", name: "Shorouk PS-3", side: "in" }, { id: "p4", name: "Badr PS-4", side: "in" },
  { id: "r1", name: "Farm irrigation", side: "out" }, { id: "r2", name: "Green belt", side: "out" }, { id: "r3", name: "Industrial cooling", side: "out" }, { id: "r4", name: "Parks & golf", side: "out" },
] as const;
const METRICS = [
  { id: "avail", label: "Equipment availability", unit: "%", base: [99, 98, 88, 99, 100, 97, 99, 93], low: 95 },
  { id: "head", label: "Capacity headroom", unit: "%", base: [24, 18, 9, 30, 12, 26, 19, 8], low: 10 },
  { id: "service", label: "Service level", unit: "%", base: [99, 98, 96, 99, 97, 95, 91, 98], low: 95 },
] as const;
type MetricId = (typeof METRICS)[number]["id"];

/** split a series into four periods (sums) */
const quarters = (v: number[]) => {
  const n = Math.ceil(v.length / 4);
  return [0, 1, 2, 3].map((q) => v.slice(q * n, q * n + n).reduce((a, b) => a + b, 0));
};
const PIE = ["#34b98f", "#3aa9c9", "#b8a23a", "#7d8f3e", "#8fa9b3"];
function Pie({ items }: { items: { name: string; value: number }[] }) {
  const total = items.reduce((s, x) => s + x.value, 0);
  let a0 = -Math.PI / 2;
  return (
    <div className="hm-pie">
      <svg viewBox="0 0 100 100" aria-hidden>
        {items.map((x, i) => {
          const a1 = a0 + (x.value / total) * Math.PI * 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const d = `M50 50 L${(50 + 48 * Math.cos(a0)).toFixed(2)} ${(50 + 48 * Math.sin(a0)).toFixed(2)} A48 48 0 ${large} 1 ${(50 + 48 * Math.cos(a1)).toFixed(2)} ${(50 + 48 * Math.sin(a1)).toFixed(2)}Z`;
          a0 = a1;
          return <path key={x.name} d={d} fill={PIE[i % PIE.length]} stroke="var(--card)" strokeWidth="1" />;
        })}
      </svg>
      <ul>
        {items.map((x, i) => <li key={x.name}><i style={{ background: PIE[i % PIE.length] }} /><span>{x.name}</span><b>{Math.round((x.value / total) * 100)}%</b></li>)}
      </ul>
    </div>
  );
}

/** Home: the whole plant on one screen, no scrolling */
export default function Home({ f, setRange, go, wos }: { f: Filters; setRange: (r: Range) => void; go: Go; wos: WorkOrder[] }) {
  const t = useTick();
  const grow = useGrow();
  const [metric, setMetric] = useState<MetricId>("avail");
  const series = useMemo(() => productionSeries(f), [f]);
  const { done: alarmsDone } = useAlarmLog();
  const critical = useMemo(() => alarms(f).filter((a) => !alarmsDone[a.id] && a.sev === "Critical").length, [f, alarmsDone]);
  const base = useMemo(() => overviewKpis(f, wos), [f, wos]);
  const flow = useMemo(() => stages(f), [f]);
  const score = complianceScore(f);

  const kpis: Kpi[] = [
    ...base.map((k, i) => ({ ...k, value: wobble(k.value, i + 1, t, KPI_WOBBLE[k.id]) })),
    { id: "mem", label: "Effluent compliance", value: score, decimals: 1, unit: "%", delta: -0.3, note: "", spark: [] },
  ];

  const m = METRICS.find((x) => x.id === metric)!;
  const regions: Region[] = ZONES.map((z, i) => {
    const v = Math.min(99, wobble(m.base[i], i + 11, t, 0.008));
    return { ...z, value: v, warn: v < m.low };
  });

  // the charts below follow the chosen time range, in four periods
  const n4 = Math.ceil(series.length / 4);
  const ql = [0, 1, 2, 3].map((q) => series[Math.min(series.length - 1, q * n4)].t);
  const actual = series.map((p) => p.actual);
  const prodML = quarters(actual).map((v) => v / 1000);
  const demand = useMemo(() => { const r = rng(404); return prodML.map((v) => v * (0.97 + r() * 0.07)); }, [f.range]); // eslint-disable-line react-hooks/exhaustive-deps
  const energyMWh = quarters(actual).map((v) => (v * 0.46) / 1000);
  const revenue = quarters(actual).map((v) => (v * PRICE) / 1e6);
  const lineData = demand.map((v, i) => ({ t: ql[i], v: +v.toFixed(1) }));
  const biogas = wobble(12400, 29, t, 0.01);
  const sludge = wobble(118, 30, t, 0.01);
  const power = LOADS.map((l, i) => ({ name: ["Blowers", "Influent pumps", "Tertiary & UV", "Sludge & reuse", "Buildings"][i], value: wobble(l.kw, i + 21, t, 0.012) }));
  const oxygen = wobble(2.1, 31, t, 0.01);

  return (
    <div className="hm">
      <section className="hm-map-p" style={{ ["--i" as string]: 0 }}>
        <div className="hm-map-head">
          <button className={`hm-alarm ${critical ? "bad" : "ok"}`} onClick={() => go("alarms")}>{critical ? `${critical} critical alarm` : "All normal"}</button>
          <Segmented<Range> label="Time range" value={f.range} options={RANGES} onChange={setRange} />
        </div>
        <div className="hm-rib" role="list" aria-label="Treatment process, live flow per stage">
          {flow.map((st, i) => (
            <button key={st.id} role="listitem" className={`hm-rib-c ${st.tone}`} style={{ ["--n" as string]: i }} onClick={() => go("production", st.id)} aria-label={`${st.name}: open in Production`}>
              <span>{st.name}</span>
              <b><CountUp value={wobble(st.flow, i + 41, t, 0.004)} decimals={0} /> <small>{st.unit}</small></b>
            </button>
          ))}
        </div>
        <div className="hm-map-wrap"><CatchmentMap regions={regions} unit={m.unit} grow={grow} /></div>
        <label className="hm-select">
          <span className="sr">Map metric</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value as MetricId)}>
            {METRICS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
      </section>

      <div className="hm-side">
        <Panel title="Summary" className="hm-sum" i={1}>
          <div className="hm-tiles">
            {kpis.map((k, n) => {
              const good = k.goodWhenDown ? k.delta <= 0 : k.delta >= 0;
              const Arrow = k.delta >= 0 ? ArrowUp : ArrowDown;
              return (
                <button key={k.id} className="hm-tile" style={{ ["--n" as string]: n }} onClick={() => go(KPI_TO[k.id])} aria-label={`${k.label}: open ${KPI_TO[k.id]}`}>
                  <span>{k.label}</span>
                  <b><CountUp value={k.value} decimals={k.decimals} />{k.suffix}{k.unit ? ` ${k.unit}` : ""}<Arrow size={16} className={good ? "up" : "down"} aria-label={good ? "good" : "needs attention"} /></b>
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel title="Reuse revenue" className="hm-rev" i={2}><Bars labels={ql} values={revenue} unit="M LE" grow={grow} /></Panel>
      </div>

      <div className="hm-strip">
        <Panel title="Sewage Received" i={3}>
          <div className="hm-line">
            <ResponsiveContainer>
              <LineChart data={lineData} margin={{ left: -8, right: 12, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="t" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} width={44} tickCount={4} domain={[0, (max: number) => niceMax(max * 1.1)]} tickFormatter={tick} />
                <Tooltip content={<Tip unit=" ML" />} cursor={{ stroke: C.teal, strokeOpacity: 0.3 }} />
                <Line type="linear" dataKey="v" name="Inflow" stroke="var(--teal)" strokeWidth={1.6} dot={{ r: 3, fill: "var(--teal)", stroke: "var(--teal)" }} isAnimationActive animationDuration={1100} animationBegin={500} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Total Water Treated" i={4}><Bars labels={ql} values={prodML} unit="ML" grow={grow} /></Panel>
        <Panel title="Total Energy Consumed" i={5}><Bars labels={ql} values={energyMWh} unit="MWh" grow={grow} /></Panel>
        <Panel title="Sludge & Biogas" className="hm-loss" i={6}>
          <div className="hm-box"><span>Dewatered sludge</span><b><CountUp value={sludge} decimals={0} /> t/d</b></div>
          <div className="hm-box"><span>Biogas produced</span><b><CountUp value={biogas} decimals={0} /> m³/d</b></div>
        </Panel>
      </div>

      <div className="hm-pair">
        <Panel title="Aeration" className="hm-feed" i={7}>
          <div className="hm-box"><span>Dissolved oxygen</span><b><CountUp value={oxygen} decimals={1} /> mg/L</b></div>
          <div className="hm-box"><span>Flow through lanes</span><b><CountUp value={flow[3].flow} decimals={0} /> m³/h</b></div>
        </Panel>
        <Panel title="Power Monitoring" i={8}><Pie items={power} /></Panel>
      </div>
    </div>
  );
}
