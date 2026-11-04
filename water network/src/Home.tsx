import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";
import { alarms, complianceScore, overviewKpis, productionSeries, RANGES, rng, stages, type Filters, type Kpi, type Range } from "./data";
import { LOADS, type WorkOrder } from "./cmms";
import { useAlarmLog } from "./AlarmsContext";
import { C, CountUp, Segmented, Tip } from "./ui";
import GeoNetwork from "./GeoNetwork";
import { LEGEND, METRICS, type Metric } from "./mapcolor";
import { NET, networkAt } from "./network";
import { useTick, wobble } from "./live";
import { Bars, niceMax, Panel, tick } from "./charts";
import { useGrow } from "./anim";
import type { Go, TabId } from "./App";

const KPI_WOBBLE: Record<string, number> = { water: 0.0015, nrw: 0.004, press: 0.006, energy: 0.004, wo: 0, mem: 0 };
const KPI_TO: Record<string, TabId> = { water: "network", nrw: "network", press: "network", energy: "electrical", wo: "maintenance", mem: "overview" };

const MOMENTS = [{ label: "Night", h: 3 }, { label: "Morning peak", h: 8 }, { label: "Midday", h: 13 }, { label: "Evening", h: 19 }] as const;

/** split a series into four periods (sums) */
const quarters = (v: number[]) => {
  const n = Math.ceil(v.length / 4);
  return [0, 1, 2, 3].map((q) => v.slice(q * n, q * n + n).reduce((a, b) => a + b, 0));
};
const PIE = ["#3db8ff", "#2fbf9b", "#b8a23a", "#7d8fb0", "#8fa9b3"];
const POWER_NAME: Record<string, string> = { blowers: "PS-1 high-lift pumps", influent: "Raw water pumps", tertiary: "Treatment plant", sludge: "Booster & storage", aux: "Buildings" };
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

