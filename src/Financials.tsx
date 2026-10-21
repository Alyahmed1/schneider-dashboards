import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RotateCcw, Sparkles } from "lucide-react";
import { BUCKET, compact, productionSeries, RANGE_LABEL, rng, type Filters, type Kpi } from "./data";
import { ANNUAL_M3, BASE_COST, costModel, costSeries, itemSeries, PRICE, WHATIF_BASE, type WhatIf } from "./step3";
import { axis, C, Card, Chip, CountUp, gridProps, KpiCard, Legend, Replay, Tip } from "./ui";
import { useTick, wobble } from "./live";

const COLORS = [C.teal, C.blue, C.aqua, "#7fa8d6", "#c2cdd0", "#e0b66a"];
const FMT2 = (v: number) => v.toFixed(2);

function Slider({ label, unit, value, min, max, step, base, onChange }: { label: string; unit: string; value: number; min: number; max: number; step: number; base: number; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  const basePct = ((base - min) / (max - min)) * 100;
  return (
    <label className="sl">
      <span className="sl-top"><b>{label}</b><em>{value.toFixed(step < 1 ? 1 : 0)} {unit}</em></span>
      <span className="sl-track">
        <i className="sl-fill" style={{ width: `${pct}%` }} /><i className="sl-thumb" style={{ left: `${pct}%` }} />
        <i className="sl-base" style={{ left: `${basePct}%` }} title={`Today: ${base}`} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} aria-label={label} />
      </span>
      <span className="sl-ends"><small>{min}</small><small>today {base}</small><small>{max}</small></span>
    </label>
  );
}

