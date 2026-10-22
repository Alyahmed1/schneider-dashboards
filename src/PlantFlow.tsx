import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { fmt, stages, type Filters } from "./data";
import { Chip, popDelay, rise } from "./ui";
import { wobble } from "./live";
import { PlayPauseIcon, StageKpis, TagInfo, tagShow } from "./StageView";
import { Cap, effective, Pipe, ScaleCtx, SCENES, type TagDef } from "./Scenes";
import { useEquip } from "./Equip";
import type { Go } from "./App";

/* The whole plant on one screen: every stage is drawn exactly like its Production picture,
   placed in two rows and joined by the real water lines. The drawing is laid out in real pixels,
   so it always fills the panel, and every label is placed where it covers nothing. */

const ORDER: { id: string; c: number; r: number }[] = [
  { id: "intake", c: 0, r: 0 }, { id: "pre", c: 1, r: 0 }, { id: "hp", c: 2, r: 0 }, { id: "ro", c: 3, r: 0 },
  { id: "erd", c: 0, r: 1 }, { id: "post", c: 1, r: 1 }, { id: "tank", c: 2, r: 1 }, { id: "net", c: 3, r: 1 },
];

/** the tags the Overview keeps; every tag is still available in the Production picture */
const KEEP: Record<string, string[]> = {
  intake: ["p1", "p2", "p3", "xv1", "fit"],
  pre: ["f1", "f2", "f3", "dos", "bw"],
  hp: ["pa", "pb", "pc", "pd", "cfa"],
  ro: ["ta", "tb", "tc", "cip", "pdt"],
  erd: ["ea", "eb", "ec", "bp", "sav"],
  post: ["lime", "co2", "cl", "ph", "qual"],
  tank: ["l1", "l2", "xv", "fit", "ait"],
  net: ["p1", "p2", "p3", "fit", "pit"],
};

interface Geo { w: number; h: number; e: number; cw: number; ch: number; x0: number; gap: number; y1: number; y2: number; lane1: number; lane2: number }

/** pick the biggest picture size that fits the panel, then spread the leftover space evenly */
function layout(w: number, h: number): Geo {
  const SIDE = 16, GAPX = 30, TOP = 108, LANES = 70, BOTTOM = 38;
  const e = Math.max(0.2, Math.min((w - 2 * SIDE - 3 * GAPX) / 3200, (h - TOP - LANES - BOTTOM) / 900));
  const cw = 800 * e;
  const ch = 450 * e;
  const slackX = w - (4 * cw + 3 * GAPX + 2 * SIDE);
  const gap = GAPX + slackX / 3;
  const x0 = (w - (4 * cw + 3 * gap)) / 2;
  const slackY = h - (TOP + 2 * ch + LANES + BOTTOM);
  const y1 = TOP + slackY * 0.25;
  const y2 = y1 + ch + LANES + slackY * 0.5;
  return { w, h, e, cw, ch, x0, gap, y1, y2, lane1: y1 + ch + 22, lane2: y1 + ch + 46 };
}
const cx = (g: Geo, c: number) => g.x0 + c * (g.cw + g.gap);
const cy = (g: Geo, r: number) => (r === 0 ? g.y1 : g.y2);
const px = (g: Geo, c: number, x: number) => cx(g, c) + x * g.e; // a point inside a picture, in panel pixels
const py = (g: Geo, r: number, y: number) => cy(g, r) + y * g.e;
const elbow = (ax: number, ay: number, bx: number, by: number) => `M${ax} ${ay} H${(ax + bx) / 2} V${by} H${bx}`;

