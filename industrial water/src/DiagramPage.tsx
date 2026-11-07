import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { ChevronLeft, ChevronRight, MousePointerClick, Play, Square } from "lucide-react";
import { toneOf, type Metric, type PageCfg, type Tone } from "./diagram";
import { C, CountUp } from "./ui";
import { useTick, wobble } from "./live";
import { useStore, type Area as AreaId } from "./store";
import Backdrop from "./Backdrop";
import PhoneFlow from "./PhoneFlow";
import { useNarrow } from "./useNarrow";
import { PAGES } from "./pages";

const ALL_PAGES = Object.values(PAGES);

/** the legend for one page; every page's legend is laid out in the same box, so the diagram never changes size between tabs */
function Legend({ items }: { items: PageCfg["legend"] }) {
  return (
    <>
      {items.map((l) => <span key={l.label}><i className={l.cls} />{l.label}</span>)}
      <span><i className="k-dot good" />Normal</span>
      <span><i className="k-dot warn" />Warning</span>
      <span><i className="k-dot bad" />Alarm</span>
      <span><svg className="lg-ico" viewBox="-12 -12 24 24" aria-hidden><circle className="lg-fill" r={8} /><path d="M0 -5 V5 M-4 -2.500 L4 2.500 M-4 2.500 L4 -2.500" /></svg>Pump</span>
      <span><svg className="lg-ico" viewBox="-12 -12 24 24" aria-hidden><path className="lg-fill" d="M-9 -6 L9 6 V-6 L-9 6 Z" /></svg>Valve</span>
    </>
  );
}

const TONE_LABEL: Record<Tone, string> = { good: "Normal", warn: "Warning", bad: "Alarm" };
const TONE_COLOR: Record<Tone, string> = { good: C.aqua, warn: C.warn, bad: C.bad };

const live = (m: Metric, t: number, i: number) => m.v * wobble(t, m.amp, i + 1);
const fmt = (m: Metric, t: number, i: number) => live(m, t, i).toLocaleString("en-US", { minimumFractionDigits: m.dec, maximumFractionDigits: m.dec });

