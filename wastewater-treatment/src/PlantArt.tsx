import type { ReactNode } from "react";

/** Isometric drawings for the Plant board: the treatment plant and a pump skid. Pure SVG, animated with CSS. */

const U = 21;
const OX = 212;
const OY = 52;
const pt = (x: number, y: number, z = 0): [number, number] => [OX + (x - y) * 0.866 * U, OY + (x + y) * 0.5 * U - z];
const pts = (a: [number, number][]) => a.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
const RY = 0.7071 * U;
const RX = 1.2247 * U;

type Tri = [string, string, string]; // top, left face, right face
const WHITE: Tri = ["#f6fafb", "#c4d1d7", "#9db0b9"];
const SAND: Tri = ["#f1ead8", "#d3c7a8", "#b0a283"];

function Box({ x, y, w, d, h, c, z = 0, win = 0 }: { x: number; y: number; w: number; d: number; h: number; c: Tri; z?: number; win?: number }) {
  const wins = [];
  for (let i = 0; i < win; i++) {
    const u0 = x + 0.35 + (i * (w - 0.7)) / win;
    const u1 = u0 + (w - 0.7) / win - 0.28;
    wins.push(<polygon key={i} points={pts([pt(u0, y + d, z + h * 0.35), pt(u1, y + d, z + h * 0.35), pt(u1, y + d, z + h * 0.7), pt(u0, y + d, z + h * 0.7)])} fill="#3aa8e8" opacity=".85" />);
  }
  return (
    <g>
      <polygon points={pts([pt(x, y + d, z), pt(x + w, y + d, z), pt(x + w, y + d, z + h), pt(x, y + d, z + h)])} fill={c[1]} />
      <polygon points={pts([pt(x + w, y, z), pt(x + w, y + d, z), pt(x + w, y + d, z + h), pt(x + w, y, z + h)])} fill={c[2]} />
      <polygon points={pts([pt(x, y, z + h), pt(x + w, y, z + h), pt(x + w, y + d, z + h), pt(x, y + d, z + h)])} fill={c[0]} />
      {wins}
    </g>
  );
}

function Cyl({ cx, cy, r, h, grad, top, dome = 0, children }: { cx: number; cy: number; r: number; h: number; grad: string; top: string; dome?: number; children?: ReactNode }) {
  const [sx, sy] = pt(cx, cy);
  const rx = r * RX, ry = r * RY, ty = sy - h;
  return (
    <g>
      <ellipse cx={sx} cy={sy + 1} rx={rx * 1.04} ry={ry * 1.04} fill="rgba(0,0,0,.28)" />
      <path d={`M${sx - rx} ${ty} L${sx - rx} ${sy} A${rx} ${ry} 0 0 0 ${sx + rx} ${sy} L${sx + rx} ${ty} Z`} fill={`url(#${grad})`} />
      <ellipse cx={sx} cy={ty} rx={rx} ry={ry} fill={top} />
      {dome > 0 && <path d={`M${sx - rx} ${ty} A${rx} ${dome} 0 0 1 ${sx + rx} ${ty} A${rx} ${ry} 0 0 1 ${sx - rx} ${ty} Z`} fill={`url(#${grad})`} />}
      {children}
    </g>
  );
}

function Pipe({ path, kind }: { path: [number, number][]; kind: "sludge" | "clean" | "raw" }) {
  return <polyline className={`kp-pipe ${kind}`} points={pts(path.map(([x, y]) => pt(x, y, 1.5)))} />;
}

function Tag({ x, y, label, value, tone = "teal" }: { x: number; y: number; label: string; value: string; tone?: "teal" | "warm" | "cool" }) {
  const w = 14 + Math.max(label.length, value.length) * 6.6;
  return (
    <g className={`kp-tag ${tone}`}>
      <line x1={x} y1={y} x2={x} y2={y + 16} />
      <circle cx={x} cy={y + 16} r="2.6" />
      <rect x={x - w / 2} y={y - 31} width={w} height="33" rx="6" />
      <text x={x} y={y - 19} textAnchor="middle" className="l">{label}</text>
      <text x={x} y={y - 5} textAnchor="middle" className="v">{value}</text>
    </g>
  );
}

