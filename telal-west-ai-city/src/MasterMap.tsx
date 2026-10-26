import type { KeyboardEvent, ReactNode } from "react";
import { BOUNDARY, DIMS, NEIGHBORS, ZONES, type Pt, type ZoneId } from "./data";

/** straight-edged polygon */
const poly = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ") + "Z";

/** water in the golf corridor: x, y, rx, ry */
const LAGOONS: [number, number, number, number][] = [[505, 372, 9, 24], [514, 462, 8, 20], [585, 614, 24, 30], [548, 560, 7, 14], [510, 700, 10, 22]];
/** main roads around the land, drawn lightly behind the zones */
const ROADS = [
  "M150 700 L395 405", "M160 762 L448 968", "M470 968 Q640 800 800 728 T1112 692 L1232 668", "M1168 140 Q1215 400 1168 580 L1158 720 L1180 960", "M300 168 L700 168",
];

export const FULL_VIEW = "150 140 1100 820";

interface Props {
  hover?: ZoneId | null; selected?: ZoneId | null;
  onHover?: (id: ZoneId | null) => void; onSelect?: (id: ZoneId) => void;
  dims?: boolean; neighbors?: boolean; grow?: boolean;
  /** the part of the map on screen; changing it zooms */
  viewBox?: string;
  /** zones drawn quietly and not clickable, so something else can sit on top */
  muted?: boolean;
  /** replaces the land-use colour of a zone (heat colouring) */
  fills?: Partial<Record<ZoneId, string>>;
  labels?: boolean;
  children?: ReactNode;
  className?: string;
}

/** the zoning map of the brief, redrawn in SVG so every zone can be hovered, selected, coloured and animated */
export default function MasterMap({ hover = null, selected = null, onHover, onSelect, dims = false, neighbors = false, grow = true, viewBox = FULL_VIEW, muted = false, fills, labels = true, children, className = "" }: Props) {
  const active = muted ? null : hover ?? selected;
  const interactive = (id: ZoneId, name: string, feddan: number) => muted ? { "aria-hidden": true } : {
    tabIndex: 0, role: "button", "aria-label": `${name}, ${feddan} feddan`, "aria-pressed": selected === id,
    onMouseEnter: () => onHover?.(id), onMouseLeave: () => onHover?.(null), onFocus: () => onHover?.(id), onBlur: () => onHover?.(null),
    onClick: () => onSelect?.(id), onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(id); } },
  };
  return (
    <svg className={`mm ${active ? "has-active" : ""} ${grow ? "grown" : ""} ${muted ? "muted" : ""} ${className}`} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Master plan of Telal West with eight land-use zones">
      <defs>
        <pattern id="mm-plots" width="13" height="13" patternUnits="userSpaceOnUse"><rect x="2" y="2" width="8" height="8" rx="1.5" fill="#fff" opacity=".2" /></pattern>
        <pattern id="mm-blocks" width="26" height="22" patternUnits="userSpaceOnUse"><rect x="2" y="2" width="19" height="15" rx="1" fill="#fff" opacity=".2" /></pattern>
        <pattern id="mm-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="12" stroke="var(--gold)" strokeWidth="1" opacity=".35" /></pattern>
      </defs>

      <g className="mm-roads" aria-hidden>{ROADS.map((d, i) => <path key={i} d={d} />)}</g>
      <path className="mm-train" d="M170 770 L440 975" aria-hidden />
      <text className="mm-road-t" transform="translate(226 856) rotate(37)">High-speed train route</text>

      {neighbors && <g className="mm-nb" aria-hidden>
        <path className="mm-nb-block" d="M722 214 L1085 214 L1085 470 L716 470 Z" fill="url(#mm-hatch)" />
        {NEIGHBORS.map((n) => <text key={n.text} transform={`translate(${n.at[0]} ${n.at[1]}) rotate(${n.rot ?? 0})`} textAnchor="middle">{n.text}</text>)}
      </g>}

      <path className="mm-land" d={poly(BOUNDARY)} />

      <g className="mm-zones">
        {ZONES.map((z, i) => (
          <g key={z.id} className={`zone z-${z.id} ${active === z.id ? "hot" : ""} ${selected === z.id ? "sel" : ""}`} style={{ ["--zc" as string]: fills?.[z.id] ?? `var(${z.color})`, ["--n" as string]: i }} {...interactive(z.id, z.name, z.feddan)}>
            {z.polys.map((pts: Pt[], k: number) => (
              <g key={k}>
                <path className="zp" d={poly(pts)} />
                {z.id !== "golf" && <path className="zp-tex" d={poly(pts)} fill={z.id === "commercial" ? "url(#mm-blocks)" : "url(#mm-plots)"} />}
              </g>
            ))}
            {z.id === "golf" && LAGOONS.map(([cx, cy, rx, ry], k) => <ellipse key={k} className="lagoon" cx={cx} cy={cy} rx={rx} ry={ry} style={{ ["--k" as string]: k }} />)}
            {labels && !muted && z.labels.map((l, k) => (
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

      {children}

      <g className="mm-north" transform="translate(1190 880)" aria-hidden>
        <circle r="26" /><path d="M0 -17 L8 9 L0 3 L-8 9 Z" /><text y="-31" textAnchor="middle">N</text>
      </g>
    </svg>
  );
}
