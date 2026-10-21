import { useMemo, useRef, useState, type SVGProps } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, Cell, Line, ComposedChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Power, RotateCcw } from "lucide-react";
import { BUCKET, compact, RANGE_LABEL, rng, type Filters, type Kpi } from "./data";
import { GEN_KW, LOADS, PRODUCT_FLOW, powerSeries, SOLAR_KW } from "./cmms";
import { axis, C, Card, Chip, CountUp, gridProps, KpiCard, Legend, Replay, Tip, useCount } from "./ui";
import { useTick, wobble } from "./live";

type FeederId = "grid" | "pv" | "gen" | "hp" | "intake" | "pre" | "transfer" | "aux";
type Kind = "source" | "xfmr" | "inv" | "load";
interface NodeDef { id: string; feeder: FeederId; kind: Kind; name: string; sub: string; cx: number; y: number; w: number; h: number; kv: number; rated: number; pf: number; note: string }

const NODES: NodeDef[] = [
  { id: "grid", feeder: "grid", kind: "source", name: "Utility grid", sub: "132 kV", cx: 210, y: 12, w: 156, h: 66, kv: 132, rated: 40000, pf: 0.96, note: "Main import point. Power is bought at the industrial tariff." },
  { id: "tr1", feeder: "grid", kind: "xfmr", name: "Transformer TR-1", sub: "132 / 11 kV · 50 MVA", cx: 210, y: 108, w: 156, h: 66, kv: 11, rated: 46500, pf: 0.96, note: "Oil-filled transformer with on-load tap changer. Winding temperature is normal." },
  { id: "pv", feeder: "pv", kind: "source", name: "Solar PV field", sub: "5 MWp", cx: 560, y: 12, w: 156, h: 66, kv: 0.69, rated: 5000, pf: 1, note: "Roof and ground-mounted panels. Output follows the sun." },
  { id: "inv", feeder: "pv", kind: "inv", name: "PV inverters", sub: "DC → AC · 11 kV step-up", cx: 560, y: 108, w: 156, h: 66, kv: 0.69, rated: 5000, pf: 1, note: "String inverters with a step-up transformer to the 11 kV bus." },
  { id: "gen", feeder: "gen", kind: "source", name: "Diesel generator", sub: "2 MVA standby", cx: 790, y: 108, w: 156, h: 66, kv: 11, rated: GEN_KW, pf: 0.8, note: "Standby unit for essential loads. Close its breaker to run a test." },
  { id: "hp", feeder: "hp", kind: "load", name: "HP pumps", sub: "3 × motors · 11 kV", cx: 130, y: 330, w: 156, h: 76, kv: 11, rated: LOADS[0].rated, pf: LOADS[0].pf, note: "The biggest user. Energy recovery devices cut this load by about 38%." },
  { id: "intake", feeder: "intake", kind: "load", name: "Intake pumps", sub: "Sea water lift", cx: 310, y: 330, w: 156, h: 76, kv: 11, rated: LOADS[1].rated, pf: LOADS[1].pf, note: "Four pumps, one on standby." },
  { id: "pre", feeder: "pre", kind: "load", name: "Pre-treatment", sub: "Filters · dosing · 0.4 kV", cx: 490, y: 330, w: 156, h: 76, kv: 0.4, rated: LOADS[2].rated, pf: LOADS[2].pf, note: "Fed through a 11 / 0.4 kV transformer and the low-voltage MCC." },
  { id: "transfer", feeder: "transfer", kind: "load", name: "Transfer pumps", sub: "Booster · network", cx: 670, y: 330, w: 156, h: 76, kv: 11, rated: LOADS[3].rated, pf: LOADS[3].pf, note: "Pushes the drinking water into the network at 6.2 bar." },
  { id: "aux", feeder: "aux", kind: "load", name: "Buildings & aux", sub: "Lighting · HVAC · 0.4 kV", cx: 850, y: 330, w: 156, h: 76, kv: 0.4, rated: LOADS[4].rated, pf: LOADS[4].pf, note: "Control rooms, workshops, lab and lighting." },
];
const BUS_Y = 252;
const FEEDER_NAME: Record<FeederId, string> = { grid: "Grid incomer", pv: "Solar feeder", gen: "Generator feeder", hp: "HP pump feeder", intake: "Intake feeder", pre: "Pre-treatment feeder", transfer: "Transfer feeder", aux: "Auxiliary feeder" };
const FLOW_COLOR: Record<string, string> = { grid: C.blue, pv: C.sun, gen: "#8a6bd1", load: C.teal };
const DONUT = [C.teal, C.blue, C.aqua, "#7fa8d6", "#c2cdd0"];
const LOAD_LABEL: Record<string, string> = { hp: "HP pumps", intake: "Intake", pre: "Pre-treatment", transfer: "Transfer", aux: "Buildings" };

