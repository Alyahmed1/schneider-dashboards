import { useMemo } from "react";
import { annular, pt, compass } from "./geo";
import { statusOf, type PivotState } from "./model";
import { RINGS, cellKind, underRings } from "./field";

/** the field seen from above in perspective: 8 rings x 60 sectors. Sectors behind the span are green (on target), orange (a nozzle on that ring is closed or faulty) or teal (being watered now); the rest is grey. */
const W = 660, H = 300, CX = 330, CY = 150, R = 292, SQ = 0.42;
const SECT = 60, HUB = 0.12;
const rr = (i: number) => R * (HUB + (1 - HUB) * (i / RINGS));

export default function PolarField({ p, label }: { p: PivotState; label: string }) {
  const cells = useMemo(() => {
    const out: { d: string; ring: number; c: number }[] = [];
    for (let i = 0; i < RINGS; i++) for (let j = 0; j < SECT; j++) {
      const a0 = compass(j * (360 / SECT)), a1 = compass((j + 1) * (360 / SECT));
      out.push({ d: annular(0, 0, rr(i), rr(i + 1), a0, a1), ring: i, c: (j + 0.5) * (360 / SECT) });
    }
    return out;
  }, []);

  const under = underRings(p);
  const st = statusOf(p);
  const fill = (ring: number, c: number) => cellKind(p, under, ring, c);
  const [ax, ay] = pt(0, 0, R + 6, compass(p.angle));
  const [b0x, b0y] = pt(0, 0, R, compass(p.angle - 5));
  const [b1x, b1y] = pt(0, 0, R, compass(p.angle + 5));
  const towers = Array.from({ length: 7 }, (_, i) => pt(0, 0, R * (0.2 + 0.8 * ((i + 1) / 7)), compass(p.angle)));
  const cyc = Math.round((p.angle / 360) * 100);

  return (
    <svg className="pf" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${label} seen from above, span at ${Math.round(p.angle)} degrees`}>
      <ellipse cx={CX} cy={CY + 10} rx={R + 8} ry={(R + 8) * SQ} fill="rgba(0,0,0,.45)" />
      <g transform={`translate(${CX} ${CY}) scale(1 ${SQ})`}>
        <circle r={R + 6} className="pf-rim" />
        {cells.map((c, k) => <path key={k} d={c.d} className={`cell ${fill(c.ring, c.c)}`} />)}
        <path d={`M0 0L${b0x} ${b0y}L${b1x} ${b1y}Z`} className={`beam ${p.running ? "go" : ""}`} />
        <line x1={0} y1={0} x2={ax} y2={ay} className={`arm ${st}`} />
        {towers.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4.5} className="arm-t" />)}
        <circle r={9} className="pf-hub" />
      </g>
      <line x1={CX} y1={0} x2={CX} y2={CY} className="link" />
      <circle cx={CX} cy={CY} r={4} className="link-dot" />

      <text x={10} y={22} className="pf-t">{label}</text>
      <text x={W - 10} y={22} textAnchor="end" className="pf-t">Cycle <tspan className="pf-v">{cyc}%</tspan></text>
      <text x={W - 10} y={H - 8} textAnchor="end" className="pf-t">Position <tspan className="pf-v">{Math.round(p.angle)}°</tspan></text>
      {([["ok", "Applied"], ["under", "Under-applied"], ["wet", "Watering"], ["pend", "Pending"]] as const).map(([k, t], i) => (
        <g key={k} transform={`translate(10 ${H - 48 + i * 14})`}>
          <rect width={9} height={9} y={-8} className={`cell ${k}`} /><text x={15} y={0} className="pf-lg">{t}</text>
        </g>
      ))}
    </svg>
  );
}