/** the lines that join the pictures */
function Links({ g }: { g: Geo }) {
  const R = (c: number) => cx(g, c) + g.cw;
  const L = (c: number) => cx(g, c);
  const R3 = R(3);
  const edge = Math.min(14, g.gap * 0.35);
  return (
    <g className="conn">
      <Pipe d={elbow(R(0), py(g, 0, 225), L(1), py(g, 0, 290))} kind="sea" w={6} />
      <Pipe d={elbow(R(1), py(g, 0, 370), L(2), py(g, 0, 225))} kind="sea" w={6} />
      <Pipe d={elbow(R(2), py(g, 0, 120), L(3), py(g, 0, 225))} kind="sea" w={6} />
      <Pipe d={`M${R3} ${py(g, 0, 54)} H${R3 + edge + 4} V${g.lane1} H${L(1) - g.gap * 0.5} V${py(g, 1, 120)} H${L(1)}`} kind="clean" w={6} />
      <Pipe d={`M${R3} ${py(g, 0, 396)} H${R3 + edge - 4} V${g.lane2} H${L(0) - edge} V${py(g, 1, 100)} H${L(0)}`} kind="brine" w={6} />
      <Pipe d={elbow(R(1), py(g, 1, 420), L(2), py(g, 1, 90))} kind="product" w={6} />
      <Pipe d={elbow(R(2), py(g, 1, 400), L(3), py(g, 1, 400))} kind="product" w={6} />
      <Pipe d={`M${R(0)} ${py(g, 1, 225)} H${R(0) + g.gap * 0.35}`} kind="sea" w={6} />
      <Pipe d={`M${R(0)} ${py(g, 1, 380)} H${R(0) + g.gap * 0.35}`} kind="brine" w={6} />
      <Cap x={(R(1) + L(3)) / 2} y={g.lane1 - 6}>Permeate to post-treatment</Cap>
      <Cap x={cx(g, 2) + g.cw * 0.74} y={g.lane2 - 6}>Brine to energy recovery</Cap>
    </g>
  );
}

function PlantArt({ g }: { g: Geo }) {
  return (
    <ScaleCtx.Provider value={{ pipe: 1.5, icon: 1.55 }}>
    <g>
      {ORDER.map(({ id, c, r }) => {
        const Art = SCENES[id].Art;
        const cid = `ov-clip-${id}`;
        return (
          <g key={id} data-cell={id} transform={`translate(${cx(g, c)} ${cy(g, r)}) scale(${g.e})`}>
            <clipPath id={cid}><rect width="800" height="450" rx="26" /></clipPath>
            <rect width="800" height="450" rx="26" className="cell-bg" />
            <g clipPath={`url(#${cid})`}><Art /></g>
            <rect width="800" height="450" rx="26" className="cell-edge" />
          </g>
        );
      })}
      <Links g={g} />
    </g>
    </ScaleCtx.Provider>
  );
}

interface Placed { key: string; stageId: string; tag: TagDef; x: number; y: number; ax: number; ay: number; w: number; h: number }
type Open = { kind: "stage"; id: string } | { kind: "tag"; stageId: string; tag: TagDef } | null;

