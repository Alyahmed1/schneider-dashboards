import { useLayoutEffect, useMemo, useRef, useState, type SVGProps } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, Anchor, Building2, Cpu, Filter, Fuel, Gauge, Gauge as Meter, PlugZap, Power, PowerOff, RotateCcw, Send, Sun, X, type LucideIcon } from "lucide-react";
import { compact, rng, type Filters } from "./data";
import { GEN_KW, LOADS, PRODUCT_FLOW, powerSeries, SOLAR_KW } from "./cmms";
import { axis, C, Chip, CountUp, gridProps, popDelay, Replay, rise, Tip, useCount } from "./ui";
import { useTick, wobble } from "./live";
import { PlayPauseIcon } from "./StageView";

type FeederId = "grid" | "pv" | "gen" | "hp" | "intake" | "pre" | "transfer" | "aux";
type Kind = "source" | "xfmr" | "inv" | "load";
interface NodeDef { id: string; feeder: FeederId; kind: Kind; name: string; sub: string; icon: LucideIcon; kv: number; rated: number; pf: number; note: string }

const NODES: NodeDef[] = [
  { id: "grid", feeder: "grid", kind: "source", name: "Utility grid", sub: "132 kV", icon: PlugZap, kv: 132, rated: 40000, pf: 0.96, note: "Main import point. Power is bought at the industrial tariff." },
  { id: "tr1", feeder: "grid", kind: "xfmr", name: "Transformer TR-1", sub: "132 / 11 kV · 50 MVA", icon: Activity, kv: 11, rated: 46500, pf: 0.96, note: "Oil-filled transformer with on-load tap changer. Winding temperature is normal." },
  { id: "pv", feeder: "pv", kind: "source", name: "Solar PV field", sub: "5 MWp", icon: Sun, kv: 0.69, rated: 5000, pf: 1, note: "Roof and ground-mounted panels. Output follows the sun." },
  { id: "inv", feeder: "pv", kind: "inv", name: "PV inverters", sub: "DC → AC · 11 kV step-up", icon: Cpu, kv: 0.69, rated: 5000, pf: 1, note: "String inverters with a step-up transformer to the 11 kV bus." },
  { id: "gen", feeder: "gen", kind: "source", name: "Diesel generator", sub: "2 MVA standby", icon: Fuel, kv: 11, rated: GEN_KW, pf: 0.8, note: "Standby unit for essential loads. Start it to run a test." },
  { id: "hp", feeder: "hp", kind: "load", name: "HP pumps", sub: "3 × motors · 11 kV", icon: Meter, kv: 11, rated: LOADS[0].rated, pf: LOADS[0].pf, note: "The biggest user. Energy recovery devices cut this load by about 38%." },
  { id: "intake", feeder: "intake", kind: "load", name: "Intake pumps", sub: "Sea water lift", icon: Anchor, kv: 11, rated: LOADS[1].rated, pf: LOADS[1].pf, note: "Four pumps, one on standby." },
  { id: "pre", feeder: "pre", kind: "load", name: "Pre-treatment", sub: "Filters · dosing · 0.4 kV", icon: Filter, kv: 0.4, rated: LOADS[2].rated, pf: LOADS[2].pf, note: "Fed through a 11 / 0.4 kV transformer and the low-voltage MCC." },
  { id: "transfer", feeder: "transfer", kind: "load", name: "Transfer pumps", sub: "Booster · network", icon: Send, kv: 11, rated: LOADS[3].rated, pf: LOADS[3].pf, note: "Pushes the drinking water into the network at 6.2 bar." },
  { id: "aux", feeder: "aux", kind: "load", name: "Buildings & aux", sub: "Lighting · HVAC · 0.4 kV", icon: Building2, kv: 0.4, rated: LOADS[4].rated, pf: LOADS[4].pf, note: "Control rooms, workshops, lab and lighting." },
];
const nodeOf = (id: string) => NODES.find((n) => n.id === id)!;
const LOAD_IDS: FeederId[] = ["hp", "intake", "pre", "transfer", "aux"];
const FEEDER_NAME: Record<FeederId, string> = { grid: "Grid incomer", pv: "Solar feeder", gen: "Generator feeder", hp: "HP pump feeder", intake: "Intake feeder", pre: "Pre-treatment feeder", transfer: "Transfer feeder", aux: "Auxiliary feeder" };
const BRK_TAG: Record<FeederId, string> = { grid: "Q1", pv: "Q2", gen: "Q3", hp: "Q4", intake: "Q5", pre: "Q6", transfer: "Q7", aux: "Q8" };
const FLOW_COLOR: Record<string, string> = { grid: C.blue, pv: C.sun, gen: "#8a6bd1", load: C.teal };
const DONUT = [C.teal, C.blue, C.aqua, "#7fa8d6", "#c2cdd0"];
const LOAD_LABEL: Record<string, string> = { hp: "HP pumps", intake: "Intake", pre: "Pre-treatment", transfer: "Transfer", aux: "Buildings" };

