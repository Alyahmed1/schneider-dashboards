import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BarChart3, CheckCircle2, Cloud, Coins, Droplet, Droplets, Factory, Flame, FlaskConical, Landmark, Leaf, Recycle, Settings, Sprout, TrendingUp, Truck, Waves, Zap, type LucideIcon } from "lucide-react";
import { MINISTRY_BY_ID, type Go, type MinistryId } from "./data";
import {
  GEN_PCT, NETWORK, NETWORK_SPLIT, OUTPUTS, REUSE, REUSED_PCT, REUSE_TOTAL, SLUDGE_SPLIT, SOURCES, SUPPLY_TOTAL, WATER_SPLIT,
  type Kpi, type Lane, type Output, type Step,
} from "./cycleData";
import Eq from "./Eq";
import { Donut, Semi } from "./gauges";
import Scene from "./Scenes";
import { CountUp } from "./ui";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.05 + i * 0.07, ease } });

type SubTab = "cycle" | "reuse" | "outputs";
const TABS: { id: SubTab; label: string; sub: string; icon: typeof Waves }[] = [
  { id: "cycle", label: "Cycle", sub: "Where the water comes from", icon: Waves },
  { id: "reuse", label: "Reuse", sub: "Wastewater back into use", icon: Recycle },
  { id: "outputs", label: "Outputs", sub: "Fertilizer, irrigation, biogas", icon: Leaf },
];

const cap = (t: string) => t[0] + t.slice(1).toLowerCase();
/* ---------- small building blocks ---------- */
const Tile = ({ k, tone }: { k: Kpi; tone?: string }) => (
  <div className="wc-tile" style={{ ["--tone" as string]: tone }}><em>{k.label}</em><b>{k.value}{k.unit && <small> {k.unit}</small>}</b></div>
);
function Owner({ id, go }: { id: MinistryId; go: Go }) {
  const m = MINISTRY_BY_ID[id];
  return <button className="wc-owner" style={{ ["--c" as string]: m.accent }} onClick={() => go("ministry", id)} title={`Open ${m.name}`}>{m.short}</button>;
}
/** one process step: symbol, name, number tile */
const StepBox = ({ s, tone, hot }: { s: Step; tone: string; hot?: boolean }) => (
  <div className={`wc-step ${hot ? "hot" : ""}`} style={{ ["--tone" as string]: tone }}>
    <div className="wc-sym"><Eq kind={s.sym} /></div>
    <h5>{s.name}</h5>
    <div className="wc-num"><em>{s.tile[0]}</em><b>{s.tile[1]}</b></div>
  </div>
);
const Arrow = ({ tone }: { tone: string }) => (
  <div className="wc-arrow" style={{ ["--tone" as string]: tone }} aria-hidden><i /><i /><i /></div>
);

/** a lane = one stream from start to end, with its share gauge and KPIs on the right */
function LaneRow({ lane, i, go }: { lane: Lane; i: number; go: Go }) {
  return (
    <motion.section className="wc-lane" style={{ ["--tone" as string]: lane.tone }} {...rise(i)}>
      <header><span className="wc-dot" /><h4>{lane.kicker}</h4><i>{lane.title}</i><Owner id={lane.owner} go={go} /></header>
      <div className="wc-lane-body">
        <div className="wc-steps">
          {lane.steps.map((s, n) => (
            <div key={s.sym + n} className="wc-stepwrap">
              <StepBox s={s} tone={lane.tone} />
              {n < lane.steps.length - 1 && <Arrow tone={lane.tone} />}
            </div>
          ))}
        </div>
        <div className="wc-kpis">
          <Semi pct={lane.gauge.pct} tone={lane.tone} label={lane.gauge.label} size={146} />
          <div className="wc-tiles">{lane.kpis.map((k) => <Tile key={k.label} k={k} tone={lane.tone} />)}</div>
        </div>
      </div>
    </motion.section>
  );
}

