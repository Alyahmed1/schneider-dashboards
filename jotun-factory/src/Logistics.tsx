import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { C, logisticsData, MATERIALS, rangeLabel, type Filters } from "./data";
import { axis, Bar, Card, chartAnim, Detail, grid, KpiCard, Legend, Tip, useLast, type ModalTone, Replay } from "./ui";
import { useLiveKpis, useLiveRows } from "./live";
import { DockBoard, DockSummary, useDock, type Truck } from "./DockBoard";

export default function Logistics({ f }: { f: Filters }) {
  const [sel, setSel] = useState<Truck | null>(null);
  const t0 = useLast(sel);
  const d = useMemo(() => logisticsData(f), [f]);
  const dock = useDock(d.trucks);
  const { kpis } = useLiveKpis(d.kpis);
  const otif = useLiveRows(d.otif, "otif", "otif", 0.003, 1);
  const atBays = dock.inLoc("out").length + dock.inLoc("in").length;
  const shownKpis = kpis.map((k) => (k.id === "bay" ? { ...k, num: atBays } : k));

  const loc = t0 ? dock.locOf(t0) : "queue";
  const bay = t0 ? dock.bayOf(t0) : null;
  const where = loc === "queue" ? "Yard queue" : loc === "departed" ? "Departed" : loc === "hold" ? "On hold" : `Bay ${bay}`;
  const tone: ModalTone = loc === "hold" ? "navy" : t0?.status === "Delayed" && loc === "queue" ? "orange" : t0?.dir === "Outbound" ? "yellow" : "green";

  return (
    <>
      <motion.div className="banner" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <img src="/stages/warehouse.jpg" alt="Finished goods warehouse" />
        <div className="banner-in"><div><b>Warehouse and yard</b><span>Finished goods, raw materials and truck movements</span></div></div>
      </motion.div>

      <div className="grid g-kpi">{shownKpis.map((k, i) => <KpiCard key={k.id} k={k} i={i} />)}</div>

      <Card title="Dock board" sub="Drag a truck onto a free bay. Drop it on Departed or On hold when it leaves or needs a pause." i={1}>
        <DockBoard trucks={d.trucks} dock={dock} onOpen={setSel} />
      </Card>

      <div className="grid g-12">
        <Card title="Raw material stock" sub="Level and days of cover" i={2}>
          <div className="row-kv">
            {MATERIALS.map((m) => {
              const c = m.cover < 5 ? C.bad : m.cover < 8 ? C.warn : C.good;
              return (
                <div key={m.id} className="silo">
                  <span className="silo-name">{m.name}<small>{m.id}</small></span>
                  <span className="silo-val">{m.level}% · {m.cover.toFixed(1)} d cover</span>
                  <Bar pct={m.level} color={c} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="On-time, in-full" sub={`OTIF % · ${rangeLabel(f.range)}`} right={<Legend items={[{ name: "OTIF", color: C.teal }, { name: "Target 95%", color: C.mute }]} />} i={3}>
          <Replay className="chart-h">
            <ResponsiveContainer>
              <LineChart data={otif} margin={{ left: -10, right: 6, top: 8 }}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={44} domain={[90, 100]} />
                <Tooltip content={<Tip unit=" %" />} />
                <Line dataKey="otif" name="OTIF" stroke={C.teal} strokeWidth={2.4} dot={false} {...chartAnim} />
                <Line dataKey="target" name="target" stroke={C.mute} strokeDasharray="5 5" dot={false} {...chartAnim} />
              </LineChart>
            </ResponsiveContainer>
          </Replay>
        </Card>
      </div>

      <div className="grid g-2">
        <Card title="Warehouse by family" sub="Share of pallet positions" i={4}>
          <Replay className="donut-wrap">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={d.zones} dataKey="value" nameKey="name" innerRadius={58} outerRadius={80} paddingAngle={3} stroke="none" {...chartAnim}>
                  {d.zones.map((z) => <Cell key={z.name} fill={z.color} />)}
                </Pie>
                <Tooltip content={<Tip unit=" %" />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center"><div><b>{kpis.find((k) => k.id === "wh")!.num.toFixed(0)}%</b><span>full</span></div></div></Replay>
          <div className="row-kv" style={{ marginTop: 6 }}>
            {d.zones.map((z) => (
              <div key={z.name} className="kv-line" style={{ margin: 0 }}>
                <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: z.color, marginRight: 8 }} />{z.name}</span><b>{z.value}%</b>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Dock summary" sub="Updates as you move trucks on the board" i={5}>
          <DockSummary trucks={d.trucks} dock={dock} />
        </Card>
      </div>

      {t0 && (
        <Detail open={!!sel} onClose={() => setSel(null)} tone={tone} eyebrow={`${t0.id} · ${t0.dir}`} title={t0.carrier}
          big={where} bigNote={t0.eta}
          rows={[["Load", t0.load], ["Direction", t0.dir], ["Location", where], ["ETA", t0.eta]]} />
      )}
    </>
  );
}
