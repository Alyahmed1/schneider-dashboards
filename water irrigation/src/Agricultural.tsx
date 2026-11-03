import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";
import { budget, FARM, fmt, LOADS, MOMENT_LABELS, momentHour, pivotsAt, RANGES, series, SPECIFIC_ENERGY, type Filters, type Moment, type Range } from "./farm";
import { LEGEND, METRICS, type Metric } from "./farmColor";
import { useOpenAlarms } from "./alarms";
import { useTick, wobble } from "./live";
import { useGrow } from "./anim";
import { Bars, CountUp, niceMax, Panel, Pie, Segmented, Tip, tick } from "./ui";
import FarmMap from "./FarmMap";
import type { Go, ViewId } from "./App";

/** split a series into four periods and average each, so a short last period never looks like a drop */
const quarters = (v: number[]) => {
  const n = Math.ceil(v.length / 4);
  return [0, 1, 2, 3].map((q) => { const part = v.slice(q * n, q * n + n); return part.reduce((a, b) => a + b, 0) / Math.max(1, part.length); });
};
const PER: Record<Range, { water: string; energy: string }> = { "24H": { water: "m³/h", energy: "kW" }, "7D": { water: "m³/day", energy: "kWh/day" }, "30D": { water: "m³/day", energy: "kWh/day" }, YTD: { water: "m³/month", energy: "kWh/month" } };
interface Tile { id: string; label: string; value: number; decimals: number; unit: string; delta: number; goodWhenDown?: boolean; to: ViewId }

