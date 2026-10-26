import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUp, X } from "lucide-react";
import { fmt, QUALITY, stages, type Filters, type Stage } from "./data";
import { StageKpis, PlayPauseIcon } from "./StageView";
import { wobble } from "./live";
import { useGrow } from "./anim";
import { Basin, Box, Clar, Cyl, Egg, GasHolder, Group, Pit, Pump, Tree, pt } from "./Iso";
import PlantFlow from "./PlantFlow";
import type { Go } from "./App";

/** a thin line is a list of [x, y, position]; a point moves sideways with its position, so lines stay joined to the equipment when the drawing is stretched */
type Pipe = { kind: "raw" | "sludge" | "treated" | "product"; v: [number, number, number][] };
const PIPES: Pipe[] = [
  { kind: "raw", v: [[300, 244, 1], [334, 244, 1]] },
  { kind: "raw", v: [[408, 256, 1], [560, 256, 2], [598, 240, 2]] },
  { kind: "raw", v: [[766, 296, 2], [820, 296, 3], [820, 240, 3], [892, 240, 3]] },
  { kind: "raw", v: [[1108, 253, 3], [1236, 253, 4]] },
  { kind: "sludge", v: [[1372, 326, 4], [1372, 452, 5]] },
  { kind: "treated", v: [[1306, 566, 5], [978, 566, 6]] },
  { kind: "product", v: [[800, 560, 6], [622, 560, 7]] },
  { kind: "sludge", v: [[1000, 336, 3], [1000, 398, 3], [1290, 398, 5]] },
  { kind: "sludge", v: [[1290, 398, 5], [180, 398, 8], [180, 500, 8]] },
  { kind: "sludge", v: [[1310, 580, 5], [1290, 580, 5], [1290, 398, 5]] },
];
/** how far each position moves when the drawing is wider than 1600: 0 stays at the left edge, 1 moves all the way to the right edge */
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

  const intake = S("intake"), pre = S("pre"), hp = S("hp"), ro = S("ro"), erd = S("erd"), post = S("post"), tank = S("tank"), net = S("net");
  const goStage = (s: Stage) => () => setOpen(s);

  // bottom gauges: the effluent quality leaving the plant
  const q = (name: string) => QUALITY.find((x) => x.name === name)!;
  const rings = [
    { n: "BOD₅", v: wobble(q("BOD₅").value, 51, t, 0.01), unit: "mg/L", d: 0, frac: (v: number) => v / 20, ok: true },
    { n: "pH", v: wobble(q("pH").value, 52, t, 0.006), unit: "pH", d: 1, frac: (v: number) => (v - 6) / 3, ok: true },
    { n: "Suspended solids", v: wobble(q("Suspended solids (TSS)").value, 53, t, 0.02), unit: "mg/L", d: 0, frac: (v: number) => v / 30, ok: true },
    { n: "Ammonia", v: wobble(q("Ammonia (NH₄-N)").value, 54, t, 0.01), unit: "mg/L", d: 1, frac: (v: number) => v / 5, ok: true },
  ];
  const lvl = intake.readings[0], temp = intake.readings[2];

  return (
    <div className="ov">
      <section className="ov-art">
        <div className="ov-scroll" ref={box}>
          <svg className={`ov-svg ${flowOn ? "" : "paused"}`} style={{ ["--ts" as string]: ts }} viewBox={`0 86 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="The whole plant from the inlet works to reuse">
            <defs>
              <linearGradient id="iso-gw" x1="0" x2="1"><stop offset="0" stopColor="#f1f7f5" /><stop offset=".45" stopColor="#d3e3de" /><stop offset="1" stopColor="#9db8b0" /></linearGradient>
              <linearGradient id="iso-gb" x1="0" x2="1"><stop offset="0" stopColor="#5fc9ae" /><stop offset=".5" stopColor="#34967f" /><stop offset="1" stopColor="#236c5c" /></linearGradient>
              <linearGradient id="iso-gp" x1="0" x2="1"><stop offset="0" stopColor="#b08af0" /><stop offset=".5" stopColor="#7d57cc" /><stop offset="1" stopColor="#54379a" /></linearGradient>
            </defs>
            {PIPES.map((p, i) => (
              <g key={i} className="ov-pg" style={{ ["--i" as string]: i }}>
                <path className="ov-pipe" d={d(p)} pathLength={1} />
                <path className={`ov-flow ${p.kind}`} d={d(p)} />
              </g>
            ))}

            <g className="ov-st" style={{ ["--i" as string]: 0 }}><g transform={`translate(${dx(1)} 0)`}>
            {/* 1 · inlet works: wet well, bar screen, influent pumps */}
            <Group x={150} y={250} onClick={goStage(intake)} label="Wet well and bar screen">
              <Pit size={120} tone="m" />
              <Box x={54} y={-32} w={8} d={64} h={22} pal="g" />
            </Group>
            <Group x={330} y={228} onClick={goStage(intake)} label="Influent pumps">
              {[0, 1, 2].map((i) => <Pump key={i} x={-20} y={-30 + i * 34} />)}
            </Group>
            {head(1, intake, 60, 112)}
            <Label x={420} y={176} text="Pump 1" state={eq(intake, 0)} />
            <Label x={420} y={206} text="Pump 2" state={eq(intake, 1)} />
            <Label x={420} y={236} text="Pump 3" state={eq(intake, 2)} />
            <DataBox k={ts} x={60} y={338} rows={rows(intake, 1)} />

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 1 }}><g transform={`translate(${dx(2)} 0)`}>
            {/* 2 · grit and grease: two aerated grit chambers, classifier, ferric dosing */}
            <Group x={680} y={262} onClick={goStage(pre)} label="Grit chambers">
              <Basin x={-80} y={-50} w={140} d={30} h={14} tone="m" bubbles={7} />
              <Basin x={-80} y={0} w={140} d={30} h={14} tone="m" bubbles={7} seed={2} />
              <Cyl cx={-40} cy={64} r={13} h={32} pal="g" />
              <Cyl cx={-150} cy={0} r={12} h={32} pal="p" />
            </Group>
            {head(2, pre, 560, 112)}
            <Label x={778} y={178} text="Grit chamber 1" state={eq(pre, 0)} />
            <Label x={778} y={202} text="Grit chamber 2" state={eq(pre, 1)} />
            <Label x={778} y={226} text="Grit classifier" state={eq(pre, 2)} />
            <Label x={500} y={208} text="Ferric" state={eq(pre, 3)} />
            <DataBox k={ts} x={600} y={340} rows={rows(pre, 3)} />

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 2 }}><g transform={`translate(${dx(3)} 0)`}>
            {/* 3 · primary clarification: three round clarifiers */}
            <Group x={1000} y={252} onClick={goStage(hp)} label="Primary clarifiers">
              {[-56, 0, 56].map((cy, i) => <Clar key={cy} cx={0} cy={cy} r={24} tone="m" delay={i * 4} />)}
            </Group>
            {head(3, hp, 890, 112)}
            <Label x={1112} y={170} text="Primary clarifier 1" state={eq(hp, 0)} />
            <Label x={1112} y={200} text="Primary clarifier 2" state={eq(hp, 1)} />
            <Label x={1112} y={230} text="Primary clarifier 3" state={eq(hp, 2)} />
            <DataBox k={ts} x={920} y={338} rows={rows(hp, 5)} />

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 3 }}><g transform={`translate(${dx(4)} 0)`}>
            {/* 4 · aeration: three lanes and the blower house */}
            <Group x={1370} y={250} onClick={goStage(ro)} label="Aeration lanes">
              {[-62, -4, 54].map((y, i) => <Basin key={i} x={-56} y={y} w={112} d={26} h={8} tone="o" bubbles={6} alarm={i === 1 && ro.equipment[1]?.state === "Alarm"} seed={i} />)}
              <Box x={-100} y={-48} w={30} d={96} h={24} pal="g" />
            </Group>
            {head(4, ro, 1250, 112)}
            <Label x={1462} y={196} text="Lane A" state={eq(ro, 0)} />
            <Label x={1462} y={238} text="Lane B" state={eq(ro, 1)} />
            <Label x={1462} y={280} text="Lane C" state={eq(ro, 2)} />
            <DataBox k={ts} x={1594 - 196 * ts} y={300} w={196} rows={rows(ro, 7)} />

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 4 }}><g transform={`translate(${dx(5)} 0)`}>
            {/* 5 · secondary clarifiers */}
            <Group x={1370} y={550} onClick={goStage(erd)} label="Secondary clarifiers">
              {[-46, 0, 46].map((cx, i) => <Clar key={cx} cx={cx} cy={0} r={15} tone="t" delay={i * 3} />)}
            </Group>
            {head(5, erd, 1190, 440)}
            <Label x={1470} y={512} text="Clarifier A" state={eq(erd, 0)} />
            <Label x={1470} y={534} text="Clarifier B" state={eq(erd, 1)} />
            <Label x={1470} y={556} text="Clarifier C" state={eq(erd, 2)} />
            <text className="iso-note" x={1210} y={642} textAnchor="start">Sludge out</text>

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 5 }}><g transform={`translate(${dx(6)} 0)`}>
            {/* 6 · tertiary and disinfection: disc filters and two UV banks */}
            <Group x={890} y={548} onClick={goStage(post)} label="Tertiary and disinfection">
              <Box x={-80} y={-32} w={160} d={64} h={4} pal="g" />
              {[-52, -26, 0].map((cx) => <Cyl key={cx} cx={cx} cy={0} z={4} r={11} h={30} pal="w" />)}
              {[-26, 8].map((y, i) => (
                <g key={y}>
                  <Box x={16} y={y} w={56} d={18} z={4} h={8} pal="b" />
                  {[0, 1, 2, 3, 4].map((l) => { const a = pt(24 + l * 10, y + 4, 13), b2 = pt(24 + l * 10, y + 14, 13); return <line key={l} className="iso-uv" x1={a[0]} y1={a[1]} x2={b2[0]} y2={b2[1]} style={{ ["--d" as string]: `${(l * 0.3 + i * 0.5).toFixed(1)}s` }} />; })}
                </g>
              ))}
            </Group>
            {head(6, post, 724, 440)}
            <Label x={1000} y={566} text="Disc filters" state={eq(post, 0)} />
            <Label x={1000} y={590} text="UV bank 1" state={eq(post, 1)} />
            <Label x={1000} y={614} text="UV bank 2" state={eq(post, 2)} />
            <DataBox k={ts} x={1090} y={540} rows={rows(post, 9)} />

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 6 }}><g transform={`translate(${dx(7)} 0)`}>
            {/* 7 · effluent and reuse: reuse tank, pumps, irrigation trees */}
            <Group x={520} y={536} onClick={goStage(net)} label="Effluent and reuse">
              <Cyl cx={-46} cy={0} r={34} h={34} pal="w" water wt="t" />
              {[-14, 10].map((y) => <Pump key={y} x={22} y={y} />)}
              {[-30, -8, 14, 36].map((y) => <Tree key={y} x={78} y={y} />)}
            </Group>
            {head(7, net, 380, 426)}
            <Label x={436} y={604} text="Reuse pump 1" state={eq(net, 0)} />
            <Label x={560} y={622} text="Reuse pump 2" state={eq(net, 1)} />
            <text className="iso-note" x={380} y={566} textAnchor="start">To irrigation</text>

            </g></g>
            <g className="ov-st" style={{ ["--i" as string]: 7 }}><g transform={`translate(${dx(8)} 0)`}>
            {/* 8 · sludge and biogas: thickener, digesters, gas holder, CHP */}
            <Group x={180} y={548} onClick={goStage(tank)} label="Sludge and biogas">
              <Clar cx={-60} cy={26} r={14} tone="o" delay={1} />
              <Egg cx={-20} cy={-10} />
              <Egg cx={22} cy={-10} />
              <GasHolder cx={56} cy={-30} />
              <Box x={34} y={14} w={44} d={26} h={22} pal="g" />
            </Group>
            {head(8, tank, 40, 440)}
            <Label x={50} y={612} text="Digester 1" state={eq(tank, 0)} />
            <Label x={50} y={634} text="Digester 2" state={eq(tank, 1)} />
            <Label x={200} y={634} text="CHP engine" state={eq(tank, 2)} />
            </g></g>
          </svg>
        </div>
      </section>

      <section className="ov-gauges">
        <div className="ov-g wide">
          <h3>Raw sewage</h3>
          <div className="ov-gr"><span>{lvl.label}</span><b>{live(lvl, 61, t)}<ArrowUp size={15} className="up" /></b></div>
          <div className="ov-gr"><span>{temp.label}</span><b>{live(temp, 62, t)}<ArrowUp size={15} className="up" /></b></div>
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
              <span><i style={{ background: "var(--f-raw)" }} />Raw sewage</span>
              <span><i style={{ background: "var(--f-sludge)" }} />Sludge</span>
              <span><i style={{ background: "var(--f-treated)" }} />Treated water</span>
              <span><i style={{ background: "#2fbf9b" }} />Reuse water</span>
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
