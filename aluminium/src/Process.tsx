import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { MILL_STEPS, process, STAGES, type Filters } from "./data";
import { useLiveEquipment, useLiveStats } from "./live";
import { axis, Bar, Card, Chip, grid, Legend, Tip, rise } from "./ui";

const MILL = STAGES[0]; // Alumina Milling is the only process shown on this tab

export default function Process({ f }: { f: Filters }) {
  const [stepId, setStepId] = useState(MILL_STEPS[0].id);
  const idx = MILL_STEPS.findIndex((s) => s.id === stepId);
  const step = MILL_STEPS[idx];
  const d = useMemo(() => process(f, MILL, step), [f, step]);
  const stats = useLiveStats(step.kpis);
  const eq = useLiveEquipment(d.eq);

  return (
    <>
      <div className="steps">
        {MILL_STEPS.map((s, i) => (
          <motion.button key={s.id} className={`step ${s.id === stepId ? "on" : ""}`} onClick={() => setStepId(s.id)} aria-pressed={s.id === stepId} {...rise(i)}>
            <span className="step-img" style={{ backgroundImage: `url(${s.img})`, backgroundPosition: s.pos }} />
            <span className="step-n">STAGE {String(i + 1).padStart(2, "0")}</span>
            <span className="step-t">{s.name}</span>
          </motion.button>
        ))}
      </div>

      <div className="grid g-12">
        <motion.div className="card photo-card" key={step.id} {...rise(1)}>
          <img src={step.img} alt={`${step.name} at the Misr Aluminium plant`} style={{ objectPosition: step.pos }} />
          <div className="photo-cap"><b>{step.name}</b><span>{step.desc}</span></div>
        </motion.div>

        <Card title={`Stage ${String(idx + 1).padStart(2, "0")} · ${step.name}`} sub={`Tonnes per ${f.range === "YTD" ? "month" : f.range === "24H" ? "hour" : "day"} vs target`}
          right={<Legend items={[{ name: "Actual", color: "#ff7a1a" }, { name: "Target", color: "#8896a9" }]} />} i={2}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", marginBottom: 14 }}>
            {stats.map((k) => (
              <div key={k.label} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: "var(--muted)", fontSize: 11.5 }}>{k.label}</div>
                <div style={{ fontFamily: "var(--display)", fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{k.value}<small style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--body)", marginLeft: 4 }}>{k.unit}</small></div>
              </div>
            ))}
          </div>
          <div style={{ height: 210 }}>
            <ResponsiveContainer>
              <AreaChart data={d.chart} margin={{ left: -8, right: 6, top: 6 }}>
                <defs><linearGradient id="stG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff7a1a" stopOpacity={0.45} /><stop offset="100%" stopColor="#ff7a1a" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} domain={["auto", "auto"]} width={52} />
                <Tooltip content={<Tip />} />
                <Area dataKey="actual" stroke="#ff7a1a" strokeWidth={2.2} fill="url(#stG)" />
                <Line dataKey="target" stroke="#8896a9" strokeDasharray="5 5" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Equipment in this stage" sub="Live load and temperature" i={3}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tag</th><th>Equipment</th><th style={{ width: 200 }}>Load</th><th className="num">Temp °C</th><th className="num">Run hours</th><th>Status</th></tr></thead>
            <tbody>
              {eq.map((e) => (
                <tr key={e.id}>
                  <td className="mono">{e.id}</td><td>{e.name}</td>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ flex: 1 }}><Bar pct={e.load} color={e.tone === "bad" ? "var(--bad)" : e.tone === "warn" ? "var(--warn)" : "var(--molten)"} /></div><span style={{ fontFamily: "var(--mono)", fontSize: 12, width: 34 }}>{e.load}%</span></div></td>
                  <td className="num">{e.temp}</td><td className="num">{e.hours.toLocaleString()}</td><td><Chip tone={e.tone}>{e.status}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