/** a stacked bar whose parts add up to 100 */
function ShareBar({ title, amount, parts }: { title: string; amount?: string; parts: { label: string; pct: number; color: string }[] }) {
  return (
    <div className="wc-share">
      <span className="wc-share-t">{title} {amount && <u>{amount}</u>} <b>= {parts.reduce((a, p) => a + p.pct, 0)}%</b></span>
      <div className="wc-bar">
        {parts.map((p) => (
          <motion.span key={p.label} style={{ background: p.color }} initial={{ flexGrow: 0 }} animate={{ flexGrow: p.pct }} transition={{ duration: 0.9, ease }}>
            <em>{p.label} {p.pct}%</em>
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/* ---------- the three sub-tabs ---------- */
function CycleTab({ go, next }: { go: Go; next: () => void }) {
  const parts = SOURCES.map((l) => ({ label: cap(l.kicker), pct: l.gauge.pct, color: l.tone }));
  return (
    <>
      <div className="wc-head">
        <div className="wc-title"><h2>Water Cycle</h2><p>Step 1 · where the water comes from, {SUPPLY_TOTAL} M m³/day in total</p></div>
        <ShareBar title="Sources of supply" parts={parts} />
      </div>
      <div className="wc-main wc-cols-cycle">
        <div className="wc-lanes">{SOURCES.map((l, i) => <LaneRow key={l.id} lane={l} i={i} go={go} />)}</div>
        <motion.section className="wc-side" style={{ ["--tone" as string]: "#34d399" }} {...rise(3)}>
          <header><span className="wc-dot" /><h4>NETWORK</h4><i>End of step 1</i><Owner id="mhuuc" go={go} /></header>
          <div className="wc-side-sym"><Eq kind="network" /></div>
          <div className="wc-in"><em>Into the network</em><b><CountUp value={15.5} decimals={1} /> <small>M m³/day</small></b><span>+ {NETWORK.raw} M used raw by farms and industry</span></div>
          <div className="wc-split2">
            <Donut size={112} centre={`${NETWORK_SPLIT[0]}%`} parts={[{ label: "Delivered", pct: NETWORK_SPLIT[0], color: "#34d399" }, { label: "Lost", pct: NETWORK_SPLIT[1], color: "#fb7185" }]} />
            <ul>
              <li><i style={{ background: "#34d399" }} />Delivered <b>{NETWORK_SPLIT[0]}%</b><span>{NETWORK.delivered} M m³/day</span></li>
              <li><i style={{ background: "#fb7185" }} />Lost <b>{NETWORK_SPLIT[1]}%</b><span>{NETWORK.lost} M m³/day</span></li>
            </ul>
          </div>
          <div className="wc-tiles">
            <Tile k={{ label: "Average cost", value: `EGP ${NETWORK.cost}`, unit: "/ m³" }} tone="#34d399" />
            <Tile k={{ label: "People served", value: NETWORK.people }} tone="#34d399" />
            <Tile k={{ label: "Pressure on target", value: NETWORK.pressure }} tone="#34d399" />
            <Tile k={{ label: "Treatment plants", value: "120" }} tone="#34d399" />
          </div>
          <button className="wc-next" onClick={next}>Next: Reuse <ArrowRight size={16} /></button>
        </motion.section>
      </div>
    </>
  );
}

function ReuseTab({ go, next }: { go: Go; next: () => void }) {
  const gen = REUSE.map((l, i) => ({ label: cap(l.kicker), pct: GEN_PCT[i], color: l.tone }));
  const used = REUSE.map((l, i) => ({ label: cap(l.kicker), pct: REUSED_PCT[i], color: l.tone }));
  return (
    <>
      <div className="wc-head">
        <div className="wc-title"><h2>Water Cycle</h2><p>Step 2 · wastewater goes back into use, {REUSE_TOTAL.collected} M m³/day collected</p></div>
        <ShareBar title="Wastewater collected" parts={gen} />
      </div>
      <div className="wc-main wc-cols-cycle">
        <div className="wc-lanes">{REUSE.map((l, i) => <LaneRow key={l.id} lane={l} i={i} go={go} />)}</div>
        <motion.section className="wc-side" style={{ ["--tone" as string]: "#22d3ee" }} {...rise(3)}>
          <header><span className="wc-dot" /><h4>REUSE</h4><i>End of step 2</i></header>
          <Semi pct={REUSE_TOTAL.pct} tone="#22d3ee" label="of wastewater reused" size={176} />
          <div className="wc-in"><em>Reused water</em><b><CountUp value={4.1} decimals={1} /> <small>M m³/day</small></b><span>{REUSE_TOTAL.ofSupply}% of national supply</span></div>
          <div className="wc-split2">
            <Donut size={128} centre="100%" parts={used} />
            <ul>{REUSE.map((l, i) => <li key={l.id}><i style={{ background: l.tone }} />{cap(l.kicker)} <b>{REUSED_PCT[i]}%</b></li>)}</ul>
          </div>
          <div className="wc-tiles">
            <Tile k={{ label: "Treated", value: "8.0", unit: "M m³/day" }} tone="#22d3ee" />
            <Tile k={{ label: "Treatment rate", value: "85", unit: "%" }} tone="#22d3ee" />
            <Tile k={{ label: "Average reuse cost", value: "EGP 1.6", unit: "/ m³" }} tone="#22d3ee" />
            <Tile k={{ label: "Value of reuse", value: "EGP 3.4", unit: "bn/yr" }} tone="#22d3ee" />
          </div>
          <button className="wc-next" onClick={next}>Next: Outputs <ArrowRight size={16} /></button>
        </motion.section>
      </div>
    </>
  );
}

const OUT_ICONS: Record<string, LucideIcon[]> = {
  fert: [Sprout, Coins, FlaskConical, Leaf],
  irr: [TrendingUp, BarChart3, Droplet, Landmark],
  gas: [Leaf, Coins, Settings, Flame],
};
function OutputCol({ o, i, go }: { o: Output; i: number; go: Go }) {
  const icons = OUT_ICONS[o.id];
  return (
    <motion.section className="wc-out" style={{ ["--tone" as string]: o.tone }} {...rise(i)}>
      <header><span className="wc-dot" /><h4>{o.title.toUpperCase()}</h4><Owner id={o.owner} go={go} /></header>
      <div className="wc-scene"><Scene id={o.id} /></div>
      <div className="wc-chips">{o.steps.map((s) => <div key={s.sym + s.name} className="wc-num"><h5>{s.name}</h5><b>{s.tile[1]}</b></div>)}</div>
      <div className="wc-out-gauges">{o.gauges.map((g) => <Semi key={g.label} pct={g.pct} tone={o.tone} label={g.label} size={118} />)}</div>
      <div className="wc-tiles">{o.kpis.map((k, n) => { const Ic = icons[n]; return (
        <div key={k.label} className="wc-itile"><i><Ic size={22} strokeWidth={1.8} /></i><span><em>{k.label}</em><b>{k.value}{k.unit && <small> {k.unit}</small>}</b></span></div>
      ); })}</div>
    </motion.section>
  );
}

const TOP_KPIS: { icon: LucideIcon; label: string; value: string; unit: string; delta: string; down?: boolean; tone: string }[] = [
  { icon: Droplet, label: "Reused Water", value: "4.1", unit: "M m³/day", delta: "+6%", tone: "#22d3ee" },
  { icon: Truck, label: "Sludge", value: "4,200", unit: "t/day", delta: "−2%", down: true, tone: "#a78bfa" },
  { icon: Cloud, label: "CO₂ Avoided", value: "310", unit: "t/day", delta: "+8%", tone: "#34d399" },
  { icon: Zap, label: "Energy Use", value: "0.85", unit: "GWh/day", delta: "−3%", down: true, tone: "#fbbf24" },
];
const REUSE_TREND = [3.2, 3.3, 3.4, 3.4, 3.5, 3.6, 3.7, 3.7, 3.8, 3.9, 4.0, 4.1];

function OutputsTab({ go }: { go: Go }) {
  const water = [{ label: "Irrigation", pct: WATER_SPLIT[0], color: "#4ade80", icon: Sprout }, { label: "Industry", pct: WATER_SPLIT[1], color: "#38bdf8", icon: Factory }];
  const sludge = [{ label: "Biogas", pct: SLUDGE_SPLIT[0], color: "#22d3ee", icon: Flame }, { label: "Fertilizer", pct: SLUDGE_SPLIT[1], color: "#fbbf24", icon: Leaf }];
  const Group = ({ parts }: { parts: typeof water }) => (
    <div className="wc-grp">
      {parts.map((p) => { const Ic = p.icon; return (
        <motion.span key={p.label} style={{ background: p.color }} initial={{ flexGrow: 0 }} animate={{ flexGrow: p.pct }} transition={{ duration: 0.9, ease }}><Ic size={16} /><em>{p.label} {p.pct}%</em></motion.span>
      ); })}
    </div>
  );
  return (
    <>
      <div className="wc-head out">
        <div className="wc-title"><h2>Water Cycle</h2><p>Step 3 · the end of the cycle</p></div>
        {TOP_KPIS.map((k) => { const Ic = k.icon; return (
          <div key={k.label} className="wc-kcard" style={{ ["--tone" as string]: k.tone }}>
            <i><Ic size={26} strokeWidth={1.7} /></i>
            <span><em>{k.label}</em><b>{k.value} <small>{k.unit}</small> <s className={k.down ? "dn" : "up"}>{k.down ? "▼" : "▲"} {k.delta}</s></b></span>
          </div>
        ); })}
        <div className="wc-kcard" style={{ ["--tone" as string]: "#34d399" }}>
          <Donut size={44} centre="" parts={[{ label: "ok", pct: 98, color: "#34d399" }, { label: "rest", pct: 2, color: "transparent" }]} />
          <span><em>System Health</em><b>98%</b></span>
        </div>
      </div>
      <div className="wc-strip">
        <span className="wc-strip-t">Reuse &amp; Resource Recovery <b>each group = 100%</b></span>
        <Group parts={water} /><Group parts={sludge} />
      </div>
      <div className="wc-main wc-cols-out">{OUTPUTS.map((o, i) => <OutputCol key={o.id} o={o} i={i} go={go} />)}</div>
      <div className="wc-bot">
        <motion.div className="wc-bp cov" {...rise(4)}>
          <svg viewBox="0 0 100 100" aria-hidden><path d="M10 20 L58 14 L66 30 L82 20 L76 54 L68 42 L80 88 L36 88 L10 88Z" className="outline" />
            {[[24, 40], [46, 30], [60, 52], [34, 66], [52, 78], [70, 70], [20, 78]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" className="node" style={{ animationDelay: `${i * 0.3}s` }} />)}</svg>
          <span><em>National Coverage</em><b>27 governorates</b></span>
        </motion.div>
        <motion.div className="wc-bp" {...rise(5)}>
          <h6>Operational Status</h6>
          <div className="wc-ok"><CheckCircle2 size={44} strokeWidth={1.6} /><span><b>7 / 7</b><em>Regions Online</em></span></div>
        </motion.div>
        <motion.div className="wc-bp" {...rise(6)}>
          <h6>Water Reuse Trend (M m³/day)</h6>
          <div className="wc-bp-chart"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 300, height: 60 }}>
            <AreaChart data={REUSE_TREND.map((v, i) => ({ v, m: i }))} margin={{ top: 6, right: 6, bottom: 2, left: 6 }}>
              <defs><linearGradient id="rt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity=".5" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" /></linearGradient></defs>
              <YAxis hide domain={[3, 4.3]} />
              <Area type="monotone" dataKey="v" stroke="#22d3ee" strokeWidth={2.4} fill="url(#rt)" dot={{ r: 2.5, fill: "#22d3ee" }} animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer></div>
        </motion.div>
        <motion.div className="wc-bp" {...rise(7)}>
          <h6>Resource Recovery KPIs</h6>
          <ul className="wc-rk">
            {[{ l: "Irrigation", p: WATER_SPLIT[0], c: "#4ade80", I: Sprout }, { l: "Biogas", p: SLUDGE_SPLIT[0], c: "#22d3ee", I: Flame }, { l: "Fertilizer", p: SLUDGE_SPLIT[1], c: "#fbbf24", I: Leaf }].map((r) => (
              <li key={r.l} style={{ ["--c" as string]: r.c }}><r.I size={15} /><span>{r.l}</span><div><motion.i initial={{ width: 0 }} animate={{ width: `${r.p}%` }} transition={{ duration: 1, ease }} /></div><b>{r.p}%</b></li>
            ))}
          </ul>
        </motion.div>
        <motion.div className="wc-bp perf" {...rise(8)}>
          <Donut size={74} centre="" parts={[{ label: "ok", pct: 96, color: "#22d3ee" }, { label: "rest", pct: 4, color: "transparent" }]} />
          <span><em>Overall Performance</em><b>96% <s className="up">▲ +4%</s></b></span>
        </motion.div>
      </div>
    </>
  );
}

export default function Cycle({ go }: { go: Go }) {
  const [tab, setTab] = useState<SubTab>("cycle");
  return (
    <motion.div className="wc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <linearGradient id="wcBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4d44c0" /><stop offset="0.35" stopColor="#3a31a0" /><stop offset="0.7" stopColor="#262070" /><stop offset="1" stopColor="#1a1552" /></linearGradient>
          <linearGradient id="wcTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7466e8" /><stop offset="1" stopColor="#3f35a8" /></linearGradient>
        </defs>
      </svg>
      <AnimatePresence mode="wait">
        <motion.div key={tab} className={`wc-body ${tab === "outputs" ? "out" : ""}`} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.25 }}>
          {tab === "cycle" ? <CycleTab go={go} next={() => setTab("reuse")} /> : tab === "reuse" ? <ReuseTab go={go} next={() => setTab("outputs")} /> : <OutputsTab go={go} />}
        </motion.div>
      </AnimatePresence>
      <nav className="wc-tabs" aria-label="Water cycle steps">
        {TABS.map((t, n) => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}>
              <i>{n + 1}</i><Icon size={19} /><span><b>{t.label}</b><em>{t.sub}</em></span>
            </button>
          );
        })}
        <span className="wc-tabs-note"><Droplets size={14} /> Every split adds up to 100%</span>
      </nav>
    </motion.div>
  );
}
