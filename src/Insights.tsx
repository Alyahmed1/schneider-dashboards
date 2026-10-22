import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ComposedChart, Line, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Award, CheckCircle2, Cloud, Coins, Droplets, FlaskConical, RotateCcw, Sparkles, Star, Sun, Waves, Wrench, X, Zap, type LucideIcon } from "lucide-react";
import { BUCKET, compact, qualityOk, QUALITY, rng, RANGES, RANGE_LABEL, type Filters, type Range } from "./data";
import { ANNUAL_M3, BASE_COST, benchmarks, benchScore, benchTone, CHEMICALS, co2Series, costModel, GOALS, goalProgress, GRID_CO2, itemSeries, MARINE, PRICE, WHATIF_BASE, type Bench, type WhatIf } from "./step3";
import { axis, C, Chip, CountUp, gridProps, Replay, rise, Segmented, Tip, TONE_COLOR } from "./ui";
import { useTick, wobble } from "./live";
import type { Go } from "./App";

const SOLAR_LCOE = 0.9;
const COLORS = [C.teal, C.blue, C.aqua, "#7fa8d6", "#c2cdd0", "#e0b66a"];
const SHORT: Record<string, string> = { sec: "Energy", rec: "Recovery", av: "Availability", cost: "Cost", rej: "Rejection", life: "Membrane life", loss: "Water loss", co2: "CO₂" };
const clamp = (v: number) => Math.max(4, Math.min(100, v));
const gradeOf = (s: number) => (s >= 85 ? "A" : s >= 70 ? "B" : s >= 55 ? "C" : s >= 40 ? "D" : "E");
const co2Of = (m: { sec: number }, solar: number) => m.sec * GRID_CO2 * (1 - solar / 100);
const BASE_CO2 = co2Of(BASE_COST, WHATIF_BASE.solar);

interface Tile {
  id: string; icon: LucideIcon; ac: string; label: string; value: number; dec: number; unit: string; delta: number; goodDown?: boolean;
  goal: string; fill: number; ok: boolean; text: string; about: string; facts: [string, string][]; spark: number[]; badge?: string;
}
type Pop = { k: "tile"; id: string } | { k: "cost"; id: string } | { k: "goals" } | { k: "bench" } | { k: "permit" } | { k: "opp"; id: string } | null;

interface Opp { id: string; icon: LucideIcon; title: string; from: string; to: string; save: number; co2: number; effort: string; why: string; patch?: Partial<WhatIf> }
function whatIfOpp(patch: Partial<WhatIf>) {
  const w = { ...WHATIF_BASE, ...patch };
  const m = costModel(w);
  return { save: ((BASE_COST.total - m.total) * ANNUAL_M3) / 1e6, co2: ((BASE_CO2 - co2Of(m, w.solar)) * ANNUAL_M3) / 1e6 };
}
const BLENDED = WHATIF_BASE.tariff * (1 - WHATIF_BASE.solar / 100) + SOLAR_LCOE * (WHATIF_BASE.solar / 100);
const OPPS: Opp[] = [
  { id: "rec", icon: Droplets, title: "Raise water recovery to 48%", from: "45.2 %", to: "48 %", patch: { recovery: 48 }, ...whatIfOpp({ recovery: 48 }), effort: "Quick win", why: "More of the feed water becomes drinking water, so less sea water is pumped for every m³." },
  { id: "sol", icon: Sun, title: "Grow the solar share to 40%", from: "25.9 %", to: "40 %", patch: { solar: 40 }, ...whatIfOpp({ solar: 40 }), effort: "1 to 2 years", why: "Own solar power is cheaper than grid power and has no CO₂, so both cost and emissions fall." },
  { id: "cip", icon: Wrench, title: "Clean the Train B membranes", from: "ΔP 2.4 bar", to: "1.7 bar", save: (0.04 * BLENDED * ANNUAL_M3) / 1e6, co2: (0.04 * GRID_CO2 * (1 - WHATIF_BASE.solar / 100) * ANNUAL_M3) / 1e6, effort: "WO-2417", why: "Fouled membranes need more pressure. A clean brings the energy per m³ back down." },
];

