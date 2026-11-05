import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { rng } from "./data";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { CountUp, Replay, Tip } from "./ui";
import { Panel } from "./charts";
import { Trend } from "./boardui";
import { KpDefs } from "./kpiui";
import { PumpArt } from "./PlantArt";
import type { Go } from "./App";
import "./kpi.css";
import "./kpi-boards.css";

type Run = "Running" | "Standby" | "Alarm";
interface Pump {
  id: string; name: string; duty: string; maker: string; model: string; kw: number; flow: number;
  state: Run; eff: number; cap: number; hot: boolean; seed: number;
}

const PUMPS: Pump[] = [
  { id: "P-01", name: "Influent pump 1", duty: "Inlet works", maker: "KSB", model: "Sewatec K 200", kw: 160, flow: 1600, state: "Running", eff: 81.4, cap: 78, hot: false, seed: 11 },
  { id: "P-02", name: "Influent pump 2", duty: "Inlet works", maker: "KSB", model: "Sewatec K 200", kw: 160, flow: 1560, state: "Running", eff: 79.2, cap: 74, hot: false, seed: 12 },
  { id: "P-03", name: "Influent pump 3", duty: "Inlet works", maker: "KSB", model: "Sewatec K 200", kw: 160, flow: 1580, state: "Running", eff: 80.6, cap: 76, hot: false, seed: 13 },
  { id: "P-04", name: "Influent pump 4", duty: "Inlet works", maker: "KSB", model: "Sewatec K 200", kw: 160, flow: 1600, state: "Standby", eff: 80.1, cap: 0, hot: false, seed: 14 },
  { id: "P-05", name: "RAS pump A", duty: "Secondary", maker: "KSB", model: "Amarex KRT", kw: 45, flow: 900, state: "Running", eff: 76.1, cap: 69, hot: false, seed: 15 },
  { id: "P-06", name: "RAS pump B", duty: "Secondary", maker: "KSB", model: "Amarex KRT", kw: 45, flow: 880, state: "Running", eff: 75.4, cap: 66, hot: false, seed: 16 },
  { id: "P-07", name: "Reuse pump 1", duty: "Effluent", maker: "KSB", model: "Etanorm 080", kw: 90, flow: 1200, state: "Running", eff: 83.0, cap: 77, hot: false, seed: 17 },
  { id: "P-08", name: "Reuse pump 2", duty: "Effluent", maker: "KSB", model: "Etanorm 080", kw: 90, flow: 1160, state: "Running", eff: 82.2, cap: 73, hot: false, seed: 18 },
  { id: "P-09", name: "Sludge pump 1", duty: "Digesters", maker: "Seepex", model: "BN 35-6", kw: 22, flow: 90, state: "Running", eff: 71.5, cap: 64, hot: false, seed: 19 },
  { id: "P-10", name: "Sludge pump 2", duty: "Digesters", maker: "Seepex", model: "BN 35-6", kw: 22, flow: 70, state: "Alarm", eff: 61.2, cap: 48, hot: true, seed: 20 },
];