export function PlantArt({ inflow, o2, gas }: { inflow: string; o2: string; gas: string }) {
  const A = pt(4.4, 7.2), B = pt(9.6, 7.6);
  const slabTop = [pt(0, 0), pt(16, 0), pt(16, 11), pt(0, 11)];
  const T = 15;
  return (
    <svg viewBox="0 0 520 372" role="img" aria-label="Treatment plant, isometric view" className="pl2-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="pa-white" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9fb1ba" /><stop offset=".38" stopColor="#f4f8f9" /><stop offset="1" stopColor="#a9bac2" /></linearGradient>
        <linearGradient id="pa-grey" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7f929b" /><stop offset=".4" stopColor="#d3dde1" /><stop offset="1" stopColor="#8799a2" /></linearGradient>
        <linearGradient id="pa-rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#b6c4cb" /><stop offset=".4" stopColor="#f2f6f8" /><stop offset="1" stopColor="#a5b5bd" /></linearGradient>
        <linearGradient id="pa-water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5cc8ff" /><stop offset="1" stopColor="#1b7fc4" /></linearGradient>
        <radialGradient id="pa-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#2bd4d0" stopOpacity=".5" /><stop offset="1" stopColor="#2bd4d0" stopOpacity="0" /></radialGradient>
      </defs>

      <ellipse cx={OX + 40} cy={OY + 150} rx="270" ry="120" fill="url(#pa-glow)" className="pa-pulse" />

      {/* ground slab */}
      <polygon points={pts([pt(0, 11, 0), pt(16, 11, 0), pt(16, 11, -T), pt(0, 11, -T)])} fill="#6b4a2b" />
      <polygon points={pts([pt(16, 0, 0), pt(16, 11, 0), pt(16, 11, -T), pt(16, 0, -T)])} fill="#8a6338" />
      <polygon points={pts(slabTop)} fill="#9ccf3f" />
      <polygon points={pts([pt(0.2, 0.2), pt(9.4, 0.2), pt(9.4, 4.6), pt(0.2, 4.6)])} fill="#d8dfe2" />
      <polygon points={pts([pt(0, 9.9), pt(16, 9.9), pt(16, 10.8), pt(0, 10.8)])} fill="#4a5258" />
      <polyline points={pts([pt(0.4, 10.35), pt(15.6, 10.35)])} stroke="#e8edef" strokeWidth="1.4" strokeDasharray="6 5" fill="none" />

      <Pipe kind="sludge" path={[[8.8, 2.4], [10.6, 2.4], [10.6, 3.6], [12.6, 3.6]]} />
      <Pipe kind="raw" path={[[6.6, 4.4], [6.6, 7.2]]} />
      <Pipe kind="clean" path={[[6.6, 8.0], [7.6, 8.0]]} />
      <Pipe kind="clean" path={[[11.6, 8.0], [13.2, 8.0], [13.2, 6.8]]} />

      {/* back to front */}
      <Box x={0.6} y={0.6} w={3} d={2.2} h={22} c={WHITE} win={3} />
      <Box x={4.4} y={0.6} w={4.4} d={3.4} h={32} c={SAND} win={4} />
      <Box x={4.4} y={0.6} w={4.4} d={3.4} h={4} z={32} c={["#7fb7d6", "#5f93b3", "#4a7c9b"]} />

      {/* clarifier A */}
      <Cyl cx={4.4} cy={7.2} r={2.2} h={8} grad="pa-rim" top="#e9eef0">
        <ellipse cx={A[0]} cy={A[1] - 8} rx={RX * 2.2 * 0.88} ry={RY * 2.2 * 0.88} fill="url(#pa-water)" />
        <ellipse className="pa-shimmer" cx={A[0] - 8} cy={A[1] - 10} rx={RX * 2.2 * 0.4} ry={RY * 2.2 * 0.3} fill="#fff" />
        <g transform={`translate(${A[0]} ${A[1] - 8}) scale(1 .5774)`}><g className="bd-spin slow"><line x1="-47" y1="0" x2="47" y2="0" stroke="#f4fbff" strokeWidth="3" /><circle r="4" fill="#dfeaef" /></g></g>
      </Cyl>

      {/* digesters */}
      {[[11.4, 1.8], [13.9, 2.4], [12.6, 3.9]].map(([x, y], i) => {
        const [sx, sy] = pt(x, y);
        return (
          <Cyl key={i} cx={x} cy={y} r={1.0} h={40} grad="pa-white" top="#f4f8f9" dome={13}>
            <path d={`M${sx - 18} ${sy - 28} H${sx + 18}`} stroke="rgba(31,111,209,.55)" strokeWidth="2" fill="none" />
            <circle className="rise" cx={sx - 6} cy={sy - 46} r="1.8" style={{ ["--d" as string]: `${i * 0.7}s` }} />
            <circle className="rise" cx={sx + 5} cy={sy - 50} r="1.4" style={{ ["--d" as string]: `${i * 0.7 + 1.1}s` }} />
            <circle className="pa-beacon" cx={sx} cy={sy - 56} r="2.6" style={{ ["--d" as string]: `${i * 0.5}s` }} />
          </Cyl>
        );
      })}

      {/* clarifier B */}
      <Cyl cx={9.6} cy={7.6} r={2.0} h={8} grad="pa-rim" top="#e9eef0">
        <ellipse cx={B[0]} cy={B[1] - 8} rx={RX * 2.0 * 0.88} ry={RY * 2.0 * 0.88} fill="url(#pa-water)" />
        <ellipse className="pa-shimmer" cx={B[0] + 10} cy={B[1] - 10} rx={RX * 2.0 * 0.4} ry={RY * 2.0 * 0.3} fill="#fff" style={{ animationDelay: "1.2s" }} />
        <g transform={`translate(${B[0]} ${B[1] - 8}) scale(1 .5774)`}><g className="bd-spin"><line x1="-43" y1="0" x2="43" y2="0" stroke="#f4fbff" strokeWidth="3" /><circle r="4" fill="#dfeaef" /></g></g>
      </Cyl>

      {/* storage tanks */}
      <Cyl cx={14.4} cy={6.6} r={1.05} h={18} grad="pa-grey" top="#dfe8ec" />
      <Cyl cx={14.5} cy={8.5} r={1.05} h={18} grad="pa-grey" top="#dfe8ec" />

      <Tag x={pt(6.6, 2.3, 38)[0]} y={pt(6.6, 2.3, 38)[1]} label="INFLUENT" value={inflow} tone="cool" />
      <Tag x={pt(12.6, 3.0, 66)[0]} y={pt(12.6, 3.0, 66)[1]} label="BIOGAS" value={gas} tone="warm" />
      <Tag x={A[0]} y={A[1] - 30} label="AERATION O₂" value={o2} />
    </svg>
  );
}

