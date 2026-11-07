import { useMemo, useState } from "react";
import { CartesianGrid, ComposedChart, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Cog, Droplet, Factory, Gauge, HeartPulse, Thermometer, Timer, Waves, Zap } from "lucide-react";
import { curve, fmt, MOMENT_LABELS, momentHour, STATIONS, stationNow, type Moment, type Override, type StationId } from "./farm";
import { useTick, wobble } from "./live";
import { CountUp, Panel, Segmented, Tip } from "./ui";
import StationScene from "./StationScene";

const ICON = { "PS-A": Droplet, "PS-B": Waves, "PS-C": Gauge } as const;
const isStation = (s?: string): s is StationId => s === "PS-A" || s === "PS-B" || s === "PS-C";
const STATE_TONE = { Running: "good", Standby: "mute", Off: "warn" } as const;

/** Pump Stations: pick a station, see it drawn pump by pump with each pump's numbers, then open one pump for its health and curve */
export default function Pumps({ start }: { start?: string }) {
  const t = useTick();
  const [sel, setSel] = useState<StationId>(isStation(start) ? start : "PS-A");
  const [moment, setMoment] = useState<Moment>("Morning");
  const [ov, setOv] = useState<Override>({});
  const [pumpSel, setPumpSel] = useState("");
  const hour = momentHour(moment);
  const sts = useMemo(() => STATIONS.map((s) => stationNow(s.id, hour, ov)), [hour, ov]);
  const cur = sts.find((s) => s.id === sel)!;
  const pump = cur.pumps.find((p) => p.def.id === pumpSel) ?? cur.pumps.find((p) => p.state === "Running") ?? cur.pumps[0];
  const cdata = useMemo(() => curve(pump.def), [pump.def]);
  const manual = Object.keys(ov).length > 0;
  const on = pump.state === "Running";
  const toggle = () => setOv((o) => ({ ...o, [pump.def.id]: on ? "off" : "on" }));
  const note = cur.short ? "The pumps cannot keep up with the pivots" : cur.running === 0 && cur.demand > 0 ? "No pump is running: the pivots get no water" : manual ? "Some pumps were changed by hand" : "Automatic: the pumps follow the pivots";

  return (
    <div className="pm">
      <div className="pm-top">
        <div className="pm-cards">
          {sts.map((s) => {
            const info = STATIONS.find((x) => x.id === s.id)!;
            const Icon = ICON[s.id];
            const tone = s.short || (s.running === 0 && s.demand > 0) ? "bad" : s.running ? "good" : "idle";
            return (
              <button key={s.id} className={`pm-card ${s.id === sel ? "on" : ""}`} onClick={() => setSel(s.id)} aria-pressed={s.id === sel}>
                <Icon size={22} />
                <div><b>{s.id} · {info.name}</b><span>{s.running} of {s.pumps.length} pumps running</span></div>
                <div className="pm-nums"><b>{fmt(wobble(s.flow, s.id.charCodeAt(3), t, 0.004))} <small>m³/h</small></b><span>{fmt(s.kw)} kW</span></div>
                <i className={`dot ${tone}`} title={tone === "bad" ? "Not enough pumping" : tone === "good" ? "Pumping" : "Not needed now"} />
              </button>
            );
          })}
        </div>
        <div className="pm-ctl">
          {manual && <button className="btn" onClick={() => setOv({})}>Back to automatic</button>}
          <Segmented<Moment> label="Time of day" value={moment} options={MOMENT_LABELS} onChange={setMoment} />
        </div>
      </div>

      <Panel title={`${cur.id} · ${STATIONS.find((s) => s.id === cur.id)!.name}`} className="pm-scene" i={1} right={<span className={`pm-note ${cur.short ? "bad" : ""}`}>{note}</span>}>
        <div className="pm-scene-in"><StationScene st={cur} selected={pump.def.id} onSelect={setPumpSel} /></div>
      </Panel>

      <div className="pm-right">
        <Panel title="This station" icon={Factory} className="pm-read" i={2}>
          <div className="pm-boxes">
            <div className="box"><span><Waves className="sym" size={15} aria-hidden />Flow</span><b><CountUp value={cur.flow} decimals={0} /> <small>m³/h</small></b></div>
            <div className="box"><span><Gauge className="sym" size={15} aria-hidden />Pressure</span><b><CountUp value={cur.bar} decimals={1} /> <small>bar</small></b></div>
            <div className="box"><span><Zap className="sym" size={15} aria-hidden />Power</span><b><CountUp value={cur.kw} decimals={0} /> <small>kW</small></b></div>
            <div className="box"><span><Activity className="sym" size={15} aria-hidden />Energy / m³</span><b><CountUp value={cur.kwhPerM3} decimals={2} /> <small>kWh</small></b></div>
          </div>
        </Panel>
        <Panel title={`Pump ${pump.def.id}`} icon={Cog} className="pm-pump" i={3}
          right={<div className="pm-act"><span className={`chip ${STATE_TONE[pump.state]}`}>{pump.state}</span><button className={`btn ${on ? "" : "pri"}`} onClick={toggle}>{on ? "Stop" : "Start"}</button></div>}>
          <div className="pm-boxes four">
            <div className={`box ${pump.vib > 3.5 ? "warnbox" : ""}`}><span><Activity className="sym" size={15} aria-hidden />Vibration</span><b>{fmt(pump.vib, 1)} <small>mm/s</small></b></div>
            <div className={`box ${pump.temp > 70 ? "warnbox" : ""}`}><span><Thermometer className="sym" size={15} aria-hidden />Motor temp</span><b>{fmt(pump.temp)} <small>°C</small></b></div>
            <div className="box"><span><Timer className="sym" size={15} aria-hidden />Run hours</span><b>{fmt(pump.def.hours)} <small>h</small></b></div>
            <div className={`box ${pump.def.health < 75 ? "warnbox" : ""}`}><span><HeartPulse className="sym" size={15} aria-hidden />Health</span><b>{pump.def.health} <small>%</small></b></div>
          </div>
        </Panel>
        <Panel title="Pump curve" className="pm-curve" i={4}
          right={<span className="pm-leg"><i style={{ background: "var(--water)" }} />Head (m)<i style={{ background: "var(--teal)" }} />Efficiency (%)</span>}>
          <div className="pm-chart">
            <ResponsiveContainer>
              <ComposedChart data={cdata} margin={{ left: -4, right: 0, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="q" type="number" domain={[0, "dataMax"]} stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} tickCount={5} />
                <YAxis yAxisId="h" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} width={36} tickCount={5} />
                <YAxis yAxisId="e" orientation="right" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} width={34} domain={[0, 100]} tickCount={5} />
                <Tooltip content={<Tip unit="" />} cursor={{ stroke: "var(--teal)", strokeOpacity: 0.3 }} />
                <ReferenceLine yAxisId="h" x={Math.round(pump.def.flow * 0.95)} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: "best point", fill: "var(--muted)", fontSize: 12, position: "insideTopRight" }} />
                <Line yAxisId="h" type="monotone" dataKey="head" name="Head" stroke="var(--water)" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={900} />
                <Line yAxisId="e" type="monotone" dataKey="eff" name="Efficiency" stroke="var(--teal)" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={900} />
                {on && <ReferenceDot yAxisId="h" x={Math.round(pump.q)} y={+pump.head.toFixed(1)} r={6} fill="var(--water)" stroke="var(--card)" strokeWidth={2} />}
                {on && <ReferenceDot yAxisId="e" x={Math.round(pump.q)} y={+(pump.eta * 100).toFixed(1)} r={6} fill="var(--teal)" stroke="var(--card)" strokeWidth={2} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="pm-hint">Flow in m³/h along the bottom. The dots show where this pump is working now.</p>
        </Panel>
      </div>
    </div>
  );
}
