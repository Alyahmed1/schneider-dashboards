import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUp, X } from "lucide-react";
import { fmt, QUALITY, stages, type Filters, type Stage } from "./data";
import { StageKpis, PlayPauseIcon } from "./StageView";
import { wobble } from "./live";
import { useGrow } from "./anim";
import { Box, Cyl, Group, Pump, Sea, Tube, pt } from "./Iso";
import PlantFlow from "./PlantFlow";
import type { Go } from "./App";

/** a thin water line is a list of [x, y, stage]; a point moves sideways with its stage, so lines stay joined to the equipment when the drawing is stretched */
type Pipe = { kind: "sea" | "clean" | "brine"; v: [number, number, number][] };
const PIPES: Pipe[] = [
  { kind: "sea", v: [[300, 244, 1], [334, 244, 1]] },
  { kind: "sea", v: [[408, 256, 1], [560, 256, 2], [598, 240, 2]] },
  { kind: "sea", v: [[766, 296, 2], [820, 296, 3], [820, 240, 3], [892, 240, 3]] },
  { kind: "sea", v: [[1108, 253, 3], [1236, 253, 4]] },
  { kind: "brine", v: [[1372, 326, 4], [1372, 452, 5]] },
  { kind: "clean", v: [[1296, 322, 4], [1296, 396, 4], [936, 396, 6], [936, 470, 6]] },
  { kind: "clean", v: [[793, 532, 6], [612, 532, 7]] },
  { kind: "clean", v: [[434, 538, 7], [244, 538, 8]] },
  { kind: "brine", v: [[1440, 578, 5], [1600, 578, 5]] },
];
/** how far each stage moves when the drawing is wider than 1600: 0 stays at the left edge, 1 moves all the way to the right edge */
const SHIFT: Record<number, number> = { 1: 0, 2: 0.348, 3: 0.688, 4: 1, 8: 0, 7: 0.285, 6: 0.675, 5: 1 };
const H = 580; // height of the drawing


type Lab = { x: number; y: number; text: string; state?: "run" | "idle" | "alarm" };
const STATE = (s?: string): Lab["state"] => (s === "Alarm" ? "alarm" : s === "Standby" ? "idle" : "run");

/** numbers in a reading keep the same decimals and move a little with every live update */
function live(r: { label: string; value: string; unit: string }, seed: number, t: number) {
  const n = parseFloat(r.value.replace(/,/g, ""));
  if (Number.isNaN(n)) return `${r.value}${r.unit ? ` ${r.unit}` : ""}`;
  const d = (r.value.split(".")[1] ?? "").length;
  const w = wobble(n, seed, t, 0.004);
  return `${fmt(r.unit === "%" && n <= 100 ? Math.min(w, 100) : w, d)}${r.unit ? ` ${r.unit}` : ""}`;
}

function DataBox({ x, y, w = 172, k = 1, rows }: { x: number; y: number; w?: number; k?: number; rows: [string, string][] }) {
  w *= k;
  const h = (14 + rows.length * 18) * k;
  return (
    <g className="iso-box" transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} />
      {rows.map(([label, v], i) => (
        <g key={label} transform={`translate(${9 * k} ${(22 + i * 18) * k})`}>
          <text className="k">{label}</text>
          <text className="v" x={w - 18 * k} textAnchor="end">{v}</text>
        </g>
      ))}
    </g>
  );
}

function Label({ x, y, text, state = "run" }: Lab) {
  return (
    <g className={`iso-lab ${state}`} transform={`translate(${x} ${y})`}>
      <circle r="3.6" cx="0" cy="-4" />
      <text x="10">{text}</text>
    </g>
  );
}