export function PumpArt() {
  return (
    <svg viewBox="0 0 124 76" aria-hidden className="pump-art">
      <defs>
        <linearGradient id="pm-motor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5aa0ff" /><stop offset=".45" stopColor="#2563c9" /><stop offset="1" stopColor="#12306f" /></linearGradient>
        <radialGradient id="pm-volute" cx=".38" cy=".35" r=".8"><stop offset="0" stopColor="#8fc4ff" /><stop offset=".55" stopColor="#2f72dd" /><stop offset="1" stopColor="#14327a" /></radialGradient>
      </defs>
      <ellipse cx="62" cy="68" rx="52" ry="6" fill="rgba(0,0,0,.4)" />
      <polygon points="6,56 60,42 116,56 62,70" fill="#dde5e9" />
      <polygon points="6,56 62,70 62,74 6,60" fill="#9fb0b8" />
      <polygon points="62,70 116,56 116,60 62,74" fill="#7d8e97" />
      <rect x="18" y="26" width="52" height="28" rx="8" fill="url(#pm-motor)" />
      <ellipse cx="20" cy="40" rx="6" ry="14" fill="#1a3f93" />
      {[30, 40, 50, 60].map((x) => <line key={x} x1={x} y1="27" x2={x} y2="53" stroke="rgba(8,24,64,.55)" strokeWidth="2" />)}
      <rect x="68" y="35" width="8" height="12" fill="#b9c6cc" />
      <circle cx="90" cy="42" r="19" fill="url(#pm-volute)" />
      <circle cx="90" cy="42" r="10" fill="#0f2a66" />
      <g transform="translate(90 42)"><g className="bd-spin"><path d="M-8 0 H8 M0 -8 V8" stroke="#8fd0ff" strokeWidth="2.4" strokeLinecap="round" /></g></g>
      <rect x="84" y="10" width="12" height="14" fill="#2a64c8" />
      <rect x="80" y="7" width="20" height="5" rx="1.5" fill="#cfd9de" />
    </svg>
  );
}

