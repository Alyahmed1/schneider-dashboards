import { useContext } from "react";
import { PhoneContext } from "./stage";
import { NOZZLES, type Nz, type PivotState } from "./model";

/** side view of the span with its 16 nozzles (click one to open/close it) and the application depth profile below */
const W = 660, H = 190, X0 = 24, X1 = 636, PIPE = 62;
const towerX = Array.from({ length: 8 }, (_, i) => X0 + 10 + ((X1 - X0 - 10) * i) / 7);
const nzX = (i: number) => X0 + 36 + ((X1 - X0 - 50) * i) / (NOZZLES - 1);
const COL: Record<Nz, string> = { on: "#2bff6a", off: "#6f8790", fault: "#ff9a1f" };

export default function SpanView({ p, onNozzle }: { p: PivotState; onNozzle: (i: number) => void }) {
  const phone = useContext(PhoneContext);
  const slot = (X1 - X0 - 50) / (NOZZLES - 1);
  const BASE = 184, TOP = 124;
  const svg = (
    <svg className="sv" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Span and nozzles">
      <line x1={W / 2} y1={0} x2={W / 2} y2={H} className="link" />

      {/* truss: arches between the towers, a zig-zag and the water pipe */}
      {towerX.slice(0, -1).map((x, i) => {
        const nx = towerX[i + 1], m = (x + nx) / 2;
        return <path key={i} d={`M${x} ${PIPE}Q${m} ${PIPE - 44} ${nx} ${PIPE}`} className="truss" />;
      })}
      {Array.from({ length: 30 }, (_, i) => {
        const x = towerX[0] + ((towerX[7] - towerX[0]) * i) / 29;
        return <line key={i} x1={x} y1={PIPE} x2={x + 10} y2={PIPE - 14 - Math.sin((i / 29) * Math.PI * 7) * 8} className="truss thin" />;
      })}
      <line x1={X0} y1={PIPE} x2={X1} y2={PIPE} className="pipe" />
      {towerX.map((x, i) => (
        <g key={i} className="tower">
          <line x1={x} y1={PIPE} x2={x - 6} y2={PIPE + 22} />
          <line x1={x} y1={PIPE} x2={x + 6} y2={PIPE + 22} />
          <circle cx={x - 6} cy={PIPE + 24} r={2.6} /><circle cx={x + 6} cy={PIPE + 24} r={2.6} />
        </g>
      ))}
      <circle cx={X0} cy={PIPE} r={7} className="hub" />

      {/* nozzles V1..V16 */}
      {p.nozzles.map((s, i) => {
        const x = nzX(i);
        return (
          <g key={i} className={`nz ${s}`} role="button" tabIndex={0} aria-label={`Nozzle V${i + 1}, ${s === "on" ? "open" : s === "off" ? "closed" : "fault"}`} aria-pressed={s === "on"} onClick={() => onNozzle(i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNozzle(i); } }}>
            <rect x={x - slot / 2} y={PIPE + 6} width={slot} height={46} className="hit" />
            <line x1={x} y1={PIPE} x2={x} y2={PIPE + 12} stroke="#e8f4f0" strokeWidth={1.4} />
            {s === "on" && p.running && <circle cx={x} cy={PIPE + 20} r={7.5} className="ripple" style={{ animationDelay: `${(i % 6) * 0.3}s` }} />}
            <circle cx={x} cy={PIPE + 20} r={7.5} fill="rgba(4,20,18,.9)" stroke={COL[s]} strokeWidth={2.6} className={s === "fault" ? "blink" : ""} />
            <circle cx={x} cy={PIPE + 20} r={3} fill={COL[s]} />
            <text x={x} y={PIPE + 42} textAnchor="middle" className="nz-t">V{i + 1}</text>
          </g>
        );
      })}

      {/* application depth per nozzle, deeper towards the end of the span */}
      <line x1={X0} y1={BASE} x2={X1} y2={BASE} className="axis" />
      {p.nozzles.map((s, i) => {
        const h = (s === "off" ? 0 : s === "fault" ? 0.35 : 1) * (BASE - TOP - 14) * (0.28 + 0.72 * ((i + 1) / NOZZLES));
        const x = nzX(i) - slot / 2;
        return <rect key={i} x={x + 1} y={BASE - h} width={slot - 2} height={Math.max(h, 0)} className={`prof ${s}`} style={{ animationDelay: `${i * 25}ms` }} />;
      })}
      <text x={X0} y={TOP} className="sv-cap">Application per nozzle</text>
      <text x={X1} y={TOP} textAnchor="end" className="sv-cap">{p.nozzles.filter((n) => n === "on").length} of {NOZZLES} open</text>
    </svg>
  );
  // phone: the span keeps its real width (the 16 nozzles stay about 40 px wide, easy to tap) and is swiped sideways
  return phone ? <div className="sv-scroll" tabIndex={0} role="region" aria-label="Span and nozzles, scroll sideways">{svg}</div> : <div className="dcard sv-card">{svg}</div>;
}