/** live number inside the SVG that glides to its new value */
function SvgNum({ v, dec = 0, ...rest }: { v: number; dec?: number } & SVGProps<SVGTextElement>) {
  return <text {...rest}>{useCount(v, dec)}</text>;
}

export default function Electrical({ f }: { f: Filters }) {
  const t = useTick();
  const k = f.area === "All plant" ? 1 : 1 / 3;
  const [sel, setSel] = useState("hp");
  const [open, setOpen] = useState<Partial<Record<FeederId, boolean>>>({ gen: true });
  const isOpen = (id: FeederId) => !!open[id];
  const toggle = (id: FeederId) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const touched = Object.keys(open).some((id) => (id === "gen" ? !open.gen : open[id as FeederId]));
  const svgBox = useRef<HTMLDivElement>(null);

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
  const flow = isOpen("hp") ? 0 : wobble(PRODUCT_FLOW * k, 31, t, 0.004);
  const sec = flow > 0 ? p.demand / flow : 0;
  const solarShare = p.demand > 0 ? (p.pv / p.demand) * 100 : 0;
  const pf = wobble(0.93, 41, t, 0.004);

  const sp = (seed: number, base: number) => { const r = rng(seed); return Array.from({ length: 14 }, () => base * (0.94 + r() * 0.12)); };
  const kpis: Kpi[] = [
    { id: "dem", label: "Total demand", value: p.demand / 1000, decimals: 2, unit: "MW", delta: -1.2, goodWhenDown: true, note: "all feeders", spark: sp(1, 15) },
    { id: "gri", label: "Grid import", value: p.grid / 1000, decimals: 2, unit: "MW", delta: -3.4, goodWhenDown: true, note: "after solar", spark: sp(2, 11) },
    { id: "sol", label: "Solar share", value: solarShare, decimals: 1, unit: "%", delta: 2.1, note: "of demand", spark: sp(3, 26) },
    { id: "sec", label: "Specific energy", value: sec, decimals: 2, unit: "kWh/m³", delta: -2.4, goodWhenDown: true, note: flow ? "demand ÷ water" : "HP pumps are off", spark: sp(4, 3.2) },
    { id: "pf", label: "Power factor", value: pf, decimals: 2, unit: "", delta: 0.6, note: "target ≥ 0.90", spark: sp(5, 0.93) },
  ];

  const series = useMemo(() => powerSeries(f), [f]);
  const split = LOADS.map((l) => ({ name: LOAD_LABEL[l.id], value: Math.round(p[l.id]) }));
  const splitTotal = split.reduce((s, x) => s + x.value, 0) || 1;

  const node = NODES.find((n) => n.id === sel) ?? NODES[5];
  const nodeKw = node.id === "grid" || node.id === "tr1" ? p.grid : node.id === "pv" || node.id === "inv" ? p.pv : node.id === "gen" ? p.gen : p[node.id];
  const nodeRated = node.rated * k;
  const amps = nodeKw / (1.732 * node.kv * node.pf);
  const trend = useMemo(() => { const r = rng(node.id.length * 17 + node.id.charCodeAt(0)); return Array.from({ length: 24 }, (_, i) => ({ t: `${String(i).padStart(2, "0")}:00`, v: Math.round(node.kind === "source" && node.feeder === "pv" ? SOLAR_KW * k * Math.max(0, Math.sin(((i - 6) / 12) * Math.PI)) : (node.feeder === "gen" ? 0 : (nodeRated * 0.8) * (0.93 + r() * 0.14))) })); }, [node, nodeRated, k]);
  const fOpen = isOpen(node.feeder);
  const status = fOpen ? (node.feeder === "gen" ? "Standby" : "Breaker open") : node.feeder === "gen" ? "Running" : "Energised";
  const loadPct = nodeRated ? Math.min(100, (nodeKw / nodeRated) * 100) : 0;

  const live = (feeder: FeederId) => !isOpen(feeder) && (feeder !== "pv" || p.pv > 0);

  return (
    <>
      <div className="grid g-kpi">
        {kpis.map((x, i) => <KpiCard key={x.id} k={x} i={i} hero={i === 0} />)}
      </div>

      <div className="grid g-21">
        <Card title="Single-line diagram" sub="Click a box for details. Click a breaker to switch it and watch the numbers react." i={1}
          right={
            <div className="sld-tools">
              {p.short > 0 && <Chip tone="bad">Short by {compact(p.short)} kW</Chip>}
              <button className="btn" onClick={() => setOpen({ gen: true })} disabled={!touched}><RotateCcw size={13} /> Reset</button>
            </div>
          }>
          <div className="sld-wrap" ref={svgBox}>
            <svg viewBox="0 0 960 430" className="sld" role="group" aria-label="Single-line diagram of the plant power system">
              <rect x="40" y={BUS_Y - 4} width="880" height="8" rx="4" className="bus" />
              <text x="44" y={BUS_Y - 12} className="sld-tag">11 kV main bus</text>

              {/* wires from the sources down to the bus and from the bus to the loads */}
              {[["grid", 210, 78, BUS_Y], ["pv", 560, 78, BUS_Y], ["gen", 790, 174, BUS_Y]].map(([id, x, y1, y2]) => {
                const on = live(id as FeederId);
                const c = FLOW_COLOR[id as string];
                return (
                  <g key={id as string}>
                    <line x1={x as number} y1={y1 as number} x2={x as number} y2={y2 as number} className="wire" />
                    {on && <line x1={x as number} y1={y1 as number} x2={x as number} y2={y2 as number} className="wire-flow down" stroke={c} />}
                  </g>
                );
              })}
              {NODES.filter((n) => n.kind === "load").map((n) => {
                const on = live(n.feeder);
                const sz = Math.max(2.5, Math.min(6, (p[n.id] / (LOADS[0].kw * k)) * 5 + 2));
                return (
                  <g key={n.id}>
                    <line x1={n.cx} y1={BUS_Y + 4} x2={n.cx} y2={n.y} className="wire" />
                    {on && <line x1={n.cx} y1={BUS_Y + 4} x2={n.cx} y2={n.y} className="wire-flow down" stroke={FLOW_COLOR.load} strokeWidth={sz} />}
                  </g>
                );
              })}

              {/* breakers */}
              {([["grid", 210, 206], ["pv", 560, 206], ["gen", 790, 206], ["hp", 130, 292], ["intake", 310, 292], ["pre", 490, 292], ["transfer", 670, 292], ["aux", 850, 292]] as [FeederId, number, number][]).map(([id, x, y]) => {
                const o = isOpen(id);
                return (
                  <g key={`b-${id}`} className={`brk ${o ? "open" : "closed"}`} onClick={() => toggle(id)} role="button" tabIndex={0} aria-label={`${FEEDER_NAME[id]} breaker, ${o ? "open" : "closed"}. Press to switch.`}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(id); } }}>
                    <rect x={x - 18} y={y - 18} width="36" height="36" fill="transparent" />
                    <rect x={x - 8} y={y - 8} width="16" height="16" rx="3" />
                    {o && <line x1={x - 8} y1={y + 8} x2={x + 8} y2={y - 8} />}
                    <title>{FEEDER_NAME[id]}: {o ? "open (click to close)" : "closed (click to open)"}</title>
                  </g>
                );
              })}

              {/* boxes */}
              {NODES.map((n) => {
                const kw = n.id === "grid" || n.id === "tr1" ? p.grid : n.id === "pv" || n.id === "inv" ? p.pv : n.id === "gen" ? p.gen : p[n.id];
                const off = isOpen(n.feeder);
                return (
                  <g key={n.id} className={`nd nd-${n.kind} ${sel === n.id ? "sel" : ""} ${off ? "off" : ""}`} transform={`translate(${n.cx - n.w / 2} ${n.y})`}
                    onClick={() => setSel(n.id)} role="button" tabIndex={0} aria-label={`${n.name}, ${Math.round(kw)} kilowatts`}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(n.id); } }}>
                    <rect width={n.w} height={n.h} rx="14" className="nd-box" />
                    <text x="14" y="23" className="nd-name">{n.name}</text>
                    <text x="14" y="39" className="nd-sub">{n.sub}</text>
                    <SvgNum v={kw} x="14" y={n.h - 10} className="nd-val" />
                    <text x={n.w - 14} y={n.h - 10} className="nd-unit" textAnchor="end">kW</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="sld-legend">
            <span><i style={{ background: C.blue }} />Grid power</span>
            <span><i style={{ background: C.sun }} />Solar power</span>
            <span><i style={{ background: "#8a6bd1" }} />Generator</span>
            <span><i style={{ background: C.teal }} />To the plant</span>
            <span><b className="sq closed" />Breaker closed</span>
            <span><b className="sq open" />Breaker open</span>
          </div>
        </Card>

        <Card i={2} className="detail-card">
          <AnimatePresence mode="wait">
            <motion.div key={node.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.22 }}>
              <div className="d-head">
                <div><h3>{node.name}</h3><p>{node.sub}</p></div>
                <Chip tone={fOpen && node.feeder !== "gen" ? "warn" : "good"}>{status}</Chip>
              </div>
              <div className="d-big"><b><CountUp value={nodeKw} /></b><span>kW now</span></div>
              <div className="bar big"><i style={{ width: `${loadPct}%`, background: loadPct > 90 ? C.warn : C.teal }} /></div>
              <p className="d-cap">{loadPct.toFixed(0)}% of {compact(nodeRated)} kW rating</p>
              <dl className="d-grid">
                <div><dt>Voltage</dt><dd>{node.kv >= 1 ? `${node.kv} kV` : `${node.kv * 1000} V`}</dd></div>
                <div><dt>Current</dt><dd><CountUp value={amps} /> A</dd></div>
                <div><dt>Power factor</dt><dd>{node.pf.toFixed(2)}</dd></div>
                <div><dt>Breaker</dt><dd>{fOpen ? "Open" : "Closed"}</dd></div>
              </dl>
              <Replay className="chart-h xs" key={`tr-${node.id}`}>
                <ResponsiveContainer>
                  <AreaChart data={trend} margin={{ left: 0, right: 4, top: 6 }}>
                    <defs>
                      <linearGradient id="ndG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.teal} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="t" {...axis} interval={5} />
                    <YAxis {...axis} width={40} tickCount={3} tickFormatter={(v: number) => compact(v)} />
                    <Tooltip content={<Tip unit="kW" />} />
                    <Area type="monotone" dataKey="v" name="Load" stroke={C.teal} strokeWidth={2} fill="url(#ndG)" animationDuration={900} />
                  </AreaChart>
                </ResponsiveContainer>
              </Replay>
              <p className="d-note">{node.note}</p>
              <button className={`btn wide ${fOpen ? "on" : ""}`} onClick={() => toggle(node.feeder)}>
                <Power size={14} /> {node.feeder === "gen" ? (fOpen ? "Stop test run" : "Start generator test") : fOpen ? "Close breaker" : "Open breaker"}
              </button>
              {fOpen && node.feeder === "hp" && <p className="d-warn"><AlertTriangle size={14} /> Water production has stopped.</p>}
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>

      <div className="grid g-21">
        <Card title="Power demand" sub={`kW ${BUCKET[f.range]} · ${RANGE_LABEL[f.range]}`} i={3}
          right={<Legend items={[{ name: "HP pumps", color: DONUT[0] }, { name: "Others", color: DONUT[1] }, { name: "Solar", color: C.sun }]} />}>
          <Replay className="chart-h">
            <ResponsiveContainer>
              <ComposedChart data={series} margin={{ left: -6, right: 6, top: 8 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={46} tickFormatter={(v: number) => compact(v)} />
                <Tooltip content={<Tip unit="kW" />} cursor={{ stroke: C.teal, strokeOpacity: 0.25 }} />
                {LOADS.map((l, i) => <Area key={l.id} stackId="p" type="monotone" dataKey={l.id} name={LOAD_LABEL[l.id]} stroke={DONUT[i]} fill={DONUT[i]} fillOpacity={0.78} strokeWidth={1.2} animationDuration={1200} />)}
                <Line type="monotone" dataKey="solar" name="Solar" stroke={C.sun} strokeWidth={2.4} dot={false} animationDuration={1400} />
              </ComposedChart>
            </ResponsiveContainer>
          </Replay>
        </Card>

        <Card title="Where the power goes" sub="Live share of demand" i={4}>
          <div className="donut-row">
            <Replay className="donut">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={split} dataKey="value" innerRadius="64%" outerRadius="94%" paddingAngle={3} stroke="none" animationDuration={1000}>
                    {split.map((_, i) => <Cell key={i} fill={DONUT[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-mid"><b><CountUp value={p.demand / 1000} decimals={1} /></b><span>MW</span></div>
            </Replay>
            <ul className="split">
              {split.map((x, i) => (
                <li key={x.name}><i style={{ background: DONUT[i] }} /><span>{x.name}</span><b><CountUp value={(x.value / splitTotal) * 100} decimals={0} />%</b></li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </>
  );
}