/** the whole process drawn in 3D-style, with live readings; every stage opens its KPIs */
function PlantView({ f, go, t, flowOn }: { f: Filters; go: Go; t: number; flowOn: boolean }) {
  const list = useMemo(() => stages(f), [f]);
  const grow = useGrow();
  // the drawing is as wide as its panel: on a wide screen the stages spread apart instead of leaving empty bands at the sides
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1600);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => { if (el.clientHeight > 0) setW(Math.max(1600, Math.min(2600, Math.round((H * el.clientWidth) / el.clientHeight)))); };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const extra = W - 1600;
  const ts = 1 + Math.min(0.1, extra / 4800); // text and box size
  const d = (p: Pipe) => p.v.map(([x, y, st], k) => `${k ? "L" : "M"}${x + dx(st)} ${y}`).join(" ");
  const dx = (stage: number) => extra * (SHIFT[stage] ?? 0);
  const [open, setOpen] = useState<Stage | null>(null);
  const S = (id: string) => list.find((s) => s.id === id)!;
  const tone = (s: Stage) => (s.tone === "bad" ? "alarm" : s.tone === "warn" ? "warn" : "run");

  const head = (n: number, s: Stage, x: number, y: number) => (
    <g className={`iso-head ${tone(s)}`} transform={`translate(${x} ${y})`} onClick={() => setOpen(s)} role="button" tabIndex={0} aria-label={`${s.name}, open its KPIs`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(s); } }}>
      <circle r="4.5" cx="0" cy="-5" />
      <text x="12">{n} · {s.name}</text>
      <text className="flow" x="12" y="16">{fmt(wobble(s.flow, n, t, 0.004))} {s.unit}</text>
    </g>
  );
  const rows = (s: Stage, seed: number): [string, string][] => s.readings.map((r, i) => [r.label, live(r, seed + i, t)]);
  const eq = (s: Stage, i: number) => STATE(s.equipment[i]?.state);

  const sea = S("intake"), pre = S("pre"), hp = S("hp"), ro = S("ro"), erd = S("erd"), post = S("post"), tank = S("tank"), net = S("net");
  const goStage = (s: Stage) => () => setOpen(s);

  // bottom gauges: the drinking-water quality of the product
  const q = (name: string) => QUALITY.find((x) => x.name === name)!;
  const rings = [
    { n: "Product TDS", v: wobble(q("Salinity (TDS)").value, 51, t, 0.01), unit: "mg/L", d: 0, frac: (v: number) => v / 500, ok: true },
    { n: "pH", v: wobble(q("pH").value, 52, t, 0.006), unit: "pH", d: 1, frac: (v: number) => (v - 6) / 3, ok: true },
    { n: "Turbidity", v: wobble(q("Turbidity").value, 53, t, 0.02), unit: "NTU", d: 2, frac: (v: number) => v / 1, ok: true },
    { n: "Free chlorine", v: wobble(q("Free chlorine").value, 54, t, 0.01), unit: "mg/L", d: 1, frac: (v: number) => v / 1.2, ok: true },
  ];
  const temp = sea.readings[0], sal = sea.readings[1];

  return (
    <div className="ov">
      <section className="ov-art">
        <div className="ov-scroll" ref={box}>
          <svg className={`ov-svg ${flowOn ? "" : "paused"}`} style={{ ["--ts" as string]: ts }} viewBox={`0 86 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="The whole plant from sea intake to the network">
            <defs>
              <linearGradient id="iso-gw" x1="0" x2="1"><stop offset="0" stopColor="#eef0fb" /><stop offset=".45" stopColor="#d5dbf0" /><stop offset="1" stopColor="#9ea8cf" /></linearGradient>
              <linearGradient id="iso-gb" x1="0" x2="1"><stop offset="0" stopColor="#5b8ff0" /><stop offset=".5" stopColor="#3466c4" /><stop offset="1" stopColor="#223f8a" /></linearGradient>
              <linearGradient id="iso-gp" x1="0" x2="1"><stop offset="0" stopColor="#b08af0" /><stop offset=".5" stopColor="#7d57cc" /><stop offset="1" stopColor="#54379a" /></linearGradient>
            </defs>
            {PIPES.map((p, i) => (
              <g key={i} className="ov-pg" style={{ ["--i" as string]: i }}>
                <path className="ov-pipe" d={d(p)} pathLength={1} />
                <path className={`ov-flow ${p.kind}`} d={d(p)} />
              </g>
            ))}

            <g className="ov-st" style={{ ["--i" as string]: 0 }}><g transform={`translate(${dx(1)} 0)`}>
            {/* 1 · sea and intake pumps */}
            <Group x={170} y={250} onClick={goStage(sea)} label="Sea intake"><Sea size={150} /></Group>
            <Group x={330} y={228} onClick={goStage(sea)} label="Intake pumps">
              {[0, 1, 2].map((i) => <Pump key={i} x={-20 + i * 0} y={-30 + i * 34} />)}
            </Group>
            {head(1, sea, 60, 112)}
            <Label x={420} y={176} text="Pump 1" state={eq(sea, 0)} />
            <Label x={420} y={206} text="Pump 2" state={eq(sea, 1)} />
            <Label x={420} y={236} text="Pump 3" state={eq(sea, 2)} />
            <DataBox k={ts} x={60} y={338} rows={rows(sea, 1)} />

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 1 }}><g transform={`translate(${dx(2)} 0)`}>
            {/* 2 · pre-treatment */}
            <Group x={680} y={262} onClick={goStage(pre)} label="Pre-treatment">
              {[0, 1, 2].map((i) => <Cyl key={i} cx={-62 + i * 62} cy={0} r={24} h={62} pal="w" water />)}
              <Cyl cx={-150} cy={0} r={12} h={32} pal="p" />
            </Group>
            {head(2, pre, 560, 112)}
            <Label x={778} y={178} text="Gravity filter 1" state={eq(pre, 0)} />
            <Label x={778} y={202} text="Gravity filter 2" state={eq(pre, 1)} />
            <Label x={778} y={226} text="Gravity filter 3" state={eq(pre, 2)} />
            <Label x={500} y={208} text="Ferric" state={eq(pre, 3)} />
            <DataBox k={ts} x={600} y={340} rows={rows(pre, 3)} />

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 2 }}><g transform={`translate(${dx(3)} 0)`}>
            {/* 3 · HP pumps */}
            <Group x={1000} y={252} onClick={goStage(hp)} label="High-pressure pumps">
              <Box x={-70} y={-55} w={140} d={110} h={6} pal="w" />
              {[0, 1, 2].map((i) => <Pump key={i} x={-48} y={-44 + i * 34} z={6} />)}
            </Group>
            {head(3, hp, 890, 112)}
            <Label x={1066} y={170} text="HP pump A" state={eq(hp, 0)} />
            <Label x={1066} y={200} text="HP pump B" state={eq(hp, 1)} />
            <Label x={1066} y={230} text="HP pump C" state={eq(hp, 2)} />
            <DataBox k={ts} x={920} y={338} rows={rows(hp, 5)} />

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 3 }}><g transform={`translate(${dx(4)} 0)`}>
            {/* 4 · RO membranes */}
            <Group x={1370} y={250} onClick={goStage(ro)} label="RO membranes">
              {[-62, -4, 54].map((y, i) => (
                <g key={i}>
                  <Box x={-56} y={y} w={112} d={24} h={5} pal="g" />
                  {[12, 24, 36].map((z) => <Tube key={z} a={pt(-48, y + 12, z)} b={pt(48, y + 12, z)} r={5.5} pal={i === 1 && ro.equipment[1]?.state === "Alarm" ? "p" : "w"} />)}
                </g>
              ))}
            </Group>
            {head(4, ro, 1250, 112)}
            <Label x={1462} y={196} text="Train A" state={eq(ro, 0)} />
            <Label x={1462} y={238} text="Train B" state={eq(ro, 1)} />
            <Label x={1462} y={280} text="Train C" state={eq(ro, 2)} />
            <DataBox k={ts} x={1594 - 166 * ts} y={300} w={166} rows={rows(ro, 7)} />

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 4 }}><g transform={`translate(${dx(5)} 0)`}>
            {/* 5 · energy recovery */}
            <Group x={1370} y={550} onClick={goStage(erd)} label="Energy recovery">
              <Box x={-60} y={-20} w={120} d={40} h={4} pal="g" />
              {[-40, 0, 40].map((cx, i) => <Cyl key={i} cx={cx} cy={0} z={4} r={11} h={40} pal="b" />)}
            </Group>
            {head(5, erd, 1190, 440)}
            <Label x={1470} y={512} text="Exchanger A" state={eq(erd, 0)} />
            <Label x={1470} y={534} text="Exchanger B" state={eq(erd, 1)} />
            <Label x={1470} y={556} text="Exchanger C" state={eq(erd, 2)} />
            <text className="iso-note" x={1500} y={598} textAnchor="start">Brine out</text>

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 5 }}><g transform={`translate(${dx(6)} 0)`}>
            {/* 6 · post-treatment */}
            <Group x={890} y={548} onClick={goStage(post)} label="Post-treatment">
              <Box x={-80} y={-32} w={160} d={64} h={4} pal="g" />
              {(["w", "p", "w"] as const).map((pal, i) => <Cyl key={i} cx={-52 + i * 52} cy={0} z={4} r={15} h={44} pal={pal} />)}
            </Group>
            {head(6, post, 724, 440)}
            <Label x={1000} y={566} text="Lime" state={eq(post, 0)} />
            <Label x={1000} y={590} text="CO₂" state={eq(post, 1)} />
            <Label x={1000} y={614} text="Chlorine" state={eq(post, 2)} />
            <DataBox k={ts} x={1090} y={540} rows={rows(post, 9)} />

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 6 }}><g transform={`translate(${dx(7)} 0)`}>
            {/* 7 · storage */}
            <Group x={520} y={536} onClick={goStage(tank)} label="Storage">
              {[-46, 46].map((cx) => <Cyl key={cx} cx={cx} cy={0} r={38} h={34} pal="w" water />)}
            </Group>
            {head(7, tank, 380, 426)}
            <Label x={436} y={604} text="Tank 1" state={eq(tank, 0)} />
            <Label x={560} y={622} text="Tank 2" state={eq(tank, 1)} />

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 7 }}><g transform={`translate(${dx(8)} 0)`}>
            {/* 8 · network */}
            <Group x={180} y={548} onClick={goStage(net)} label="Network">
              <Box x={-44} y={-22} w={88} d={44} h={26} pal="w" />
              <Box x={54} y={-48} w={26} d={26} h={64} pal="c" />
              <Box x={86} y={-22} w={26} d={26} h={44} pal="c" />
              <Box x={54} y={6} w={26} d={26} h={30} pal="c" />
            </Group>
            {head(8, net, 40, 440)}
            <Label x={50} y={612} text="Pump house" state={eq(net, 0)} />
            <Label x={50} y={634} text="Customers" state="run" />
            </g></g>
          </svg>
        </div>
      </section>

      <section className="ov-gauges">
        <div className="ov-g wide">
          <h3>Sea water</h3>
          <div className="ov-gr"><span>{temp.label}</span><b>{live(temp, 61, t)}<ArrowUp size={15} className="up" /></b></div>
          <div className="ov-gr"><span>{sal.label}</span><b>{live(sal, 62, t)}<ArrowUp size={15} className="up" /></b></div>
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

/** the Overview tab has two views: the 3D-style plant, and the detailed Operations process with every tag */
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
        {sub === "overview" && (
          <>
            <div className="ov-legend" aria-hidden>
              <span><i style={{ background: "#3d8fe0" }} />Sea water</span>
              <span><i style={{ background: "#3dd6d0" }} />Drinking water</span>
              <span><i style={{ background: "#e0a23c" }} />Brine</span>
            </div>
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
