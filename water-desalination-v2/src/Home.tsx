import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, ChartColumn, Coins, Droplets, DropletOff, Gauge, Info, Layers, PlugZap, Waves, Zap, Activity, ClipboardList, Factory, Droplet } from "lucide-react";
import { IconBadge, Meter, MiniBars, MiniRing, Segments, Spark } from "./vizkit";
import { alarms, membraneScore, METRICS, overviewKpis, productionSeries, RANGES, rng, stages, ZONES, type Filters, type Kpi, type Range } from "./data";
import { LOADS, woInArea, type WorkOrder } from "./cmms";
import { useAlarmLog } from "./AlarmsContext";
import { C, CountUp, Segmented, Tip } from "./ui";
import EgyptMap, { type Region } from "./EgyptMap";
import { useTick, wobble } from "./live";
import { useGrow } from "./anim";
import { Bars, niceMax, Panel, tick } from "./charts";
import type { Go, TabId } from "./App";

const KPI_WOBBLE: Record<string, number> = { water: 0.0015, energy: 0.004, cost: 0.004, avail: 0.0008, wo: 0, mem: 0 };
const TILE_ICON: Record<string, typeof Droplets> = { water: Droplets, energy: Zap, cost: Coins, avail: Activity, wo: ClipboardList, mem: Layers };
const KPI_TO: Record<string, TabId> = { water: "production", energy: "electrical", cost: "overview", avail: "maintenance", wo: "maintenance", mem: "overview" };

type MetricId = (typeof METRICS)[number]["id"];

/** split a series into four periods (sums) */
const quarters = (v: number[]) => {
  const n = Math.ceil(v.length / 4);
  return [0, 1, 2, 3].map((q) => v.slice(q * n, q * n + n).reduce((a, b) => a + b, 0));
};
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

  const openWo = wos.filter((w) => woInArea(w, f) && w.status !== "Done");
  const woLate = openWo.filter((w) => w.late).length;
  const woProg = openWo.filter((w) => !w.late && w.status === "In progress").length;
  const woOpen = openWo.length - woLate - woProg;

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
        <Panel title="Summary" icon={ChartColumn} className="hm-sum" i={1} right={<span title="Click a tile to open its tab"><Info size={15} /></span>}>
          <div className="hm-tiles">
            {kpis.map((k, n) => {
              const good = k.goodWhenDown ? k.delta <= 0 : k.delta >= 0;
              const Arrow = k.delta >= 0 ? ArrowUp : ArrowDown;
              const ring = k.id === "avail";
              return (
                <button key={k.id} className={`hm-tile ${ring ? "has-ring" : ""}`} style={{ ["--n" as string]: n }} onClick={() => go(KPI_TO[k.id])} aria-label={`${k.label}: open ${KPI_TO[k.id]}`}>
                  <div className="vz-head"><IconBadge icon={TILE_ICON[k.id]} tone={k.id === "wo" && woLate ? "warn" : "teal"} /><span>{k.label}</span></div>
                  <div className="vz-val">
                    <span><CountUp value={k.value} decimals={k.decimals} />{k.suffix}</span>{k.unit && <em>{k.unit}</em>}
                    <Arrow size={16} className={good ? "up" : "down"} aria-label={good ? "good" : "needs attention"} />
                  </div>
                  {ring && <MiniRing frac={k.value / 100} label={`${k.value.toFixed(1)}%`} tone="good" />}
                  <div className="vz-viz">
                    {k.id === "water" && <Spark data={k.spark} dots />}
                    {k.id === "energy" && <MiniBars data={k.spark} />}
                    {k.id === "cost" && <Spark data={k.spark} fill={false} dots />}
                    {ring && <span className="vz-note">{k.note}</span>}
                    {k.id === "wo" && <div style={{ width: "100%", display: "grid", gap: 4 }}><Segments parts={[{ v: woProg, tone: "teal" }, { v: woOpen, tone: "ink" }, { v: woLate, tone: "bad" }]} /><span className="vz-note">{woLate} overdue · {woProg} in progress</span></div>}
                    {k.id === "mem" && <Meter frac={k.value / 100} label={`${Math.round(k.value)}%`} tone={k.value < 80 ? "warn" : "teal"} />}
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="hm-strip">
        <Panel title="Water Demand" icon={Droplet} i={3}>
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
        <Panel title="Total Water Production" icon={Factory} i={4}><Bars labels={ql} values={prodML} unit="ML" grow={grow} /></Panel>
        <Panel title="Total Energy Consumed" icon={Zap} i={5}><Bars labels={ql} values={energyMWh} unit="MWh" grow={grow} /></Panel>
        <Panel title="Water Loss" icon={DropletOff} className="hm-loss" i={6}>
          <div className="hm-box"><IconBadge icon={DropletOff} tone="warn" /><span>Water Losses</span><b><CountUp value={lossML} decimals={2} /> ML/d</b></div>
          <div className="hm-box"><IconBadge icon={Waves} /><span>System Inputs</span><b><CountUp value={inputML} decimals={0} /> ML/d</b></div>
        </Panel>
      </div>

      <div className="hm-pair">
        <Panel title="RO Feed" icon={Gauge} className="hm-feed" i={7}>
          <div className="hm-box"><IconBadge icon={Gauge} /><span>Pressure</span><b><CountUp value={feed} decimals={1} /> bar</b></div>
          <div className="hm-box"><IconBadge icon={Droplets} /><span>Permeate flow</span><b><CountUp value={flow[3].flow} decimals={0} /> m³/h</b></div>
        </Panel>
        <Panel title="Power Monitoring" icon={PlugZap} i={8}><Pie items={power} /></Panel>
      </div>
    </div>
  );
}
