import { networkAt, PIPES, ZONES } from "./network";
import { colorOf, type Metric } from "./mapcolor";

/** the Home diagram: the water travels left to right, from the plant to six zone tiles, each tile and pipe coloured green, amber or red.
    A plain flow diagram, not a geographic map: the full map is one click away. */
const TILE = { w: 232, h: 112 };
const COLX = [520, 790];
const ROWY = [34, 164, 294];
const ORDER = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"] as const;
const HUB = { x: 440, y: 220 };

export default function HomeDiagram({ metric, hour, flow, onOpen }: { metric: Metric; hour: number; flow: number; onOpen: () => void }) {
  const s = networkAt(hour);
  const zoneLoad = (id: string) => { const ps = PIPES.filter((p) => p.zone === id && p.kind === "tree"); return ps.reduce((a, p) => a + s.pipes[p.id].load, 0) / ps.length; };
  const info = (id: (typeof ORDER)[number]) => {
    const z = ZONES.find((q) => q.id === id)!, q = s.zones[id];
    if (metric === "Consumption") return { z, c: colorOf(metric, zoneLoad(id)), big: `${q.supplied.toFixed(0)}`, unit: "L/s", sub: `${q.pressure.toFixed(1)} bar · ${(q.nrw * 100).toFixed(0)}% lost` };
    if (metric === "Pressure") return { z, c: colorOf(metric, q.pressure), big: q.pressure.toFixed(1), unit: "bar", sub: `lowest ${q.minPressure.toFixed(1)} bar · ${q.supplied.toFixed(0)} L/s` };
    return { z, c: colorOf(metric, q.nrw), big: `${(q.nrw * 100).toFixed(0)}`, unit: "% lost", sub: `${q.leaks} known leak${q.leaks === 1 ? "" : "s"} · ${q.supplied.toFixed(0)} L/s` };
  };
  const chain = [{ x: 24, label: "Plant", icon: "plant" }, { x: 168, label: "PS-1 pumps", icon: "pump" }, { x: 312, label: "Reservoir", icon: "tank" }] as const;
  return (
    <svg className="hm-map hd" viewBox="0 0 1040 440" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Water flowing from the plant to the six supply zones, each coloured by its status. Click to open the full map." onClick={onOpen} style={{ cursor: "pointer" }}>
      {/* main line: plant, pump station, reservoir, hub */}
      <path className="hd-pipe" d={`M${chain[0].x + 100} ${HUB.y} H${HUB.x}`} />
      <path className="hd-flow" d={`M${chain[0].x + 100} ${HUB.y} H${HUB.x}`} />
      {chain.map((c) => (
        <g key={c.label} transform={`translate(${c.x} ${HUB.y})`} className="hd-asset">
          {c.icon === "plant" && <rect x="-4" y="-34" width="104" height="68" rx="6" />}
          {c.icon === "pump" && <circle cx="52" cy="0" r="34" />}
          {c.icon === "tank" && <path d="M16 -34 H88 L78 20 H26 Z" />}
          {c.icon === "plant" && <path className="ic" d="M48 -18 C58 -4 66 3 66 11 A18 18 0 0 1 30 11 C30 3 38 -4 48 -18Z" />}
          {c.icon === "pump" && <path className="ic" d="M42 -14 L68 0 L42 14Z" />}
          {c.icon === "tank" && <rect className="ic" x="30" y="-8" width="44" height="26" />}
          <text x="48" y="62" textAnchor="middle" className="n">{c.label}</text>
          <text x="48" y="82" textAnchor="middle" className="v">{c.icon === "tank" ? `${s.tank.toFixed(0)}% full` : `${flow.toLocaleString("en-US")} m³/h`}</text>
        </g>
      ))}
      {/* branches from the hub to the six tiles */}
      {ORDER.map((id, i) => {
        const col = i % 2, row = Math.floor(i / 2), y = ROWY[row] + TILE.h / 2, x = COLX[col];
        const { c } = info(id);
        const d = col === 0 ? `M${HUB.x} ${HUB.y} C${HUB.x + 40} ${HUB.y}, ${x - 50} ${y}, ${x} ${y}` : `M${COLX[0] + TILE.w} ${y} H${x}`;
        return (
          <g key={`p${id}`}>
            <path className="hd-pipe" d={d} style={{ stroke: c }} />
            <path className="hd-flow" d={d} />
          </g>
        );
      })}
      <circle className="hd-hub" cx={HUB.x} cy={HUB.y} r="11" />
      {/* zone tiles */}
      {ORDER.map((id, i) => {
        const col = i % 2, row = Math.floor(i / 2), x = COLX[col], y = ROWY[row];
        const m = info(id);
        return (
          <g key={id} className="hd-tile" transform={`translate(${x} ${y})`}>
            <rect className="bg" width={TILE.w} height={TILE.h} />
            <rect className="bar" width="9" height={TILE.h} style={{ fill: m.c }} />
            <text className="zn" x="26" y="30">{m.z.name}</text>
            <text className="big" x="26" y="74" style={{ fill: m.c }}>{m.big}<tspan className="u" dx="6">{m.unit}</tspan></text>
            <text className="sub" x="26" y="98">{m.sub}</text>
          </g>
        );
      })}
    </svg>
  );
}
