import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bar as RBar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { batches, C, qualityData, rangeLabel, type Batch, type Filters, type Result, type Tone } from "./data";
import { axis, Bar, Card, chartAnim, Chip, Detail, downloadCsv, ExportButton, grid, KpiCard, Legend, SearchBox, Segmented, Tip, useLast, type ModalTone, Replay } from "./ui";
import { useLiveKpis, useLiveRows } from "./live";
import type { Go } from "./nav";

const STAGE_LABELS = ["Dispersion", "Milling", "Let-down", "QC lab", "Filling", "Released"];
const RESULT_MODAL: Record<Result, ModalTone> = { Pass: "green", Rework: "orange", Hold: "navy", "In QC": "yellow" };

const RESULT_TONE: Record<Result, Tone> = { Pass: "good", Rework: "warn", Hold: "bad", "In QC": "info" };
const RESULT_FILTERS = ["All", "Pass", "Rework", "Hold", "In QC"] as const;
type ResultFilter = (typeof RESULT_FILTERS)[number];

export default function Quality({ f, go }: { f: Filters; go: Go }) {
  const [sel, setSel] = useState<Batch | null>(null);
  const b = useLast(sel);
  const d = useMemo(() => qualityData(f), [f]);
  const { kpis } = useLiveKpis(d.kpis);
  const fpyLive = useLiveRows(d.fpy, "fpy", "fpy", 0.003, 1);
  const gauges = useLiveRows(d.gauges, "pct", "gau", 0.004, 1);
  const paretoLive = useLiveRows(d.pareto, "n", "par", 0.07, 0);
  const all = useMemo(() => batches(f), [f]);
  const [res, setRes] = useState<ResultFilter>("All");
  const [q, setQ] = useState("");
  const rows = useMemo(() => all.filter((b) => (res === "All" || b.result === res) && (!q || `${b.id} ${b.product} ${b.line}`.toLowerCase().includes(q.toLowerCase()))), [all, res, q]);
  const exportCsv = () => downloadCsv("jotun-batches", [{ title: "Batches", rows: rows.map((b) => ({ Batch: b.id, Product: b.product, Line: b.line, Stage: b.stage, "Colour dE": b.de, "Viscosity KU": b.visc, "Solids %": b.solids, Result: b.result, Time: b.time })) }]);
  const total = paretoLive.reduce((s, x) => s + x.n, 0);
  let run = 0;
  const pareto = paretoLive.map((x) => ({ ...x, cum: Math.round(((run += x.n) / total) * 100) }));

  return (
    <>
      <div className="grid g-kpi">{kpis.map((k, i) => <KpiCard key={k.id} k={k} i={i} />)}</div>

      <div className="grid g-21">
        <Card title="First-pass yield" sub={`Right first time · ${rangeLabel(f.range)}`} right={<Legend items={[{ name: "FPY %", color: C.good }, { name: "Target", color: C.mute }]} />} i={1}>
          <Replay className="chart-h">
            <ResponsiveContainer>
              <LineChart data={fpyLive} margin={{ left: -10, right: 6, top: 8 }}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={44} domain={[91, 100]} />
                <Tooltip content={<Tip unit=" %" />} />
                <Line dataKey="fpy" name="FPY" stroke={C.good} strokeWidth={2.4} dot={false} {...chartAnim} />
                <Line dataKey="target" name="target" stroke={C.mute} strokeDasharray="5 5" dot={false} {...chartAnim} />
              </LineChart>
            </ResponsiveContainer>
          </Replay>
        </Card>

        <Card title="In-spec rate by test" sub="Share of samples within limits" i={2}>
          <div className="row-kv">
            {gauges.map((g) => {
              const c = g.pct >= 97 ? C.good : g.pct >= 95 ? C.yellow : C.warn;
              return (
                <div key={g.name}>
                  <div className="kv-line"><span>{g.name}</span><b>{g.pct.toFixed(1)}%</b></div>
                  <Bar pct={g.pct} color={c} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid g-12">
        <Card title="Rework causes" sub="Pareto of batches sent back" i={3}>
          <Replay className="chart-h">
            <ResponsiveContainer>
              <BarChart data={pareto} layout="vertical" margin={{ left: 8, right: 14, top: 4 }}>
                <CartesianGrid {...grid} horizontal={false} vertical />
                <XAxis type="number" {...axis} />
                <YAxis type="category" dataKey="cause" {...axis} width={128} />
                <Tooltip content={<Tip unit=" batches" />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <ReferenceLine x={0} stroke="var(--line)" />
                <RBar dataKey="n" name="batches" radius={[0, 6, 6, 0]} {...chartAnim}>
                  {pareto.map((p, i) => <Cell key={p.cause} fill={i === 0 ? C.yellow : i < 3 ? C.warn : C.blue} />)}
                </RBar>
              </BarChart>
            </ResponsiveContainer>
          </Replay>
        </Card>

        <Card title="Batch register" sub={`${rows.length} batches`} i={4}
          right={
            <div className="table-tools">
              <Segmented value={res} options={RESULT_FILTERS} onChange={setRes} label="Result" />
              <SearchBox value={q} onChange={setQ} placeholder="Search batch or product…" />
              <ExportButton onClick={exportCsv} />
            </div>
          }>
          <div className="table-wrap" style={{ maxHeight: 360, overflowY: "auto" }}>
            <table>
              <thead><tr><th>Batch</th><th>Product</th><th>Line</th><th>Stage</th><th className="num">ΔE</th><th className="num">KU</th><th className="num">Solids %</th><th>Result</th></tr></thead>
              <tbody>
                {rows.slice(0, 14).map((r) => (
                  <motion.tr layout key={r.id} className="clickable" tabIndex={0} onClick={() => setSel(r)} onKeyDown={(e) => { if (e.key === "Enter") setSel(r); }}>
                    <td className="mono">{r.id}</td><td className="strong">{r.product}</td><td className="mono">{r.line}</td><td>{r.stage}</td>
                    <td className="num" style={{ color: r.de > 1 ? "var(--bad)" : undefined }}>{r.de.toFixed(2)}</td>
                    <td className="num">{r.visc}</td><td className="num">{r.solids.toFixed(1)}</td>
                    <td><Chip tone={RESULT_TONE[r.result]}>{r.result}</Chip></td>
                  </motion.tr>
                ))}
                {!rows.length && <tr><td colSpan={8} className="empty">No batches match.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      {b && (
        <Detail open={!!sel} onClose={() => setSel(null)} tone={RESULT_MODAL[b.result]} eyebrow={`${b.id} · ${b.line}`} title={b.product}
          big={b.result} bigNote={`ΔE ${b.de.toFixed(2)}`}
          steps={{ labels: STAGE_LABELS, current: Math.max(0, STAGE_LABELS.indexOf(b.stage)) }}
          rows={[
            ["Colour ΔE", `${b.de.toFixed(2)}${b.de > 1 ? " · above limit" : ""}`], ["Viscosity", `${b.visc} KU`], ["Solids", `${b.solids.toFixed(1)} %`],
            ["Family", b.family], ["Current stage", b.stage], ["Logged", b.time],
          ]}
          actions={<button className="mbtn" onClick={() => { setSel(null); go("process", { stage: "qc" }); }}>Open QC stage</button>} />
      )}
    </>
  );
}
