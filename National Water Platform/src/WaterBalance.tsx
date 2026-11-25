import { useState } from "react";
import { motion } from "framer-motion";
import { Droplet, Droplets, Factory, Recycle, Scale, Sprout, Trees, Waves, type LucideIcon } from "lucide-react";
import { useSupply } from "./live";
import { split } from "./cycleData";
import { Panel } from "./parts";
import "./pages.css";
import "./balance.css";

/**
 * Water balance (M m³/day). Base numbers are the ones every other page uses: supply 17.5 = sea 7.0 + Nile 10.0 + lakes 0.5 (this page only; lakes are very small),
 * and the same 17.5 goes out as reused 4.1 + returned 5.3 + used up 4.4 + lost 3.7. In and out are tied in tenths, so the check is always 0.0.
 */
type Scenario = "normal" | "drought" | "lownile";
const SCEN: { id: Scenario; label: string; river: number; lakes: number; note: string }[] = [
  { id: "normal", label: "Normal year", river: 1, lakes: 1, note: "All sources at their usual level" },
  { id: "drought", label: "Drought", river: 0.85, lakes: 0.9, note: "The Nile gives 15% less and lakes 10% less" },
  { id: "lownile", label: "Low Nile", river: 0.75, lakes: 1, note: "The Nile gives 25% less (dam release cut)" },
];

/** share an amount (in tenths) over weights so the parts add up exactly */
function splitTenths(total: number, w: number[]): number[] {
  const T = Math.round(total * 10);
  const sum = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (x / sum) * T);
  const out = raw.map(Math.floor);
  let left = T - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f).forEach(({ i }) => { if (left > 0) { out[i] += 1; left -= 1; } });
  return out.map((x) => x / 10);
}
const r1 = (n: number) => Math.round(n * 10) / 10;

interface Item { label: string; v: number; color: string; Icon: LucideIcon }

/** drawing space of the flow picture */
const W = 1400, H = 500, CX = 700, CY = 235, R = 112;
const CARD_W = 300;
const LINE_K = 6; // line width per M m³/day

/** one card: colour bar, symbol, name, amount, share */
function Card({ x, y, h, it, pct }: { x: number; y: number; h: number; it: Item; pct: number }) {
  const c = it.color;
  return (
    <g>
      <rect x={x} y={y} width={CARD_W} height={h} rx="16" className="wbf-card" />
      <rect x={x} y={y + 14} width="5" height={h - 28} rx="2.5" style={{ fill: c }} />
      <rect x={x + 22} y={y + h / 2 - 26} width="52" height="52" rx="14" className="wbf-tile" style={{ stroke: c }} />
      <it.Icon x={x + 22 + 13} y={y + h / 2 - 13} size={26} style={{ color: c }} />
      <text x={x + 92} y={y + h / 2 - 8} className="wbf-name">{it.label}</text>
      <text x={x + 92} y={y + h / 2 + 24} className="wbf-val" style={{ fill: c }}>{it.v.toFixed(1)}<tspan className="wbf-unit"> M m³/day</tspan></text>
      <text x={x + CARD_W - 18} y={y + h / 2 + 24} textAnchor="end" className="wbf-pct">{pct}%</text>
    </g>
  );
}