/** Home: the whole network on one screen, no scrolling */
export default function Home({ f, setRange, go, wos }: { f: Filters; setRange: (r: Range) => void; go: Go; wos: WorkOrder[] }) {
  const t = useTick();
  const grow = useGrow();
  const [metric, setMetric] = useState<Metric>("Consumption");
  const [moment, setMoment] = useState<(typeof MOMENTS)[number]["label"]>("Morning peak");
  const hour = MOMENTS.find((m) => m.label === moment)!.h;
  const series = useMemo(() => productionSeries(f), [f]);
  const { done: alarmsDone } = useAlarmLog();
  const critical = useMemo(() => alarms(f).filter((a) => !alarmsDone[a.id] && a.sev === "Critical").length, [f, alarmsDone]);
  const base = useMemo(() => overviewKpis(f, wos), [f, wos]);
  const flow = useMemo(() => stages(f), [f]);
  const score = complianceScore(f);
  const snap = networkAt(hour);

  const kpis: Kpi[] = [
    ...base.map((k, i) => ({ ...k, value: wobble(k.value, i + 1, t, KPI_WOBBLE[k.id]) })),
    { id: "mem", label: "Water quality compliance", value: score, decimals: 1, unit: "%", delta: 0.1, note: "", spark: [] },
  ];

  // the charts below follow the chosen time range, in four periods
  const n4 = Math.ceil(series.length / 4);
  const ql = [0, 1, 2, 3].map((q) => series[Math.min(series.length - 1, q * n4)].t);
  const actual = series.map((p) => p.actual);
  const supplied = quarters(actual).map((v) => v / 1000);
  const demand = useMemo(() => { const r = rng(404); return supplied.map((v) => v * (1 - NET.nrw) * (0.98 + r() * 0.04)); }, [f.range]); // eslint-disable-line react-hooks/exhaustive-deps
  const energyMWh = quarters(actual).map((v) => (v * 0.52) / 1000);
  const lineData = supplied.map((v, i) => ({ t: ql[i], supplied: +v.toFixed(1), billed: +demand[i].toFixed(1) }));
  const lost = wobble(NET.supplied - NET.billed, 29, t, 0.01);
  const leaks = wobble(31.7, 30, t, 0.01);
  const power = LOADS.map((l, i) => ({ name: POWER_NAME[l.id], value: wobble(l.kw, i + 21, t, 0.012) }));
  const tank = wobble(snap.tank, 31, t, 0.01);

  return (
    <div className="hm">
      <section className="hm-map-p" style={{ ["--i" as string]: 0 }}>
        <div className="hm-map-head">
          <div className="hm-map-lead">
            <button className={`hm-alarm ${critical ? "bad" : "ok"}`} onClick={() => go("alarms")}>{critical ? `${critical} critical alarm` : "All normal"}</button>
            <label className="hm-select">
              <span className="sr">Colour the map by</span>
              <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
                {METRICS.map((x) => <option key={x} value={x}>Colour by {x === "Leakage" ? "water lost" : x.toLowerCase()}</option>)}
              </select>
            </label>
            <Segmented label="Time of day" value={moment} options={MOMENTS.map((m) => m.label)} onChange={setMoment} />
          </div>
          <Segmented<Range> label="Time range" value={f.range} options={RANGES} onChange={setRange} />
        </div>
        <div className="hm-map-wrap hm-map-col">
          <div className="hm-dia">
            <GeoNetwork mode="home" metric={metric} hour={hour} flow={Math.round(wobble(flow[1].flow, 3, t, 0.004))} onOpen={() => go("network")} label="Interactive map of the water network over New Cairo: the treatment plant, pump stations, reservoir and six supply zones. Click a zone, pump or reservoir for its numbers." />
          </div>
          <div className="hm-key" aria-label="Colour key">
            <b>{LEGEND[metric].title}:</b>
            {LEGEND[metric].items.map((i) => <span key={i.label}><i style={{ background: i.c }} />{i.label} <em>{i.note}</em></span>)}
            <button className="nm-open" onClick={() => go("network")}>Open the full network map</button>
          </div>
        </div>
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
      </div>

      <div className="hm-strip">
        <Panel title="Supplied and Billed" i={3}>
          <div className="hm-line">
            <ResponsiveContainer>
              <LineChart data={lineData} margin={{ left: -8, right: 12, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="t" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} width={44} tickCount={4} domain={[0, (max: number) => niceMax(max * 1.1)]} tickFormatter={tick} />
                <Tooltip content={<Tip unit=" k m³" />} cursor={{ stroke: C.teal, strokeOpacity: 0.3 }} />
                <Line type="linear" dataKey="supplied" name="Supplied" stroke="var(--teal)" strokeWidth={1.6} dot={{ r: 3, fill: "var(--teal)", stroke: "var(--teal)" }} isAnimationActive animationDuration={1100} animationBegin={500} />
                <Line type="linear" dataKey="billed" name="Billed" stroke="var(--warn)" strokeWidth={1.6} dot={{ r: 3, fill: "var(--warn)", stroke: "var(--warn)" }} isAnimationActive animationDuration={1100} animationBegin={650} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Total Water Supplied" i={4}><Bars labels={ql} values={supplied} unit="k m³" grow={grow} /></Panel>
        <Panel title="Total Energy Consumed" i={5}><Bars labels={ql} values={energyMWh} unit="MWh" grow={grow} /></Panel>
        <Panel title="Water Loss" className="hm-loss" i={6}>
          <div className="hm-box"><span>Lost per day</span><b><CountUp value={lost} decimals={0} /> m³</b></div>
          <div className="hm-box"><span>Known leaks</span><b><CountUp value={leaks} decimals={1} /> L/s</b></div>
        </Panel>
      </div>

      <div className="hm-pair">
        <Panel title="Reservoir" className="hm-feed" i={7}>
          <div className="hm-box"><span>Level now</span><b><CountUp value={tank} decimals={0} /> %</b></div>
          <div className="hm-box"><span>Plant output</span><b><CountUp value={flow[1].flow} decimals={0} /> m³/h</b></div>
        </Panel>
        <Panel title="Power Monitoring" i={8}><Pie items={power} /></Panel>
      </div>
    </div>
  );
}
