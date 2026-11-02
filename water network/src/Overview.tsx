import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUp, X } from "lucide-react";
import { fmt, QUALITY, stages, type Filters, type Stage } from "./data";
import { StageKpis, PlayPauseIcon } from "./StageView";
import { wobble } from "./live";
import { useGrow } from "./anim";
import { networkAt } from "./network";
import type { Go } from "./App";

/** where each stage sits in the drawing: five across the top (the water travels right), then three below (it comes back left) */
const POS: Record<string, { x: number; y: number }> = {
  source: { x: 40, y: 70 }, plant: { x: 340, y: 70 }, ps1: { x: 640, y: 70 }, res: { x: 940, y: 70 }, trunk: { x: 1240, y: 70 },
  zones: { x: 1240, y: 330 }, meters: { x: 940, y: 330 }, leak: { x: 640, y: 330 },
};
const W = 236, H = 150;
/** one thin line between two stages: from the right edge of one box to the left edge of the next */
const LINKS: { from: string; to: string; kind: "raw" | "treated" | "product" | "loss" }[] = [
  { from: "source", to: "plant", kind: "raw" }, { from: "plant", to: "ps1", kind: "treated" }, { from: "ps1", to: "res", kind: "product" }, { from: "res", to: "trunk", kind: "product" },
  { from: "trunk", to: "zones", kind: "product" }, { from: "zones", to: "meters", kind: "product" }, { from: "zones", to: "leak", kind: "loss" },
];
const edge = (id: string, side: "l" | "r" | "t" | "b", dy = 0) => {
  const p = POS[id];
  return side === "r" ? [p.x + W, p.y + H / 2 + dy] : side === "l" ? [p.x, p.y + H / 2 + dy] : side === "b" ? [p.x + W / 2, p.y + H] : [p.x + W / 2, p.y];
};
function linkPath(l: (typeof LINKS)[number]) {
  if (l.from === "trunk" && l.to === "zones") { const [a, b] = edge("trunk", "b"), [, d] = edge("zones", "t"); return `M${a} ${b} V${d}`; }
  if (l.to === "leak") { const [a, b] = edge("zones", "b"), [c] = edge("leak", "b"); return `M${a} ${b} V${b + 26} H${c} V${b}`; }
  if (l.to === "meters") { const [a, b] = edge("zones", "l"), [c] = edge("meters", "r"); return `M${a} ${b} H${c}`; }
  const [a, b] = edge(l.from, "r"), [c] = edge(l.to, "l");
  return `M${a} ${b} H${c}`;
}

/** live reading: the numbers keep their decimals and move a little with every update */
function live(r: { label: string; value: string; unit: string }, seed: number, t: number) {
  const n = parseFloat(r.value.replace(/,/g, ""));
  if (Number.isNaN(n)) return `${r.value}${r.unit ? ` ${r.unit}` : ""}`;
  const d = (r.value.split(".")[1] ?? "").length;
  const w = wobble(n, seed, t, 0.004);
  return `${fmt(r.unit === "%" && n <= 100 ? Math.min(w, 100) : w, d)}${r.unit ? ` ${r.unit}` : ""}`;
}

/** the whole supply chain drawn as a flat flow diagram, with live readings; every stage opens its KPIs */
export default function Overview({ f, go, t }: { f: Filters; go: Go; t: number }) {
  const list = useMemo(() => stages(f), [f]);
  const grow = useGrow();
  const [flowOn, setFlowOn] = useState(true);
  const [open, setOpen] = useState<Stage | null>(null);
  const attention = list.some((s) => s.tone === "bad");
  const snap = networkAt(8);
  const q = (name: string) => QUALITY.find((x) => x.name === name)!;
  const avgBar = Object.values(snap.zones).reduce((a, z) => a + z.pressure, 0) / 6;
  const rings = [
    { n: "Free chlorine", v: wobble(q("Free chlorine").value, 51, t, 0.01), unit: "mg/L", d: 2, frac: (v: number) => v / 1 },
    { n: "Turbidity", v: wobble(q("Turbidity").value, 52, t, 0.02), unit: "NTU", d: 1, frac: (v: number) => v / 1 },
    { n: "pH", v: wobble(q("pH").value, 53, t, 0.006), unit: "pH", d: 1, frac: (v: number) => (v - 6) / 3 },
    { n: "Average pressure", v: wobble(avgBar, 54, t, 0.01), unit: "bar", d: 1, frac: (v: number) => v / 7 },
  ];
  const src = list[0];

  return (
    <div className="ovx">
      <div className="ovx-head">
        <div className="ov-legend" aria-hidden>
          <span><i style={{ background: "var(--f-raw)" }} />Raw water</span>
          <span><i style={{ background: "var(--f-treated)" }} />Treated water</span>
          <span><i style={{ background: "#3aa0f0" }} />Water in the network</span>
          <span><i style={{ background: "var(--bad)" }} />Water lost</span>
        </div>
        <span className={`ov-state ${attention ? "bad" : "ok"}`}>{attention ? "Action needed" : "Normal"}</span>
        <button className="ov-btn" onClick={() => setFlowOn((v) => !v)} aria-pressed={!flowOn} aria-label={flowOn ? "Pause the moving water" : "Play the moving water"}><PlayPauseIcon playing={flowOn} /> {flowOn ? "Pause" : "Play"}</button>
      </div>

      <div className="ov ovx-body">
        <section className="ov-art">
          <div className="ov-scroll">
            <svg className={`ov-svg ${flowOn ? "" : "paused"}`} viewBox="0 30 1560 520" preserveAspectRatio="xMidYMid meet" role="img" aria-label="The water supply chain from the river to the customers">
              {LINKS.map((l, i) => (
                <g key={`${l.from}-${l.to}`} className="ov-g-link" style={{ ["--i" as string]: i }}>
                  <path className={`ov-pipe ${l.kind}`} d={linkPath(l)} style={{ strokeWidth: 9 }} />
                  <path className={`ov-flow ${l.kind}`} d={linkPath(l)} style={{ strokeWidth: 3 }} />
                </g>
              ))}
              {list.map((s, i) => {
                const p = POS[s.id];
                return (
                  <g key={s.id} className={`ov-node ${s.tone}`} transform={`translate(${p.x} ${p.y})`} style={{ ["--n" as string]: i }} role="button" tabIndex={0} aria-label={`${s.name}, open its KPIs`}
                    onClick={() => setOpen(s)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(s); } }}>
                    <rect className="box" width={W} height={H} />
                    <rect className="bar" width="5" height={H} />
                    <circle className="num" cx="30" cy="30" r="14" />
                    <text className="numt" x="30" y="35" textAnchor="middle">{i + 1}</text>
                    <text className="nm" x="54" y="27">{s.name}</text>
                    <text className="sh" x="54" y="46">{s.short}</text>
                    <text className="fl" x="20" y="86">{fmt(wobble(s.flow, i + 1, t, 0.004))}<tspan className="u"> {s.unit}</tspan></text>
                    {s.readings.slice(0, 2).map((r, k) => (
                      <g key={r.label} transform={`translate(20 ${108 + k * 18})`}>
                        <text className="k">{r.label}</text>
                        <text className="v" x={W - 36} textAnchor="end">{live(r, i * 7 + k, t)}</text>
                      </g>
                    ))}
                  </g>
                );
              })}
              <text className="iso-note" x="1358" y="528" textAnchor="end">Water lost on the way: leaks, bursts and unbilled use</text>
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
    </div>
  );
}