function Slider({ label, unit, value, min, max, step, base, onChange }: { label: string; unit: string; value: number; min: number; max: number; step: number; base: number; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  const basePct = ((base - min) / (max - min)) * 100;
  return (
    <label className="sl">
      <span className="sl-top"><b>{label}</b><em>{value.toFixed(step < 1 ? 1 : 0)} {unit}</em></span>
      <span className="sl-track">
        <i className="sl-fill" style={{ width: `${pct}%` }} /><i className="sl-thumb" style={{ left: `${pct}%` }} /><i className="sl-base" style={{ left: `${basePct}%` }} title={`Today: ${base}`} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} aria-label={label} />
      </span>
    </label>
  );
}

function Ring({ pct, size = 66, stroke = 7, color, children }: { pct: number; size?: number; stroke?: number; color: string; children: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ins-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span>{children}</span>
    </div>
  );
}

/** where a measure sits between "worse than average" and "best in class" */
const place = (b: Bench, v: number) => {
  const span = Math.abs(b.best - b.avg) * 2;
  const worst = b.lowerBetter ? b.avg + span / 2 : b.avg - span / 2;
  const best = b.lowerBetter ? b.avg - span / 2 : b.avg + span / 2;
  return Math.max(2, Math.min(98, ((v - worst) / (best - worst)) * 100));
};
const VERDICT = { good: "Near best", info: "Better than average", warn: "Below average", bad: "Behind" } as const;