/** Network: a glossy clarifier tank with a sweeping scraper bridge */
export function ClarifierArt() {
  return (
    <svg viewBox="0 0 220 170" aria-hidden className="cl-art" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="cl-wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5aa6d6" /><stop offset=".4" stopColor="#c9ecff" /><stop offset="1" stopColor="#4a90c4" /></linearGradient>
        <radialGradient id="cl-water" cx=".4" cy=".35" r=".8"><stop offset="0" stopColor="#7fdcff" /><stop offset=".6" stopColor="#25a9e8" /><stop offset="1" stopColor="#1273b8" /></radialGradient>
        <radialGradient id="cl-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#2bd4d0" stopOpacity=".55" /><stop offset="1" stopColor="#2bd4d0" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="110" cy="110" rx="104" ry="52" fill="url(#cl-glow)" className="pa-pulse" />
      <ellipse cx="110" cy="118" rx="92" ry="40" fill="rgba(0,0,0,.35)" />
      <path d="M18 98 V114 A92 40 0 0 0 202 114 V98 Z" fill="url(#cl-wall)" />
      <ellipse cx="110" cy="98" rx="92" ry="40" fill="#e6f4fb" />
      <ellipse cx="110" cy="98" rx="80" ry="34" fill="url(#cl-water)" />
      <ellipse className="pa-shimmer" cx="92" cy="90" rx="30" ry="9" fill="#fff" />
      <ellipse className="pa-shimmer" cx="140" cy="108" rx="22" ry="6" fill="#fff" style={{ animationDelay: "1.4s" }} />
      <g transform="translate(110 98) scale(1 .4)"><g className="bd-spin slow"><line x1="-80" y1="0" x2="80" y2="0" stroke="#f4fbff" strokeWidth="4" /><circle r="9" fill="#dcecf3" /></g></g>
      <ellipse cx="110" cy="96" rx="9" ry="4" fill="#f4fbff" />
      <path d="M110 96 V74" stroke="#cfe3ec" strokeWidth="3" />
      <circle className="rise" cx="76" cy="104" r="2.2" style={{ ["--d" as string]: "0s" }} />
      <circle className="rise" cx="146" cy="100" r="1.8" style={{ ["--d" as string]: ".9s" }} />
      <circle className="rise" cx="120" cy="112" r="1.6" style={{ ["--d" as string]: "1.6s" }} />
    </svg>
  );
}

