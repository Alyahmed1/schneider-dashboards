import type { Sym } from "./cycleData";

/** equipment drawings, one 120 x 72 canvas each, same look as the wastewater Biogas tab (shaded tanks, glowing pipes, bubbles) */
export const Frame = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 120 72" aria-hidden>
    <ellipse cx="60" cy="68" rx="50" ry="3.5" className="ground" />
    {children}
  </svg>
);
export const Valve = ({ x, y }: { x: number; y: number }) => <g><path d={`M${x - 3} ${y - 3} L${x + 3} ${y + 3} V${y - 3} L${x - 3} ${y + 3}Z`} className="eq-bolt" /><path d={`M${x} ${y - 3} V${y - 7} M${x - 3} ${y - 7} H${x + 3}`} className="eq-line" strokeWidth="1.2" /></g>;
export const Gauge = ({ x, y }: { x: number; y: number }) => <g><circle cx={x} cy={y} r="4" className="eq-top" /><path d={`M${x} ${y} L${x + 2.5} ${y - 2}`} className="eq-line" strokeWidth="1" /></g>;
export const B = (x: number, y: number, d: number) => <circle cx={x} cy={y} r="1.7" className="rise" style={{ ["--d" as string]: `${d}s` }} />;
export const Tank = ({ cx, w, top, bottom, dome = false, liq = 0.5 }: { cx: number; w: number; top: number; bottom: number; dome?: boolean; liq?: number }) => {
  const x0 = cx - w / 2, x1 = cx + w / 2, ry = Math.max(4, w / 7), mid = top + (bottom - top) * (1 - liq);
  return (
    <g>
      <ellipse cx={cx} cy={bottom} rx={w / 2} ry={ry} className="eq" />
      <path d={`M${x0} ${bottom} V${top} a${w / 2} ${ry} 0 0 1 ${w} 0 V${bottom}`} className="eq" />
      <path d={`M${x0} ${mid} a${w / 2} ${ry} 0 0 0 ${w} 0 V${bottom} a${w / 2} ${ry} 0 0 1 ${-w} 0Z`} className="eq-liq" />
      {dome ? <path d={`M${x0} ${top} Q${cx} ${top - w * 0.55} ${x1} ${top}`} className="eq-dome" /> : <ellipse cx={cx} cy={top} rx={w / 2} ry={ry} className="eq-top" />}
      <path d={`M${x0 + 5} ${top + 3} V${bottom - 4}`} className="spec" />
      <path d={`M${x1 - 6} ${top + 4} V${bottom - 2} M${x1 - 2} ${top + 4} V${bottom - 2} M${x1 - 6} ${top + 10} H${x1 - 2} M${x1 - 6} ${top + 18} H${x1 - 2} M${x1 - 6} ${top + 26} H${x1 - 2}`} className="eq-line" strokeWidth="0.9" opacity="0.7" />
      <path d={`M${x0} ${bottom - 7} H${x1}`} className="band" />
      <circle cx={cx - w * 0.15} cy={bottom - 12} r="2.2" className="eq-top" />
    </g>
  );
};
export const Pipe = ({ d }: { d: string }) => <g><path d={d} className="pipe" /><path d={d} className="pipe-flow" /></g>;