/** One page for every plant: the diagram is the star, with a scenario switch, a KPI strip and a detail panel around it. Sized to fit one screen. */
export default function DiagramPage({ cfg }: { cfg: PageCfg }) {
  const t = useTick();
  const area = cfg.key as AreaId;
  const { scn: allScn, setScn } = useStore();
  const scn = allScn[area];
  const [sel, setSel] = useState(cfg.start);
  const [mk, setMk] = useState("");
  const [tour, setTour] = useState(false);
  const order = useMemo(() => cfg.equip.map((e) => e.id), [cfg]);

  const all = useMemo(() => Object.fromEntries(order.map((id) => [id, cfg.metrics(id, scn)])) as Record<string, Metric[]>, [cfg, order, scn]);
  const tones = useMemo(() => Object.fromEntries(order.map((id) => [id, toneOf(all[id])])) as Record<string, Tone>, [all, order]);
  const find = (id: string, k: string) => { const i = all[id].findIndex((m) => m.k === k); return { m: all[id][i], i }; };
  const val = (id: string, k: string) => { const { m, i } = find(id, k); return m ? fmt(m, t, i) : "-"; };
  const num = (id: string, k: string) => { const { m, i } = find(id, k); return m ? live(m, t, i) : 0; };
  const tone = (id: string, k: string): Tone => find(id, k).m?.tone ?? "good";

  // "Follow the water": steps through the equipment one by one
  useEffect(() => {
    if (!tour) return;
    const id = window.setInterval(() => {
      setSel((cur) => {
        const n = order.indexOf(cur) + 1;
        if (n >= order.length) { setTour(false); return cur; }
        return order[n];
      });
    }, 4200);
    return () => window.clearInterval(id);
  }, [tour, order]);

  const narrow = useNarrow();
  const pick = (id: string) => { setTour(false); setSel(id); setMk(""); };
  // on a phone the details sit above the flow, so bring them into view when a stage is tapped
  const pickPhone = (id: string) => { pick(id); window.setTimeout(() => document.querySelector(".pd-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); };
  const startTour = () => { setSel(order[0]); setMk(""); setTour(true); };
  const step = (d: number) => { setTour(false); setMk(""); setSel(order[(order.indexOf(sel) + d + order.length) % order.length]); };

  const eq = cfg.equip.find((e) => e.id === sel)!;
  const ms = all[sel];
  const cur = ms.find((m) => m.k === mk) ?? ms[0];
  const curIdx = ms.indexOf(cur);
  const trend = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ i, v: cur.v * wobble(t - (23 - i), Math.max(cur.amp, 0.01) * 1.500, curIdx + 1) })),
    [cur, curIdx, t],
  );
  const alerts = order.filter((id) => tones[id] !== "good").length;
  const kpis = cfg.kpis({ num, tone, alerts, total: order.length });
  const Diagram = cfg.Diagram;

  return (
    <div className="pp">
      <Backdrop src={cfg.bg} />
      <div className="pp-body">
        <div className="pp-head">
          <div className="pp-title">
            <div className="pp-h1"><h1>{cfg.title}</h1><span className="pp-hint"><MousePointerClick size={13} /> Click any equipment</span></div>
            {/* every scenario text of every tab sits in the same cell: the cell is as tall as the longest one, so the header (and the diagram under it) never changes size */}
            <div className="stack">
              {ALL_PAGES.flatMap((p) => p.scenarios.map((sc, i) => {
                const on = p.key === cfg.key && sc.id === scn;
                return on
                  ? <motion.p key={`${p.key}.${sc.id}`} className={`story s${i}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>{sc.story}</motion.p>
                  : <p key={`${p.key}.${sc.id}`} className={`story s${i} ghost`} aria-hidden>{sc.story}</p>;
              }))}
            </div>
          </div>
          <div className="pp-ctl">
            <div className="seg" role="group" aria-label="Scenario">
              {cfg.scenarios.map((s) => <button key={s.id} className={s.id === scn ? "on" : ""} aria-pressed={s.id === scn} onClick={() => setScn(area, s.id)}>{s.label}</button>)}
            </div>
            <button className={`tour-btn ${tour ? "on" : ""}`} onClick={() => (tour ? setTour(false) : startTour())}>
              {tour ? <><Square size={13} /> Stop tour</> : <><Play size={13} /> Follow the water</>}
            </button>
          </div>
        </div>

        <div className="pp-kpis">
          {kpis.map((k) => (
            <div key={k.label} className={`pk ${k.tone}`}>
              <span>{k.icon && <i className="pk-ico"><k.icon size={11} /></i>}{k.label}</span>
              <b><CountUp value={k.v} decimals={k.dec} /> <em>{k.unit}</em></b>
            </div>
          ))}
        </div>

        <div className="pp-grid">
          <div className="card pd-card">
            <div className="pd-scroll">
              {narrow
                ? <PhoneFlow flow={cfg.flow} sel={sel} onSelect={pickPhone} tones={tones} num={num} val={val} lines={(id) => all[id].slice(0, 2).map((m, i) => `${m.label}: ${fmt(m, t, i)} ${m.unit}`.trim())} />
                : <Diagram sel={sel} onSelect={pick} scn={scn} tones={tones} val={val} num={num} />}
            </div>
            <div className="stack pd-legend-stack">
              {ALL_PAGES.map((p) => <div key={p.key} className={`pd-legend ${p.key === cfg.key ? "" : "ghost"}`} aria-hidden={p.key !== cfg.key}><Legend items={p.legend} /></div>)}
            </div>
          </div>

          <motion.aside key={sel} className="card pd-panel" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} aria-live="polite">
            <div className="pn-top">
              <div className="pn-step">
                <button onClick={() => step(-1)} aria-label="Previous equipment"><ChevronLeft size={16} /></button>
                <span>Step {eq.n} of {order.length}</span>
                <button onClick={() => step(1)} aria-label="Next equipment"><ChevronRight size={16} /></button>
              </div>
              <span className={`chip ${tones[sel]}`}>{TONE_LABEL[tones[sel]]}</span>
            </div>
            <div className="pn-text">
              <h3>{eq.name}</h3>
              <p className="pn-what">{eq.what}</p>
              <p className="pn-why"><b>Why it matters.</b> {eq.why}</p>
            </div>

            <ul className="pn-metrics">
              {ms.map((m, i) => (
                <li key={m.k}>
                  <button className={m.k === cur.k ? "on" : ""} onClick={() => { setTour(false); setMk(m.k); }}>
                    <i className={`k-dot ${m.tone}`} />
                    <span>{m.label}</span>
                    <b>{fmt(m, t, i)} <em>{m.unit}</em></b>
                  </button>
                </li>
              ))}
            </ul>

            <div className="pn-trend">
              <div className="pn-trend-h"><span>{cur.label}</span><em>last 48 s</em></div>
              <div className="pn-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="pnTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={TONE_COLOR[cur.tone]} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={TONE_COLOR[cur.tone]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <YAxis hide domain={["dataMin", "dataMax"]} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(cur.dec)} ${cur.unit}`, cur.label]} labelFormatter={() => ""} contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 4, color: "var(--ink)", fontSize: 12 }} />
                    <Area type="monotone" dataKey="v" stroke={TONE_COLOR[cur.tone]} strokeWidth={2} fill="url(#pnTrend)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
