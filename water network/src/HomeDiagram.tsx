import { useLayoutEffect, useRef, useState } from "react";
import { networkAt, PIPES, ZONES } from "./network";
import { colorOf, type Metric } from "./mapcolor";

/** The Home diagram: the water travels left to right, from the plant to six zone tiles, each tile and pipe coloured green, amber or red.
    It is drawn in the box's own pixels, so it always fills the box: a tall box gets 3 rows of 2 tiles, a short wide box gets 2 rows of 3.
    Nothing is stretched, cropped or left empty at the sides. */
const ORDER = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"] as const;

export default function HomeDiagram({ metric, hour, flow, onOpen }: { metric: Metric; hour: number; flow: number; onOpen: () => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 1040, h: 440 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) setSize({ w: Math.round(r.width), h: Math.round(r.height) }); };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w, h } = size;

  // ---- layout, in the box's own pixels ----
  const rows = h >= 330 ? 3 : 2, cols = 6 / rows;
  const pad = 12, gapY = 12, gapX = 34;
  const tileH = Math.min(140, (h - 2 * pad - (rows - 1) * gapY) / rows);
  const ka = Math.max(0.62, Math.min(1.1, h / 440)); // size of the plant, pumps and reservoir
  const chainW = (3 * 104 + 2 * 44) * ka, hubGap = 74 * ka;
  const narrow = w < 700;
  const tileW = Math.max(120, Math.min(360, (w - 2 * pad - chainW - hubGap - (cols - 1) * gapX) / cols));
  const comp = chainW + hubGap + cols * tileW + (cols - 1) * gapX;
  const x0 = Math.max(pad, (w - comp) / 2);
  const hubX = x0 + chainW + 10 * ka, hubY = h / 2;
  const colX = Array.from({ length: cols }, (_, c) => hubX + hubGap + c * (tileW + gapX));
  const rowY = Array.from({ length: rows }, (_, r) => pad + r * (tileH + gapY) + Math.max(0, (h - 2 * pad - rows * tileH - (rows - 1) * gapY) / 2));
  const k = Math.max(0.68, Math.min(1.3, Math.min(tileH / 112, tileW / 232)));
  const chain = [{ x: x0, label: "Plant", icon: "plant" }, { x: x0 + 148 * ka, label: "PS-1 pumps", icon: "pump" }, { x: x0 + 296 * ka, label: "Reservoir", icon: "tank" }] as const;

  const s = networkAt(hour);
  const zoneLoad = (id: string) => { const ps = PIPES.filter((p) => p.zone === id && p.kind === "tree"); return ps.reduce((a, p) => a + s.pipes[p.id].load, 0) / ps.length; };
  const info = (id: (typeof ORDER)[number]) => {
    const z = ZONES.find((q) => q.id === id)!, q = s.zones[id];
    if (metric === "Consumption") return { z, c: colorOf(metric, zoneLoad(id)), big: `${q.supplied.toFixed(0)}`, unit: "L/s", sub: `${q.pressure.toFixed(1)} bar · ${(q.nrw * 100).toFixed(0)}% lost` };
    if (metric === "Pressure") return { z, c: colorOf(metric, q.pressure), big: q.pressure.toFixed(1), unit: "bar", sub: `lowest ${q.minPressure.toFixed(1)} bar · ${q.supplied.toFixed(0)} L/s` };
    return { z, c: colorOf(metric, q.nrw), big: `${(q.nrw * 100).toFixed(0)}`, unit: "% lost", sub: `${q.leaks} known leak${q.leaks === 1 ? "" : "s"} · ${q.supplied.toFixed(0)} L/s` };
  };
  void narrow;

  return (
    <svg ref={ref} className="hm-map hd" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMinYMin meet" role="img" aria-label="Water flowing from the plant to the six supply zones, each coloured by its status. Click to open the full map." onClick={onOpen} style={{ cursor: "pointer" }}>
      <path className="hd-pipe" d={`M${chain[0].x + 100 * ka} ${hubY} H${hubX}`} />
      <path className="hd-flow" d={`M${chain[0].x + 100 * ka} ${hubY} H${hubX}`} />
      {chain.map((c) => (
        <g key={c.label} transform={`translate(${c.x} ${hubY}) scale(${ka})`} className="hd-asset">
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
      {ORDER.map((id, i) => {
        const row = Math.floor(i / cols), col = i % cols, y = rowY[row] + tileH / 2;
        const { c } = info(id);
        const x = colX[col];
        const d = col === 0 ? `M${hubX} ${hubY} C${hubX + hubGap * 0.5} ${hubY}, ${x - hubGap * 0.5} ${y}, ${x} ${y}` : `M${colX[col - 1] + tileW} ${y} H${x}`;
        return (
          <g key={`p${id}`}>
            <path className="hd-pipe" d={d} style={{ stroke: c }} />
            <path className="hd-flow" d={d} />
          </g>
        );
      })}
      <circle className="hd-hub" cx={hubX} cy={hubY} r={Math.max(8, 11 * ka)} />
      {ORDER.map((id, i) => {
        const row = Math.floor(i / cols), col = i % cols;
        const m = info(id);
        return (
          <g key={id} className="hd-tile" transform={`translate(${colX[col]} ${rowY[row]})`}>
            <rect className="bg" width={tileW} height={tileH} />
            <rect className="bar" width="8" height={tileH} style={{ fill: m.c }} />
            <g transform={`translate(0 ${Math.max(0, (tileH - 112 * k) / 2)}) scale(${k})`}>
              <text className="zn" x="22" y="28">{m.z.name}</text>
              <text className="big" x="22" y="72" style={{ fill: m.c }}>{m.big}<tspan className="u" dx="6">{m.unit}</tspan></text>
              <text className="sub" x="22" y="96">{m.sub}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