export default function Eq({ kind }: { kind: Sym }) {
  switch (kind) {
    case "sea":
      return (
        <Frame>
          <path d="M0 38 Q15 30 30 38 T60 38 T90 38 T120 38 V72 H0Z" className="eq-liq" />
          <path d="M0 46 Q15 40 30 46 T60 46 T90 46 T120 46" className="spec" />
          <g className="bd-sway"><path d="M0 30 Q15 24 30 30 T60 30 T90 30 T120 30" className="eq-line" /><path d="M10 28 H26 L23 33 H13Z M18 28 V20 L25 28" className="eq-dome" /></g>
          <rect x="70" y="24" width="30" height="34" rx="4" className="eq" /><rect x="76" y="30" width="18" height="22" rx="2" className="eq-top" />
          <Pipe d="M70 50 H30" />{B(40, 58, 0)}{B(52, 62, 0.8)}{B(24, 52, 1.4)}
        </Frame>
      );
    case "river":
      return (
        <Frame>
          <path d="M0 44 Q20 30 40 40 T80 40 T120 34 V72 H0Z" className="eq-liq" />
          <path d="M0 54 Q20 44 40 52 T80 52 T120 46" className="spec" />
          <path d="M82 40 V18 H104 V40" className="eq" /><rect x="86" y="22" width="14" height="14" rx="2" className="eq-top" />
          <path d="M96 40 H104" className="eq-line" />
          <Pipe d="M82 44 H52" />{B(34, 58, 0.2)}{B(60, 60, 1)}
          <path d="M8 24 q6 -8 12 0 M24 18 q6 -8 12 0" className="eq-line" />
        </Frame>
      );
    case "wells":
      return (
        <Frame>
          <path d="M0 24 H120 V72 H0Z" className="eq-liq" />
          {[28, 60, 92].map((x, i) => (
            <g key={x}>
              <rect x={x - 5} y="6" width="10" height="56" rx="3" className="eq" /><rect x={x - 8} y="2" width="16" height="9" rx="3" className="eq-dome" />
              <path d={`M${x} 14 V54`} className="eq-line" /><g className="bd-spin slow"><circle cx={x} cy="56" r="4" className="eq-top" /></g>
              {B(x + 12, 52, i * 0.5)}{B(x - 12, 58, i * 0.5 + 0.7)}
            </g>
          ))}
        </Frame>
      );
    case "pretreat":
      return (
        <Frame>
          <rect x="8" y="22" width="104" height="36" rx="5" className="eq" /><rect x="12" y="34" width="96" height="20" rx="3" className="eq-liq" />
          <path d="M40 22 V48 M72 22 V48" className="eq-line" /><path d="M8 22 H112" className="eq-top" strokeWidth="5" />
          <g className="bd-spin slow"><path d="M22 28 V46 M16 37 H28" className="eq-line" /></g>
          {B(52, 44, 0)}{B(60, 50, 0.9)}{B(90, 46, 0.4)}
          <Pipe d="M0 40 H8" /><Pipe d="M112 40 H120" /><Valve x={4} y={40} /><Gauge x={100} y={16} />
        </Frame>
      );
    case "ro":
      return (
        <Frame>
          {[16, 32, 48].map((y, i) => (
            <g key={y}>
              <rect x="22" y={y} width="76" height="11" rx="5.500" className="eq" /><rect x="26" y={y + 3} width="68" height="5" rx="2.500" className="eq-liq" />
              {[40, 60, 80].map((x) => <path key={x} d={`M${x} ${y} V${y + 11}`} className="eq-line" />)}
              {B(34 + i * 18, y + 5.500, i * 0.6)}
            </g>
          ))}
          <rect x="4" y="22" width="14" height="30" rx="5" className="eq-dome" /><g className="bd-spin slow"><circle cx="11" cy="37" r="4" className="eq-top" /></g>
          <Pipe d="M18 37 H22" /><Gauge x={11} y={20} /><Pipe d="M98 37 H116" /><Valve x={108} y={37} /><Gauge x={60} y={10} />
        </Frame>
      );
    case "filter":
      return (
        <Frame>
          <rect x="12" y="14" width="96" height="46" rx="5" className="eq" />
          <rect x="16" y="18" width="88" height="14" rx="3" className="eq-liq" />
          <rect x="16" y="34" width="88" height="8" className="eq-dome" /><rect x="16" y="43" width="88" height="7" className="eq-top" /><rect x="16" y="51" width="88" height="6" className="eq-line-fill" />
          {B(30, 28, 0)}{B(60, 26, 0.8)}{B(88, 29, 1.5)}
          <Pipe d="M0 24 H12" /><Pipe d="M108 54 H120" /><Valve x={6} y={24} /><Valve x={114} y={54} />
          {[22, 34, 46, 58, 70, 82, 94].map((x, i) => <circle key={x} cx={x} cy={46.5} r="1" fill="#cbbfff" opacity="0.6" className="rise" style={{ ["--d" as string]: `${i * 0.3}s` }} />)}
          <path d="M30 14 V8 H90 V14" className="pipe" /><path d="M30 14 V8 H90 V14" className="pipe-flow" />
        </Frame>
      );
    case "uv":
      return (
        <Frame>
          <Tank cx={60} w={56} top={20} bottom={60} liq={0.7} />
          <rect x="50" y="6" width="20" height="10" rx="3" className="eq-dome" />
          <g className="bd-pulse"><rect x="43" y="30" width="34" height="26" rx="5" fill="#22d3ee" opacity="0.18" /><path d="M48 32 V54 M60 32 V54 M72 32 V54" className="eq-line" strokeWidth="2.600" /></g>
          <Pipe d="M0 52 H32" /><Pipe d="M88 52 H120" />
        </Frame>
      );
    case "network":
      return (
        <Frame>
          <Pipe d="M6 36 H114" /><Pipe d="M30 36 V10 H60" /><Pipe d="M60 36 V64 H100" /><Pipe d="M90 36 V10 H114" />
          {[[30, 10], [60, 10], [60, 64], [100, 64], [114, 10], [30, 36], [60, 36], [90, 36]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.500" className="eq-dome" />)}
          <rect x="0" y="30" width="10" height="12" rx="3" className="eq-top" /><path d="M96 14 l6 -5 l6 5 v6 h-12z M16 54 l6 -5 l6 5 v6 h-12z" className="eq-dome" /><Gauge x={72} y={26} />
        </Frame>
      );
    case "houses":
      return (
        <Frame>
          {[[8, 36, 26], [38, 26, 32], [74, 34, 28]].map(([x, y, w], i) => (
            <g key={i}><rect x={x} y={y} width={w} height={62 - y} rx="2" className="eq" /><path d={`M${x - 2} ${y} H${x + w + 2}`} className="eq-line" strokeWidth="3" />
              <rect x={x + 5} y={y + 8} width="6" height="6" className="eq-top" /><rect x={x + w - 11} y={y + 8} width="6" height="6" className="eq-top" /></g>
          ))}
          <Pipe d="M0 66 H120" />{B(44, 62, 0)}{B(90, 63, 0.9)}
        </Frame>
      );
    case "factory":
      return (
        <Frame>
          <rect x="10" y="34" width="70" height="28" rx="2" className="eq" /><path d="M10 34 L28 24 V34 L46 24 V34 L64 24 V34" className="eq-dome" />
          <rect x="84" y="12" width="12" height="50" rx="2" className="eq" /><rect x="82" y="8" width="16" height="6" rx="2" className="eq-top" />
          <circle cx="92" cy="4" r="3" className="rise" style={{ ["--d" as string]: "0s" }} /><circle cx="98" cy="8" r="2.500" className="rise" style={{ ["--d" as string]: "0.9s" }} />
          <rect x="20" y="44" width="8" height="8" className="eq-top" /><rect x="36" y="44" width="8" height="8" className="eq-top" />
          <Pipe d="M80 62 H120" />
        </Frame>
      );
    case "field":
    case "drip":
      return (
        <Frame>
          <path d="M0 52 H120 V72 H0Z" className="eq-liq" />
          {[10, 30, 50, 70, 90].map((x, i) => (
            <g key={x}><path d={`M${x + 8} 52 V36`} className="eq-line" /><path d={`M${x + 8} 40 q-8 -2 -8 -10 q8 0 8 10 q8 -2 8 -10 q-8 0 -8 10`} className="eq-dome" />{B(x + 8, 60, i * 0.4)}</g>
          ))}
          <Pipe d="M0 48 H120" />
        </Frame>
      );
    case "collect":
      return (
        <Frame>
          <Tank cx={34} w={44} top={26} bottom={60} liq={0.6} /><Tank cx={88} w={44} top={30} bottom={60} liq={0.45} />
          <Pipe d="M56 44 H66" />{B(26, 50, 0)}{B(86, 52, 0.8)}
          <g className="bd-spin slow"><path d="M78 40 H98" className="eq-line" /></g>
        </Frame>
      );
    case "wwtp":
      return (
        <Frame>
          <Tank cx={30} w={46} top={24} bottom={60} liq={0.65} /><Tank cx={86} w={46} top={24} bottom={60} liq={0.6} />
          <g className="bd-spin slow"><path d="M18 36 H42" className="eq-line" /></g><g className="bd-spin slow"><path d="M74 36 H98" className="eq-line" /></g>
          <Pipe d="M53 46 H63" />{B(26, 52, 0)}{B(34, 56, 0.8)}{B(84, 54, 0.4)}
        </Frame>
      );
    case "tertiary":
      return (
        <Frame>
          <Tank cx={36} w={44} top={22} bottom={60} liq={0.8} />
          <rect x="68" y="16" width="40" height="44" rx="5" className="eq" /><rect x="72" y="20" width="32" height="12" rx="2" className="eq-liq" /><rect x="72" y="34" width="32" height="8" className="eq-dome" /><rect x="72" y="44" width="32" height="12" className="eq-top" />
          <Pipe d="M58 40 H68" />{B(34, 48, 0)}{B(42, 54, 0.7)}{B(88, 27, 0.4)}
        </Frame>
      );
    case "sludge":
      return (
        <Frame>
          <path d="M14 62 Q22 28 60 22 Q98 28 106 62Z" className="eq-dome" /><path d="M34 54 Q44 38 60 34" className="spec" />
          <ellipse cx="60" cy="63" rx="50" ry="5" className="eq" />{B(46, 56, 0)}{B(72, 58, 0.9)}
        </Frame>
      );
    case "compost":
      return (
        <Frame>
          {[10, 46, 82].map((x, i) => (
            <g key={x}><path d={`M${x} 62 Q${x + 4} 30 ${x + 18} 28 Q${x + 32} 30 ${x + 36} 62Z`} className="eq-dome" /><path d={`M${x + 8} 54 Q${x + 12} 40 ${x + 18} 36`} className="spec" />
              {B(x + 18, 24, i * 0.6)}</g>
          ))}
          <ellipse cx="60" cy="64" rx="56" ry="4" className="eq" />
        </Frame>
      );
    case "pivot":
      return (
        <Frame>
          <ellipse cx="60" cy="52" rx="52" ry="14" className="eq-liq" />
          <g className="bd-spin slower"><path d="M60 52 L108 40 M60 52 L12 64" className="eq-line" strokeWidth="2.400" />
            {[78, 96, 36, 22].map((x, i) => <circle key={i} cx={x} cy={52 + (x > 60 ? -(x - 60) / 4 : (60 - x) / 4)} r="2.600" className="eq-top" />)}</g>
          <rect x="54" y="30" width="12" height="24" rx="3" className="eq" /><circle cx="60" cy="28" r="5" className="eq-dome" />{B(86, 56, 0)}{B(36, 58, 0.8)}
        </Frame>
      );
    case "digester":
      return (
        <Frame>
          <Pipe d="M22 10 H98" />
          {[22, 60, 98].map((x, i) => (
            <g key={x}><path d={`M${x} 10 V24`} className="pipe" /><Tank cx={x} w={34} top={42} bottom={62} dome liq={0.7} />{B(x - 4, 52, i * 0.5)}{B(x + 5, 58, i * 0.5 + 0.8)}</g>
          ))}
        </Frame>
      );
    case "gas":
      return (
        <Frame>
          <Tank cx={34} w={46} top={26} bottom={62} dome liq={0.3} />
          <rect x="68" y="30" width="40" height="30" rx="4" className="eq" /><g className="bd-spin slow"><circle cx="80" cy="45" r="8" className="eq-top" /><path d="M72 45 H88 M80 37 V53" className="eq-line" /></g>
          <path d="M96 38 L90 48 H98 L92 58" className="eq-bolt" />
          <Pipe d="M57 46 H68" />
        </Frame>
      );
  }
}