/** Agricultural: the whole farm on one screen, no scrolling */
export default function Agricultural({ f, setRange, go }: { f: Filters; setRange: (r: Range) => void; go: Go }) {
  const t = useTick();
  const grow = useGrow();
  const [metric, setMetric] = useState<Metric>("Soil moisture");
  const [moment, setMoment] = useState<Moment>("Morning");
  const hour = momentHour(moment);
  const snap = useMemo(() => pivotsAt(hour), [hour]);
  const open = useOpenAlarms();
  const critical = open.filter((a) => a.sev === "Critical").length;
  const data = useMemo(() => series(f), [f]);
  const bud = useMemo(() => budget(), []);

  const applied = data.map((p) => p.applied);
  const total = applied.reduce((a, b) => a + b, 0);
  const big = total >= 1e6;
  const avgMoist = snap.reduce((s, n) => s + n.moist, 0) / snap.length;
  const stress = snap.reduce((s, n) => s + n.stress, 0) / snap.length;
  const ql = useMemo(() => { const n4 = Math.ceil(data.length / 4); return [0, 1, 2, 3].map((q) => data[Math.min(data.length - 1, q * n4)].t); }, [data]);
  const periodApplied = quarters(applied);
  const periodEnergy = quarters(applied).map((v) => v * SPECIFIC_ENERGY);
  const lineData = data.map((p) => ({ t: p.t, applied: p.applied, demand: p.demand }));
  const power = LOADS.map((l, i) => ({ name: l.name, value: wobble(l.kw, i + 21, t, 0.012) }));
  const pond = wobble(76, 31, t, 0.01);
  const inflow = wobble(1420, 32, t, 0.01); // the canal fills the pond all day

  const tiles: Tile[] = [
    { id: "water", label: "Water applied", value: big ? total / 1e6 : total / 1e3, decimals: big ? 2 : 1, unit: big ? "M m³" : "k m³", delta: 1.2, to: "energy" },
    { id: "eff", label: "Irrigation efficiency", value: wobble(FARM.efficiency, 1, t, 0.004), decimals: 1, unit: "%", delta: 0.6, to: "pivots" },
    { id: "moist", label: "Average soil moisture", value: avgMoist, decimals: 1, unit: "%", delta: -0.4, to: "pivots" },
    { id: "stress", label: "Crop water stress", value: stress, decimals: 2, unit: "", delta: -0.02, goodWhenDown: true, to: "pivots" },
    { id: "energy", label: "Specific energy", value: wobble(SPECIFIC_ENERGY, 4, t, 0.004), decimals: 2, unit: "kWh/m³", delta: -1.5, goodWhenDown: true, to: "energy" },
    { id: "budget", label: "Water allocation used", value: bud.pct, decimals: 0, unit: "%", delta: -4, goodWhenDown: true, to: "energy" },
  ];

  return (
    <div className="ag">
      <section className="ag-map-p" style={{ ["--i" as string]: 0 }}>
        <div className="ag-map-head">
          <div className="ag-map-lead">
            <button className={`ag-alarm ${critical ? "bad" : "ok"}`} onClick={() => go("alarms")}>{critical ? `${critical} critical alarm` : "All normal"}</button>
            <label className="select">
              <span className="sr">Colour the map by</span>
              <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
                {METRICS.map((x) => <option key={x} value={x}>Colour by {x.toLowerCase()}</option>)}
              </select>
            </label>
            <Segmented<Moment> label="Time of day" value={moment} options={MOMENT_LABELS} onChange={setMoment} />
          </div>
          <Segmented<Range> label="Time range" value={f.range} options={RANGES} onChange={setRange} />
        </div>
        <div className="ag-map-wrap">
          <div className="ag-map-in"><FarmMap metric={metric} hour={hour} snap={snap} onOpen={(id) => go("pivots", id)} onStation={(id) => go("pumps", id)} /></div>
        </div>
        <div className="ag-key" aria-label="Colour key">
          <b>{LEGEND[metric].title}:</b>
          {LEGEND[metric].items.map((i) => <span key={i.label}><i style={{ background: i.c }} />{i.label} {i.note && <em>{i.note}</em>}</span>)}
          <button className="btn pri" onClick={() => go("pivots")}>Open the pivots</button>
        </div>
      </section>

      <div className="ag-side solo">
        <Panel title="Summary" className="ag-sum" i={1}>
          <div className="tiles">
            {tiles.map((k, n) => {
              const good = k.goodWhenDown ? k.delta <= 0 : k.delta >= 0;
              const Arrow = k.delta >= 0 ? ArrowUp : ArrowDown;
              return (
                <button key={k.id} className="tile" style={{ ["--n" as string]: n }} onClick={() => go(k.to)} aria-label={`${k.label}: open ${k.to}`}>
                  <span>{k.label}</span>
                  <b><CountUp value={k.value} decimals={k.decimals} />{k.unit ? ` ${k.unit}` : ""}<Arrow size={16} className={good ? "up" : "down"} aria-label={good ? "good" : "needs attention"} /></b>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="ag-strip">
        <Panel title="Applied and crop demand" i={3}>
          <div className="ag-line">
            <ResponsiveContainer>
              <LineChart data={lineData} margin={{ left: -8, right: 12, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="t" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
                <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} width={44} tickCount={5} domain={[0, (max: number) => niceMax(max * 1.1)]} tickFormatter={tick} />
                <Tooltip content={<Tip unit="m³" />} cursor={{ stroke: "var(--teal)", strokeOpacity: 0.3 }} />
                <Line type="monotone" dataKey="applied" name="Applied" stroke="var(--water)" strokeWidth={1.8} dot={false} isAnimationActive animationDuration={1100} animationBegin={500} />
                <Line type="monotone" dataKey="demand" name="Crop demand" stroke="var(--warn)" strokeWidth={1.8} dot={false} isAnimationActive animationDuration={1100} animationBegin={650} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Average water applied" i={4}><Bars labels={ql} values={periodApplied} unit={PER[f.range].water} grow={grow} /></Panel>
        <Panel title="Average energy used" i={5}><Bars labels={ql} values={periodEnergy} unit={PER[f.range].energy} grow={grow} color="var(--amber)" /></Panel>
        <Panel title="Water budget" className="ag-bud" i={6}>
          <div className="box"><span>Allocation used</span><b><CountUp value={bud.pct} decimals={0} /> %</b></div>
          <div className="box"><span>Left this year</span><b><CountUp value={bud.left / 1e6} decimals={1} /> M m³</b></div>
        </Panel>
      </div>

      <div className="ag-pair">
        <Panel title="Storage pond" className="ag-pond" i={7}>
          <div className="box"><span>Level now</span><b><CountUp value={pond} decimals={0} /> %</b></div>
          <div className="box"><span>Inflow</span><b><CountUp value={inflow} decimals={0} /> m³/h</b></div>
        </Panel>
        <Panel title="Power monitoring" i={8}><Pie items={power} /></Panel>
      </div>
      <span className="sr">{fmt(total)} cubic metres applied</span>
    </div>
  );
}
