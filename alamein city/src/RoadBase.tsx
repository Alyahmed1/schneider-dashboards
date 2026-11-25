import { memo, useEffect, useRef, useState } from "react";
import { COAST, NEW_ALAMEIN_S, ROAD, ROAD_H, ROAD_W, SEGMENTS } from "./road";
import { makePath } from "./geo";
import { rng } from "./live";
import { paintTerrain, type Lake } from "./terrain";
import { useSimTime, type Clock } from "./PanZoom";

/* The picture under the road: a painted satellite-style terrain, then New Alamein City, the airport, the Cairo road and the highway itself.
   All of it is schematic and decorative; only the road geometry (road.ts) drives the data. */
export const COAST_PATH = makePath(COAST, 24);
const SEA_D = `${COAST_PATH.d}L${ROAD_W + 10} -10L-10 -10Z`;
export const CITY_X = ROAD.at(NEW_ALAMEIN_S).x;
export const CITY_Y = ROAD.at(NEW_ALAMEIN_S).y;
const CITY_D = `M${CITY_X - 170} ${CITY_Y - 96} q14 -64 150 -70 t170 6 q36 38 -8 86 q-80 38 -170 34 t-142 -56z`;

const COAST_Y = (() => {
  const a = new Float32Array(ROAD_W + 1).fill(NaN);
  for (let i = 0; i <= 4000; i++) { const p = COAST_PATH.at(i / 4000), x = Math.round(p.x); if (x >= 0 && x <= ROAD_W) a[x] = p.y; }
  let last = 150;
  for (let x = 0; x <= ROAD_W; x++) { if (Number.isNaN(a[x])) a[x] = last; else last = a[x]; }
  return a;
})();

const CAIRO = ROAD.at(0.65);
const CAIRO_PATH = makePath([[CAIRO.x, CAIRO.y], [CAIRO.x - 14, CAIRO.y + 90], [CAIRO.x + 22, CAIRO.y + 200], [CAIRO.x + 6, ROAD_H + 20]], 20);
const AIR = ROAD.at(0.4);
const AX = AIR.x, AY = AIR.y + 112;
const LAKES: Lake[] = [{ cx: 200, cy: 590, rx: 100, ry: 22 }, { cx: 1070, cy: 612, rx: 125, ry: 25 }, { cx: 1195, cy: 500, rx: 62, ry: 14 }];

let terrainUrl: string | null = null;
let terrainJob: Promise<string> | null = null;
function useTerrain() {
  const [url, setUrl] = useState<string | null>(terrainUrl);
  useEffect(() => {
    if (terrainUrl) return;
    let live = true;
    terrainJob ??= paintTerrain(ROAD_W, ROAD_H, COAST_Y, LAKES).then((b) => (terrainUrl = URL.createObjectURL(b)));
    terrainJob.then((u) => { if (live) setUrl(u); }).catch(() => { /* the flat colours stay */ });
    return () => { live = false; };
  }, []);
  return url;
}

const SHIPS: [number, number, number, number][] = [[260, 58, 8, 1], [820, 40, -168, 0.9], [1130, 78, 6, 1.1], [520, 20, 190, 0.8]];

const Asphalt = ({ d, w }: { d: string; w: number }) => (
  <g>
    <path d={d} className="rd-shoulder" style={{ strokeWidth: w + 7 }} />
    <path d={d} className="rd-case" style={{ strokeWidth: w }} />
  </g>
);