/** Pumps: a large cutaway of a centrifugal pump and its motor; spins and flows when running */
export function PumpHero({ running, hot }: { running: boolean; hot: boolean }) {
  return (
    <svg viewBox="0 0 560 300" role="img" aria-label="Centrifugal pump cutaway" className="ph-art" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="ph-motor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6fb0ff" /><stop offset=".45" stopColor="#2563c9" /><stop offset="1" stopColor="#10285f" /></linearGradient>
        <radialGradient id="ph-volute" cx=".38" cy=".32" r=".85"><stop offset="0" stopColor="#9fd0ff" /><stop offset=".55" stopColor="#2f72dd" /><stop offset="1" stopColor="#12306f" /></radialGradient>
        <linearGradient id="ph-pipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9e6ec" /><stop offset=".5" stopColor="#8fa7b3" /><stop offset="1" stopColor="#4d6573" /></linearGradient>
        <radialGradient id="ph-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#2bd4d0" stopOpacity=".5" /><stop offset="1" stopColor="#2bd4d0" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="280" cy="236" rx="270" ry="50" fill="url(#ph-glow)" className="pa-pulse" />
      <polygon points="30,244 280,206 540,244 290,284" fill="#dde6ea" />
      <polygon points="30,244 290,284 290,292 30,252" fill="#9fb0b8" />
      <polygon points="290,284 540,244 540,252 290,292" fill="#7d8e97" />

      <rect x="6" y="150" width="130" height="34" fill="url(#ph-pipe)" />
      <rect x="126" y="142" width="14" height="50" rx="2" fill="#cfd9de" />
      <path d="M6 167 H128" className={`kp-pipe clean ${running ? "" : "still"}`} />
      <path d="M210 90 V40 H380" className={`kp-pipe clean ${running ? "" : "still"}`} fill="none" />
      <rect x="198" y="52" width="24" height="46" fill="url(#ph-pipe)" />
      <rect x="198" y="26" width="190" height="24" rx="3" fill="url(#ph-pipe)" />
      <rect x="380" y="20" width="14" height="36" rx="2" fill="#cfd9de" />
      <path d="M210 38 H386" className={`kp-pipe clean ${running ? "" : "still"}`} />

      <circle cx="210" cy="168" r="82" fill="url(#ph-volute)" />
      <circle cx="210" cy="168" r="64" fill="#0e2457" stroke="#8fd0ff" strokeOpacity=".5" />
      <g transform="translate(210 168)"><g className={running ? "bd-spin" : "bd-spin off"}>
        <circle r="26" fill="#2f72dd" stroke="#8fd0ff" />
        {Array.from({ length: 6 }, (_, i) => <path key={i} d="M0 0 C16 -20 30 -18 40 0" transform={`rotate(${i * 60})`} fill="none" stroke="#8fd0ff" strokeWidth="3.4" strokeLinecap="round" />)}
      </g></g>

      <rect x="290" y="161" width="70" height="14" fill="#c4d0d6" />
      <rect x="300" y="146" width="22" height="44" rx="3" className={hot ? "ph-bear hot" : "ph-bear"} />
      <rect x="350" y="106" width="160" height="124" rx="10" fill="url(#ph-motor)" />
      {Array.from({ length: 8 }, (_, i) => <rect key={i} x={364 + i * 17} y="106" width="6" height="124" fill="rgba(8,24,64,.55)" />)}
      <ellipse cx="510" cy="168" rx="16" ry="62" fill="#1a3f93" />
      <circle cx="510" cy="168" r="22" fill="#12306f" stroke="#8fd0ff" strokeOpacity=".5" />
      <g transform="translate(510 168)"><g className={running ? "bd-spin" : "bd-spin off"}><path d="M-14 0 H14 M0 -14 V14" stroke="#8fd0ff" strokeWidth="2.6" strokeLinecap="round" /></g></g>

      <text x="14" y="140" className="ph-t">SUCTION</text>
      <text x="236" y="16" className="ph-t">DISCHARGE</text>
      <text x="400" y="252" className="ph-t">MOTOR</text>
      <g className={hot ? "ph-tag hot" : "ph-tag"}><rect x="268" y="108" width="86" height="22" rx="6" /><text x="311" y="123" textAnchor="middle">{hot ? "BEARING HOT" : "BEARING OK"}</text></g>
    </svg>
  );
}