/** Insights: sustainability, benchmarks and the cost of water on one screen; every card opens its details over the picture */
export default function Insights({ f, setRange, go }: { f: Filters; setRange: (r: Range) => void; go: Go }) {
  const t = useTick();
  const [w, setW] = useState<WhatIf>(WHATIF_BASE);
  const [pop, setPop] = useState<Pop>(null);
  const changed = w.recovery !== WHATIF_BASE.recovery || w.tariff !== WHATIF_BASE.tariff || w.solar !== WHATIF_BASE.solar;
  const model = useMemo(() => costModel(w), [w]);
  const rows = useMemo(() => benchmarks(f), [f]);
  const scores = rows.map(benchScore);
  const overall = scores.reduce((s, x) => s + x, 0) / scores.length;
  const grade = gradeOf(overall);
  const ahead = rows.filter((b) => benchScore(b) >= 50).length;
  const gap = [...rows].sort((a, b) => benchScore(a) - benchScore(b))[0];
  const co2 = co2Of(model, w.solar);
  const series = useMemo(() => co2Series(f), [f]);
  const saving = ((BASE_COST.total - model.total) * ANNUAL_M3) / 1e6;
  const diff = model.total - BASE_COST.total;

  const sp = (seed: number, base: number) => { const r = rng(seed); return Array.from({ length: 14 }, () => base * (0.94 + r() * 0.12)); };
  const dpct = (v: number, base: number, fallback: number) => { const d = ((v - base) / base) * 100; return Math.abs(d) < 0.05 ? fallback : +d.toFixed(1); };
  const energy = wobble(model.sec, 1, t, 0.003);
  const cost = wobble(model.total, 2, t, 0.003);
  const budget = BASE_COST.budgetTotal;

  const tiles: Tile[] = [
    { id: "energy", icon: Zap, ac: "#e8a317", label: "Energy per m³", value: energy, dec: 2, unit: "kWh/m³", delta: dpct(energy, BASE_COST.sec, -2.4), goodDown: true, goal: "budget 3.30", fill: clamp((3.3 / energy) * 100), ok: energy <= 3.3,
      text: energy <= 3.3 ? `${(3.3 - energy).toFixed(2)} under budget` : `${(energy - 3.3).toFixed(2)} over budget`, badge: "recovery saves 38%", about: "Energy is the biggest part of what water costs, and the HP pumps use most of it.",
      facts: [["Biggest user", "HP pumps, 58% of power"], ["Saved by energy recovery", "38%, about 6.1 MW"], ["Best in class", "2.8 kWh/m³"]], spark: sp(1, energy) },
    { id: "cost", icon: Coins, ac: "#7a5af0", label: "Cost of 1 m³", value: cost, dec: 1, unit: "LE/m³", delta: dpct(cost, BASE_COST.total, -1.7), goodDown: true, goal: `budget ${budget.toFixed(1)}`, fill: clamp((budget / cost) * 100), ok: cost <= budget,
      text: cost <= budget ? `${(budget - cost).toFixed(1)} LE under budget` : `${(cost - budget).toFixed(1)} LE over budget`, about: "The full cost of one cubic metre: energy, membranes, chemicals, labour, maintenance and capital.",
      facts: [["Selling price", `${PRICE.toFixed(1)} LE/m³`], ["Margin", `${(PRICE - cost).toFixed(1)} LE/m³`], ["Energy share", `${Math.round((model.lines[0].value / model.total) * 100)}% of the cost`]], spark: sp(2, cost) },
    { id: "co2", icon: Cloud, ac: "#5a7a8a", label: "CO₂ per m³", value: co2, dec: 2, unit: "kg/m³", delta: dpct(co2, BASE_CO2, -3.2), goodDown: true, goal: "goal 0.80 by 2028", fill: clamp((0.8 / co2) * 100), ok: co2 <= 0.8,
      text: co2 <= 0.8 ? "Goal reached" : `${(co2 - 0.8).toFixed(2)} above goal`, about: "Emissions come from grid power. Own solar power and lower energy per m³ both bring it down.",
      facts: [["Grid factor", `${GRID_CO2} kg per kWh`], ["Saved by solar", `${(model.sec * GRID_CO2 * (w.solar / 100)).toFixed(2)} kg/m³`], ["Goal", "0.80 kg/m³ by 2028"]], spark: sp(3, co2) },
    { id: "solar", icon: Sun, ac: "#f0b429", label: "Solar share", value: wobble(w.solar, 4, t, 0.004), dec: 1, unit: "%", delta: dpct(w.solar, WHATIF_BASE.solar, 2.1), goal: "goal 40% by 2028", fill: clamp((w.solar / 40) * 100), ok: w.solar >= 40,
      text: w.solar >= 40 ? "Goal reached" : `${(40 - w.solar).toFixed(1)} pts to go`, about: "The share of the plant's power that comes from its own solar field.",
      facts: [["Solar field", "5 MWp, 4.1 MW at peak"], ["Goal", "40% by 2028"], ["Cost of own solar", `${SOLAR_LCOE} LE/kWh`]], spark: sp(4, w.solar) },
    { id: "rec", icon: Droplets, ac: "#0e8f8a", label: "Water recovery", value: wobble(w.recovery, 5, t, 0.002), dec: 1, unit: "%", delta: dpct(w.recovery, WHATIF_BASE.recovery, 0.8), goal: "goal 48% by 2027", fill: clamp((w.recovery / 48) * 100), ok: w.recovery >= 48,
      text: w.recovery >= 48 ? "Goal reached" : `${(48 - w.recovery).toFixed(1)} pts to go`, about: "How much of the feed water becomes drinking water. The rest leaves as brine.",
      facts: [["Brine per m³", `${(100 / w.recovery - 1).toFixed(2)} m³`], ["Best in class", "50%"], ["Salt rejection", "99.7%"]], spark: sp(5, w.recovery) },
    { id: "score", icon: Award, ac: "#1f6fd1", label: "Overall score", value: overall, dec: 0, unit: "/100", delta: 3, goal: "A at 85+", fill: clamp(overall), ok: overall >= 70,
      text: `Grade ${grade}, ahead on ${ahead} of ${rows.length}`, badge: `Grade ${grade}`, about: "How the plant compares with typical large sea-water RO plants. 50 is the industry average, 100 is the best.",
      facts: [["Measures ahead of average", `${ahead} of ${rows.length}`], ["Biggest gap", gap.name], ["Reference", "typical large SWRO plants"]], spark: sp(6, overall) },
  ];

  const goalPct = [goalProgress(GOALS[0]), goalProgress(GOALS[1]), goalProgress(GOALS[2])];
  const radar = rows.map((b, i) => ({ name: SHORT[b.id] ?? b.name, us: Math.round(scores[i]), avg: 50, best: 100 }));
  const marineOk = MARINE.filter(qualityOk).length;
  const chemOk = CHEMICALS.filter((c) => c.use <= c.target).length;
  const waterOk = QUALITY.filter(qualityOk).length;
  const permits: { icon: LucideIcon; label: string; text: string; ok: boolean }[] = [
    { icon: Waves, label: "Sea-water permit", text: `${marineOk} of ${MARINE.length} within limits`, ok: marineOk === MARINE.length },
    { icon: Droplets, label: "Drinking water", text: `${waterOk} of ${QUALITY.length} tests pass`, ok: waterOk === QUALITY.length },
    { icon: FlaskConical, label: "Chemicals", text: `${chemOk} of ${CHEMICALS.length} under target`, ok: chemOk === CHEMICALS.length },
    { icon: Cloud, label: "Brine dilution", text: "38 : 1, minimum 30", ok: true },
  ];

  const tileOf = (id: string) => tiles.find((x) => x.id === id);
  const popTile = pop?.k === "tile" ? tileOf(pop.id) : undefined;
  const popLine = pop?.k === "cost" ? model.lines.find((l) => l.id === pop.id) : undefined;
  const popOpp = pop?.k === "opp" ? OPPS.find((o) => o.id === pop.id) : undefined;

  return (
    <div className="ins-wrap">
      <div className="ins">
        <header className="ins-head">
          <div><h1>Sustainability & Energy Insights</h1></div>
          <div className="filters"><Segmented<Range> label="Time range" value={f.range} options={RANGES} onChange={setRange} /></div>
        </header>

        <div className="ins-tiles">
          {tiles.map((x, i) => {
            const Icon = x.icon;
            const good = x.goodDown ? x.delta <= 0 : x.delta >= 0;
            const Arrow = x.delta >= 0 ? ArrowUpRight : ArrowDownRight;
            const warn = x.fill < 70;
            return (
              <motion.button key={x.id} className={`it ${x.id === "score" ? "it-hero" : ""}`} style={{ ["--ac" as string]: x.ac }} onClick={() => setPop({ k: "tile", id: x.id })} aria-label={`${x.label}, open details`} {...rise(i)}>
                <span className="it-line" aria-hidden />
                <div className="it-head">
                  <span className="it-ico"><Icon size={19} strokeWidth={2} /></span>
                  <b>{x.label}</b>
                  <span className={`delta ${good ? "up" : "down"}`}><Arrow size={12} /><CountUp value={Math.abs(x.delta)} decimals={1} />%</span>
                </div>
                <div className="it-val"><b><CountUp value={x.value} decimals={x.dec} /></b><span>{x.unit}</span>{x.id === "score" && <em className="grade">{grade}</em>}</div>
                <div className="it-bar"><motion.i className={warn ? "off" : ""} initial={{ width: 0 }} animate={{ width: `${x.fill}%` }} transition={{ duration: 0.9, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }} /></div>
                <div className={`it-status ${warn ? "warn" : ""}`}>{x.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}<b>{x.text}</b><em>{x.goal}</em></div>
              </motion.button>
            );
          })}
        </div>

        <div className="ins-mid">
          <motion.section className="card ins-card" {...rise(2)}>
            <header className="ins-ch">
              <div><h3>Cost of 1 m³ and what-if</h3><p>Move a slider, watch the cost</p></div>
              <div className="ins-res">
                <span className={`pill ${diff < -0.005 ? "good" : diff > 0.005 ? "bad" : ""}`}><Sparkles size={13} /> <b><CountUp value={model.total} decimals={2} /></b> LE/m³{changed ? ` · ${saving >= 0 ? "saves" : "costs"} ${Math.abs(saving).toFixed(1)} M LE/yr` : ""}</span>
                {changed && <button className="ins-reset" onClick={() => setW(WHATIF_BASE)} aria-label="Reset the sliders"><RotateCcw size={13} /></button>}
              </div>
            </header>
            <div className="stack" aria-hidden>
              {model.lines.map((l, i) => <motion.i key={l.id} layout animate={{ flexGrow: l.value }} transition={{ type: "spring", stiffness: 160, damping: 22 }} style={{ background: COLORS[i], flexBasis: 0 }} />)}
            </div>
            <div className="ins-lines">
              {model.lines.map((l, i) => (
                <button key={l.id} style={{ ["--c" as string]: COLORS[i] }} onClick={() => setPop({ k: "cost", id: l.id })} aria-label={`${l.name}, budget against actual`}>
                  <span>{l.name.split(" ")[0]}</span><b>{l.value.toFixed(2)}</b>
                </button>
              ))}
            </div>
            <div className="ins-sliders">
              <Slider label="Water recovery" unit="%" value={w.recovery} min={40} max={50} step={0.1} base={WHATIF_BASE.recovery} onChange={(recovery) => setW({ ...w, recovery })} />
              <Slider label="Electricity price" unit="LE/kWh" value={w.tariff} min={1.2} max={3.5} step={0.1} base={WHATIF_BASE.tariff} onChange={(tariff) => setW({ ...w, tariff })} />
              <Slider label="Solar share of power" unit="%" value={w.solar} min={0} max={60} step={1} base={WHATIF_BASE.solar} onChange={(solar) => setW({ ...w, solar })} />
            </div>
          </motion.section>

          <motion.section className="card ins-card" {...rise(3)}>
            <header className="ins-ch"><div><h3>CO₂ and our goals</h3><p>{`Tonnes ${BUCKET[f.range]} · ${RANGE_LABEL[f.range]}`}</p></div>
              <div className="legend"><span><i style={{ background: "#8aa1a8" }} />Grid</span><span><i style={{ background: C.sun }} />Saved by solar</span></div></header>
            <Replay className="ins-chart">
              <ResponsiveContainer>
                <AreaChart data={series} margin={{ left: -8, right: 6, top: 6 }}>
                  <defs>
                    <linearGradient id="insG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8aa1a8" stopOpacity={0.55} /><stop offset="100%" stopColor="#8aa1a8" stopOpacity={0.08} /></linearGradient>
                    <linearGradient id="insS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.sun} stopOpacity={0.65} /><stop offset="100%" stopColor={C.sun} stopOpacity={0.1} /></linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis {...axis} width={40} tickCount={4} tickFormatter={(v: number) => compact(v)} />
                  <Tooltip content={<Tip unit="t" />} cursor={{ stroke: C.teal, strokeOpacity: 0.25 }} />
                  <Area type="monotone" stackId="c" dataKey="grid" name="From grid" stroke="#8aa1a8" strokeWidth={2} fill="url(#insG)" animationDuration={1100} />
                  <Area type="monotone" stackId="c" dataKey="avoided" name="Saved by solar" stroke={C.sun} strokeWidth={2} fill="url(#insS)" animationDuration={1200} />
                </AreaChart>
              </ResponsiveContainer>
            </Replay>
            <button className="ins-goals" onClick={() => setPop({ k: "goals" })} aria-label="Our goals, open details">
              {GOALS.map((g, i) => (
                <div key={g.name}>
                  <Ring pct={goalPct[i]} color={[C.sun, "#5a7a8a", C.teal][i]}><b>{Math.round(goalPct[i])}%</b></Ring>
                  <span>{["Solar share", "CO₂ per m³", "Recovery"][i]}<small>{g.target} {g.unit} by {g.year}</small></span>
                </div>
              ))}
            </button>
          </motion.section>

          <motion.section className="card ins-card" {...rise(4)}>
            <header className="ins-ch"><div><h3>How we compare</h3><p>Biggest gap: <b>{gap.name.toLowerCase()}</b></p></div><button className="link" onClick={() => setPop({ k: "bench" })}>All measures <ArrowRight size={13} /></button></header>
            <div className="ins-bench">
              <Replay className="ins-radar">
                <ResponsiveContainer>
                  <RadarChart data={radar} outerRadius="60%">
                    <PolarGrid stroke="var(--line)" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b8089" }} />
                    <Radar dataKey="best" stroke="none" fill="none" />
                    <Radar dataKey="avg" name="Average" stroke="#b9c4c7" fill="#c2cdd0" fillOpacity={0.35} animationDuration={900} />
                    <Radar dataKey="us" name="Us" stroke={C.teal} strokeWidth={2.2} fill={C.teal} fillOpacity={0.3} animationDuration={1200} />
                  </RadarChart>
                </ResponsiveContainer>
              </Replay>
              <button className="ins-rows" onClick={() => setPop({ k: "bench" })} aria-label="Benchmarks, open the full list">
                {[...rows].sort((a, b) => benchScore(a) - benchScore(b)).map((b) => {
                  const s = benchScore(b);
                  return (
                    <div key={b.id}>
                      <span>{SHORT[b.id]}</span>
                      <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${s}%` }} transition={{ duration: 0.9 }} style={{ background: TONE_COLOR[benchTone(b)] }} /></div>
                      <b>{Math.round(s)}</b>
                    </div>
                  );
                })}
              </button>
            </div>
          </motion.section>
        </div>

        <div className="ins-bot">
          <motion.section className="card ins-card" {...rise(5)}>
            <header className="ins-ch"><div><h3>Top 3 savings opportunities</h3><p>Sample estimates, per year</p></div></header>
            <div className="ins-opps">
              {OPPS.map((o, n) => {
                const Icon = o.icon;
                const share = (o.save / Math.max(...OPPS.map((x) => x.save))) * 100;
                return (
                  <motion.button key={o.id} className="opp" onClick={() => setPop({ k: "opp", id: o.id })} aria-label={`${o.title}, open details`}
                    initial={{ opacity: 0, y: 22, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.25 + n * 0.14, type: "spring", stiffness: 260, damping: 22 }}>
                    <span className="op-rank">{n + 1}</span>
                    <span className="op-ico"><Icon size={20} /></span>
                    <div className="op-t"><b>{o.title}</b><small>{o.from} → {o.to}</small></div>
                    <div className="op-n"><b><CountUp value={o.save} decimals={1} /><em> M LE</em></b><small>−{o.co2.toFixed(1)} kt CO₂</small></div>
                    <span className="op-bar" aria-hidden><motion.i initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={{ duration: 1.2, delay: 0.5 + n * 0.14, ease: [0.22, 1, 0.36, 1] }} /></span>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>

          <motion.section className="card ins-card" {...rise(6)}>
            <header className="ins-ch"><div><h3>Permits and quality</h3><p>Today against the allowed limits</p></div></header>
            <div className="ins-permits">
              {permits.map((p) => {
                const Icon = p.icon;
                return (
                  <button key={p.label} className={p.ok ? "" : "bad"} onClick={() => setPop({ k: "permit" })} aria-label={`${p.label}, open details`}>
                    <Icon size={16} /><span>{p.label}<small>{p.text}</small></span>{!p.ok && <AlertTriangle size={16} />}
                  </button>
                );
              })}
            </div>
          </motion.section>
        </div>
      </div>

      <AnimatePresence>
        {pop && (
          <motion.div className="pop-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPop(null)}>
            <motion.div className={`pop ${pop.k === "bench" || pop.k === "permit" || pop.k === "cost" ? "xwide" : ""}`} role="dialog" aria-modal="true" aria-label="Details"
              initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(e) => e.stopPropagation()}>
              <button className="pop-x" onClick={() => setPop(null)} aria-label="Close"><X size={16} /> Close</button>

              {popTile && (
                <>
                  <div className="pop-head"><div><h3>{popTile.label}</h3><p>{popTile.goal}</p></div><Chip tone={popTile.ok ? "good" : popTile.fill < 70 ? "warn" : "info"}>{popTile.text}</Chip></div>
                  <div className="pop-big"><b><CountUp value={popTile.value} decimals={popTile.dec} /></b><span>{popTile.unit}</span></div>
                  <Replay className="chart-h xs">
                    <ResponsiveContainer>
                      <AreaChart data={popTile.spark.map((v, n) => ({ n, v }))} margin={{ left: -6, right: 6, top: 6 }}>
                        <defs><linearGradient id="tpG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={popTile.ac} stopOpacity={0.4} /><stop offset="100%" stopColor={popTile.ac} stopOpacity={0.02} /></linearGradient></defs>
                        <XAxis dataKey="n" hide />
                        <YAxis {...axis} width={38} domain={["auto", "auto"]} tickCount={3} />
                        <Area type="monotone" dataKey="v" stroke={popTile.ac} strokeWidth={2} fill="url(#tpG)" animationDuration={900} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Replay>
                  <div className="pop-rows three">{popTile.facts.map(([a, b]) => <div key={a}><span>{a}</span><b className="small">{b}</b></div>)}</div>
                  <p className="pop-note">{popTile.about}</p>
                </>
              )}

              {popLine && (
                <>
                  <div className="pop-head"><div><h3>{popLine.name}</h3><p>LE per m³ against its budget</p></div><Chip tone={popLine.value <= popLine.budget ? "good" : "warn"}>{popLine.value <= popLine.budget ? "Under budget" : "Over budget"}</Chip></div>
                  <div className="pop-rows three">
                    <div><span>Budget</span><b><CountUp value={popLine.budget} decimals={2} /></b></div>
                    <div><span>Actual</span><b><CountUp value={popLine.value} decimals={2} /></b></div>
                    <div><span>Difference</span><b className={popLine.value <= popLine.budget ? "ok" : "over"}>{popLine.value > popLine.budget ? "+" : ""}{(((popLine.value - popLine.budget) / popLine.budget) * 100).toFixed(1)}%</b></div>
                  </div>
                  <Replay className="chart-h tall2" key={popLine.id}>
                    <ResponsiveContainer>
                      <ComposedChart data={itemSeries(f, popLine.id)} margin={{ left: -8, right: 6, top: 8 }}>
                        <defs><linearGradient id="lnG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.aqua} stopOpacity={0.4} /><stop offset="100%" stopColor={C.aqua} stopOpacity={0.02} /></linearGradient></defs>
                        <CartesianGrid {...gridProps} />
                        <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={22} />
                        <YAxis {...axis} width={36} domain={["auto", "auto"]} />
                        <Tooltip content={<Tip unit="LE/m³" />} cursor={{ stroke: C.teal, strokeOpacity: 0.25 }} />
                        <Area type="monotone" dataKey="actual" name="Actual" stroke={C.teal} strokeWidth={2.4} fill="url(#lnG)" animationDuration={1000} />
                        <Line type="monotone" dataKey="budget" name="Budget" stroke="#9aa9ae" strokeDasharray="5 5" dot={false} strokeWidth={1.8} animationDuration={1000} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Replay>
                  <p className="pop-note">{popLine.value <= popLine.budget ? "Under" : "Over"} budget by {Math.abs(popLine.value - popLine.budget).toFixed(2)} LE/m³, about {Math.abs(((popLine.value - popLine.budget) * ANNUAL_M3) / 1e6).toFixed(1)} M LE a year at today's volume.</p>
                </>
              )}

              {pop.k === "goals" && (
                <>
                  <div className="pop-head"><div><h3>Our goals</h3><p>Progress from the 2024 starting point</p></div></div>
                  <ul className="pop-goals">
                    {GOALS.map((g, i) => (
                      <li key={g.name}>
                        <Ring pct={goalPct[i]} size={74} stroke={8} color={[C.sun, "#5a7a8a", C.teal][i]}><b>{Math.round(goalPct[i])}%</b></Ring>
                        <div><b>{g.name}</b><span>Now {g.now.toFixed(g.digits)} {g.unit} · goal {g.target} {g.unit} by {g.year}</span><div className="bar big"><i style={{ width: `${goalPct[i]}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.aqua})` }} /></div></div>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {pop.k === "bench" && (
                <>
                  <div className="pop-head"><div><h3>Measure by measure</h3><p>Left is worse, right is better. The dark dot is our plant.</p></div><Chip tone="info">Score {Math.round(overall)} · grade {grade}</Chip></div>
                  <ul className="bench ins-bl">
                    {rows.map((b, n) => {
                      const tone = benchTone(b);
                      return (
                        <motion.li key={b.id} {...rise(n)}>
                          <div className="b-name"><b>{b.name}</b><small>{b.lowerBetter ? "lower is better" : "higher is better"}</small></div>
                          <div className="b-track" role="img" aria-label={`${b.name}: ${b.us.toFixed(b.digits)} ${b.unit}, average ${b.avg}, best ${b.best}`}>
                            <span className="b-zone" style={{ background: "linear-gradient(90deg, #fde6e9, #fbf0c2 50%, #dcf1e4)" }} />
                            <span className="b-mark avg" style={{ left: `${place(b, b.avg)}%` }}><small>{b.avg}</small></span>
                            <span className="b-mark best" style={{ left: `${place(b, b.best)}%` }}><Star size={11} fill="currentColor" /></span>
                            <motion.span className="b-us" initial={{ left: "2%" }} animate={{ left: `${place(b, b.us)}%` }} transition={{ duration: 1.1, delay: n * 0.06, ease: [0.22, 1, 0.36, 1] }} style={{ borderColor: TONE_COLOR[tone === "info" ? "info" : tone] }} />
                          </div>
                          <div className="b-val"><b><CountUp value={b.us} decimals={b.digits} /></b><small>{b.unit}</small></div>
                          <Chip tone={tone === "good" ? "good" : tone === "info" ? "info" : "warn"}>{VERDICT[tone]}</Chip>
                        </motion.li>
                      );
                    })}
                  </ul>
                </>
              )}

              {pop.k === "permit" && (
                <>
                  <div className="pop-head"><div><h3>Permits and quality</h3><p>Sea-water protection and chemicals today</p></div><Chip tone={marineOk === MARINE.length ? "good" : "bad"}>{marineOk === MARINE.length ? "All within permit" : "Check outfall"}</Chip></div>
                  <div className="pop-two2">
                    <ul className="bench qual pop-qual">
                      {MARINE.map((q, n) => {
                        const v = wobble(q.value, n + 11, t, 0.01);
                        const pos = Math.max(2, Math.min(98, ((v - q.min) / (q.max - q.min)) * 100));
                        const ok = qualityOk({ ...q, value: v });
                        const oneSided = q.min === 0;
                        return (
                          <motion.li key={q.name} {...rise(n)}>
                            <div className="b-name"><b>{q.name}</b><small>{oneSided ? `allowed up to ${q.max} ${q.unit}` : `allowed ${q.min} to ${q.max} ${q.unit}`}</small></div>
                            <div className="b-track" role="img" aria-label={`${q.name}: ${v.toFixed(q.digits)} ${q.unit}, ${ok ? "within" : "outside"} the permit`}>
                              <span className="b-zone" style={{ background: oneSided ? "linear-gradient(90deg, #dcf1e4 0%, #dcf1e4 68%, #fbf0c2 88%, #fde6e9 100%)" : "linear-gradient(90deg, #fde6e9, #fbf0c2 16%, #dcf1e4 34%, #dcf1e4 66%, #fbf0c2 84%, #fde6e9)" }} />
                              <span className="q-end l">{q.min}</span>
                              <span className="q-end r">{q.max}</span>
                              <motion.span className="b-us" initial={{ left: "2%" }} animate={{ left: `${pos}%` }} transition={{ duration: 1.1, delay: n * 0.06, ease: [0.22, 1, 0.36, 1] }} style={{ borderColor: ok ? C.good : C.bad }} />
                            </div>
                            <div className="b-val"><b><CountUp value={v} decimals={q.digits} /></b><small>{q.unit}</small></div>
                            <Chip tone={ok ? "good" : "bad"}>{ok ? "Within limit" : "Out of limit"}</Chip>
                          </motion.li>
                        );
                      })}
                    </ul>
                    <ul className="chems">
                      {CHEMICALS.map((c, n) => {
                        const used = wobble(c.use, n + 21, t, 0.01);
                        const over = used > c.target;
                        return (
                          <motion.li key={c.name} {...rise(n)}>
                            <span>{c.name}</span>
                            <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, (used / (c.target * 1.25)) * 100)}%` }} transition={{ duration: 0.9, delay: 0.1 + n * 0.07 }} style={{ background: over ? C.warn : C.teal }} /><s style={{ left: `${(1 / 1.25) * 100}%` }} title={`Target ${c.target}`} /></div>
                            <b><CountUp value={used} decimals={1} /> <em>g</em></b>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              )}

              {popOpp && (
                <>
                  <div className="pop-head"><div><h3>{popOpp.title}</h3><p>{popOpp.from} → {popOpp.to}</p></div><Chip tone="good">{popOpp.effort}</Chip></div>
                  <div className="pop-rows three">
                    <div><span>Saves per year</span><b className="ok">{popOpp.save.toFixed(1)}<em> M LE</em></b></div>
                    <div><span>CO₂ avoided</span><b>{popOpp.co2.toFixed(1)}<em> kt</em></b></div>
                    <div><span>Cost per m³</span><b>−{((popOpp.save * 1e6) / ANNUAL_M3).toFixed(2)}<em> LE</em></b></div>
                  </div>
                  <p className="pop-note">{popOpp.why} The figures are sample estimates from the cost model.</p>
                  <div className="pop-foot">
                    {popOpp.patch
                      ? <button className="btn on" onClick={() => { setW({ ...WHATIF_BASE, ...popOpp.patch }); setPop(null); }}>Try it in the what-if <ArrowRight size={14} /></button>
                      : <button className="btn on" onClick={() => go("maintenance")}>Open work orders <ArrowRight size={14} /></button>}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
