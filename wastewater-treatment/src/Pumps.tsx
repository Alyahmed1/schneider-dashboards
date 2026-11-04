import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { rng } from "./data";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { CountUp, Replay, Tip } from "./ui";
import { Panel } from "./charts";
import { Trend } from "./boardui";
import type { Go } from "./App";

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

function PumpArt({ running, hot }: { running: boolean; hot: boolean }) {
  return (
    <svg className="pu-svg" viewBox="0 0 560 300" role="img" aria-label="Centrifugal pump cutaway">
      <rect x="30" y="250" width="500" height="14" className="base" />
      <path d="M8 168 H148" className={running ? "hm-pipe clean" : "pipe-still"} />
      <text x="16" y="150">Suction</text>
      <circle cx="210" cy="168" r="74" className="case" />
      <circle cx="210" cy="168" r="64" className="case-in" />
      <path d="M210 94 V40 H390" className={running ? "hm-pipe clean" : "pipe-still"} />
      <text x="300" y="32">Discharge</text>
      <g className={running ? "bd-spin" : "bd-spin off"}>
        <circle cx="210" cy="168" r="28" className="hub" />
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d="M210 168 C226 148 240 150 248 168" transform={`rotate(${i * 60} 210 168)`} className="vane" />
        ))}
      </g>
      <rect x="248" y="162" width="86" height="12" className="shaft" />
      <rect x="292" y="146" width="18" height="44" className={hot ? "bearing hot bd-hot" : "bearing"} />
      <rect x="334" y="112" width="150" height="112" className="motor" />
      {Array.from({ length: 7 }, (_, i) => <rect key={i} x={350 + i * 16} y="112" width="5" height="112" className="fin" />)}
      <circle cx="484" cy="168" r="26" className="cowl" />
      <text x="372" y="246">Motor</text>
    </svg>
  );
}

function Body({ pump, go }: { pump: Pump; go: Go }) {
  const t = useTick();
  const grow = useGrow();
  const running = pump.state !== "Standby";
  const trend = useMemo(() => {
    const r = rng(pump.seed);
    return Array.from({ length: 18 }, (_, i) => {
      const on = running ? 0.72 + r() * 0.3 : 0.04 + r() * 0.03;
      return { t: `${i}h`, active: Math.round(pump.kw * on), expected: Math.round(pump.kw * 0.8), loss: Math.round(pump.kw * (pump.hot ? 0.18 : 0.04) * (0.6 + r())) };
    });
  }, [pump, running]);
  const health = useMemo(() => {
    const r = rng(pump.seed + 5);
    return Array.from({ length: 18 }, () => Math.round((pump.hot ? 38 : 76) + r() * (pump.hot ? 50 : 22)));
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

  return (
    <div className="pu-body">
      <div className="pu-col">
        <Panel title="Power trends" className="bd-grow" i={1}>
          <Trend data={trend} unit=" kW" lines={[
            { key: "active", name: "Active power", color: "var(--teal)" },
            { key: "expected", name: "Expected", color: "var(--blue)", dash: "4 3" },
            { key: "loss", name: "Shortfall", color: "var(--warn)" },
          ]} />
        </Panel>
        <Panel title="Predictive health" i={2}>
          <div className="pu-bars">
            {health.map((v, i) => <i key={i} className={v < 45 ? "bad" : v < 70 ? "warn" : ""} style={{ height: `${grow ? v : 4}%`, ["--n" as string]: i }} />)}
          </div>
        </Panel>
        <button className="bd-cta" onClick={() => go("alarms")}><AlertTriangle size={15} /> View alerts</button>
      </div>
      <Panel title={pump.name} className="bd-grow" i={3}>
        <PumpArt running={running} hot={pump.hot} />
      </Panel>
      <div className="pu-col">
        <div className="pu-losses">
          <Panel title="Revenue loss" i={4}><b className="bd-big" style={{ color: lossLe < 0 ? "var(--bad)" : undefined }}><CountUp value={lossLe} decimals={1} /></b><span className="bd-unit">LE/h</span></Panel>
          <Panel title="Flow loss" i={5}><b className="bd-big" style={{ color: lossFlow < 0 ? "var(--bad)" : undefined }}><CountUp value={lossFlow} decimals={0} /></b><span className="bd-unit">m³/h</span></Panel>
        </div>
        <Panel title="Power curve" className="bd-grow" i={6}>
          <Replay className="bd-chart">
            <ResponsiveContainer>
              <ScatterChart margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" />
                <XAxis dataKey="x" name="Flow" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} interval={3} />
                <YAxis dataKey="y" name="Power" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `${v >= 20 ? Math.round(v) : +Number(v).toFixed(1)} kW`} />
                <Tooltip content={<Tip unit="" />} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={curve} fill="var(--teal)" isAnimationActive animationDuration={1100} />
              </ScatterChart>
            </ResponsiveContainer>
          </Replay>
        </Panel>
        <Panel title="Predictive events" i={7}>
          <table className="pu-table">
            <thead><tr><th>Event</th><th>Start</th><th>End</th></tr></thead>
            <tbody>{events.map((e) => <tr key={e.name}><td>{e.name}</td><td>{e.start}</td><td>{e.end}</td></tr>)}</tbody>
          </table>
        </Panel>
        <Panel title="Pump details" i={8}>
          <div className="pu-meta">
            <div><span>Duty</span><b>{pump.duty}</b></div>
            <div><span>Manufacturer</span><b>{pump.maker}</b></div>
            <div><span>Model</span><b>{pump.model}</b></div>
            <div><span>Rated power</span><b><CountUp value={wobble(pump.kw, pump.seed, t, 0)} decimals={0} /> kW</b></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/** Pumps: the turbine board rebuilt as the plant's centrifugal pumps, with the same live motion. */
export default function Pumps({ go }: { go: Go }) {
  const t = useTick();
  const [id, setId] = useState("P-01");
  const pump = PUMPS.find((p) => p.id === id)!;
  const kwh = pump.state === "Standby" ? 40 : pump.kw * 18 * (pump.eff / 80);
  return (
    <div className="bd-fit pu">
      <section className="hm-p pu-head" style={{ ["--i" as string]: 0 }}>
        <div className="pu-top">
          <div>
            <h2>Pump operations</h2>
            <p>{pump.name} · {pump.duty}</p>
          </div>
          <div className="seg pu-pick" role="tablist" aria-label="Pump">
            {PUMPS.map((p) => (
              <button key={p.id} role="tab" aria-selected={p.id === id} className={`${p.id === id ? "on" : ""} ${p.hot ? "hot" : ""}`} onClick={() => setId(p.id)}>{p.id}</button>
            ))}
          </div>
        </div>
        <div className="pu-kpis">
          <div><span>Daily energy</span><b><CountUp value={wobble(kwh, 2, t, 0.01)} decimals={0} /> kWh</b></div>
          <div><span>Capacity</span><b><CountUp value={wobble(pump.cap, 3, t, 0.01)} decimals={1} />%</b></div>
          <div><span>State</span><b className={pump.state === "Alarm" ? "bad" : pump.state === "Running" ? "ok" : ""}>{pump.state}</b></div>
          <div><span>Operating efficiency</span><b><CountUp value={wobble(pump.eff, 4, t, 0.006)} decimals={1} />%</b></div>
          <div><span>Overheat alarm</span><b className={pump.hot ? "bad" : "ok"}>{pump.hot ? "High" : "Clear"}</b></div>
        </div>
      </section>
      <Body key={id} pump={pump} go={go} />
    </div>
  );
}
