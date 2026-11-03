import { farmFlow, fmt, stationFlow, type PivotNow, type StationId } from "./farm";
import { pivotColor, pivotValue, type Metric } from "./farmColor";
import { useAspect } from "./useAspect";

const W0 = 1250, H0 = 455, R = 86, HEADER_Y = 245;
const ROWY = [130, 360];

function Station({ x, y, id, name, flow, onClick }: { x: number; y: number; id: StationId; name: string; flow: number; onClick: () => void }) {
  return (
    <g className="fm-st" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}>
      <title>{`${id} ${name}: open the pump station`}</title>
      <rect x={x - 95} y={y - 28} width={190} height={56} />
      <circle cx={x - 72} cy={y} r={13} className="ic" />
      <path d={`M${x - 76} ${y - 6} L${x - 76} ${y + 6} L${x - 66} ${y} Z`} className="ic-t" />
      <text x={x - 50} y={y - 3} className="n">{id} {name}</text>
      <text x={x - 50} y={y + 17} className="v">{fmt(flow)} m³/h</text>
    </g>
  );
}

/** the farm from above: canal, pump stations, pond, main pipe and the eight pivots. The drawing spreads sideways to fill its box. */
export default function FarmMap({ metric, hour, snap, onOpen, onStation }: { metric: Metric; hour: number; snap: PivotNow[]; onOpen: (id: string) => void; onStation: (id: StationId) => void }) {
  const [ref, asp] = useAspect<SVGSVGElement>(1.8, 5);
  const W = Math.max(W0, H0 * asp), H = Math.max(H0, W / asp), dy = (H - H0) / 2;
  const sx = W - 100; // the right-hand stations
  const x0 = 270, x1 = W - 215;
  const COLX = [0, 1, 2, 3].map((i) => x0 + R + (i * (x1 - x0 - 2 * R)) / 3);
  const h = hour;
  const pond = 74 + 8 * Math.cos(((h - 3) / 24) * Math.PI * 2);
  const total = farmFlow(h);
  return (
    <svg ref={ref} className="fm" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of the farm with eight pivots, three pump stations, the canal and the storage pond">
      {/* canal along the left edge */}
      <rect className="fm-canal" x={0} y={0} width={46} height={H} />
      <path className="fm-flow" d={`M12 0 V${H}`} />
      <text className="fm-lab" transform={`translate(35 ${H / 2}) rotate(-90)`} textAnchor="middle">Irrigation canal</text>

      <g transform={`translate(0 ${dy})`}>
        {/* pipes under everything else */}
        <g className="fm-pipes">
          <path className="fm-pipe" d="M46 108 H60" />
          <path className="fm-pipe" d="M155 134 V270" />
          <path className="fm-pipe" d={`M230 310 H250 V${HEADER_Y} H${sx}`} />
          <path className="fm-pipe" d={`M${sx - 60} 96 V120 M${sx - 20} 96 V120 M${sx + 20} 96 V120 M${sx + 60} 96 V120 M${sx - 60} 120 H${sx + 60} M${sx} 120 V149`} />
          <path className="fm-pipe" d={`M${sx} 200 V${HEADER_Y} M${sx} ${HEADER_Y} V300`} />
          {snap.map((n) => <path key={n.p.id} className="fm-pipe thin" d={`M${COLX[n.p.col]} ${HEADER_Y} V${ROWY[n.p.row]}`} />)}
        </g>
        <g className="fm-flows">
          <path className="fm-flow" d="M46 108 H60" />
          <path className="fm-flow" d="M155 134 V270" />
          <path className="fm-flow" d={`M230 310 H250 V${HEADER_Y} H${sx}`} />
          <path className="fm-flow" d={`M${sx} 200 V${HEADER_Y}`} />
        </g>

        {/* storage pond */}
        <g className="fm-pond">
          <rect x={80} y={270} width={150} height={80} rx={6} />
          <text x={155} y={298} className="n" textAnchor="middle">Storage pond</text>
          <text x={155} y={326} className="v" textAnchor="middle">{fmt(pond)}% full</text>
        </g>

        {/* pump stations */}
        <Station x={155} y={108} id="PS-B" name="Canal lift" flow={stationFlow("PS-B", h)} onClick={() => onStation("PS-B")} />
        <Station x={sx} y={175} id="PS-A" name="Boreholes" flow={stationFlow("PS-A", h)} onClick={() => onStation("PS-A")} />
        <Station x={sx} y={326} id="PS-C" name="Booster" flow={stationFlow("PS-C", h)} onClick={() => onStation("PS-C")} />
        {[-60, -20, 20, 60].map((d) => <circle key={d} className="fm-well" cx={sx + d} cy={84} r={12} />)}
        <text x={sx} y={56} className="fm-lab" textAnchor="middle">4 boreholes</text>
        <text x={sx} y={392} className="fm-lab" textAnchor="middle">Total {fmt(total)} m³/h</text>

        {/* the eight pivots */}
        {snap.map((n, i) => {
          const x = COLX[n.p.col], y = ROWY[n.p.row], c = pivotColor(metric, n);
          const irrigating = n.status === "Irrigating";
          const val = pivotValue(metric, n);
          return (
            <g key={n.p.id} className="fm-piv" transform={`translate(${x} ${y})`} onClick={() => onOpen(n.p.id)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(n.p.id); }} style={{ ["--n" as string]: i }}
              aria-label={`Pivot ${n.p.id}, ${n.p.crop}, ${val}, ${n.status}`}>
              <title>{`${n.p.id} · ${n.p.crop} (${n.p.stage}) · ${n.status} · soil moisture ${fmt(n.moist, 1)}%`}</title>
              <circle className="circ" r={R} style={{ fill: c, stroke: c }} />
              {irrigating && (
                <g className="arm" style={{ ["--s" as string]: `${26 + i * 3}s` }}>
                  <path className="wedge" d={`M0 0 L${R - 3} 0 A${R - 3} ${R - 3} 0 0 0 ${(R - 3) * Math.cos(0.5)} ${-(R - 3) * Math.sin(0.5)} Z`} />
                  <line x1={0} y1={0} x2={R - 3} y2={0} />
                </g>
              )}
              <rect className="plate" x={-46} y={-44} width={92} height={90} rx={4} />
              <text className="id" y={-22} textAnchor="middle">{n.p.id}</text>
              <text className={`val ${val.length > 6 ? "sm" : ""}`} y={12} textAnchor="middle">{val}</text>
              <text className="crop" y={34} textAnchor="middle">{n.p.crop}</text>
              <circle className={`dot ${n.status.toLowerCase()}`} cx={R * 0.68} cy={-R * 0.68} r={8} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