interface G { w: number; h: number; mx: number; bw: number; bh: number; lbh: number; y1: number; y2: number; yS: number; yBus: number; yL1: number; yL: number; xg: number; xp: number; xn: number; lx: number[]; f: number }
/** place everything in real pixels so the diagram fills the whole panel */
function layout(w: number, h: number): G {
  const top = 82, bottom = 58, mx = 30;
  const avail = Math.max(300, h - top - bottom);
  const bh = Math.min(98, Math.max(54, avail / 5.1));
  const lbh = bh * 1.08;
  const bw = Math.min(244, Math.max(132, (w - 2 * mx) / 5.9));
  const y1 = top;
  const y2 = y1 + bh * 1.5;
  const yS = y2 + bh * 1.5;
  const yBus = yS + bh * 0.34;
  const yL1 = yBus + bh * 0.34;
  const yL = yL1 + bh * 0.3;
  const step = (w - 2 * mx) / 5;
  return { w, h, mx, bw, bh, lbh, y1, y2, yS, yBus, yL1, yL, xg: w * 0.19, xp: w * 0.5, xn: w * 0.82, lx: LOAD_IDS.map((_, i) => mx + (i + 0.5) * step), f: Math.max(11.5, Math.min(16, bw * 0.068)) };
}


type SymKind = "grid" | "tr" | "gen" | "motor" | "pv" | "inv" | "load";
const SYM: Record<string, SymKind> = { grid: "grid", tr1: "tr", pv: "pv", inv: "inv", gen: "gen", hp: "motor", intake: "motor", transfer: "motor", pre: "load", aux: "load" };
const SYM_NAME: Record<SymKind, string> = { grid: "Utility supply", tr: "Transformer", gen: "Generator", motor: "Motor", pv: "Solar PV", inv: "Inverter", load: "Load" };

/** standard single-line diagram symbols, drawn around (0, 0) */
function Sym({ k, s }: { k: SymKind; s: number }) {
  const r = s / 2;
  const fs = s * 0.46;
  switch (k) {
    case "grid":
      return (<g className="nd-sym"><path d={`M0 ${-r} L${r * 0.32} ${-r * 0.52} L${-r * 0.32} ${-r * 0.12} L0 ${r * 0.3}`} /><path d={`M${-r * 0.4} ${r * 0.08} L0 ${r * 0.72} L${r * 0.4} ${r * 0.08}`} /></g>);
    case "tr":
      return (<g className="nd-sym"><circle cx={-r * 0.36} cy="0" r={r * 0.66} /><circle cx={r * 0.36} cy="0" r={r * 0.66} /></g>);
    case "gen":
      return (<g className="nd-sym"><circle r={r} /><text y={-r * 0.02} textAnchor="middle" fontSize={fs} fontWeight="700">G</text><text y={r * 0.62} textAnchor="middle" fontSize={fs * 0.9}>~</text></g>);
    case "motor":
      return (<g className="nd-sym"><circle r={r} /><text y={r * 0.2} textAnchor="middle" fontSize={fs} fontWeight="700">M</text><text y={r * 0.68} textAnchor="middle" fontSize={fs * 0.55}>3~</text></g>);
    case "pv":
      return (<g className="nd-sym"><rect x={-r} y={-r} width={s} height={s} /><line x1={-r} y1={r} x2={r} y2={-r} /><circle cx={-r * 0.38} cy={-r * 0.38} r={r * 0.2} /><path d={`M${-r * 0.38} ${-r * 0.8} V${-r * 0.7} M${-r * 0.8} ${-r * 0.38} H${-r * 0.7} M${-r * 0.7} ${-r * 0.7} L${-r * 0.62} ${-r * 0.62}`} /></g>);
    case "inv":
      return (<g className="nd-sym"><rect x={-r} y={-r} width={s} height={s} /><line x1={-r} y1={r} x2={r} y2={-r} /><text x={r * 0.45} y={-r * 0.3} textAnchor="middle" fontSize={fs * 0.9}>~</text><text x={-r * 0.45} y={r * 0.62} textAnchor="middle" fontSize={fs * 0.9}>=</text></g>);
    default:
      return (<g className="nd-sym"><path d={`M${-r * 0.7} ${-r * 0.55} H${r * 0.7} L0 ${r * 0.8} Z`} /></g>);
  }
}

