import { Gauge, Pipe, Tank, Valve } from "./Eq";

/** big drawings for the Outputs tab, 300 x 150 each: several machines joined by flowing pipes */
const Bub = (x: number, y: number, d: number, c = "rise") => <circle cx={x} cy={y} r="1.8" className={c} style={{ ["--d" as string]: `${d}s` }} />;
const Ground = () => (<g><rect x="0" y="126" width="300" height="24" fill="rgba(8,6,40,0.55)" /><path d="M0 126 H300" className="band" /><ellipse cx="150" cy="140" rx="140" ry="5" className="ground" /></g>);

function Fertilizer() {
  return (
    <svg viewBox="0 18 300 132" aria-hidden>
      <Ground />
      {/* sludge silo */}
      <g transform="translate(-6 24) scale(1.3)"><Tank cx={36} w={36} top={26} bottom={80} dome liq={0.7} /></g>
      <Pipe d="M70 112 H96" /><Valve x={82} y={112} />
      {/* conveyor with lumps */}
      <rect x="92" y="104" width="76" height="12" rx="6" className="belt" />
      {[100, 116, 132, 148, 162].map((x) => <circle key={x} cx={x} cy="110" r="3" className="eq-top" />)}
      {[0, 1, 2, 3].map((i) => <ellipse key={i} cx={98} cy={101} rx="4.5" ry="3" className="lump" style={{ ["--d" as string]: `${i * 0.85}s` }} />)}
      {/* rotary dryer with flame */}
      <rect x="170" y="78" width="66" height="30" rx="15" className="eq" /><rect x="176" y="84" width="54" height="18" rx="9" className="eq-line-fill" />
      <g className="bd-spin slower"><path d="M182 93 H224 M203 84 V102" className="eq-line" /></g>
      <path d="M170 108 L160 118 M236 108 L246 118" className="eq-line" strokeWidth="3" /><path d="M170 86 H238" className="band" />
      <path d="M236 90 l10 -4 l-3 10 z" className="flame" /><path d="M241 92 l6 -2 l-2 6 z" fill="#fde68a" className="flame" />
      <rect x="196" y="66" width="14" height="12" rx="2" className="eq-dome" />{Bub(203, 62, 0, "steam")}{Bub(207, 58, 1, "steam")}
      {/* compost windrows */}
      {[176, 204, 232].map((x, i) => (
        <g key={x}><path d={`M${x} 126 Q${x + 4} 112 ${x + 14} 111 Q${x + 24} 112 ${x + 28} 126Z`} fill="#8a6a3a" stroke="#d6b36e" strokeWidth="1" />{Bub(x + 14, 106, i * 0.7, "steam")}</g>
      ))}
      {/* bags of fertilizer and a truck */}
      <g><rect x="262" y="104" width="22" height="22" rx="4" className="eq-dome" /><rect x="262" y="98" width="22" height="8" rx="3" className="eq-top" /><path d="M266 112 H280 M266 118 H280" className="eq-line" strokeWidth="1.2" /></g>
      <Gauge x={96} y={96} />
      <path d="M20 36 L30 30 L40 36" className="eq-line" opacity="0" />
    </svg>
  );
}
function Irrigation() {
  const crops = Array.from({ length: 16 }, (_, i) => i);
  return (
    <svg viewBox="0 18 300 132" aria-hidden>
      <Ground />
      {/* elevated tank on legs + pump house */}
      <path d="M18 66 L12 124 M58 66 L64 124 M26 80 L52 110 M50 80 L24 110" className="eq-line" strokeWidth="2" />
      <Tank cx={38} w={46} top={36} bottom={66} dome liq={0.8} />
      <rect x="74" y="98" width="34" height="26" rx="4" className="eq" /><path d="M72 98 H110 L91 88Z" className="eq-dome" /><g className="bd-spin"><circle cx="91" cy="112" r="6" className="eq-top" /><path d="M85 112 H97 M91 106 V118" className="eq-line" /></g>
      <Pipe d="M38 66 V120 H74" /><Pipe d="M108 112 H140" /><Valve x={124} y={112} />
      {/* green field with crop rows */}
      <ellipse cx="208" cy="116" rx="86" ry="22" className="field" />
      {crops.map((i) => <path key={i} d={`M${140 + i * 9} ${118 + (i % 3) * 2} q-3 -8 0 -12 q3 4 0 12`} className="crop" style={{ ["--d" as string]: `${(i % 5) * 0.4}s` }} />)}
      {/* centre pivot: tower, long arm, wheels, spray */}
      <g className="bd-spin slower"><path d="M208 74 L268 94 M208 74 L148 94" className="eq-line" strokeWidth="2.6" />
        {[232, 252, 184, 164].map((x, i) => <path key={i} d={`M${x} ${x > 208 ? 74 + (x - 208) / 3 : 74 + (208 - x) / 3} v8`} className="eq-line" strokeWidth="1.6" />)}</g>
      <rect x="203" y="54" width="10" height="26" rx="3" className="eq" /><circle cx="208" cy="52" r="6" className="eq-dome" />
      {[222, 236, 250, 194, 180, 166].map((x, i) => <circle key={x} cx={x} cy={84 + ((i % 3) * 3)} r="1.8" className="drop" style={{ ["--d" as string]: `${i * 0.2}s` }} />)}
      <Gauge x={124} y={100} />
      {/* drip line */}
      <path d="M150 128 H270" className="pipe" /><path d="M150 128 H270" className="pipe-flow" />
    </svg>
  );
}
function Biogas() {
  return (
    <svg viewBox="0 18 300 132" aria-hidden>
      <Ground />
      {/* sludge feed */}
      <path d="M8 124 Q14 100 34 96 Q54 100 60 124Z" className="eq-dome" /><Pipe d="M60 116 H78 V94" /><Valve x={68} y={116} />
      {/* three digesters, gas line on top */}
      <Pipe d="M92 32 H196" />
      {[92, 134, 176].map((x, i) => (
        <g key={x}><Pipe d={`M${x} 32 V54`} /><g transform={`translate(${x - 92 + 0} 0)`}><Tank cx={92} w={40} top={64} bottom={120} dome liq={0.65} /></g>{Bub(x - 6, 100, i * 0.5)}{Bub(x + 6, 108, i * 0.5 + 0.8)}{Bub(x, 76, i * 0.4, "steam")}</g>
      ))}
      <Gauge x={112} y={54} />
      {/* gas holder with level */}
      <Pipe d="M196 32 H214 V60" />
      <ellipse cx="228" cy="122" rx="24" ry="6" className="eq" /><path d="M204 122 V80 Q228 46 252 80 V122" className="eq" /><path d="M204 100 Q228 114 252 100 V122 Q228 128 204 122Z" className="eq-liq" /><path d="M204 80 Q228 46 252 80" className="eq-dome" />
      <path d="M212 84 Q216 66 226 60" className="spec" />
      {/* CHP container, power line */}
      <rect x="258" y="94" width="36" height="30" rx="4" className="eq" /><g className="bd-spin"><circle cx="270" cy="109" r="7" className="eq-top" /><path d="M263 109 H277 M270 102 V116" className="eq-line" /></g>
      <path d="M284 98 L278 108 H286 L280 120" className="eq-bolt glow-bolt" />
      <path d="M268 94 V58 M262 66 H274 M264 74 H272" className="eq-line" /><path d="M274 66 Q290 58 300 62" className="eq-line" />
      <path d="M92 100 H206" className="band" opacity="0.4" />
    </svg>
  );
}
/** true = pictures cropped from Aly's mockup (option 2); false = the animated drawings above (option 1) */
const USE_ART = false;
export default function Scene({ id }: { id: string }) {
  if (USE_ART) return <img className="wc-art" src={`/img/out-${id}.jpg`} alt="" draggable={false} />;
  return id === "fert" ? <Fertilizer /> : id === "irr" ? <Irrigation /> : <Biogas />;
}
