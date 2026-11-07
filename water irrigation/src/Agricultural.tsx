import { useMemo, useState } from "react";
import { Droplets, Gauge, Leaf, Layers, Sprout, Zap } from "lucide-react";
import { budget, FARM, fmt, loadProfile, MOMENT_LABELS, momentHour, pivotsAt, RANGES, series, SPECIFIC_ENERGY, type Filters, type Moment, type Range } from "./farm";
import { LEGEND } from "./farmColor";
import { useOpenAlarms } from "./alarms";
import { useTick, wobble } from "./live";
import { Panel, Segmented } from "./ui";
import SummaryTile, { type SumTileData } from "./SummaryTile";
import FarmImage from "./FarmImage";
import type { Go } from "./App";

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

  const stressDay = useMemo(() => Array.from({ length: 24 }, (_, h) => { const x = pivotsAt(h + 0.5); return x.reduce((q, n) => q + n.stress, 0) / x.length; }), []);
  const pumpKw = useMemo(() => loadProfile().map((p) => p.pump), []);

  const tiles: SumTileData[] = [
    { id: "water", label: "Water applied", icon: Droplets, value: big ? total / 1e6 : total / 1e3, decimals: big ? 2 : 1, unit: big ? "M m³" : "k m³", delta: 1.2, kind: "spark", series: applied, onClick: () => go("energy"), hint: "Water applied: open Water & energy" },
    { id: "eff", label: "Irrigation efficiency", icon: Leaf, value: wobble(FARM.efficiency, 1, t, 0.004), decimals: 1, unit: "%", delta: 0.6, kind: "ring", onClick: () => go("pivots"), hint: "Irrigation efficiency: open the pivots" },
    { id: "moist", label: "Average soil moisture", icon: Layers, value: avgMoist, decimals: 1, unit: "%", delta: -0.4, kind: "bar", pct: avgMoist, onClick: () => go("pivots"), hint: "Average soil moisture: open the pivots" },
    { id: "stress", label: "Crop water stress", icon: Sprout, value: stress, decimals: 2, delta: -0.02, goodWhenDown: true, kind: "line", series: stressDay, onClick: () => go("pivots"), hint: "Crop water stress: open the pivots" },
    { id: "energy", label: "Specific energy", icon: Zap, value: wobble(SPECIFIC_ENERGY, 4, t, 0.004), decimals: 2, unit: "kWh/m³", delta: -1.5, goodWhenDown: true, kind: "bars", series: pumpKw, onClick: () => go("energy"), hint: "Specific energy: open Water & energy" },
    { id: "budget", label: "Water allocation used", icon: Gauge, value: bud.pct, decimals: 0, unit: "%", delta: -4, goodWhenDown: true, kind: "bar", pct: bud.pct, onClick: () => go("energy"), hint: "Water allocation used: open Water & energy" },
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
          <div className="tiles">{tiles.map((k, n) => <SummaryTile key={k.id} d={k} n={n} />)}</div>
        </Panel>
      </div>

      <span className="sr">{fmt(total)} cubic metres applied</span>
    </div>
  );
}
