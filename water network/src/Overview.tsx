import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUp, X } from "lucide-react";
import { fmt, QUALITY, stages, zoneRows, type Filters, type Stage } from "./data";
import { StageKpis, PlayPauseIcon } from "./StageView";
import { wobble } from "./live";
import { useGrow } from "./anim";
import { networkAt } from "./network";
import { Basin, Box, Clar, Cyl, Group, Pump, Tube, pt } from "./Iso";
import { BAD, GOOD, MID } from "./mapcolor";
import PlantFlow from "./PlantFlow";
import type { Go } from "./App";

/** the pipes that join the stages, in drawing coordinates: raw river water, treated water, water in the network, water lost */
type Line = { kind: "raw" | "treated" | "product" | "loss"; d: string };
/** a point on the ground of one stage, in drawing coordinates */
const VIEW_H = 690; // height of the drawing; its width follows the box
const SC = 1.25; // how much bigger the 3D drawings are than their raw size
const at = (gx: number, gy: number, x: number, y: number, z = 0) => { const [px, py] = pt(x, y, z); return `${(gx + px * SC).toFixed(1)} ${(gy + py * SC).toFixed(1)}`; };
const seg = (a: string, b: string) => `M${a} L${b}`;
type Pos = readonly [number, number];
type Spots = Record<"source" | "plant" | "ps1" | "res" | "trunk" | "zones" | "meters" | "leak", Pos>;
/** where each stage stands: four across the top, four across the bottom (the water comes back along the bottom); the columns spread out as the box gets wider */
const spots = (W: number, dyA: number, dyB: number): Spots => {
  const sp = Math.max(400, (W - 480) / 3);
  const c = [0, 1, 2, 3].map((i) => W / 2 + (i - 1.5) * sp + 14); // +14: the left edge of the river is wider than the right edge of the labels
  return { source: [c[0], 254 + dyA], plant: [c[1], 206 + dyA], ps1: [c[2], 247 + dyA], res: [c[3], 305 + dyA], trunk: [c[3], 530 + dyB], zones: [c[2], 575 + dyB], meters: [c[1], 554 + dyB], leak: [c[0], 531 + dyB] };
};
const lines = (G: Spots, dyB: number): Line[] => [
  { kind: "raw", d: seg(at(...G.source, 52, 0, 9), at(...G.plant, -100, 0, 9)) },
  { kind: "treated", d: seg(at(...G.plant, 132, 0, 9), at(...G.ps1, -92, 0, 9)) },
  { kind: "product", d: seg(at(...G.ps1, 116, 0, 24), at(...G.res, -22, 0, 8)) },
  { kind: "product", d: seg(at(...G.res, 0, 22, 2), at(...G.trunk, -6, -30, 16)) },
  { kind: "product", d: seg(at(...G.trunk, -96, 6, 9), at(...G.zones, 84, 0, 9)) },
  { kind: "product", d: seg(at(...G.zones, -92, 0, 9), at(...G.meters, 44, 0, 9)) },
  { kind: "product", d: seg(at(...G.meters, -74, 0, 9), at(...G.leak, 98, 0, 10)) },
  { kind: "loss", d: `M${at(...G.zones, 0, 48, 0)} V${668 + dyB} H${G.leak[0]} V${at(...G.leak, 0, 20, 0).split(" ")[1]}` },
];

type State = "run" | "idle" | "alarm";
const STATE = (s?: string): State => (s === "Alarm" ? "alarm" : s === "Standby" ? "idle" : "run");

/** numbers in a reading keep the same decimals and move a little with every live update */
function live(r: { label: string; value: string; unit: string }, seed: number, t: number) {
  const n = parseFloat(r.value.replace(/,/g, ""));
  if (Number.isNaN(n)) return `${r.value}${r.unit ? ` ${r.unit}` : ""}`;
  const d = (r.value.split(".")[1] ?? "").length;
  const w = wobble(n, seed, t, 0.004);
  return `${fmt(r.unit === "%" && n <= 100 ? Math.min(w, 100) : w, d)}${r.unit ? ` ${r.unit}` : ""}`;
}

