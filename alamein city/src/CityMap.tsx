import { memo, useMemo, useState } from "react";
import { CITY, LAYERS, MAP_H, MAP_W, SHARE, ZONES, type LayerId, type Zone } from "./data";
import { rng, useTick } from "./live";
import { useFilters, type ZoneFilter } from "./state";

/** how many dots stand for the devices of each layer: bus stations are drawn one by one, the others are sampled */
const DOTS: Record<LayerId, number> = { poles: 70, water: 55, waste: 45, bus: 50, parking: 40, signage: 45 };

const inside = (x: number, y: number, p: [number, number][]) => {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

interface Dot { x: number; y: number; zone: Zone["id"]; k: number }
/** dots are placed once, inside the zone shapes, in proportion to each zone's share (illustrative placement, not surveyed) */
const DOT_CACHE: Record<LayerId, Dot[]> = (() => {
  const out = {} as Record<LayerId, Dot[]>;
  LAYERS.forEach((l, li) => {
    const r = rng(900 + li * 37);
    const n = DOTS[l.id];
    const raw = SHARE[l.id].map((s) => s * n);
    const counts = raw.map(Math.floor);
    let left = n - counts.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left-- > 0) counts[i]++; });
    const dots: Dot[] = [];
    ZONES.forEach((z, zi) => {
      const xs = z.poly.map((p) => p[0]), ys = z.poly.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      let placed = 0, guard = 0;
      while (placed < counts[zi] && guard++ < 4000) {
        const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
        if (inside(x, y, z.poly)) { dots.push({ x, y, zone: z.id, k: dots.length }); placed++; }
      }
    });
    out[l.id] = dots;
  });
  return out;
})();

/** a few dots in every zone (3 each: a pole, a water sensor, a bus stop) so the map is never empty */
const AMBIENT: { x: number; y: number; zone: Zone["id"]; layer: LayerId; k: number }[] = ZONES.flatMap((z) =>
  (["poles", "water", "bus"] as LayerId[]).flatMap((layer) => { const d = DOT_CACHE[layer].find((x) => x.zone === z.id); return d ? [{ x: d.x, y: d.y, zone: z.id, layer, k: d.k }] : []; }));

const pts = (z: Zone) => z.poly.map((p) => p.join(",")).join(" ");

function CityMapBase({ layers, onPick, labels = true, dotScale = 1, zoneInfo = false, ambient = false }: { layers: LayerId[]; onPick?: (z: ZoneFilter) => void; labels?: boolean; dotScale?: number; zoneInfo?: boolean; ambient?: boolean }) {
  const { zone, setZone } = useFilters();
  const tick = useTick();
  const [hover, setHover] = useState<Zone["id"] | null>(null);
  const pick = (z: ZoneFilter) => { setZone(z); onPick?.(z); };

  // the status of each dot changes a little on every live refresh
  const status = useMemo(() => {
    const m = new Map<string, "ok" | "warn" | "bad">();
    for (const id of layers) for (const d of DOT_CACHE[id]) {
      const r = rng(d.k * 31 + id.length * 7 + tick * 977)();
      m.set(`${id}${d.k}`, r > 0.985 ? "bad" : r > 0.93 ? "warn" : "ok");
    }
    return m;
  }, [layers, tick]);

  const hz = hover ? ZONES.find((z) => z.id === hover) : null;
  return (
    <div className="mapwrap">
      <svg className="map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="New Alamein City master plan with zones and smart device layers">
        <image className="map-img" href="/master-plan.webp" x="0" y="0" width={MAP_W} height={MAP_H} />
        {ZONES.map((z, i) => (
          <g key={z.id}>
            <polygon className={`zone ${zone === z.id ? "sel" : ""} ${hover === z.id ? "hov" : ""} ${zone !== "all" && zone !== z.id ? "dim" : ""}`} points={pts(z)} tabIndex={0} role="button" aria-label={`${z.name}, ${z.kind}`}
              style={{ ["--n" as string]: i }}
              onMouseEnter={() => setHover(z.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(z.id)} onBlur={() => setHover(null)}
              onClick={() => pick(zone === z.id ? "all" : z.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(zone === z.id ? "all" : z.id); } }} />
          </g>
        ))}
        {layers.map((id) => {
          const color = LAYERS.find((l) => l.id === id)!.color;
          return (
            <g key={id} className="dots" pointerEvents="none">
              {DOT_CACHE[id].map((d) => {
                const s = status.get(`${id}${d.k}`) ?? "ok";
                const faded = zone !== "all" && zone !== d.zone;
                return <circle key={d.k} cx={d.x} cy={d.y} r={(s === "ok" ? 4 : 5.4) * dotScale} fill={s === "bad" ? "var(--bad)" : s === "warn" ? "var(--warn)" : color} className={`dot ${s} ${faded ? "faded" : ""}`} />;
              })}
            </g>
          );
        })}
        {ambient && layers.length === 0 && (
          <g className="dots" pointerEvents="none">
            {AMBIENT.map((d) => <circle key={`${d.layer}${d.k}`} cx={d.x} cy={d.y} r={7 * dotScale} fill={LAYERS.find((l) => l.id === d.layer)!.color} className={`dot ${zone !== "all" && zone !== d.zone ? "faded" : ""}`} />)}
          </g>
        )}
        {labels && ZONES.map((z) => (
          <text key={z.id} className={`zlabel ${zone !== "all" && zone !== z.id ? "dim" : ""}`} x={z.label[0]} y={z.label[1]} textAnchor="middle" pointerEvents="none">{z.name}</text>
        ))}
        {zoneInfo && zone !== "all" && (() => {
          const zi = ZONES.findIndex((z) => z.id === zone), z = ZONES[zi];
          const txt = `${Math.round(CITY.meters * SHARE.meters[zi]).toLocaleString("en-US")} meters · ${Math.round(CITY.poles * SHARE.poles[zi])} poles · ${Math.round(CITY.parking * SHARE.parking[zi])} parking`;
          const w = txt.length * 8.4 + 28;
          return (
            <g pointerEvents="none" className="zinfo">
              <rect x={z.label[0] - w / 2} y={z.label[1] + 16} width={w} height={30} rx={15} />
              <text x={z.label[0]} y={z.label[1] + 36} textAnchor="middle">{txt}</text>
            </g>
          );
        })()}
      </svg>
      {hz && <div className="maptip"><b>{hz.name}</b><span>{hz.kind}</span></div>}
    </div>
  );
}
export default memo(CityMapBase);
