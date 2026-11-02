import { LEAKS, NODES, networkAt, nodeById, PIPES, pipeById, ZONES } from "./network";
import { BAD, colorOf, type Metric } from "./mapcolor";

/** the network, small: pipes coloured by the chosen metric, moving water, leaks and the zone names. Clicking opens the full map. */
export default function MiniMap({ metric, hour, onOpen }: { metric: Metric; hour: number; onOpen: () => void }) {
  const s = networkAt(hour);
  const color = (id: string) => {
    const p = pipeById(id), st = s.pipes[id];
    if (p.kind === "tie") return "var(--wire)";
    if (metric === "Consumption") return colorOf(metric, st.load);
    if (metric === "Pressure") return colorOf(metric, st.pressure);
    return st.leak > 0 ? BAD : p.zone === "trunk" ? "var(--wire)" : colorOf(metric, s.zones[p.zone].nrw);
  };
  return (
    <svg className="hm-map nm-mini" viewBox="30 30 880 620" preserveAspectRatio="xMidYMid meet" role="img" aria-label="The water network coloured by consumption. Click to open the full map." onClick={onOpen} style={{ cursor: "pointer" }}>
      {ZONES.map((z) => (
        <g key={z.id} className="nm-zone"><g>{NODES.filter((n) => n.zone === z.id).map((n) => <circle key={n.id} cx={n.x} cy={n.y} r={52} />)}</g></g>
      ))}
      {PIPES.map((p) => {
        const a = nodeById(p.from), b = nodeById(p.to), st = s.pipes[p.id];
        const d = `M${a.x} ${a.y} L${b.x} ${b.y}`;
        const w = Math.min(14, 5 + p.dn / 100);
        return (
          <g key={p.id}>
            <path className={`nm-p k-${p.kind}`} d={d} stroke={color(p.id)} strokeWidth={p.kind === "tie" ? 1.6 : w} />
            {!st.closed && st.flow > 0.5 && <path className={`nm-flow ${st.reverse ? "rev" : ""}`} d={d} strokeWidth={Math.max(1.4, w * 0.34)} style={{ ["--dur" as string]: `${Math.max(0.35, Math.min(4, 13 / (Math.max(st.velocity, 0.05) * 14)))}s` }} />}
          </g>
        );
      })}
      {NODES.filter((n) => n.kind === "plant" || n.kind === "pump" || n.kind === "tank").map((n) => (
        <g key={n.id} transform={`translate(${n.x} ${n.y})`} className="nm-asset">
          {n.kind === "tank" ? <path d="M-14 -18 L14 -18 L10 2 L-10 2Z" /> : n.kind === "plant" ? <rect x="-18" y="-12" width="36" height="24" rx="3" /> : <circle r="11" />}
          <text y={n.kind === "tank" ? -24 : 26} textAnchor="middle">{n.kind === "plant" ? "Plant" : n.kind === "tank" ? "Reservoir" : n.id === "ps1" ? "PS-1" : "PS-2"}</text>
        </g>
      ))}
      {LEAKS.map((l) => { const a = nodeById(pipeById(l.pipe).from), b = nodeById(pipeById(l.pipe).to); return (
        <g key={l.id} className="nm-leak" transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2})`}><circle className="rip" r="5" /><circle className="dot" r="4.5" /></g>
      ); })}
      {ZONES.map((z) => (
        <g key={z.id} className="nm-zlabel" transform={`translate(${z.label.x} ${z.label.y})`}>
          <text className="n" textAnchor="middle">{z.name}</text>
          <text className="v" y="15" textAnchor="middle">{s.zones[z.id].supplied.toFixed(0)} L/s</text>
        </g>
      ))}
    </svg>
  );
}
