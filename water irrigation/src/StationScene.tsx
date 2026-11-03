import { fmt, type StationNow } from "./farm";
import { useAspect } from "./useAspect";

const W0 = 1000, H0 = 500;
const WELL_LEVEL = [42, 44, 58, 41]; // water level in each borehole, m below ground (A3 is dropping)
const STATE_C = { Running: "var(--good)", Standby: "#7d8fa3", Off: "var(--warn)" } as const;

/** one pump station drawn pump by pump: source, suction pipe, pump with its drive, valve, discharge pipe, header and outlet.
 *  Every pump carries its own numbers, so there is no table to read. The drawing spreads sideways to fill its box. */
export default function StationScene({ st, selected, onSelect }: { st: StationNow; selected: string; onSelect: (id: string) => void }) {
  const [ref, asp] = useAspect<SVGSVGElement>(1.2, 5);
  const W = Math.max(W0, H0 * asp), H = Math.max(H0, W / asp);
  const extra = W - W0;
  const PX = 380 + extra * 0.22, HX = 700 + extra * 0.5; // pump column and header move right as the box gets wider
  const n = st.pumps.length;
  const ys = st.pumps.map((_, i) => ((i + 1) * H) / (n + 1));
  const mid = (ys[0] + ys[n - 1]) / 2;
  const flowing = st.flow > 0;
  const plateX = W - 230;
  return (
    <svg ref={ref} className="ss" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${st.id} drawn pump by pump`}>
      {/* source */}
      {st.id === "PS-B" && (
        <g className="ss-src">
          <rect x={20} y={16} width={200} height={H - 32} />
          <path className="ss-wave" d={`M60 44 V${H - 44} M120 44 V${H - 44} M180 44 V${H - 44}`} />
          <text x={120} y={mid + 60} textAnchor="middle" className="n">Irrigation canal</text>
          <text x={120} y={mid + 88} textAnchor="middle" className="v">through a screen</text>
        </g>
      )}
      {st.id === "PS-C" && (
        <g className="ss-src">
          <rect x={20} y={16} width={200} height={H - 32} rx={12} />
          <path className="ss-wave" d={`M50 ${mid - 60} H190 M50 ${mid - 28} H190 M50 ${mid + 4} H190`} />
          <text x={120} y={mid + 60} textAnchor="middle" className="n">Storage pond</text>
          <text x={120} y={mid + 88} textAnchor="middle" className="v">filled by the canal</text>
        </g>
      )}
      {st.id === "PS-A" && st.pumps.map((p, i) => (
        <g key={p.def.id} className="ss-src">
          <rect x={30} y={ys[i] - 34} width={190} height={68} />
          <text x={46} y={ys[i] - 6} className="n">Well {p.def.id}</text>
          <text x={46} y={ys[i] + 22} className={`v ${WELL_LEVEL[i] > 55 ? "warn" : ""}`}>Level {WELL_LEVEL[i]} m</text>
        </g>
      ))}

      {/* pipes, then the moving water on top */}
      <g className="ss-pipes">
        {ys.map((y, i) => <path key={i} className="ss-pipe" d={`M220 ${y} H${PX - 34} M${PX + 34} ${y} H${HX}`} />)}
        <path className="ss-pipe" d={`M${HX} ${ys[0]} V${ys[n - 1]} M${HX} ${mid} H${W - 20}`} />
      </g>
      <g className="ss-flows">
        {st.pumps.map((p, i) => p.state === "Running" && <path key={p.def.id} className="ss-flow" d={`M220 ${ys[i]} H${PX - 34} M${PX + 34} ${ys[i]} H${HX} V${mid}`} />)}
        {flowing && <path className="ss-flow" d={`M${HX} ${mid} H${W - 20}`} />}
      </g>

      {/* pumps */}
      {st.pumps.map((p, i) => {
        const y = ys[i], c = STATE_C[p.state], on = p.state === "Running";
        const tx = PX + 56, vx = HX - 56;
        return (
          <g key={p.def.id} className={`ss-pump ${selected === p.def.id ? "sel" : ""}`} onClick={() => onSelect(p.def.id)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(p.def.id); }} aria-label={`Pump ${p.def.id}, ${p.state}`}>
            <title>{`Pump ${p.def.id} · ${p.state}${on ? ` · ${fmt(p.q)} m³/h · ${fmt(p.kw, 1)} kW` : ""} · click for its details and curve`}</title>
            <rect className="vfd" x={PX - 46} y={y - 66} width={92} height={28} rx={3} />
            <text className="vfd-t" x={PX} y={y - 46} textAnchor="middle">{on ? `${fmt(p.speed)}%` : "VFD"}</text>
            <path className="wire" d={`M${PX} ${y - 38} V${y - 31}`} />
            <circle className="body" cx={PX} cy={y} r={31} style={{ stroke: c }} />
            <g transform={`translate(${PX} ${y})`}>
              <g className={`imp ${on ? "spin" : ""}`}>
                <path d="M0 0 L0 -21 M0 0 L18.2 10.5 M0 0 L-18.2 10.5" style={{ stroke: c }} />
              </g>
            </g>
            <text className="id" x={tx} y={y - 6}>{p.def.id} · {on ? "Running" : p.state}</text>
            <text className="q" x={tx} y={y + 24}>{on ? `${fmt(p.q)} m³/h · ${fmt(p.kw)} kW` : "not running"}</text>
            <path className="valve" d={`M${vx} ${y - 12} L${vx + 24} ${y + 12} L${vx + 24} ${y - 12} L${vx} ${y + 12} Z`} style={{ fill: on ? "var(--good)" : "var(--card)", stroke: c }} />
          </g>
        );
      })}

      {/* header and outlet */}
      <circle className="ss-meter" cx={plateX - 46} cy={mid} r={22} />
      <text x={plateX - 46} y={mid + 7} textAnchor="middle" className="ss-meter-t">F</text>
      <g className="ss-plate">
        <rect x={plateX} y={mid - 138} width={210} height={102} />
        <text x={plateX + 14} y={mid - 104} className="n">Flow</text><text x={plateX + 196} y={mid - 104} textAnchor="end" className="v">{fmt(st.flow)} m³/h</text>
        <text x={plateX + 14} y={mid - 74} className="n">Pressure</text><text x={plateX + 196} y={mid - 74} textAnchor="end" className="v">{fmt(st.bar, 1)} bar</text>
        <text x={plateX + 14} y={mid - 44} className="n">Power</text><text x={plateX + 196} y={mid - 44} textAnchor="end" className="v">{fmt(st.kw)} kW</text>
      </g>
      <text x={plateX + 105} y={mid + 50} textAnchor="middle" className="ss-out">To the farm main</text>
    </svg>
  );
}