/** Pumps: the plant's centrifugal pumps, one at a time, with the same live motion. Numbers refresh every 10 seconds. */
export default function Pumps({ go }: { go: Go }) {
  const t = useTick();
  const grow = useGrow();
  const [id, setId] = useState("P-01");
  const pump = PUMPS.find((p) => p.id === id)!;
  const running = pump.state !== "Standby";
  const kwh = pump.state === "Standby" ? 40 : pump.kw * 18 * (pump.eff / 80);

  const trend = useMemo(() => {
    const r = rng(pump.seed);
    return Array.from({ length: 18 }, (_, i) => {
      const on = running ? 0.72 + r() * 0.3 : 0.04 + r() * 0.03;
      return { t: `${i}h`, active: Math.round(pump.kw * on), expected: Math.round(pump.kw * 0.8), loss: Math.round(pump.kw * (pump.hot ? 0.18 : 0.04) * (0.6 + r())) };
    });
  }, [pump, running]);
  const health = useMemo(() => {
    const r = rng(pump.seed + 5);
    return Array.from({ length: 24 }, () => Math.round((pump.hot ? 38 : 76) + r() * (pump.hot ? 50 : 22)));
  }, [pump]);
  const curve = useMemo(() => {
    const r = rng(pump.seed + 9);
    return Array.from({ length: 16 }, (_, i) => {
      const flow = Math.round(pump.flow * (0.35 + i / 22));
      const y = Math.round(pump.kw * (0.32 + Math.pow(flow / pump.flow, 1.5) * 0.55) * (0.96 + r() * 0.08));
      return { x: flow, y };
    });
  }, [pump]);
  const lossLe = pump.hot ? -86 : pump.state === "Standby" ? 0 : -4.2;
  const lossFlow = pump.hot ? -40 : pump.state === "Standby" ? 0 : -12;
  const events = pump.hot
    ? [{ name: "Bearing temperature", start: "Today 06:40", end: "Open" }, { name: "Efficiency drop", start: "Today 05:10", end: "Open" }]
    : [{ name: "Vibration check", start: "12 Oct 09:00", end: "12 Oct 09:40" }];

  const chips: { l: string; v: ReactNode; tone?: string }[] = [
    { l: "Daily energy", v: <><CountUp value={wobble(kwh, 2, t, 0.01)} decimals={0} /> kWh</> },
    { l: "Capacity", v: <><CountUp value={wobble(pump.cap, 3, t, 0.01)} decimals={1} />%</> },
    { l: "State", v: pump.state, tone: pump.state === "Alarm" ? "bad" : pump.state === "Running" ? "ok" : "" },
    { l: "Operating efficiency", v: <><CountUp value={wobble(pump.eff, 4, t, 0.006)} decimals={1} />%</> },
    { l: "Overheat alarm", v: pump.hot ? "High" : "Clear", tone: pump.hot ? "bad" : "ok" },
  ];

  return (
    <div className="bd-fit kp pu2">
      <KpDefs />
      <Panel title="Pump operations" className="a-menu" i={0}>
        <div className="pu2-menu" role="tablist" aria-label="Pump">
          {PUMPS.map((p) => (
            <button key={p.id} role="tab" aria-selected={p.id === id} className={`${p.id === id ? "on" : ""} ${p.hot ? "hot" : ""}`} onClick={() => setId(p.id)}>
              <span className="mini"><PumpArt /></span>
              <b>{p.id}</b><em>{p.name}</em>
              <i className={p.state === "Alarm" ? "bad" : p.state === "Standby" ? "idle" : "ok"} aria-label={p.state} />
            </button>
          ))}
        </div>
      </Panel>

      <section className="hm-p a-kpis pu2-kpis" style={{ ["--i" as string]: 1 }}>
        <div className="pu2-title"><h2>{pump.name}</h2><p>{pump.duty} · {pump.id}</p></div>
        {chips.map((c) => (
          <div key={c.l} className={`chip ${c.tone ?? ""}`}><span>{c.l}</span><b>{c.v}</b></div>
        ))}
      </section>

      <Panel title="Power trends (kW)" className="a-trend" i={2}>
        <Trend data={trend} unit=" kW" lines={[
          { key: "active", name: "Active power", color: "var(--teal)" },
          { key: "expected", name: "Expected", color: "var(--blue)", dash: "4 3" },
          { key: "loss", name: "Shortfall", color: "var(--warn)" },
        ]} />
      </Panel>
      <Panel title="Predictive health score" className="a-health" i={3}>
        <div className="pu-bars">
          {health.map((v, i) => <i key={i} className={v < 45 ? "bad" : v < 70 ? "warn" : ""} style={{ height: `${grow ? v : 4}%`, ["--n" as string]: i }} />)}
        </div>
      </Panel>

      <section className="hm-p a-img pu2-img" style={{ ["--i" as string]: 4 }} aria-label={pump.name}>
        <img className="pu2-photo" src="/pump-cutaway.jpg" alt={`${pump.name} cutaway`} />
        <button className="pu2-alerts" onClick={() => go("alarms")}><AlertTriangle size={14} /> View alerts</button>
      </section>

      <Panel title="Pump details" className="a-det" i={5}>
        <div className="pu2-meta">
          <div><span>Manufacturer</span><b>{pump.maker}</b></div>
          <div><span>Model</span><b>{pump.model}</b></div>
          <div><span>Rated power</span><b><CountUp value={wobble(pump.kw, pump.seed, t, 0)} decimals={0} /> kW</b></div>
        </div>
      </Panel>
      <Panel title="Losses" className="a-loss" i={6}>
        <div className="pu2-loss">
          <div><span>Revenue loss</span><b className={lossLe < 0 ? "neg" : ""}><CountUp value={lossLe} decimals={1} /> <small>LE/h</small></b></div>
          <div><span>Flow loss</span><b className={lossFlow < 0 ? "neg" : ""}><CountUp value={lossFlow} decimals={0} /> <small>m³/h</small></b></div>
        </div>
      </Panel>
      <Panel title="Predictive events" className="a-events" i={7}>
        <table className="pu-table">
          <thead><tr><th>Event</th><th>Start</th><th>End</th></tr></thead>
          <tbody>{events.map((e) => <tr key={e.name}><td>{e.name}</td><td>{e.start}</td><td>{e.end}</td></tr>)}</tbody>
        </table>
      </Panel>
      <Panel title="Power curve" className="a-curve" i={8}>
        <Replay className="bd-chart">
          <ResponsiveContainer>
            <ScatterChart margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" />
              <XAxis dataKey="x" name="Flow" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} interval={3} />
              <YAxis dataKey="y" name="Power" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `${v >= 20 ? Math.round(v) : +Number(v).toFixed(1)} kW`} />
              <Tooltip content={<Tip unit="" />} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={curve} fill="var(--aqua)" isAnimationActive animationDuration={1100} />
            </ScatterChart>
          </ResponsiveContainer>
        </Replay>
      </Panel>
    </div>
  );
}
