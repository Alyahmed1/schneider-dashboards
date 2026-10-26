import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { process, STAGES, type Filters } from "./data";
import { useLiveEquipment, useLiveStats } from "./live";
import { axis, Bar, Card, Chip, grid, Legend, Tip, rise } from "./ui";

// Stage 01 (Alumina Milling) has its own tab, so this one covers stages 02-05 of the plant.
const PLANT_STAGES = STAGES.slice(1);
const THROUGHPUT = PLANT_STAGES.map((s) => ({ label: s.id, value: s.throughput, unit: s.unit }));
const PHOTO: Record<string, { src: string; pos: string }> = {
  carbon: { src: "/stages/carbon.jpg", pos: "50% 50%" },
  pot: { src: "/stages/pot.jpg", pos: "35% 50%" },
  cast: { src: "/stages/cast.jpg", pos: "30% 50%" },
  dispatch: { src: "/stages/dispatch.jpg", pos: "45% 50%" },
};

export default function FactoryProcess({ f, initialStage }: { f: Filters; initialStage?: string }) {
  const [id, setId] = useState(PLANT_STAGES.some((s) => s.id === initialStage) ? initialStage! : PLANT_STAGES[0].id);
  const stage = PLANT_STAGES.find((s) => s.id === id)!;
  const d = useMemo(() => process(f, stage), [f, stage]);
  const stats = useLiveStats(stage.kpis);
  const through = useLiveStats(THROUGHPUT);
  const eq = useLiveEquipment(d.eq);

  return (
    <>
      <div className="stages four">
        {PLANT_STAGES.map((s, i) => (
          <motion.button key={s.id} className={`stage ${s.id === id ? "on" : ""}`} onClick={() => setId(s.id)} aria-pressed={s.id === id} {...rise(i)}>
            <div className="n">STAGE {String(i + 2).padStart(2, "0")}</div>
            <div className="t">{s.name}</div>
            <div className="s"><span>{through[i].value} {s.unit}</span><Chip tone={s.tone}>{s.status}</Chip></div>
          </motion.button>
        ))}
      </div>

      <div className="grid g-12">
        <motion.div className="card photo-card" key={stage.id} {...rise(1)}>
          <img src={PHOTO[stage.id].src} alt={`${stage.name} at the plant`} style={{ objectPosition: PHOTO[stage.id].pos }} />
          <div className="photo-cap"><b>{stage.name}</b><span>{stage.blurb}</span></div>
        </motion.div>

        <Card title={`${stage.name} · throughput`} sub={`${stage.unitName === "t/h" ? "Tonnes" : "Anodes"} per ${f.range === "YTD" ? "month" : f.range === "24H" ? "hour" : "day"} vs target`}
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
                <defs><linearGradient id="fpG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff7a1a" stopOpacity={0.45} /><stop offset="100%" stopColor="#ff7a1a" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} domain={["auto", "auto"]} width={52} />
                <Tooltip content={<Tip />} />
                <Area dataKey="actual" stroke="#ff7a1a" strokeWidth={2.2} fill="url(#fpG)" />
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