export default function Financials({ f }: { f: Filters }) {
  const t = useTick();
  const [w, setW] = useState<WhatIf>(WHATIF_BASE);
  const [tab, setTab] = useState("all");
  const m3 = useMemo(() => productionSeries(f).reduce((s, p) => s + p.actual, 0), [f]);
  const series = useMemo(() => costSeries(f), [f]);
  const model = useMemo(() => costModel(w), [w]);
  const changed = w.recovery !== WHATIF_BASE.recovery || w.tariff !== WHATIF_BASE.tariff || w.solar !== WHATIF_BASE.solar;

  const cost = wobble(BASE_COST.total, 3, t, 0.003);
  const margin = PRICE - cost;
  const sp = (seed: number, base: number) => { const r = rng(seed); return Array.from({ length: 14 }, () => base * (0.95 + r() * 0.1)); };
  const kpis: Kpi[] = [
    { id: "cost", label: "Cost per m³", value: cost, decimals: 1, unit: "LE/m³", delta: +(((BASE_COST.total / BASE_COST.budgetTotal) - 1) * 100).toFixed(1), goodWhenDown: true, note: "vs budget", spark: sp(1, 24.6) },
    { id: "price", label: "Selling price", value: PRICE, decimals: 1, unit: "LE/m³", delta: 2.0, note: "tariff set in July", spark: sp(2, 31.5) },
    { id: "margin", label: "Margin per m³", value: margin, decimals: 1, unit: "LE/m³", delta: 4.6, note: `${((margin / PRICE) * 100).toFixed(0)}% of price`, spark: sp(3, 6.9) },
    { id: "rev", label: "Revenue", value: (m3 * PRICE) / 1e6, decimals: 1, suffix: " M", unit: "LE", delta: 3.1, note: RANGE_LABEL[f.range], spark: sp(4, 25) },
    { id: "opex", label: "Cost of water", value: (m3 * cost) / 1e6, decimals: 1, suffix: " M", unit: "LE", delta: -1.7, goodWhenDown: true, note: RANGE_LABEL[f.range], spark: sp(5, 20) },
  ];

  const saving = (BASE_COST.total - model.total) * ANNUAL_M3 / 1e6;
  const diff = model.total - BASE_COST.total;
  const budgetData = BASE_COST.lines.map((l) => ({ name: l.name, Budget: l.budget, Actual: +l.value.toFixed(2) }));
  const item = BASE_COST.lines.find((l) => l.id === tab);
  const itemData = useMemo(() => (tab === "all" ? [] : itemSeries(f, tab)), [f, tab]);
  const itemDiff = item ? item.value - item.budget : 0;
  const itemPct = item ? (itemDiff / item.budget) * 100 : 0;
  const itemAnnual = (itemDiff * ANNUAL_M3) / 1e6;
  const maxLine = Math.max(...model.lines.map((l) => l.value));

  return (
    <>
      <div className="grid g-kpi">
        {kpis.map((k, i) => <KpiCard key={k.id} k={k} i={i} hero={i === 0} />)}
      </div>

      <div className="grid g-21">
        <Card title="Cost vs selling price" sub={`LE per m³ ${BUCKET[f.range]} · ${RANGE_LABEL[f.range]}`} i={1}
          right={<Legend items={[{ name: "Cost", color: C.teal }, { name: "Price", color: C.blue, dashed: true }]} />}>
          <Replay className="chart-h">
            <ResponsiveContainer>
              <ComposedChart data={series} margin={{ left: -6, right: 6, top: 8 }}>
                <defs>
                  <linearGradient id="costG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.aqua} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={C.aqua} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={40} domain={[20, 34]} tickCount={5} />
                <Tooltip content={<Tip unit="LE" />} cursor={{ stroke: C.teal, strokeOpacity: 0.25 }} />
                <Area type="monotone" dataKey="cost" name="Cost" stroke={C.teal} strokeWidth={2.4} fill="url(#costG)" animationDuration={1300} />
                <Line type="monotone" dataKey="price" name="Price" stroke={C.blue} strokeDasharray="5 5" dot={false} strokeWidth={1.8} animationDuration={1300} />
              </ComposedChart>
            </ResponsiveContainer>
          </Replay>
        </Card>

        <Card title="Where one m³ goes" sub={`${model.total.toFixed(1)} LE per m³${changed ? " (what-if)" : ""}`} i={2}>
          <div className="stack" aria-hidden>
            {model.lines.map((l, i) => <motion.i key={l.id} layout animate={{ flexGrow: l.value }} transition={{ type: "spring", stiffness: 160, damping: 22 }} style={{ background: COLORS[i], flexBasis: 0 }} />)}
          </div>
          <ul className="costlist">
            {model.lines.map((l, i) => (
              <li key={l.id}>
                <i style={{ background: COLORS[i] }} />
                <span>{l.name}</span>
                <div className="bar"><motion.i animate={{ width: `${(l.value / maxLine) * 100}%` }} transition={{ duration: 0.5 }} style={{ background: COLORS[i] }} /></div>
                <b><CountUp value={l.value} decimals={2} /></b>
                <em>{((l.value / model.total) * 100).toFixed(0)}%</em>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid g-12">
        <Card title="What if…?" sub="Move a slider and watch the cost of one m³ change. A simple estimate for planning." i={3}
          right={<button className="btn" onClick={() => setW(WHATIF_BASE)} disabled={!changed}><RotateCcw size={13} /> Reset</button>}>
          <div className="whatif">
            <div className="sliders">
              <Slider label="Water recovery" unit="%" value={w.recovery} min={40} max={50} step={0.1} base={WHATIF_BASE.recovery} onChange={(recovery) => setW({ ...w, recovery })} />
              <Slider label="Electricity price" unit="LE/kWh" value={w.tariff} min={1.2} max={3.5} step={0.1} base={WHATIF_BASE.tariff} onChange={(tariff) => setW({ ...w, tariff })} />
              <Slider label="Solar share of power" unit="%" value={w.solar} min={0} max={60} step={1} base={WHATIF_BASE.solar} onChange={(solar) => setW({ ...w, solar })} />
            </div>
            <div className={`result ${diff < -0.005 ? "good" : diff > 0.005 ? "bad" : ""}`}>
              <span><Sparkles size={14} /> New cost of water</span>
              <div className="r-big"><b><CountUp value={model.total} decimals={2} /></b><em>LE/m³</em></div>
              <Chip tone={diff < -0.005 ? "good" : diff > 0.005 ? "warn" : "mute"}>{diff > 0 ? "+" : ""}{diff.toFixed(2)} LE/m³ vs today</Chip>
              <p>{Math.abs(saving) < 0.05 ? "Same as today. Try a slider." : `${saving > 0 ? "Saves" : "Costs"} about ${Math.abs(saving).toFixed(1)} M LE every year`}</p>
              <small>Energy per m³ becomes {FMT2(model.sec)} kWh</small>
            </div>
          </div>
        </Card>

        <Card title="Budget vs actual" sub={tab === "all" ? "LE per m³ by cost type. Pick a cost type for its own view." : `${item!.name}: LE per m³ against its budget`} i={4}>
          <div className="kind-tabs item-tabs" role="tablist" aria-label="Cost type">
            {[{ id: "all", name: "All" }, ...BASE_COST.lines].map((l) => (
              <button key={l.id} role="tab" aria-selected={tab === l.id} className={tab === l.id ? "on" : ""} onClick={() => setTab(l.id)}>
                {l.name.split(" ")[0]}
                {tab === l.id && <motion.i layoutId="bud-pill" className="kind-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              </button>
            ))}
          </div>
          {tab === "all" ? (
            <>
              <Replay className="chart-h" key="all">
                <ResponsiveContainer>
                  <BarChart data={budgetData} margin={{ left: -10, right: 6, top: 8 }} barGap={4}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="name" {...axis} interval={0} tick={{ fontSize: 10.5 }} tickFormatter={(v: string) => v.split(" ")[0]} />
                    <YAxis {...axis} width={34} />
                    <Tooltip content={<Tip unit="LE/m³" />} cursor={{ fill: "rgba(14,143,138,.06)" }} />
                    <Bar dataKey="Budget" fill="#c9d2d4" radius={[6, 6, 0, 0]} animationDuration={900} />
                    <Bar dataKey="Actual" fill={C.teal} radius={[6, 6, 0, 0]} animationDuration={1100} />
                  </BarChart>
                </ResponsiveContainer>
              </Replay>
              <p className="foot-note">Total today {BASE_COST.total.toFixed(1)} LE/m³ against a budget of {BASE_COST.budgetTotal.toFixed(1)}. Total volume this period: {compact(m3)} m³.</p>
            </>
          ) : (
            <>
              <div className="kind-stats">
                <div><span>Budget</span><b><CountUp value={item!.budget} decimals={2} /></b></div>
                <div><span>Actual</span><b><CountUp value={item!.value} decimals={2} /></b></div>
                <div><span>Difference</span><b className={itemDiff <= 0 ? "ok" : "over"}>{itemDiff > 0 ? "+" : ""}<CountUp value={itemPct} decimals={1} />%</b></div>
              </div>
              <Replay className="chart-h sm" key={tab}>
                <ResponsiveContainer>
                  <ComposedChart data={itemData} margin={{ left: -10, right: 6, top: 8 }}>
                    <defs>
                      <linearGradient id="itemG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.aqua} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={C.aqua} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                    <YAxis {...axis} width={36} domain={["auto", "auto"]} />
                    <Tooltip content={<Tip unit="LE/m³" />} cursor={{ stroke: C.teal, strokeOpacity: 0.25 }} />
                    <Area type="monotone" dataKey="actual" name="Actual" stroke={C.teal} strokeWidth={2.4} fill="url(#itemG)" animationDuration={1200} />
                    <Line type="monotone" dataKey="budget" name="Budget" stroke="#9aa9ae" strokeDasharray="5 5" dot={false} strokeWidth={1.8} animationDuration={1200} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Replay>
              <p className="foot-note">{itemDiff <= 0 ? "Under" : "Over"} budget by {Math.abs(itemDiff).toFixed(2)} LE/m³, about {Math.abs(itemAnnual).toFixed(1)} M LE a year at today's volume.</p>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