function DataBox({ x, y, w = 200, rows }: { x: number; y: number; w?: number; rows: [string, string][] }) {
  const h = 14 + rows.length * 19;
  return (
    <g className="iso-box" transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} />
      {rows.map(([label, v], i) => (
        <g key={label} transform={`translate(10 ${22 + i * 19})`}>
          <text className="k">{label}</text>
          <text className="v" x={w - 20} textAnchor="end">{v}</text>
        </g>
      ))}
    </g>
  );
}
function Label({ x, y, text, state = "run" }: { x: number; y: number; text: string; state?: State }) {
  return (
    <g className={`iso-lab ${state}`} transform={`translate(${x} ${y})`}>
      <circle r="4.2" cx="0" cy="-4" />
      <text x="10">{text}</text>
    </g>
  );
}

/** the whole supply chain drawn in 3D-style, with live readings; every stage opens its KPIs */
function PlantView({ f, go, t, flowOn }: { f: Filters; go: Go; t: number; flowOn: boolean }) {
  const list = useMemo(() => stages(f), [f]);
  const grow = useGrow();
  const [open, setOpen] = useState<Stage | null>(null);
  // the drawing is as wide as its box, so it fills the box without being stretched or cropped; the stages stay centred
  const svgRef = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ w: 1660, h: VIEW_H });
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const read = () => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) setBox({ w: r.width, h: r.height }); };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // one even scale for the whole drawing; whatever width or height is left over becomes space between the stages
  const k = Math.min(box.w / 1660, box.h / VIEW_H);
  const W = box.w / k, H = box.h / k;
  const extra = Math.max(0, H - VIEW_H);
  const dyA = extra * 0.2, dyB = extra * 0.8;
  const G = spots(W, dyA, dyB);
  const S = (id: string) => list.find((s) => s.id === id)!;
  const tone = (s: Stage) => (s.tone === "bad" ? "alarm" : s.tone === "warn" ? "warn" : "run");
  const goStage = (s: Stage) => () => setOpen(s);
  const rows = (s: Stage, seed: number): [string, string][] => s.readings.slice(0, 2).map((r, i) => [r.label, live(r, seed + i, t)]);
  const eq = (s: Stage, i: number) => STATE(s.equipment[i]?.state);
  const head = (n: number, s: Stage, x: number, y: number) => (
    <g className={`iso-head ${tone(s)}`} transform={`translate(${x} ${y})`} onClick={() => setOpen(s)} role="button" tabIndex={0} aria-label={`${s.name}, open its KPIs`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(s); } }}>
      <circle r="5" cx="0" cy="-5" />
      <text x="13">{n} · {s.name}</text>
      <text className="flow" x="13" y="19">{fmt(wobble(s.flow, n, t, 0.004))} {s.unit}</text>
    </g>
  );
  const source = S("source"), plant = S("plant"), ps1 = S("ps1"), res = S("res"), trunk = S("trunk"), zones = S("zones"), meters = S("meters"), leak = S("leak");
  const zr = zoneRows(f);
  const snap = networkAt(8);

  const q = (name: string) => QUALITY.find((x) => x.name === name)!;
  const rings = [
    { n: "Free chlorine", v: wobble(q("Free chlorine").value, 51, t, 0.01), unit: "mg/L", d: 2, frac: (v: number) => v },
    { n: "Turbidity", v: wobble(q("Turbidity").value, 52, t, 0.02), unit: "NTU", d: 1, frac: (v: number) => v },
    { n: "pH", v: wobble(q("pH").value, 53, t, 0.006), unit: "pH", d: 1, frac: (v: number) => (v - 6) / 3 },
    { n: "Average pressure", v: wobble(Object.values(snap.zones).reduce((a, z) => a + z.pressure, 0) / 6, 54, t, 0.01), unit: "bar", d: 1, frac: (v: number) => v / 7 },
  ];
  const src = source;
  const ZCOL = { good: GOOD, warn: MID, bad: BAD, info: GOOD } as const;

  return (
    <div className="ov">
      <section className="ov-art">
        <div className="ov-scroll">
          <svg ref={svgRef} className={`ov-svg ${flowOn ? "" : "paused"}`} viewBox={`0 60 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="The whole water supply chain, from the river to the customers">
            <defs>
              <linearGradient id="iso-gw" x1="0" x2="1"><stop offset="0" stopColor="#f4f8fc" /><stop offset=".45" stopColor="#d3e1ee" /><stop offset="1" stopColor="#9db6cc" /></linearGradient>
              <linearGradient id="iso-gb" x1="0" x2="1"><stop offset="0" stopColor="#6db4ee" /><stop offset=".5" stopColor="#3a86c8" /><stop offset="1" stopColor="#265f93" /></linearGradient>
              <linearGradient id="iso-gp" x1="0" x2="1"><stop offset="0" stopColor="#b08af0" /><stop offset=".5" stopColor="#7d57cc" /><stop offset="1" stopColor="#54379a" /></linearGradient>
            </defs>
            {lines(G, dyB).map((l, i) => (
              <g key={i} className="ov-pg" style={{ ["--i" as string]: i }}>
                <path className={`ov-pipe ${l.kind}`} d={l.d} />
                <path className={`ov-flow ${l.kind}`} d={l.d} />
              </g>
            ))}

            {/* 1 · river and intake: the river, the intake house and three raw pumps */}
            <g className="ov-st" style={{ ["--i" as string]: 0 }}>
              <Group s={SC} x={G.source[0]} y={G.source[1]} onClick={goStage(source)} label="River intake">
                <Box x={-150} y={-40} w={90} d={92} h={5} pal="s" />
                <Box x={-130} y={-30} z={5} w={50} d={70} h={2} pal="s" />
                <Box x={-42} y={-30} w={46} d={64} h={26} pal="c" />
                {[0, 1, 2].map((i) => <Pump key={i} x={18} y={-38 + i * 30} />)}
              </Group>
              {head(1, source, G.source[0] - 130, 100 + dyA)}
              <Label x={G.source[0] + 56} y={G.source[1] + 70} text="Raw water pumps (3)" state={eq(source, 0)} />
              <text className="iso-note" x={G.source[0] - 170} y={G.source[1] + 52} textAnchor="start">River</text>
              <DataBox x={G.source[0] - 130} y={336 + dyA} rows={rows(source, 1)} />
            </g>

            {/* 2 · treatment plant: two settling tanks, three filters, chlorine */}
            <g className="ov-st" style={{ ["--i" as string]: 1 }}>
              <Group s={SC} x={G.plant[0]} y={G.plant[1]} onClick={goStage(plant)} label="Treatment plant">
                {[-36, 36].map((cy, i) => <Clar key={cy} cx={-58} cy={cy} r={26} tone="m" delay={i * 5} />)}
                {[-46, -8, 30].map((y, i) => <Basin key={y} x={0} y={y} w={84} d={30} h={12} tone="t" bubbles={i === 1 ? 5 : 0} seed={i} />)}
                <Cyl cx={118} cy={-4} r={13} h={34} pal="p" />
              </Group>
              {head(2, plant, G.plant[0] - 130, 100 + dyA)}
              <Label x={G.plant[0] + 190} y={G.plant[1] - 60} text="Settling tanks" state={eq(plant, 0)} />
              <Label x={G.plant[0] + 190} y={G.plant[1] - 38} text="Sand filters" state={eq(plant, 2)} />
              <Label x={G.plant[0] + 190} y={G.plant[1] - 16} text="Chlorinator" state={eq(plant, 3)} />
              <DataBox x={G.plant[0] - 130} y={336 + dyA} rows={rows(plant, 3)} />
            </g>

            {/* 3 · pump station PS-1: clear-water tank and the high-lift pumps */}
            <g className="ov-st" style={{ ["--i" as string]: 2 }}>
              <Group s={SC} x={G.ps1[0]} y={G.ps1[1]} onClick={goStage(ps1)} label="Pump station PS-1">
                <Cyl cx={-50} cy={0} r={40} h={36} pal="b" water wt="t" />
                <Box x={20} y={-48} w={92} d={96} h={16} pal="c" />
                {[0, 1, 2, 3].map((i) => <Pump key={i} x={44} y={-42 + i * 22} z={16} />)}
              </Group>
              {head(3, ps1, G.ps1[0] - 130, 100 + dyA)}
              <Label x={G.ps1[0] + 200} y={G.ps1[1] - 70} text="High-lift pump 1" state={eq(ps1, 0)} />
              <Label x={G.ps1[0] + 200} y={G.ps1[1] - 48} text="High-lift pump 2" state={eq(ps1, 1)} />
              <Label x={G.ps1[0] + 200} y={G.ps1[1] - 26} text="High-lift pump 3" state={eq(ps1, 2)} />
              <Label x={G.ps1[0] + 200} y={G.ps1[1] - 4} text="Pump 4 (standby)" state={eq(ps1, 3)} />
              <DataBox x={G.ps1[0] - 130} y={336 + dyA} rows={rows(ps1, 5)} />
            </g>

            {/* 4 · the elevated reservoir */}
            <g className="ov-st" style={{ ["--i" as string]: 3 }}>
              <Group s={SC} x={G.res[0]} y={G.res[1]} onClick={goStage(res)} label="Elevated reservoir">
                {[[-16, -16], [16, -16], [-16, 16], [16, 16]].map(([x, y]) => <Box key={`${x}${y}`} x={x - 3} y={y - 3} w={6} d={6} h={78} pal="g" />)}
                <Cyl cx={0} cy={0} z={78} r={42} h={38} pal="w" water wt="t" />
                <Cyl cx={0} cy={0} z={116} r={26} h={9} pal="b" />
              </Group>
              {head(4, res, G.res[0] - 130, 100 + dyA)}
              <Label x={G.res[0] + 92} y={G.res[1] - 120} text="Level sensor" state={eq(res, 2)} />
              <DataBox x={G.res[0] - 130} y={336 + dyA} w={220} rows={rows(res, 7)} />
            </g>

            {/* 5 · trunk mains and the booster station */}
            <g className="ov-st" style={{ ["--i" as string]: 4 }}>
              <Group s={SC} x={G.trunk[0]} y={G.trunk[1]} onClick={goStage(trunk)} label="Trunk mains and booster station">
                <Box x={-40} y={-28} w={52} d={56} h={14} pal="g" />
                <Box x={-40} y={-28} z={14} w={52} d={56} h={3} pal="p" />
                {[0, 1].map((i) => <Pump key={i} x={26} y={-30 + i * 32} />)}
                <Box x={-96} y={-8} w={24} d={22} h={18} pal="p" />
              </Group>
              {head(5, trunk, G.trunk[0] - 130, 428 + dyB)}
              <Label x={G.trunk[0] - 170} y={G.trunk[1] - 30} text="PRV" state={eq(trunk, 2)} />
              <Label x={G.trunk[0] + 112} y={G.trunk[1] - 12} text="Booster 1" state={eq(trunk, 0)} />
              <Label x={G.trunk[0] + 112} y={G.trunk[1] + 12} text="Booster 2" state={eq(trunk, 1)} />
              <DataBox x={G.trunk[0] - 130} y={682 + dyB} w={220} rows={rows(trunk, 9)} />
            </g>

            {/* 6 · the six supply zones, each block marked green, amber or red */}
            <g className="ov-st" style={{ ["--i" as string]: 5 }}>
              <Group s={SC} x={G.zones[0]} y={G.zones[1]} onClick={goStage(zones)} label="Supply zones">
                {[0, 1].map((row) => [0, 1, 2].map((col) => (
                  <g key={`${row}${col}`}>
                    <Box x={-90 + col * 62} y={-52 + row * 54} w={46} d={36} h={20} pal="c" />
                    <Box x={-84 + col * 62} y={-46 + row * 54} z={20} w={34} d={24} h={4} pal="g" />
                  </g>
                )))}
              </Group>
              {zr.map((z, i) => {
                const col = Math.floor(i / 2), row = i % 2;
                const [sx, sy] = pt(-67 + col * 62, -34 + row * 54, 30);
                return <circle key={z.name} className="iso-zdot" cx={G.zones[0] + sx * SC} cy={G.zones[1] + sy * SC - 8} r="8" fill={ZCOL[z.tone]} />;
              })}
              {head(6, zones, G.zones[0] - 130, 428 + dyB)}
              <DataBox x={G.zones[0] - 130} y={682 + dyB} w={220} rows={rows(zones, 11)} />
            </g>

            {/* 7 · customer metering: houses with smart meters and a radio gateway */}
            <g className="ov-st" style={{ ["--i" as string]: 6 }}>
              <Group s={SC} x={G.meters[0]} y={G.meters[1]} onClick={goStage(meters)} label="Customer metering">
                {[0, 1, 2].map((i) => (
                  <g key={i}>
                    <Box x={-70 + i * 40} y={-34} w={28} d={28} h={20} pal="c" />
                    <Box x={-66 + i * 40} y={-30} z={20} w={20} d={20} h={7} pal="g" />
                    <Box x={-70 + i * 40} y={14} w={28} d={28} h={20} pal="c" />
                    <Box x={-66 + i * 40} y={18} z={20} w={20} d={20} h={7} pal="g" />
                  </g>
                ))}
                <Box x={72} y={-8} w={8} d={8} h={64} pal="g" />
                <Box x={68} y={-12} z={64} w={16} d={16} h={8} pal="b" />
              </Group>
              {[0, 1, 2].map((k) => { const [wx, wy] = pt(76, -4, 76); return <path key={k} className="iso-wave" d={`M${G.meters[0] + wx * SC} ${G.meters[1] + wy * SC - k * 10} q15 -9 30 0 M${G.meters[0] + wx * SC} ${G.meters[1] + wy * SC - k * 10} q-15 -9 -30 0`} />; })}
              {head(7, meters, G.meters[0] - 130, 428 + dyB)}
              <Label x={G.meters[0] + 118} y={G.meters[1] - 52} text="Radio gateway" state={eq(meters, 0)} />
              <DataBox x={G.meters[0] - 130} y={682 + dyB} w={220} rows={rows(meters, 13)} />
            </g>

            {/* 8 · leaks and losses: a main with a burst, loggers and a repair crew */}
            <g className="ov-st" style={{ ["--i" as string]: 7 }}>
              <Group s={SC} x={G.leak[0]} y={G.leak[1]} onClick={goStage(leak)} label="Leak and loss control">
                <Box x={-100} y={-20} w={200} d={40} h={3} pal="e" />
                <Tube a={pt(-96, 0, 10)} b={pt(96, 0, 10)} r={7} pal="b" />
                <ellipse className="iso-water t" cx={pt(-10, 16, 4)[0]} cy={pt(-10, 16, 4)[1]} rx="30" ry="10" />
                {[-10, 0, 10].map((o, i) => <circle key={i} className="iso-bub" cx={pt(-10, 0, 16)[0] + o} cy={pt(-10, 0, 16)[1] - 6 - i * 4} r="2.6" style={{ ["--d" as string]: `${i * 0.4}s` }} />)}
                {[-60, 50].map((x) => <Cyl key={x} cx={x} cy={0} z={10} r={5} h={14} pal="p" />)}
                <Box x={60} y={26} w={40} d={20} h={14} pal="w" />
              </Group>
              {head(8, leak, G.leak[0] - 130, 428 + dyB)}
              <Label x={G.leak[0] + 150} y={G.leak[1] - 62} text="Leak loggers" state={eq(leak, 0)} />
              <Label x={G.leak[0] + 150} y={G.leak[1] - 40} text="Repair crew" state={eq(leak, 3)} />
              <DataBox x={G.leak[0] - 130} y={682 + dyB} w={220} rows={rows(leak, 15)} />
            </g>
          </svg>
        </div>
      </section>

      <section className="ov-gauges">
        <div className="ov-g wide">
          <h3>Source</h3>
          <div className="ov-gr"><span>{src.readings[0].label}</span><b>{live(src.readings[0], 61, t)}<ArrowUp size={15} className="up" /></b></div>
          <div className="ov-gr"><span>{src.readings[2].label}</span><b>{live(src.readings[2], 62, t)}<ArrowUp size={15} className="up" /></b></div>
        </div>
        {rings.map((r, n) => {
          const C = 2 * Math.PI * 44;
          const fr = Math.max(0.03, Math.min(1, r.frac(r.v)));
          return (
            <div className="ov-g" key={r.n} style={{ ["--n" as string]: n }}>
              <h3>{r.n}</h3>
              <div className="ov-ring">
                <svg viewBox="0 0 120 120" aria-hidden>
                  <circle className="bg" cx="60" cy="60" r="44" />
                  <circle className="fg" cx="60" cy="60" r="44" strokeDasharray={`${grow ? C * fr : 0} ${C}`} transform="rotate(-90 60 60)" />
                </svg>
                <div><b>{fmt(r.v, r.d)}</b><span>{r.unit}</span></div>
              </div>
            </div>
          );
        })}
      </section>

      <AnimatePresence>
        {open && (
          <motion.div className="pop-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div className="pop wide" role="dialog" aria-modal="true" aria-label="Stage KPIs"
              initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(e) => e.stopPropagation()}>
              <button className="pop-x" onClick={() => setOpen(null)} aria-label="Close"><X size={16} /> Close</button>
              <StageKpis stage={open} t={t} seed={open.id.length * 31}>
                <div className="pop-foot">
                  <button className="btn on" onClick={() => go("production", open.id)}>Open in Production <ArrowRight size={14} /></button>
                </div>
              </StageKpis>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type Sub = "overview" | "operations";
const SUBS: [Sub, string][] = [["overview", "Overview"], ["operations", "Operations"]];

/** the Overview tab has two views: the whole supply chain drawn in 3D-style, and the detailed Operations process with every tag */
export default function Overview({ f, go, t }: { f: Filters; go: Go; t: number }) {
  const [sub, setSub] = useState<Sub>("overview");
  const [flowOn, setFlowOn] = useState(true);
  const attention = useMemo(() => stages(f).some((s) => s.tone === "bad"), [f]);
  return (
    <div className="ovx">
      <div className="ovx-head">
        <div className="ovx-subtabs" role="tablist" aria-label="Overview views">
          {SUBS.map(([id, label]) => <button key={id} role="tab" aria-selected={sub === id} className={sub === id ? "on" : ""} onClick={() => setSub(id)}>{label}</button>)}
        </div>
        <div className="ov-legend" aria-hidden>
          <span><i style={{ background: "var(--f-raw)" }} />Raw river water</span>
          <span><i style={{ background: "var(--f-treated)" }} />Treated water</span>
          <span><i style={{ background: "#3aa0f0" }} />Water in the network</span>
          <span><i style={{ background: "var(--bad)" }} />Water lost</span>
        </div>
        {sub === "overview" && (
          <>
            <span className={`ov-state ${attention ? "bad" : "ok"}`}>{attention ? "Action needed" : "Normal"}</span>
            <button className="ov-btn" onClick={() => setFlowOn((v) => !v)} aria-pressed={!flowOn} aria-label={flowOn ? "Pause the moving water" : "Play the moving water"}><PlayPauseIcon playing={flowOn} /> {flowOn ? "Pause" : "Play"}</button>
          </>
        )}
      </div>
      <motion.div className="ovx-body" key={sub} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        {sub === "overview" ? <PlantView f={f} go={go} t={t} flowOn={flowOn} /> : <PlantFlow f={f} go={go} t={t} />}
      </motion.div>
    </div>
  );
}
