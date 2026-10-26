import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Droplets, Factory, Gauge, Zap } from "lucide-react";
import { rangeLabel, UTIL_TABS, utilityData, type Filters, type Trend, type UtilTab } from "./data";
import { axis, Card, chartAnim, grid, KpiCard, Tip, Replay } from "./ui";
import { useLiveKpis, useLiveRows } from "./live";

const TAB_ICON: Record<UtilTab, typeof Zap> = { Power: Zap, Water: Droplets, "Air & steam": Gauge, Emissions: Factory };
const TAB_SUB: Record<UtilTab, string> = { Power: "Load and energy intensity", Water: "Use, reuse and wastewater", "Air & steam": "Compressors and boiler", Emissions: "VOC, solvent and waste" };

function TrendCard({ t, f, i }: { t: Trend; f: Filters; i: number }) {
  const id = `ut-${i}-${t.color.slice(1)}`;
  const data = useLiveRows(t.data, "v", t.title, 0.012, 1);
  return (
    <Card title={t.title} sub={`${t.sub} · ${rangeLabel(f.range)}`} i={i}>
      <Replay className="chart-h">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: -6, right: 6, top: 8 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.color} stopOpacity={0.4} /><stop offset="100%" stopColor={t.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...grid} />
            <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
            <YAxis {...axis} width={50} domain={t.limit ? [0, (max: number) => Math.max(max, t.limit! * 1.1)] : ["auto", "auto"]} />
            <Tooltip content={<Tip unit={t.unit} />} />
            {t.limit && <ReferenceLine y={t.limit} stroke="var(--bad)" strokeDasharray="5 5" label={{ value: `Limit ${t.limit}`, fill: "var(--bad)", fontSize: 11, position: "insideTopRight" }} />}
            <Area dataKey="v" name={t.title.toLowerCase()} stroke={t.color} strokeWidth={2.2} fill={`url(#${id})`} {...chartAnim} />
          </AreaChart>
        </ResponsiveContainer>
      </Replay>
    </Card>
  );
}

export default function Utilities({ f, initial }: { f: Filters; initial?: string }) {
  const [tab, setTab] = useState<UtilTab>((UTIL_TABS as readonly string[]).includes(initial ?? "") ? (initial as UtilTab) : "Power");
  const d = useMemo(() => utilityData(tab, f), [tab, f]);
  const { kpis } = useLiveKpis(d.kpis);

  return (
    <>
      <motion.div className="banner" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <img src="/stages/utilities.jpg" alt="Utilities plant room" />
        <div className="banner-in"><div><b>Utilities plant</b><span>Power, water, compressed air, steam and abatement</span></div></div>
      </motion.div>

      <div className="tabs" role="tablist" aria-label="Utility">
        {UTIL_TABS.map((u) => {
          const I = TAB_ICON[u];
          return (
            <button key={u} role="tab" aria-selected={u === tab} className={`tab ${u === tab ? "on" : ""}`} onClick={() => setTab(u)}>
              <I size={18} /><div><b>{u}</b><div className="card-sub" style={{ margin: 0 }}>{TAB_SUB[u]}</div></div>
            </button>
          );
        })}
      </div>

      <div className="grid g-kpi">{kpis.map((k, i) => <KpiCard key={tab + k.id} k={k} i={i} />)}</div>
      <div className="grid g-2">
        <TrendCard key={tab + "a"} t={d.a} f={f} i={1} />
        <TrendCard key={tab + "b"} t={d.b} f={f} i={2} />
      </div>
    </>
  );
}
