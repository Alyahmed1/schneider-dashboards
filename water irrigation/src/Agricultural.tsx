import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { budget, FARM, fmt, MOMENT_LABELS, momentHour, pivotsAt, RANGES, series, SPECIFIC_ENERGY, type Filters, type Moment, type Range } from "./farm";
import { LEGEND } from "./farmColor";
import { useOpenAlarms } from "./alarms";
import { useTick, wobble } from "./live";
import { CountUp, Panel, Segmented } from "./ui";
import FarmImage from "./FarmImage";
import type { Go, ViewId } from "./App";

interface Tile { id: string; label: string; value: number; decimals: number; unit: string; delta: number; goodWhenDown?: boolean; to: ViewId }

/** Agricultural · Farm map: the farm picture with the Summary beside it. Click a pivot to open it on the Pivots tab. */
export default function Agricultural({ f, setRange, go }: { f: Filters; setRange: (r: Range) => void; go: Go }) {
  const t = useTick();
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

  const tiles: Tile[] = [
    { id: "water", label: "Water applied", value: big ? total / 1e6 : total / 1e3, decimals: big ? 2 : 1, unit: big ? "M m³" : "k m³", delta: 1.2, to: "energy" },
    { id: "eff", label: "Irrigation efficiency", value: wobble(FARM.efficiency, 1, t, 0.004), decimals: 1, unit: "%", delta: 0.6, to: "pivots" },
    { id: "moist", label: "Average soil moisture", value: avgMoist, decimals: 1, unit: "%", delta: -0.4, to: "pivots" },
    { id: "stress", label: "Crop water stress", value: stress, decimals: 2, unit: "", delta: -0.02, goodWhenDown: true, to: "pivots" },
    { id: "energy", label: "Specific energy", value: wobble(SPECIFIC_ENERGY, 4, t, 0.004), decimals: 2, unit: "kWh/m³", delta: -1.5, goodWhenDown: true, to: "energy" },
    { id: "budget", label: "Water allocation used", value: bud.pct, decimals: 0, unit: "%", delta: -4, goodWhenDown: true, to: "energy" },
  ];

  return (
    <div className="ag one">
      <section className="ag-map-p" style={{ ["--i" as string]: 0 }}>
        <div className="ag-map-head">
          <div className="ag-map-lead">
            <button className={`ag-alarm ${critical ? "bad" : "ok"}`} onClick={() => go("alarms")}>{critical ? `${critical} critical alarm` : "All normal"}</button>
            <Segmented<Moment> label="Time of day" value={moment} options={MOMENT_LABELS} onChange={setMoment} />
          </div>
          <Segmented<Range> label="Time range" value={f.range} options={RANGES} onChange={setRange} />
        </div>
        <div className="ag-map-wrap">
          <div className="ag-map-in"><FarmImage snap={snap} onOpen={(id) => go("pivots", id)} onStation={(id) => go("pumps", id)} /></div>
        </div>
        <div className="ag-key" aria-label="Colour key">
          <b>{LEGEND["Soil moisture"].title}:</b>
          {LEGEND["Soil moisture"].items.map((i) => <span key={i.label}><i style={{ background: i.c }} />{i.label} {i.note && <em>{i.note}</em>}</span>)}
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

      <span className="sr">{fmt(total)} cubic metres applied</span>
    </div>
  );
}