/** live number inside the SVG that glides to its new value */
function SvgNum({ v, dec = 0, ...rest }: { v: number; dec?: number } & SVGProps<SVGTextElement>) {
  return <text {...rest}>{useCount(v, dec)}</text>;
}

type Pop = { kind: "node"; id: string } | { kind: "brk"; id: FeederId } | { kind: "kpis" } | null;

/** Electrical: the single-line diagram fills the whole tab, every box and breaker opens its KPIs over the picture */
export default function Electrical({ f }: { f: Filters }) {
  const t = useTick();
  const k = f.area === "All plant" ? 1 : 1 / 3;
  const [open, setOpen] = useState<Partial<Record<FeederId, boolean>>>({ gen: true });
  const [pop, setPop] = useState<Pop>(null);
  const [flowOn, setFlowOn] = useState(true);
  const isOpen = (id: FeederId) => !!open[id];
  const setBreaker = (id: FeederId, v: boolean) => setOpen((o) => ({ ...o, [id]: v }));
  const touched = Object.keys(open).some((id) => (id === "gen" ? !open.gen : open[id as FeederId]));
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1340, h: 520 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const g = useMemo(() => layout(size.w, size.h), [size.w, size.h]);

  // live power for every box
  const p = useMemo(() => {
    const r: Record<string, number> = {};
    LOADS.forEach((l, i) => { r[l.id] = isOpen(l.id as FeederId) ? 0 : wobble(l.kw * k, i + 1, t, 0.012); });
    r.pv = isOpen("pv") ? 0 : wobble(SOLAR_KW * k, 21, t, 0.02);
    r.gen = isOpen("gen") ? 0 : GEN_KW * k;
    const demand = LOADS.reduce((s, l) => s + r[l.id], 0);
    r.demand = demand;
    r.grid = isOpen("grid") ? 0 : Math.max(0, demand - r.pv - r.gen);
    r.short = isOpen("grid") ? Math.max(0, demand - r.pv - r.gen) : 0;
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, t, k]);
  const kwOf = (id: string) => (id === "grid" || id === "tr1" ? p.grid : id === "pv" || id === "inv" ? p.pv : id === "gen" ? p.gen : p[id]);
  const feederKw = (id: FeederId) => (id === "grid" ? p.grid : id === "pv" ? p.pv : id === "gen" ? p.gen : p[id]);
  const live = (feeder: FeederId) => !isOpen(feeder) && (feeder !== "pv" || p.pv > 0);

  const flow = isOpen("hp") ? 0 : wobble(PRODUCT_FLOW * k, 31, t, 0.004);
  const sec = flow > 0 ? p.demand / flow : 0;
  const solarShare = p.demand > 0 ? (p.pv / p.demand) * 100 : 0;
  const pf = wobble(0.93, 41, t, 0.004);
  const openCount = (Object.keys(FEEDER_NAME) as FeederId[]).filter((id) => isOpen(id) && id !== "gen").length;

  const series = useMemo(() => powerSeries(f), [f]);
  const split = LOADS.map((l) => ({ name: LOAD_LABEL[l.id], value: Math.round(p[l.id]) }));
  const splitTotal = split.reduce((s, x) => s + x.value, 0) || 1;

  const dash = (x1: number, y1: number, x2: number, y2: number, feeder: FeederId, color: string, key: string, w = 5) => (
    <g key={key}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="wire" style={{ strokeWidth: w }} />
      {live(feeder) && <line x1={x1} y1={y1} x2={x2} y2={y2} className="wire-flow down" stroke={color} style={{ strokeWidth: w }} />}
    </g>
  );

  /** one box of the diagram */
  // boxes and breakers pop in one after another, with the same timing as the labels on the other tabs
  let seq = 0;
  const nextDelay = () => `${popDelay(seq++)}s`;
  const boxAt = (n: NodeDef, cx: number, y: number, h: number) => {
    const kw = kwOf(n.id);
    const off = isOpen(n.feeder);
    const sk = SYM[n.id];
    const sz = Math.min(g.f * 3.1, h * 0.56);
    return (
      <g key={n.id} className={`sld-in nd nd-${n.kind} ${pop?.kind === "node" && pop.id === n.id ? "sel" : ""} ${off ? "off" : ""}`} style={{ animationDelay: nextDelay() }} transform={`translate(${cx - g.bw / 2} ${y})`}
        onClick={() => setPop({ kind: "node", id: n.id })} role="button" tabIndex={0} aria-label={`${n.name}, ${Math.round(kw)} kilowatts. Press for its KPIs.`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPop({ kind: "node", id: n.id }); } }}>
        <rect width={g.bw} height={h} rx={Math.min(16, h * 0.2)} className="nd-box" />
        <g transform={`translate(${g.bw - sz / 2 - 14} ${sz / 2 + 9})`}><Sym k={sk} s={sz} /></g>
        <text x="14" y={h * 0.3} className="nd-name" style={{ fontSize: g.f }}>{n.name}</text>
        <text x="14" y={h * 0.3 + g.f * 1.25} className="nd-sub" style={{ fontSize: g.f * 0.8 }}>{n.sub}</text>
        <SvgNum v={kw} x="14" y={h - 12} className="nd-val" style={{ fontSize: g.f * 1.35 }} />
        <text x={g.bw - 14} y={h - 12} className="nd-unit" textAnchor="end" style={{ fontSize: g.f * 0.85 }}>kW</text>
      </g>
    );
  };

  /** a breaker on a feeder */
  const brk = (id: FeederId, x: number, y: number) => {
    const o = isOpen(id);
    return (
      <g key={`b-${id}`} className={`sld-in brk ${o ? "open" : "closed"}`} style={{ animationDelay: nextDelay() }} onClick={() => setPop({ kind: "brk", id })} role="button" tabIndex={0} aria-label={`${FEEDER_NAME[id]} breaker ${BRK_TAG[id]}, ${o ? "open" : "closed"}. Press for its KPIs.`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPop({ kind: "brk", id }); } }}>
        <rect x={x - 24} y={y - 20} width="48" height="40" fill="transparent" />
        <rect x={x - 12} y={y - 12} width="24" height="24" rx="5" />
        {o && <line x1={x - 12} y1={y + 12} x2={x + 12} y2={y - 12} />}
        <text x={x + 20} y={y + 4} className="sld-tag" style={{ fontSize: g.f * 0.82 }}>{BRK_TAG[id]}</text>
        <title>{FEEDER_NAME[id]}: {o ? "open" : "closed"}</title>
      </g>
    );
  };

  const sources: { feeder: FeederId; x: number; color: string }[] = [{ feeder: "grid", x: g.xg, color: FLOW_COLOR.grid }, { feeder: "pv", x: g.xp, color: FLOW_COLOR.pv }, { feeder: "gen", x: g.xn, color: FLOW_COLOR.gen }];
  const shown = pop?.kind === "node" ? nodeOf(pop.id) : null;

  return (
    <motion.div className="scene-wrap" {...rise(0)}>
      <div ref={box} className={`scene ${flowOn ? "" : "paused"}`}>
        <svg className="scene-art sld2" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} role="group" aria-label="Single-line diagram of the plant power system">
          {/* main bus */}
          <rect x={g.mx} y={g.yBus - 6} width={g.w - 2 * g.mx} height="12" rx="6" className="bus" />
          <text x={g.mx + 6} y={g.yBus - 14} className="sld-tag" style={{ fontSize: g.f * 0.9 }}>11 kV main bus</text>

          {/* wires: sources down to the bus, then the bus to every load */}
          {sources.map((s) => {
            const topY = s.feeder === "gen" ? g.y2 + g.bh : s.feeder === "grid" || s.feeder === "pv" ? g.y2 + g.bh : 0;
            return (
              <g key={`w-${s.feeder}`}>
                {s.feeder !== "gen" && dash(s.x, g.y1 + g.bh, s.x, g.y2, s.feeder, s.color, `a-${s.feeder}`)}
                {dash(s.x, topY, s.x, g.yBus, s.feeder, s.color, `b-${s.feeder}`)}
              </g>
            );
          })}
          <text x={g.xg + 12} y={g.y1 + g.bh + (g.y2 - g.y1 - g.bh) / 2 + 4} className="sld-tag" style={{ fontSize: g.f * 0.85 }}>132 kV</text>
          <text x={g.xg + 12} y={g.y2 + g.bh + g.bh * 0.24} className="sld-tag" style={{ fontSize: g.f * 0.85 }}>11 kV</text>
          <text x={g.xp + 12} y={g.y1 + g.bh + (g.y2 - g.y1 - g.bh) / 2 + 4} className="sld-tag" style={{ fontSize: g.f * 0.85 }}>0.69 kV DC/AC</text>
          {LOAD_IDS.map((id, i) => {
            const sz = Math.max(3.5, Math.min(8, (p[id] / (LOADS[0].kw * k)) * 6 + 3));
            return dash(g.lx[i], g.yBus, g.lx[i], g.yL, id, FLOW_COLOR.load, `l-${id}`, sz);
          })}

          {/* breakers */}
          {sources.map((s) => brk(s.feeder, s.x, g.yS))}
          {LOAD_IDS.map((id, i) => brk(id, g.lx[i], g.yL1))}

          {/* boxes */}
          {boxAt(nodeOf("grid"), g.xg, g.y1, g.bh)}
          {boxAt(nodeOf("tr1"), g.xg, g.y2, g.bh)}
          {boxAt(nodeOf("pv"), g.xp, g.y1, g.bh)}
          {boxAt(nodeOf("inv"), g.xp, g.y2, g.bh)}
          {boxAt(nodeOf("gen"), g.xn, g.y2, g.bh)}
          {LOAD_IDS.map((id, i) => boxAt(nodeOf(id), g.lx[i], g.yL, g.lbh))}
        </svg>

        <div className="scene-title"><b>Single-line diagram, plant power</b>{p.short > 0 ? <Chip tone="bad">Short by {compact(p.short)} kW</Chip> : <Chip tone={openCount ? "warn" : "good"}>{openCount ? `${openCount} breaker open` : "All feeders on"}</Chip>}</div>
        <div className="scene-tools">
          <button className="scene-btn" onClick={() => setOpen({ gen: true })} disabled={!touched} aria-label="Reset all breakers"><RotateCcw size={16} /> Reset</button>
          <button className="scene-btn" onClick={() => setFlowOn((v) => !v)} aria-pressed={!flowOn} aria-label={flowOn ? "Pause the moving power" : "Play the moving power"}><PlayPauseIcon playing={flowOn} /> {flowOn ? "Pause" : "Play"}</button>
          <button className="kpi-btn" onClick={() => setPop({ kind: "kpis" })}><Gauge size={15} /> KPIs</button>
        </div>
        <div className="flow-legend" aria-hidden>
          <span><i style={{ background: C.blue }} />Grid power</span>
          <span><i style={{ background: C.sun }} />Solar power</span>
          <span><i style={{ background: "#8a6bd1" }} />Generator</span>
          <span><i style={{ background: C.teal }} />To the plant</span>
          <span><b className="sq closed" />Breaker closed</span>
          <span><b className="sq open" />Breaker open</span>
        </div>
        <div className="flow-legend sym-legend" aria-hidden>
          {(["grid", "tr", "gen", "motor", "inv", "pv"] as SymKind[]).map((k) => (
            <span key={k} className="sym-key"><svg width="22" height="22" viewBox="-13 -13 26 26"><Sym k={k} s={18} /></svg>{SYM_NAME[k]}</span>
          ))}
        </div>

        <AnimatePresence>
          {pop && (
            <motion.div className="pop-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPop(null)}>
              <motion.div className={`pop ${pop.kind === "kpis" ? "xwide" : ""}`} role="dialog" aria-modal="true" aria-label={pop.kind === "kpis" ? "Plant power KPIs" : pop.kind === "brk" ? FEEDER_NAME[pop.id] : shown?.name}
                initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} transition={{ type: "spring", stiffness: 360, damping: 30 }}
                onClick={(e) => e.stopPropagation()}>
                <button className="pop-x" onClick={() => setPop(null)} aria-label="Close"><X size={16} /> Close</button>

                {pop.kind === "node" && shown && <NodePop n={shown} kw={kwOf(shown.id)} k={k} off={isOpen(shown.feeder)} set={(v) => setBreaker(shown.feeder, v)} />}

                {pop.kind === "brk" && <BreakerPop id={pop.id} off={isOpen(pop.id)} kw={feederKw(pop.id)} set={(v) => setBreaker(pop.id, v)} />}

                {pop.kind === "kpis" && (
                  <>
                    <div className="pop-head"><div><h3>Plant power KPIs</h3><p>Live totals across every feeder</p></div></div>
                    <div className="pop-rows three">
                      <div><span>Total demand</span><b><CountUp value={p.demand / 1000} decimals={2} /><em> MW</em></b></div>
                      <div><span>Grid import</span><b><CountUp value={p.grid / 1000} decimals={2} /><em> MW</em></b></div>
                      <div><span>Solar share</span><b><CountUp value={solarShare} decimals={1} /><em> %</em></b></div>
                      <div><span>Specific energy</span><b><CountUp value={sec} decimals={2} /><em> kWh/m³</em></b></div>
                      <div><span>Power factor</span><b><CountUp value={pf} decimals={2} /></b></div>
                      <div><span>Breakers open</span><b><CountUp value={openCount} /></b></div>
                    </div>
                    <div className="pop-two">
                      <Replay className="chart-h xs tall">
                        <ResponsiveContainer>
                          <ComposedChart data={series} margin={{ left: -6, right: 6, top: 8 }}>
                            <CartesianGrid {...gridProps} />
                            <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={26} />
                            <YAxis {...axis} width={44} tickCount={4} tickFormatter={(v: number) => compact(v)} />
                            <Tooltip content={<Tip unit="kW" />} cursor={{ stroke: C.teal, strokeOpacity: 0.25 }} />
                            {LOADS.map((l, i) => <Area key={l.id} stackId="p" type="monotone" dataKey={l.id} name={LOAD_LABEL[l.id]} stroke={DONUT[i]} fill={DONUT[i]} fillOpacity={0.78} strokeWidth={1.2} animationDuration={1000} />)}
                            <Line type="monotone" dataKey="solar" name="Solar" stroke={C.sun} strokeWidth={2.4} dot={false} animationDuration={1200} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </Replay>
                      <div className="donut-row small">
                        <Replay className="donut">
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie data={split} dataKey="value" innerRadius="62%" outerRadius="94%" paddingAngle={3} stroke="none" animationDuration={900}>
                                {split.map((_, i) => <Cell key={i} fill={DONUT[i]} />)}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="donut-mid"><b><CountUp value={p.demand / 1000} decimals={1} /></b><span>MW</span></div>
                        </Replay>
                        <ul className="split">
                          {split.map((x, i) => <li key={x.name}><i style={{ background: DONUT[i] }} /><span>{x.name}</span><b><CountUp value={(x.value / splitTotal) * 100} decimals={0} />%</b></li>)}
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** the KPIs of one box of the diagram, with the switch for its breaker */
function NodePop({ n, kw, k, off, set }: { n: NodeDef; kw: number; k: number; off: boolean; set: (open: boolean) => void }) {
  const rated = n.rated * k;
  const amps = kw / (1.732 * n.kv * n.pf);
  const loadPct = rated ? Math.min(100, (kw / rated) * 100) : 0;
  const gen = n.feeder === "gen";
  const trend = useMemo(() => {
    const r = rng(n.id.length * 17 + n.id.charCodeAt(0));
    return Array.from({ length: 24 }, (_, i) => ({ t: `${String(i).padStart(2, "0")}:00`, v: Math.round(n.feeder === "pv" ? SOLAR_KW * k * Math.max(0, Math.sin(((i - 6) / 12) * Math.PI)) : gen ? 0 : rated * 0.8 * (0.93 + r() * 0.14)) }));
  }, [n, rated, k, gen]);
  const status = off ? (gen ? "Standby" : "Breaker open") : gen ? "Running" : "Energised";
  return (
    <>
      <div className="pop-head"><div><h3>{n.name}</h3><p>{n.sub}</p></div><Chip tone={off && !gen ? "warn" : "good"}>{status}</Chip></div>
      <div className="pop-ctl" role="group" aria-label="Breaker">
        <button className={`btn ${!off ? "on" : ""}`} onClick={() => set(false)} aria-pressed={!off}><Power size={13} /> {gen ? "Start" : "Close"}</button>
        <button className={`btn ${off ? "on" : ""}`} onClick={() => set(true)} aria-pressed={off}><PowerOff size={13} /> {gen ? "Stop" : "Open"}</button>
        <span>{gen ? (off ? "Stopped" : "Running") : off ? "Breaker open" : "Breaker closed"}</span>
      </div>
      <div className="pop-big"><b><CountUp value={kw} /></b><span>kW now</span></div>
      <div className="pop-load"><div className="bar big"><i style={{ width: `${loadPct}%`, background: loadPct > 90 ? C.warn : C.teal }} /></div><span>{loadPct.toFixed(0)}% of {compact(rated)} kW</span></div>
      <div className="pop-rows">
        <div><span>Voltage</span><b>{n.kv >= 1 ? n.kv : n.kv * 1000}<em> {n.kv >= 1 ? "kV" : "V"}</em></b></div>
        <div><span>Current</span><b><CountUp value={amps} /><em> A</em></b></div>
        <div><span>Power factor</span><b>{n.pf.toFixed(2)}</b></div>
        <div><span>Breaker</span><b>{off ? "Open" : "Closed"}</b></div>
      </div>
      <Replay className="chart-h xs" key={`tr-${n.id}`}>
        <ResponsiveContainer>
          <AreaChart data={trend} margin={{ left: 0, right: 4, top: 6 }}>
            <defs><linearGradient id="ndG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.teal} stopOpacity={0.35} /><stop offset="100%" stopColor={C.teal} stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="t" {...axis} interval={5} />
            <YAxis {...axis} width={40} tickCount={3} tickFormatter={(v: number) => compact(v)} />
            <Tooltip content={<Tip unit="kW" />} />
            <Area type="monotone" dataKey="v" name="Load" stroke={C.teal} strokeWidth={2} fill="url(#ndG)" animationDuration={900} />
          </AreaChart>
        </ResponsiveContainer>
      </Replay>
      <p className="pop-note">{n.note}</p>
      {off && n.feeder === "hp" && <p className="d-warn"><AlertTriangle size={14} /> Water production has stopped.</p>}
    </>
  );
}

/** the KPIs of one breaker: its state, what it carries, and the switch */
function BreakerPop({ id, off, kw, set }: { id: FeederId; off: boolean; kw: number; set: (open: boolean) => void }) {
  const gen = id === "gen";
  const node = NODES.find((n) => n.feeder === id && n.kind !== "xfmr" && n.kind !== "inv") ?? NODES[0];
  const amps = kw / (1.732 * node.kv * node.pf);
  const ratedA = Math.round((node.rated / (1.732 * node.kv * node.pf)) / 50) * 50 || 100;
  return (
    <>
      <div className="pop-head"><div><h3>{FEEDER_NAME[id]}</h3><p className="mono">{BRK_TAG[id]}</p></div><Chip tone={off && !gen ? "warn" : "good"}>{off ? "Open" : "Closed"}</Chip></div>
      <div className="pop-ctl" role="group" aria-label="Breaker">
        <button className={`btn ${!off ? "on" : ""}`} onClick={() => set(false)} aria-pressed={!off}><Power size={13} /> Close</button>
        <button className={`btn ${off ? "on" : ""}`} onClick={() => set(true)} aria-pressed={off}><PowerOff size={13} /> Open</button>
        <span>{off ? "No power through this feeder" : "Power is flowing"}</span>
      </div>
      <div className="pop-rows">
        <div><span>Feeds</span><b>{node.name}</b></div>
        <div><span>Power through it</span><b><CountUp value={kw} /><em> kW</em></b></div>
        <div><span>Current</span><b><CountUp value={amps} /><em> A</em></b></div>
        <div><span>Rated current</span><b>{ratedA}<em> A</em></b></div>
        <div><span>Last operation</span><b>{off ? "Just now" : "Yesterday 22:14"}</b></div>
        <div><span>Trips this month</span><b>{id === "pre" ? 1 : 0}</b></div>
      </div>
      <p className="pop-note">{off && id === "hp" ? "The HP pumps are off, so water production has stopped." : "Press Open to isolate this feeder. The numbers on the diagram react straight away."}</p>
    </>
  );
}