/** a curved pipe: thick faint body sized by the amount, thin moving dashes on top */
function Pipe({ x1, y1, x2, y2, v, color }: { x1: number; y1: number; x2: number; y2: number; v: number; color: string }) {
  const mx = (x1 + x2) / 2;
  const d = `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
  return (
    <g>
      <path d={d} fill="none" strokeLinecap="round" style={{ stroke: color, strokeWidth: Math.max(v * LINE_K, 4), opacity: 0.28 }} />
      <path d={d} fill="none" strokeLinecap="round" className="wbf-dash" style={{ stroke: color }} />
    </g>
  );
}

/** one long bar split into parts; in and out have the same length when the balance closes */
function Bar({ tag, items, total }: { tag: string; items: Item[]; total: number }) {
  return (
    <div className="wbb-row">
      <span className="wbb-tag">{tag}</span>
      <div className="wbb-bar">
        {items.map((x) => (
          <s key={x.label} style={{ flexGrow: Math.max(x.v, 0.05), background: x.color }} title={`${x.label} ${x.v.toFixed(1)}`}><span>{x.label}</span><b>{x.v.toFixed(1)}</b></s>
        ))}
      </div>
      <span className="wbb-tot">{total.toFixed(1)}</span>
    </div>
  );
}

export default function WaterBalance() {
  const [sc, setSc] = useState<Scenario>("normal");
  const live = useSupply();
  const cfg = SCEN.find((s) => s.id === sc)!;
  // this page: the two big sources are the sea and the Nile, lakes give very little; the three always add up to the live total
  const base = { sea: r1(live.total * (7 / 17.5)), lakes: r1(live.total * (0.5 / 17.5)) };
  const baseRiver = r1(live.total - base.sea - base.lakes);
  const sea = base.sea, river = r1(baseRiver * cfg.river), lakes = r1(base.lakes * cfg.lakes);
  const S = r1(sea + river + lakes);
  const [reuse, back, used, lost] = splitTenths(S, [4.1, 5.3, 4.4, 3.7]);
  const out = r1(reuse + back + used + lost);
  const gap = r1(S - out);
  const demand = r1(live.total); // what the country needs = this year's normal supply
  const short = r1(demand - S);

  const ins: Item[] = [
    { label: "Sea (desalination)", v: sea, color: "var(--ac)", Icon: Waves },
    { label: "Nile (river)", v: river, color: "var(--ac)", Icon: Droplet },
    { label: "Lakes", v: lakes, color: "var(--ac)", Icon: Droplets },
  ];
  const outs: Item[] = [
    { label: "Reused", v: reuse, color: "var(--green)", Icon: Recycle },
    { label: "Returned to nature", v: back, color: "var(--green)", Icon: Trees },
    { label: "Used up by crops", v: used, color: "var(--green)", Icon: Sprout },
    { label: "Lost in networks", v: lost, color: "var(--red)", Icon: Factory },
  ];
  const pin = split(ins.map((x) => x.v)), pout = split(outs.map((x) => x.v));

  // card positions: centred in the drawing
  const inH = 124, inGap = 30, inY0 = (H - (3 * inH + 2 * inGap)) / 2;
  const outH = 98, outGap = 22, outY0 = (H - (4 * outH + 3 * outGap)) / 2;
  const inY = (i: number) => inY0 + i * (inH + inGap), outY = (i: number) => outY0 + i * (outH + outGap);
  // pipes meet the drop at three / four points on its side so they do not pile up
  const edge = (i: number, n: number, side: -1 | 1) => { const a = (i - (n - 1) / 2) * 0.46; return { x: CX + side * R * Math.cos(a), y: CY + R * Math.sin(a) }; };

  return (
    <motion.div className="pg" style={{ gridTemplateRows: "80px 1fr 208px" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <header className="x-hero">
        <div className="x-hero-t"><h2>Water Balance</h2><p>What comes in and where it goes, in M m³/day · {cfg.note}</p></div>
        <div className="x-tools">
          <div className="x-seg" role="group" aria-label="Scenario">
            {SCEN.map((s) => <button key={s.id} className={sc === s.id ? "on" : ""} aria-pressed={sc === s.id} onClick={() => setSc(s.id)}>{s.label}</button>)}
          </div>
        </div>
      </header>

      <Panel icon={Droplets} title="From the sources to every use" hint="the thicker the pipe, the more water" i={0}>
        <svg viewBox={`0 0 ${W} ${H}`} className="wbf-svg" role="img" aria-label="Water balance flow">
          {ins.map((x, i) => { const p = edge(i, 3, -1); return <Pipe key={x.label} x1={CARD_W + 20} y1={inY(i) + inH / 2} x2={p.x} y2={p.y} v={x.v} color={x.color} />; })}
          {outs.map((x, i) => { const p = edge(i, 4, 1); return <Pipe key={x.label} x1={p.x} y1={p.y} x2={W - CARD_W - 20} y2={outY(i) + outH / 2} v={x.v} color={x.color} />; })}

          {ins.map((x, i) => <Card key={x.label} x={20} y={inY(i)} h={inH} it={x} pct={pin[i]} />)}
          {outs.map((x, i) => <Card key={x.label} x={W - CARD_W - 20} y={outY(i)} h={outH} it={x} pct={pout[i]} />)}

          <circle cx={CX} cy={CY} r={R + 14} className="wbf-halo" />
          <circle cx={CX} cy={CY} r={R} className="wbf-core" />
          <Droplet x={CX - 16} y={CY - 78} size={32} style={{ color: "var(--ac)" }} />
          <text x={CX} y={CY + 24} textAnchor="middle" className="wbf-big">{S.toFixed(1)}</text>
          <text x={CX} y={CY + 52} textAnchor="middle" className="wbf-bigu">M m³/day</text>

          {short > 0.05 ? (
            <g>
              <rect x={CX - 150} y={H - 88} width="300" height="44" rx="22" className="wbf-pill bad" />
              <text x={CX} y={H - 59} textAnchor="middle" className="wbf-pilltxt bad">Shortage {short.toFixed(1)} M m³/day</text>
              <text x={CX} y={H - 22} textAnchor="middle" className="wbf-hint">Close it: reuse +0.4 · desalination at 90% +0.2 · smart irrigation +0.3</text>
            </g>
          ) : (
            <g>
              <rect x={CX - 130} y={H - 88} width="260" height="44" rx="22" className="wbf-pill ok" />
              <text x={CX} y={H - 59} textAnchor="middle" className="wbf-pilltxt ok">Demand met</text>
              <text x={CX} y={H - 22} textAnchor="middle" className="wbf-hint">Supply covers the usual {demand.toFixed(1)} M m³/day</text>
            </g>
          )}
        </svg>
      </Panel>

      <Panel icon={Scale} title="In equals out" hint={gap === 0 ? "difference 0.0 · the balance closes" : `difference ${gap.toFixed(1)}`} i={1}>
        <div className="wbb">
          <Bar tag="IN" items={ins} total={S} />
          <Bar tag="OUT" items={outs} total={out} />
          <div className="wbb-key">
            <span><i style={{ background: "var(--ac)" }} />Water that comes in</span>
            <span><i style={{ background: "var(--green)" }} />Water put to use or returned</span>
            <span><i style={{ background: "var(--red)" }} />Water lost</span>
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}
