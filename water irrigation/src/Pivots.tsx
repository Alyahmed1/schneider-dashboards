import { useMemo, useState } from "react";
import { CircleDot, Droplets, Layers, Target, Timer, Waves } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { areaM2, fmt, MOMENT_LABELS, moistAt, moistClass, momentHour, pivotById, pivotDetail, pivotPlan, pivotsAt, planMm, winHours, type Moment } from "./farm";
import { moistColor, STATUS_COLOR } from "./farmColor";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { Bars, CountUp, Panel, Segmented, Tip } from "./ui";
import PivotPlan, { DEFAULT_CTL, type Ctl } from "./PivotPlan";

const CLASS_TEXT = { dry: "Dry, needs water", low: "Low, water soon", ok: "In the optimal range", wet: "Wet" } as const;
const CROP_ICON = { Wheat: "🌾", Maize: "🌽", Alfalfa: "🌿", Potatoes: "🥔" } as const;
const hh =(h: number) => `${String(h % 24).padStart(2, "0")}:00`;

/** Pivots: pick a pivot, read its six key numbers, see it from above, control it, and follow its soil moisture and schedule */
export default function Pivots({ start }: { start?: string }) {
  const t = useTick();
  const grow = useGrow();
  const [sel, setSel] = useState(pivotById(start ?? "")?.id ?? "P5");
  const [moment, setMoment] = useState<Moment>("Morning");
  const [ctls, setCtls] = useState<Record<string, Ctl>>({});
  const hour = momentHour(moment);
  const snap = useMemo(() => pivotsAt(hour), [hour]);
  const n = snap.find((x) => x.p.id === sel)!;
  const ctl = ctls[sel] ?? DEFAULT_CTL;
  const patch = (c: Partial<Ctl>) => setCtls((o) => ({ ...o, [sel]: { ...ctl, ...c } }));
  const det = useMemo(() => pivotDetail(n), [n]);
  const plan = useMemo(() => pivotPlan(n.p).slice(0, 3).map((p) => (p.day === "Today" ? { ...p, state: n.status === "Fault" ? "Blocked" : n.status === "Irrigating" ? "Running" : n.status === "Scheduled" ? "Scheduled" : "Done" } : p)), [n.p, n.status]);
  const day = useMemo(() => Array.from({ length: 25 }, (_, h) => ({ h, moist: +moistAt(n.p, h).toFixed(1) })), [n.p]);
  const faulted = n.status === "Fault";
  const idle = n.status !== "Irrigating" && !faulted;
  const running = n.status === "Irrigating" && !ctl.stopped;
  const mm = planMm(n.p) * (100 / ctl.speed);
  const passH = winHours(n.p) * (100 / ctl.speed);
  const flow = running ? (n.rate * areaM2(n.p)) / 1000 : 0;
  const [w0, w1] = n.p.win;
  const windows: [number, number][] = w0 < w1 ? [[w0, w1]] : [[w0, 24], [0, w1]];
  const soFarM3 = (n.applied * areaM2(n.p)) / 1000;
  const cls = moistClass(n.moist);
  const statusText = ctl.stopped && n.status === "Irrigating" ? "Stopped" : n.status;
  const kpis = [
    { l: "Soil moisture", icon: Layers, v: <><CountUp value={n.moist} decimals={1} /><small>%</small></>, s: CLASS_TEXT[cls], c: moistColor(n.moist) },
    { l: "Status", icon: CircleDot, v: <span className="txt">{statusText}</span>, s: `Window ${hh(w0)} to ${hh(w1)}`, c: STATUS_COLOR[n.status] },
    { l: "Flow now", icon: Waves, v: <><CountUp value={wobble(flow, 3, t, 0.006)} decimals={0} /><small>m³/h</small></>, s: running ? `Pressure ${fmt(wobble(2.8, 4, t, 0.01), 1)} bar` : "Not irrigating", c: "var(--water)" },
    { l: "Water today", icon: Droplets, v: <><CountUp value={soFarM3} decimals={0} /><small>m³</small></>, s: `${fmt(n.applied, 1)} of ${fmt(planMm(n.p), 1)} mm`, c: "var(--water)" },
    { l: "One pass takes", icon: Timer, v: <><CountUp value={passH} decimals={1} /><small>h</small></>, s: `${fmt(mm, 1)} mm per pass`, c: "var(--teal)" },
    { l: "Spray uniformity", icon: Target, v: <><CountUp value={det.uniformity} decimals={0} /><small>%</small></>, s: faulted ? "A tower has tripped" : "All towers aligned", c: faulted ? "var(--bad)" : "var(--good)" },
  ];

  return (
    <div className="pv">
      <div className="pv-top">
        <div className="pv-chips">
          {snap.map((x) => (
            <button key={x.p.id} className={`pv-chip ${x.p.id === sel ? "on" : ""}`} onClick={() => setSel(x.p.id)} aria-pressed={x.p.id === sel}>
              <span className="pv-ico" aria-hidden="true">{CROP_ICON[x.p.crop]}</span>
              <b><i style={{ background: STATUS_COLOR[x.status] }} />{x.p.id} {x.p.crop}</b>
            </button>
          ))}
        </div>
        <Segmented<Moment> label="Time of day" value={moment} options={MOMENT_LABELS} onChange={setMoment} />
      </div>

      <div className="pv-kpis">
        {kpis.map((k, i) => (
          <div key={k.l} className="pv-kpi" style={{ ["--c" as string]: k.c, ["--n" as string]: i }}>
            <span><k.icon className="sym" size={16} aria-hidden />{k.l}</span><b>{k.v}</b><em>{k.s}</em>
          </div>
        ))}
      </div>

      <Panel title={`Pivot ${n.p.id} from above`} className="pv-plan" i={1}>
        <div className="pv-plan-in"><PivotPlan n={n} sectors={det.sectors} ctl={ctl} running={running} flow={flow} /></div>
      </Panel>

      <div className="pv-mid">
        <Panel title="Controls" className="pv-ctl" i={2}>
          <div className="pv-ctl-grid">
            <div><span>Pivot</span><button className={`btn ${running || idle ? "" : "pri"}`} disabled={faulted || idle} onClick={() => patch({ stopped: !ctl.stopped })}>{faulted ? "Fault" : idle ? (n.status === "Scheduled" ? `Starts ${hh(w0)}` : "Finished today") : ctl.stopped ? "Start" : "Stop"}</button></div>
            <div><span>Speed (% timer)</span><Segmented<string> label="Speed" value={String(ctl.speed)} options={["25", "50", "75", "100"]} onChange={(v) => patch({ speed: +v })} /></div>
            <div><span>Direction</span><Segmented<string> label="Direction" value={ctl.reverse ? "Reverse" : "Forward"} options={["Forward", "Reverse"]} onChange={(v) => patch({ reverse: v === "Reverse" })} /></div>
            <div><span>End gun</span><Segmented<string> label="End gun" value={ctl.endGun ? "On" : "Off"} options={["On", "Off"]} onChange={(v) => patch({ endGun: v === "On" })} /></div>
          </div>
          {faulted && <p className="pv-fault">{n.p.fault}. The pivot cannot start until it is repaired.</p>}
        </Panel>
        <Panel title="Soil moisture today" className="pv-chart" i={3} right={<span className="pm-leg"><i style={{ background: "var(--water)", opacity: 0.45 }} />Irrigation window</span>}>
          <div className="pv-line">
            <ResponsiveContainer>
              <LineChart data={day} margin={{ left: -4, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="h" type="number" domain={[0, 24]} ticks={[0, 6, 12, 18, 24]} stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${String(v % 24).padStart(2, "0")}:00`} />
                <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} width={40} domain={[20, 50]} tickCount={4} unit="%" />
                {windows.map(([a, b]) => <ReferenceArea key={a} x1={a} x2={b} fill="var(--water)" fillOpacity={0.18} />)}
                <ReferenceLine y={33} stroke="var(--warn)" strokeDasharray="4 4" label={{ value: "water below 33%", fill: "var(--warn)", fontSize: 12, position: "insideBottomLeft" }} />
                <Tooltip content={<Tip unit="%" />} cursor={{ stroke: "var(--teal)", strokeOpacity: 0.3 }} />
                <Line type="monotone" dataKey="moist" name="Soil moisture" stroke="var(--teal)" strokeWidth={3} dot={false} isAnimationActive animationDuration={900} />
                <ReferenceDot x={hour} y={+n.moist.toFixed(1)} r={6} fill="var(--teal)" stroke="var(--card)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="pv-right">
        <Panel title="Moisture by depth" className="pv-depth" i={4}><Bars labels={["20 cm", "40 cm", "60 cm"]} values={det.depths} unit="%" grow={grow} max={60} /></Panel>
        <Panel title="Schedule" className="pv-sched" i={5}>
          <div className="tbl">
            <table>
              <thead><tr><th>Day</th><th>Start</th><th>Water</th><th>Status</th></tr></thead>
              <tbody>
                {plan.map((p) => (
                  <tr key={p.day}>
                    <td><b>{p.day}</b></td><td>{p.start}</td><td>{fmt(p.m3)} m³</td>
                    <td><span className={`chip ${p.state === "Blocked" ? "bad" : p.state === "Running" || p.state === "Done" ? "good" : "mute"}`}>{p.state}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
