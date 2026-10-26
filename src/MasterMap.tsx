import { BOUNDARY, DIMS, NEIGHBORS, ZONES, type Pt, type Zone, type ZoneId } from "./data";

/** straight-edged polygon */
const poly = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ") + "Z";
const pathOf = (_z: Zone, pts: Pt[]) => poly(pts);

/** water in the golf corridor: x, y, rx, ry */
const LAGOONS: [number, number, number, number][] = [[505, 372, 9, 24], [514, 462, 8, 20], [585, 614, 24, 30], [548, 560, 7, 14], [510, 700, 10, 22]];
/** main roads around the land, drawn lightly behind the zones */
const ROADS = [
  "M150 700 L395 405", "M160 762 L448 968", "M470 968 Q640 800 800 728 T1112 692 L1232 668", "M1168 140 Q1215 400 1168 580 L1158 720 L1180 960", "M300 168 L700 168",
];

interface Props {
  hover: ZoneId | null; selected: ZoneId | null;
  onHover: (id: ZoneId | null) => void; onSelect: (id: ZoneId) => void;
  dims: boolean; neighbors: boolean; grow: boolean;
}

/** the zoning map of the brief, redrawn in SVG so every zone can be hovered, selected and animated */
export default function MasterMap({ hover, selected, onHover, onSelect, dims, neighbors, grow }: Props) {
  const active = hover ?? selected;
  return (
    <svg className={`mm ${active ? "has-active" : ""} ${grow ? "grown" : ""}`} viewBox="150 140 1100 820" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Master plan of Telal West with eight land-use zones">
      <defs>
        <pattern id="mm-plots" width="13" height="13" patternUnits="userSpaceOnUse"><rect x="2" y="2" width="8" height="8" rx="1.5" fill="#fff" opacity=".2" /></pattern>
        <pattern id="mm-blocks" width="26" height="22" patternUnits="userSpaceOnUse"><rect x="2" y="2" width="19" height="15" rx="1" fill="#fff" opacity=".2" /></pattern>
        <pattern id="mm-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="12" stroke="var(--gold)" strokeWidth="1" opacity=".35" /></pattern>
        <radialGradient id="mm-water" cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="var(--water)" stopOpacity=".95" /><stop offset="1" stopColor="var(--water)" stopOpacity=".6" /></radialGradient>
        <filter id="mm-shadow" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="6" stdDeviation="9" floodColor="#17382b" floodOpacity=".22" /></filter>
      </defs>

      <g className="mm-roads" aria-hidden>{ROADS.map((d, i) => <path key={i} d={d} />)}</g>
      <path className="mm-train" d="M170 770 L440 975" aria-hidden />
      <text className="mm-road-t" transform="translate(226 856) rotate(37)">High-speed train route</text>

      {neighbors && <g className="mm-nb" aria-hidden>
        <path className="mm-nb-block" d="M722 214 L1085 214 L1085 470 L716 470 Z" fill="url(#mm-hatch)" />
        {NEIGHBORS.map((n) => <text key={n.text} transform={`translate(${n.at[0]} ${n.at[1]}) rotate(${n.rot ?? 0})`} textAnchor="middle">{n.text}</text>)}
      </g>}

      <path className="mm-land" d={poly(BOUNDARY)} filter="url(#mm-shadow)" />

      <g className="mm-zones">
        {ZONES.map((z, i) => (
          <g key={z.id} className={`zone z-${z.id} ${active === z.id ? "hot" : ""} ${selected === z.id ? "sel" : ""}`} style={{ ["--zc" as string]: `var(${z.color})`, ["--n" as string]: i }}
            tabIndex={0} role="button" aria-label={`${z.name}, ${z.feddan} feddan`} aria-pressed={selected === z.id}
            onMouseEnter={() => onHover(z.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(z.id)} onBlur={() => onHover(null)}
            onClick={() => onSelect(z.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(z.id); } }}>
            {z.polys.map((pts, k) => (
              <g key={k}>
                <path className="zp" d={pathOf(z, pts)} />
                {z.id !== "golf" && z.id !== "future" && <path className="zp-tex" d={pathOf(z, pts)} fill={z.id === "commercial" ? "url(#mm-blocks)" : "url(#mm-plots)"} />}
              </g>
            ))}
            {z.id === "future" && <path className="zp-tex" d={poly(z.polys[0])} fill="url(#mm-plots)" />}
            {z.id === "golf" && LAGOONS.map(([cx, cy, rx, ry], k) => <ellipse key={k} className="lagoon" cx={cx} cy={cy} rx={rx} ry={ry} style={{ ["--k" as string]: k }} />)}
            {z.labels.map((l, k) => (
              <text key={k} className="zl" x={l.at[0]} y={l.at[1]} textAnchor="middle">
                {l.lines.map((t, j) => <tspan key={j} x={l.at[0]} dy={j ? 15 : 0}>{t}</tspan>)}
              </text>
            ))}
          </g>
        ))}
      </g>

      <path className="mm-edge" d={poly(BOUNDARY)} aria-hidden />

      {dims && <g className="mm-dims" aria-hidden>
        {DIMS.map((d) => <text key={d.text + d.at[0]} transform={`translate(${d.at[0]} ${d.at[1]}) rotate(${d.rot ?? 0})`} textAnchor="middle">{d.text}</text>)}
      </g>}

      <g className="mm-north" transform="translate(1190 880)" aria-hidden>
        <circle r="26" /><path d="M0 -17 L8 9 L0 3 L-8 9 Z" /><text y="-31" textAnchor="middle">N</text>
      </g>
    </svg>
  );
}
