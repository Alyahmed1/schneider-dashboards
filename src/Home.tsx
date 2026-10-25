import { useMemo, useState, type ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";
import { alarms, membraneScore, overviewKpis, PRICE, productionSeries, RANGES, rng, stages, type Filters, type Kpi, type Range } from "./data";
import { LOADS, type WorkOrder } from "./cmms";
import { useAlarmLog } from "./AlarmsContext";
import { C, CountUp, Segmented, Tip } from "./ui";
import EgyptMap, { type Region } from "./EgyptMap";
import { useTick, wobble } from "./live";
import { useGrow } from "./anim";
import type { Go, TabId } from "./App";

const KPI_WOBBLE: Record<string, number> = { water: 0.0015, energy: 0.004, cost: 0.004, avail: 0.0008, wo: 0, mem: 0 };
const KPI_TO: Record<string, TabId> = { water: "production", energy: "electrical", cost: "overview", avail: "maintenance", wo: "maintenance", mem: "overview" };

/** the four coastal supply zones on the map, and what each ring can show */
const ZONES = [
  { id: "rg", name: "Ras Gharib", lon: 32.55, lat: 28.5 },
  { id: "hg", name: "Hurghada", lon: 33.2, lat: 27.25 },
  { id: "qs", name: "Quseir", lon: 33.75, lat: 26.0 },
  { id: "ma", name: "Marsa Alam", lon: 34.2, lat: 24.75 },
];
const METRICS = [
  { id: "demand", label: "Demand served", unit: "%", base: [96, 98, 91, 84], low: 90 },
  { id: "level", label: "Reservoir level", unit: "%", base: [72, 78, 64, 55], low: 60 },
  { id: "press", label: "Network pressure OK", unit: "%", base: [94, 97, 93, 88], low: 90 },
] as const;
type MetricId = (typeof METRICS)[number]["id"];

/** split a series into four periods (sums) */
const quarters = (v: number[]) => {
  const n = Math.ceil(v.length / 4);
  return [0, 1, 2, 3].map((q) => v.slice(q * n, q * n + n).reduce((a, b) => a + b, 0));
};
const niceMax = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1e-9)));
  const n = v / p;
  return p * (n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 8 ? 8 : 10);
};
const tick = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${+v.toFixed(1)}`);

function Panel({ title, className = "", i = 0, children }: { title: string; className?: string; i?: number; children: ReactNode }) {
  return <section className={`hm-p ${className}`} style={{ ["--i" as string]: i }}><h3>{title}</h3>{children}</section>;
}

/** dark bars with a cyan fill, the value on top and a left scale */
function Bars({ labels, values, unit, grow }: { labels: string[]; values: number[]; unit: string; grow: boolean }) {
  const max = niceMax(Math.max(...values) * 1.1);
  return (
    <div className="hm-bars">
      <div className="hm-y">{[1, 0.75, 0.5, 0.25, 0].map((f) => <span key={f}>{tick(max * f)}{f === 1 ? ` ${unit}` : ""}</span>)}</div>
      <div className="hm-cols">
        {values.map((v, i) => (
          <div key={i} className="hm-col">
            <b>{tick(v)}</b>
            <div className="hm-track"><i style={{ height: `${grow ? Math.max(2, (v / max) * 100) : 2}%`, transitionDelay: `${i * 90}ms` }} /></div>
            <span>{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PIE = ["#3dbcdc", "#2a7fa6", "#6a6fd0", "#1f5f85", "#8e94e8"];
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
  const [metric, setMetric] = useState<MetricId>("demand");
  const series = useMemo(() => productionSeries(f), [f]);
  const { done: alarmsDone } = useAlarmLog();
  const critical = useMemo(() => alarms(f).filter((a) => !alarmsDone[a.id] && a.sev === "Critical").length, [f, alarmsDone]);
  const base = useMemo(() => overviewKpis(f, wos), [f, wos]);
  const flow = useMemo(() => stages(f), [f]);
  const score = membraneScore(f);

  const kpis: Kpi[] = [
    ...base.map((k, i) => ({ ...k, value: wobble(k.value, i + 1, t, KPI_WOBBLE[k.id]) })),
    { id: "mem", label: "Membrane health", value: score, decimals: 0, unit: "/100", delta: -1.2, note: "", spark: [] },
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
  const energyMWh = quarters(actual).map((v) => (v * 3.18) / 1000);
  const revenue = quarters(actual).map((v) => (v * PRICE) / 1e6);
  const lineData = demand.map((v, i) => ({ t: ql[i], v: +v.toFixed(1) }));
  const lossML = ((flow[6].flow - flow[7].flow) * 24) / 1000;
  const inputML = (flow[0].flow * 24) / 1000;
  const power = LOADS.map((l, i) => ({ name: ["HP pumps", "Intake", "Pre-treat.", "Transfer", "Buildings"][i], value: wobble(l.kw, i + 21, t, 0.012) }));
  const feed = wobble(58.2, 31, t, 0.006);

  return (
    <div className="hm">
      <section className="hm-map-p" style={{ ["--i" as string]: 0 }}>
        <div className="hm-map-head">
          <button className={`hm-alarm ${critical ? "bad" : "ok"}`} onClick={() => go("alarms")}>{critical ? `${critical} critical alarm` : "All normal"}</button>
          <Segmented<Range> label="Time range" value={f.range} options={RANGES} onChange={setRange} />
        </div>
        <EgyptMap regions={regions} unit={m.unit} grow={grow} />
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
        <Panel title="Revenue" className="hm-rev" i={2}><Bars labels={ql} values={revenue} unit="M LE" grow={grow} /></Panel>
      </div>

      <div className="hm-strip">
        <Panel title="Water Demand" i={3}>
          <div className="hm-line">
            <ResponsiveContainer>
              <LineChart data={lineData} margin={{ left: -8, right: 12, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="t" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} width={44} tickCount={4} domain={[0, (max: number) => niceMax(max * 1.1)]} tickFormatter={tick} />
                <Tooltip content={<Tip unit=" ML" />} cursor={{ stroke: C.teal, strokeOpacity: 0.3 }} />
                <Line type="linear" dataKey="v" name="Demand" stroke="var(--teal)" strokeWidth={1.6} dot={{ r: 3, fill: "var(--teal)", stroke: "var(--teal)" }} isAnimationActive animationDuration={1100} animationBegin={500} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Total Water Production" i={4}><Bars labels={ql} values={prodML} unit="ML" grow={grow} /></Panel>
        <Panel title="Total Energy Consumed" i={5}><Bars labels={ql} values={energyMWh} unit="MWh" grow={grow} /></Panel>
        <Panel title="Water Loss" className="hm-loss" i={6}>
          <div className="hm-box"><span>Water Losses</span><b><CountUp value={lossML} decimals={2} /> ML/d</b></div>
          <div className="hm-box"><span>System Inputs</span><b><CountUp value={inputML} decimals={0} /> ML/d</b></div>
        </Panel>
      </div>

      <div className="hm-pair">
        <Panel title="RO Feed" className="hm-feed" i={7}>
          <div className="hm-box"><span>Pressure</span><b><CountUp value={feed} decimals={1} /> bar</b></div>
          <div className="hm-box"><span>Permeate flow</span><b><CountUp value={flow[3].flow} decimals={0} /> m³/h</b></div>
        </Panel>
        <Panel title="Power Monitoring" i={8}><Pie items={power} /></Panel>
      </div>
    </div>
  );
}