/** Overview: the full process and its water flow on one screen, as detailed as the stage pictures */
export default function PlantFlow({ f, go, t }: { f: Filters; go: Go; t: number }) {
  const list = stages(f);
  const eq = useEquip();
  const [open, setOpen] = useState<Open>(null);
  const [flowOn, setFlowOn] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1340, h: 480 });
  const [placed, setPlaced] = useState<Placed[]>([]);
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
  const fs = Math.max(9, Math.min(12, 27 * g.e));

  const chips = ORDER.map(({ id, c, r }) => ({ id, left: cx(g, c) + 2, top: cy(g, r) - 7 }));

  // after the drawing is on screen, find a free spot for every label: not on equipment, pipes, captions or other labels
  useLayoutEffect(() => {
    const root = box.current;
    const svg = root?.querySelector<SVGSVGElement>("svg.scene-art");
    if (!root || !svg) return;
    const sr = root.getBoundingClientRect();
    const W = Math.ceil(sr.width);
    const H = Math.ceil(sr.height);
    const C = 4;
    const gw = Math.ceil(W / C);
    const gh = Math.ceil(H / C);
    const grid = new Uint8Array(gw * gh);
    const mark = (x0: number, y0: number, x1: number, y1: number) => {
      const a = Math.max(0, Math.floor(x0 / C)), b = Math.min(gw - 1, Math.floor(x1 / C));
      const c0 = Math.max(0, Math.floor(y0 / C)), d = Math.min(gh - 1, Math.floor(y1 / C));
      for (let j = c0; j <= d; j++) for (let i = a; i <= b; i++) grid[j * gw + i] = 1;
    };
    const overlap = (x0: number, y0: number, x1: number, y1: number) => {
      let n = 0;
      const a = Math.max(0, Math.floor(x0 / C)), b = Math.min(gw - 1, Math.floor(x1 / C));
      const c0 = Math.max(0, Math.floor(y0 / C)), d = Math.min(gh - 1, Math.floor(y1 / C));
      for (let j = c0; j <= d; j++) for (let i = a; i <= b; i++) n += grid[j * gw + i];
      return n;
    };

    const cellOf = new Map<string, DOMRect>();
    svg.querySelectorAll<SVGGElement>("g[data-cell]").forEach((el) => { const bg = el.querySelector(".cell-bg"); if (bg) cellOf.set(el.dataset.cell ?? "", bg.getBoundingClientRect()); });
    const cellFor = (el: Element) => { const id = (el.closest("g[data-cell]") as SVGGElement | null)?.dataset.cell; return id ? cellOf.get(id) : undefined; };

    // equipment, valves, filter media and captions
    svg.querySelectorAll<SVGGraphicsElement>(".eq, .eq-motor, .eq-valve, .media-a, .media-b, .sc-cap").forEach((el) => {
      const r = el.getBoundingClientRect();
      const cell = cellFor(el);
      let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
      if (cell) { x0 = Math.max(x0, cell.left); y0 = Math.max(y0, cell.top); x1 = Math.min(x1, cell.right); y1 = Math.min(y1, cell.bottom); if (x1 <= x0 || y1 <= y0) return; }
      mark(x0 - sr.left - 2, y0 - sr.top - 2, x1 - sr.left + 2, y1 - sr.top + 2);
    });
    // every pipe, followed along its length (only the part that is visible inside its picture)
    svg.querySelectorAll<SVGPathElement>(".pipe-in").forEach((el) => {
      const ctm = el.getScreenCTM();
      if (!ctm) return;
      const cell = cellFor(el);
      const rad = (parseFloat(el.getAttribute("stroke-width") ?? "6") * ctm.a) / 2 + 2;
      const len = el.getTotalLength();
      const step = Math.max(2, 3 / Math.max(ctm.a, 0.05));
      for (let l = 0; l <= len; l += step) {
        const p = el.getPointAtLength(l);
        const q = new DOMPoint(p.x, p.y).matrixTransform(ctm);
        if (cell && (q.x < cell.left || q.x > cell.right || q.y < cell.top || q.y > cell.bottom)) continue;
        mark(q.x - sr.left - rad, q.y - sr.top - rad, q.x - sr.left + rad, q.y - sr.top + rad);
      }
    });
    // the title, tools, legend and stage chips
    root.querySelectorAll(".scene-title, .scene-tools, .flow-legend, .chip-pos").forEach((el) => {
      const r = el.getBoundingClientRect();
      mark(r.left - sr.left - 3, r.top - sr.top - 3, r.right - sr.left + 3, r.bottom - sr.top + 3);
    });

    const h = fs * 1.25 + 8;
    const out: Placed[] = [];
    ORDER.forEach(({ id, c, r }) => {
      SCENES[id].tags.filter((tg) => KEEP[id].includes(tg.id)).forEach((tag) => {
        const text = `${tag.tag}${tag.show ? ` ${fmt(tag.show.v, tag.show.d ?? 0)}${tag.show.unit}` : ""}`;
        const w = text.length * fs * 0.64 + 30;
        const ax = px(g, c, tag.x);
        const ay = py(g, r, tag.y);
        let best: { x: number; y: number; cost: number } | null = null;
        search:
        for (let rad = 0; rad <= 260; rad += 4) {
          const n = rad === 0 ? 1 : Math.max(12, Math.round(rad / 3));
          for (let a = 0; a < n; a++) {
            const ang = (a / n) * Math.PI * 2;
            const x = ax + rad * Math.cos(ang) * 1.2; // labels are wide, so allow more room sideways
            const y = ay + rad * Math.sin(ang) * 0.8;
            if (x - w / 2 < 3 || x + w / 2 > W - 3 || y - h / 2 < 3 || y + h / 2 > H - 3) continue;
            const ov = overlap(x - w / 2 - 2, y - h / 2 - 1, x + w / 2 + 2, y + h / 2 + 1);
            const cost = ov * 12 + rad;
            if (!best || cost < best.cost) best = { x, y, cost };
            if (ov === 0) break search;
          }
        }
        const pos = best ?? { x: ax, y: ay, cost: 0 };
        mark(pos.x - w / 2 - 2, pos.y - h / 2 - 1, pos.x + w / 2 + 2, pos.y + h / 2 + 1);
        out.push({ key: `${id}-${tag.id}`, stageId: id, tag, x: pos.x, y: pos.y, ax, ay, w, h });
      });
    });
    setPlaced(out);
  }, [g, fs]);

  const stage = open?.kind === "stage" ? list.find((s) => s.id === open.id) ?? null : null;
  const attention = list.some((s) => s.tone === "bad");
  const stageNo = (id: string) => ORDER.findIndex((o) => o.id === id) + 1;

  return (
    <motion.div className="scene-wrap" {...rise(0)}>
      <div ref={box} className={`scene ${flowOn ? "" : "paused"}`} style={{ ["--tagfs" as string]: `${fs}px` }}>
        <svg className="scene-art" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="The whole plant from sea intake to the network">
          <PlantArt g={g} />
        </svg>

        {/* thin lines from a label to the exact equipment it belongs to */}
        <svg className="leaders" width={size.w} height={size.h} aria-hidden>
          {placed.filter((p) => Math.hypot(p.x - p.ax, p.y - p.ay) > p.h * 0.9).map((p) => (
            <g key={p.key}>
              <line x1={p.x} y1={p.y} x2={p.ax} y2={p.ay} />
              <circle cx={p.ax} cy={p.ay} r={2.6} />
            </g>
          ))}
        </svg>

        <div className="scene-title"><b>Full process, sea to network</b><Chip tone={attention ? "bad" : "good"}>{attention ? "Action needed" : "Normal"}</Chip></div>
        <div className="scene-tools">
          <button className="scene-btn" onClick={() => setFlowOn((v) => !v)} aria-pressed={!flowOn} aria-label={flowOn ? "Pause the moving water" : "Play the moving water"}><PlayPauseIcon playing={flowOn} /> {flowOn ? "Pause" : "Play"}</button>
        </div>

        <div className="flow-legend" aria-hidden>
          <span><i style={{ background: "#3d8fe0" }} />Sea water</span>
          <span><i style={{ background: "#2bc4c0" }} />Permeate and drinking water</span>
          <span><i style={{ background: "#e0a23c" }} />Brine</span>
          <span><i style={{ background: "#a070e0" }} />Chemicals</span>
        </div>

        {chips.map((c, n) => {
          const s = list.find((x) => x.id === c.id)!;
          return (
            <div key={c.id} className="chip-pos" style={{ left: c.left, top: c.top }}>
              <button className={`stage-chip tone-${s.tone}`} onClick={() => setOpen({ kind: "stage", id: s.id })} aria-label={`${s.name}, open its KPIs`}>
                <i className={`dot dot-${s.tone}`} />
                <b>{stageNo(s.id)} · {s.name}</b>
                <span>{fmt(wobble(s.flow, n + 1, t, 0.004))} m³/h</span>
              </button>
            </div>
          );
        })}

        {placed.map((p, n) => {
          const ef = effective(p.tag, p.stageId, eq.on);
          return (
            <div key={p.key} className="tag-pos" style={{ left: p.x, top: p.y }}>
              <motion.button className={`tag st-${ef.state}`}
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: popDelay(n), type: "spring", stiffness: 420, damping: 26 }}
                onClick={() => setOpen({ kind: "tag", stageId: p.stageId, tag: p.tag })} aria-label={`${p.tag.name}, ${p.tag.tag}`}>
                <i className="tag-dot" />
                <b>{p.tag.tag}</b>
                {p.tag.show && <span>{tagShow(p.tag, ef.on, n + 3, t)}</span>}
              </motion.button>
            </div>
          );
        })}

        <AnimatePresence>
          {open && (
            <motion.div className="pop-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
              <motion.div className={`pop ${open.kind === "stage" || open.tag.special ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={open.kind === "stage" ? "Stage KPIs" : open.tag.name}
                initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} transition={{ type: "spring", stiffness: 360, damping: 30 }}
                onClick={(e) => e.stopPropagation()}>
                <button className="pop-x" onClick={() => setOpen(null)} aria-label="Close"><X size={16} /> Close</button>
                {stage && (
                  <StageKpis stage={stage} t={t} seed={stage.id.length * 31}>
                    <div className="pop-foot">
                      <button className="btn on" onClick={() => go("production", stage.id)}>Open in Production <ArrowRight size={14} /></button>
                    </div>
                  </StageKpis>
                )}
                {open.kind === "tag" && (
                  <>
                    <TagInfo tag={open.tag} f={f} t={t} seed={open.stageId.length * 31} stageId={open.stageId} />
                    <div className="pop-foot">
                      <button className="btn on" onClick={() => go("production", open.stageId)}>Open in Production <ArrowRight size={14} /></button>
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