export const RoadBase = memo(function RoadBase() {
  const terrain = useTerrain();
  return (
    <g>
      <defs>
        <pattern id="rd-blocks" width="12" height="10.5" patternUnits="userSpaceOnUse" patternTransform="rotate(-9)">
          <rect width="12" height="10.5" fill="#9a9282" /><rect x="1" y="1" width="4.4" height="3.8" rx=".8" fill="#efe9db" /><rect x="6.4" y="1" width="4.6" height="3.8" rx=".8" fill="#e2d9c6" />
          <rect x="1" y="5.8" width="10" height="3.7" rx=".8" fill="#f6f1e5" />
        </pattern>
        <pattern id="rd-lightdots" width="9" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-9)">
          <circle cx="2.5" cy="2.2" r="1.5" fill="#ffd08a" /><circle cx="7" cy="2.2" r="1.3" fill="#fff0c8" /><circle cx="4.5" cy="6" r="1.4" fill="#ffc46b" />
        </pattern>
        <radialGradient id="rd-glow"><stop offset="0" stopColor="#ffb85a" stopOpacity=".8" /><stop offset="1" stopColor="#ffb85a" stopOpacity="0" /></radialGradient>
        <linearGradient id="rd-sweepg" x1="0" x2="1"><stop offset="0" stopColor="#7ff0f4" stopOpacity="0" /><stop offset=".9" stopColor="#7ff0f4" stopOpacity=".10" /><stop offset="1" stopColor="#bffcff" stopOpacity=".34" /></linearGradient>
        <clipPath id="rd-cityclip"><path d={CITY_D} /></clipPath>
      </defs>

      {/* flat colours show for a moment, then the painted terrain replaces them */}
      <rect width={ROAD_W} height={ROAD_H} className="rd-land" />
      <path d={SEA_D} className="rd-sea" />
      {terrain && <image href={terrain} x="0" y="0" width={ROAD_W} height={ROAD_H} preserveAspectRatio="none" />}
      <text x={ROAD_W / 2 + 110} y={50} textAnchor="middle" className="rd-region sea">MEDITERRANEAN SEA</text>
      <text x={ROAD_W / 2 - 40} y={ROAD_H - 22} textAnchor="middle" className="rd-region">WESTERN DESERT</text>

      {SHIPS.map(([x, y, a, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`} pointerEvents="none">
          <g className="rd-ship" style={{ animationDelay: `${-i * 9}s` }}>
            <path d="M-16 0L-70 -6M-16 0L-70 6" className="rd-wake" />
            <path d="M-15 0L-9 -4.6H9L16 0L9 4.6H-9Z" fill="#f4f7f9" stroke="#0b2433" strokeWidth=".8" /><rect x="-4" y="-2.4" width="8" height="4.8" rx="1" fill="#3b6f93" />
          </g>
        </g>
      ))}

      {/* Cairo road to the south, and the airport with its link road */}
      <Asphalt d={CAIRO_PATH.d} w={10} />
      <path d={CAIRO_PATH.d} className="rd-dash" />
            <Asphalt d={`M${AIR.x} ${AIR.y}Q${AX - 16} ${AY - 50} ${AX} ${AY - 10}`} w={8} />
      <g transform={`translate(${AX} ${AY}) rotate(-6)`}>
        <rect x="-110" y="-7" width="220" height="14" rx="2" className="rd-runway" />
        <path d="M-98 0H98" className="rd-runway-line" />
        <rect x="-26" y="-26" width="52" height="15" rx="2" fill="#e9e3d6" stroke="#8d8573" strokeWidth="1" />
        <rect x="-18" y="-22" width="36" height="7" rx="1.5" fill="#6f8ea6" />
      </g>
      
      {/* New Alamein City: blocks, a central circle, a lagoon and parks */}
      <path d={CITY_D} fill="#a39b8b" />
      <g clipPath="url(#rd-cityclip)">
        <path d={CITY_D} fill="url(#rd-blocks)" />
        <ellipse cx={CITY_X - 112} cy={CITY_Y - 104} rx="40" ry="15" fill="#7f9a5e" opacity=".9" /><ellipse cx={CITY_X + 118} cy={CITY_Y - 96} rx="34" ry="13" fill="#7f9a5e" opacity=".9" />
        <ellipse cx={CITY_X + 52} cy={CITY_Y - 112} rx="78" ry="17" fill="#2fb0a8" stroke="#eadfc4" strokeWidth="3" transform={`rotate(-5 ${CITY_X + 52} ${CITY_Y - 112})`} />
        <circle cx={CITY_X - 40} cy={CITY_Y - 112} r="31" fill="#d8b98c" stroke="#8f8676" strokeWidth="5" /><circle cx={CITY_X - 40} cy={CITY_Y - 112} r="14" fill="#a9c27d" />
      </g>
      <path d={CITY_D} className="rd-cityedge" />
      <path d={`M${CITY_X} ${CITY_Y - 62}V${CITY_Y}`} className="rd-access" /><path d={`M${CITY_X} ${CITY_Y - 62}V${CITY_Y}`} className="rd-access in" />
      <g className="rd-ramps"><ellipse cx={CITY_X - 30} cy={CITY_Y - 24} rx="26" ry="14" /><ellipse cx={CITY_X + 30} cy={CITY_Y + 24} rx="26" ry="14" /></g>

      {/* the highway: shoulders and asphalt */}
      <Asphalt d={ROAD.d} w={17} />

      {/* night: the picture darkens, the city, the airport and the road keep their lights */}
      <rect width={ROAD_W} height={ROAD_H} className="rd-night" pointerEvents="none" />
      <g className="rd-lights" pointerEvents="none">
        <ellipse cx={CITY_X + 5} cy={CITY_Y - 108} rx="230" ry="96" fill="url(#rd-glow)" />
        <path d={CITY_D} fill="url(#rd-lightdots)" />
        <ellipse cx={AX} cy={AY} rx="130" ry="36" fill="url(#rd-glow)" opacity=".6" />
        <path d={`M${AX - 100} ${AY - 6}H${AX + 100}`} stroke="#9fe0ff" strokeWidth="2" strokeDasharray="3 8" />
      </g>
      <g pointerEvents="none">
        <text x={CITY_X - 4} y={CITY_Y - 176} textAnchor="middle" className="rd-city-label">New Alamein City</text>
        <text x={AX} y={AY + 40} textAnchor="middle" className="rd-label small">Alamein Int’l Airport</text>
        <text x={CAIRO.x + 20} y={CAIRO.y + 176} className="rd-label small">To Cairo ▼</text>
      </g>
    </g>
  );
});

/* ---------- cars that ride on the road; they slow down where a segment is slow ---------- */
const CAR_COLORS = ["#f3f4f6", "#d7dde3", "#2d3640", "#c0392b", "#e6b422", "#3d7fb8", "#f3f4f6", "#9aa5b1"];
export function Cars({ clock, speeds, sk }: { clock: Clock; speeds: number[]; sk: number }) {
  const t = useSimTime(clock, 15);
  const st = useRef<{ s: number; dir: 1 | -1; v: number; col: string; len: number }[] | null>(null);
  const last = useRef(0);
  if (!st.current) {
    const r = rng(77);
    st.current = Array.from({ length: 56 }, (_, i) => ({ s: r(), dir: i % 2 ? 1 : -1, v: 0.85 + r() * 0.3, col: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)], len: r() > 0.84 ? 15 : 9 }));
  }
  const dt = Math.min(0.5, Math.max(0, t - last.current));
  last.current = t;
  for (const c of st.current) {
    const f = Math.max(0.15, speeds[Math.min(SEGMENTS - 1, Math.floor(c.s * SEGMENTS))] / 100);
    c.s = (c.s + (c.dir * c.v * f * dt) / 75 + 1) % 1;
  }
  return (
    <g pointerEvents="none">
      {st.current.map((c, i) => {
        const p = ROAD.at(c.s), a = (p.a * Math.PI) / 180, off = c.dir * 6 * sk;
        const x = p.x - Math.sin(a) * off, y = p.y + Math.cos(a) * off;
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(p.a + (c.dir < 0 ? 180 : 0)).toFixed(1)}) scale(${(sk * 1.3).toFixed(2)})`}>
            <ellipse cx={c.len / 2 + 6} cy="0" rx="9" ry="4.6" className="rd-beam" />
            <rect x={-c.len / 2} y="-2.5" width={c.len} height="5" rx="1.6" fill={c.col} className="rd-vehicle" />
            <rect x={-c.len / 2} y="-1.5" width="1.6" height="3" fill="#ff4b3a" />
          </g>
        );
      })}
    </g>
  );
}
