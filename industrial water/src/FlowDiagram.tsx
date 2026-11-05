import { useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { DiagramProps, Equip, Tone } from "./diagram";

/**
 * One layout for all three plants: six tiles in a row, a header to three users, wastewater, and a reuse loop.
 * The layout is computed from the real size of its box, so it fills the box exactly (no empty side bars, no cropping)
 * on any screen shape. Tiles keep their size; the spacing between them stretches.
 */
export type PipeKind = "raw" | "clar" | "treated" | "reject" | "sludge" | "reuse" | "slurry" | "conc";

export type FlowCfg = {
  equip: Equip[];
  symbol: (id: string, num: (id: string, k: string) => number) => ReactNode;
  row1: PipeKind[];
  header: PipeKind;
  collector: PipeKind;
  stubs: { i: number; label: string; kind: PipeKind }[];
  tags: { code: string; id: string; k: string; unit: string }[];
  caps: { header: string; collector: string; reuse: string };
  reuseVal: { id: string; k: string };
};

/** the smallest layout (in drawing units) that still has room for every tile, tag, symbol and caption */
const MIN_W = 950;
const MIN_H = 480;

function layout(W: number, H: number) {
  const mx = 80; // distance from the edge to the first and last tile centre
  const xs = Array.from({ length: 6 }, (_, i) => mx + (i * (W - 2 * mx)) / 5);
  const y1 = 88;
  const collY = H - 34;
  const y2 = collY - 110;
  const cool = xs[5] - 62;
  const etp = xs[1] - 10;
  const step = (cool - etp) / 3;
  const row2 = [cool, cool - step, cool - 2 * step, etp];
  const hy = Math.max(y1 + 124, y1 + 58 + 0.55 * (y2 - 70 - (y1 + 58)));
  return { xs, y1, y2, collY, row2, hy, gaps: xs.slice(0, 5).map((x, i) => (x + xs[i + 1]) / 2) };
}

function Pipe({ d, kind }: { d: string; kind: PipeKind }) {
  return (
    <g className={`pipe p-${kind}`}>
      <path className="pipe-base" d={d} />
      <path className="pipe-flow" d={d} />
    </g>
  );
}

/** a small solid arrowhead on a pipe, so the direction of flow reads even without the animation */
function Arrow({ x, y, rot, kind }: { x: number; y: number; rot: number; kind: PipeKind }) {
  return <path className={`sym flow-arrow ar-${kind}`} transform={`translate(${x} ${y}) rotate(${rot})`} d="M-4 -5.500 L5 0 L-4 5.500 Z" />;
}

/** a control valve (two triangles and an actuator) drawn on a pipe; its colour follows the equipment it feeds */
function Valve({ x, y, tone }: { x: number; y: number; tone: Tone }) {
  return (
    <g className={`sym valve ${tone}`} transform={`translate(${x} ${y})`}>
      <path className="v-body" d="M-10 -7 L10 7 V-7 L-10 7 Z" />
      <path className="v-stem" d="M0 0 V-10" />
      <rect className="v-act" x={-5} y={-16} width={10} height={6} rx={2} />
    </g>
  );
}

/** a pump (circle, spinning impeller and discharge nozzle) drawn on a pipe */
function Pump({ x, y }: { x: number; y: number }) {
  return (
    <g className="sym pump" transform={`translate(${x} ${y})`}>
      <path className="p-nozzle" d="M0 -12 H13 V-20 H5" />
      <circle className="p-body" r={13} />
      <g className="spin"><path className="p-blade" d="M0 -8 V8 M-7 -4 L7 4 M-7 4 L7 -4" /></g>
    </g>
  );
}

function Tag({ x, y, code, value, unit }: { x: number; y: number; code: string; value: string; unit: string }) {
  const text = `${value} ${unit}`.trim();
  const w = Math.max(58, text.length * 7 + 14);
  return (
    <g className="tag">
      <path className="tag-leader" d={`M${x} ${y + 14} V${y + 36}`} />
      <circle cx={x} cy={y} r={14} />
      <text className="tag-code" x={x} y={y + 4}>{code}</text>
      <rect className="tag-pill" x={x - w / 2} y={y + 36} width={w} height={20} rx={3} />
      <text className="tag-val" x={x} y={y + 50.500}>{text}</text>
    </g>
  );
}

function useBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

export function makeDiagram(cfg: FlowCfg): ComponentType<DiagramProps> {
  return function FlowDiagram({ sel, onSelect, scn, tones, val, num }: DiagramProps) {
    const [ref, box] = useBox();
    // scale so the minimum layout fits the box, then give the leftover room to the spacing
    const s = box.w > 0 && box.h > 0 ? Math.min(box.w / MIN_W, box.h / MIN_H) : 1;
    const W = box.w > 0 ? box.w / s : MIN_W;
    const H = box.h > 0 ? box.h / s : MIN_H;
    const L = layout(W, H);
    const { xs, y1, y2, collY, row2, hy, gaps } = L;
    const pipeY = y1 + 30;
    const bx = (i: number) => row2[i] + 38; // x of the pipe that enters a bottom-row tile
    const x = (i: number) => (i < 6 ? xs[i] : row2[i - 6]);
    const y = (i: number) => (i < 6 ? y1 : y2);
    const tileTop = y2 - 58;
    const tileBot = y2 + 58;
    const reuseMid = y1 + 58 + (y2 - y1 - 58) * 0.32;

    return (
      <div className="pd-box" ref={ref}>
        <svg className="pd" data-scn={scn} viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Water flow diagram">
          <defs>
            <clipPath id="tileclip"><rect x={-52} y={-58} width={104} height={116} rx={5} /></clipPath>
          </defs>

          {/* pipes first, so the equipment tiles sit on top of them */}
          {cfg.row1.map((kind, i) => <Pipe key={i} kind={kind} d={`M${xs[i]} ${pipeY} H${xs[i + 1]}`} />)}
          <Pipe kind={cfg.header} d={`M${xs[5]} ${pipeY} V${hy} H${bx(2)}`} />
          {[0, 1, 2].map((i) => <Pipe key={i} kind={cfg.header} d={`M${bx(i)} ${hy} V${tileTop}`} />)}
          <Pipe kind={cfg.collector} d={`M${row2[0]} ${y2 + 35} V${collY} H${row2[3]} V${y2 + 35}`} />
          <Pipe kind={cfg.collector} d={`M${row2[1]} ${y2 + 35} V${collY}`} />
          <Pipe kind={cfg.collector} d={`M${row2[2]} ${y2 + 35} V${collY}`} />
          <Pipe kind="reuse" d={`M${row2[3]} ${y2} H${xs[0]} V${y1 + 10}`} />
          {cfg.stubs.map((st) => {
            const sx = xs[st.i];
            return (
              <g key={st.label}>
                <Pipe kind={st.kind} d={`M${sx} ${y1 + 55} V${y1 + 78}`} />
                <path className={`arrow ar-${st.kind}`} d={`M${sx - 7} ${y1 + 78} H${sx + 7} L${sx} ${y1 + 90} Z`} />
                <text className="cap" x={sx} y={y1 + 106} textAnchor="middle">{st.label}</text>
              </g>
            );
          })}

          {/* direction arrows, valves and pumps, in clear space on the pipes */}
          {cfg.row1.map((kind, i) => <Arrow key={`a${i}`} x={xs[i + 1] - 52 - 6} y={pipeY} rot={0} kind={kind} />)}
          <Arrow x={(bx(0) + bx(1)) / 2} y={hy} rot={180} kind={cfg.header} />
          <Arrow x={(bx(1) + bx(2)) / 2} y={hy} rot={180} kind={cfg.header} />
          {[0, 1, 2].map((i) => (
            <g key={`b${i}`}>
              <Valve x={bx(i)} y={hy + 28} tone={tones[cfg.equip[6 + i].id]} />
              <Arrow x={bx(i)} y={tileTop - 14} rot={90} kind={cfg.header} />
              <Arrow x={row2[i]} y={tileBot + 15} rot={90} kind={cfg.collector} />
            </g>
          ))}
          <Arrow x={row2[3]} y={tileBot + 15} rot={-90} kind={cfg.collector} />
          <Arrow x={xs[0]} y={y1 + 58 + 14} rot={-90} kind="reuse" />
          <Pump x={xs[5]} y={(y1 + 58 + hy) / 2 + 6} />
          <Pump x={xs[0]} y={reuseMid} />

          {/* pipe captions: each one sits in clear space, away from pipes and labels */}
          <text className="cap" x={(bx(1) + bx(2)) / 2} y={hy + 26} textAnchor="middle">{cfg.caps.header}</text>
          <text className="cap" x={(row2[1] + row2[2]) / 2} y={collY + 22} textAnchor="middle">{cfg.caps.collector}</text>
          <text className="cap reuse" x={xs[0] + 24} y={reuseMid - 4}>{cfg.caps.reuse}</text>
          <text className="cap reuse big" x={xs[0] + 24} y={reuseMid + 20}>{val(cfg.reuseVal.id, cfg.reuseVal.k)} %</text>

          {/* live instrument tags */}
          {cfg.tags.map((t, i) => <Tag key={i} x={gaps[i]} y={pipeY} code={t.code} value={val(t.id, t.k)} unit={t.unit} />)}

          {/* equipment */}
          {cfg.equip.map((e, i) => {
            const tone = tones[e.id];
            // bottom-row labels end just left of the pipe that enters the tile, so the pipe never crosses the text
            const side = i >= 6 && i !== 9;
            const full = `${e.n} · ${e.name}`;
            return (
              <g key={e.id} transform={`translate(${x(i)} ${y(i)})`} className={`eq ${tone} ${sel === e.id ? "on" : ""}`}
                role="button" tabIndex={0} aria-pressed={sel === e.id} aria-label={`${e.name}, ${tone === "good" ? "normal" : tone === "warn" ? "warning" : "alarm"}`}
                onClick={() => onSelect(e.id)} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onSelect(e.id); } }}>
                <rect className="halo" x={-58} y={-64} width={116} height={128} rx={9} />
                <rect className="tile" x={-52} y={-58} width={104} height={116} rx={5} />
                <g clipPath="url(#tileclip)">{cfg.symbol(e.id, num)}</g>
                <g transform={`translate(${side ? 24 : 0} -70)`}>
                  <text className="lbl" x={0} y={0} textAnchor={side ? "end" : "middle"}><tspan className="dot">●</tspan><tspan dx={6}>{full}</tspan></text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };
}
