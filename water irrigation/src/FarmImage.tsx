import { useCallback, useEffect, useRef, useState } from "react";
import { Home, Layers, Minus, Plus } from "lucide-react";
import { fmt, type PivotNow, type StationId } from "./farm";
import { pivotColor } from "./farmColor";

/** the farm picture (public/farm-map.jpg, 3.21 : 1). Click areas sit over it in percentages of the picture, so they stay on the right circle at any box size or zoom. */
const W = 1999, H = 623, RX = 98, RY = 71;
const COLS = [728, 929, 1131, 1331];
const PIVOT_AT: Record<string, [number, number]> = {
  P1: [COLS[0], 215], P2: [COLS[1], 215], P3: [COLS[2], 215], P4: [COLS[3], 215],
  P5: [COLS[0] + 4, 377], P6: [COLS[1], 377], P7: [COLS[2], 377], P8: [COLS[3], 377],
};
const STATION_AT: Record<StationId, [number, number, number, number]> = { // x, y, width, height of the label box in the picture
  "PS-B": [530, 217, 146, 76], "PS-A": [1556, 214, 170, 76], "PS-C": [1556, 382, 170, 76],
};
const POND_AT = [516, 383, 205, 118]; // the storage pond and its label: it feeds the PS-C booster, so it opens that station
const pc = (v: number, of: number) => `${(v / of) * 100}%`;
const MAX = 4, STEP = 1.5;

interface View { s: number; x: number; y: number }

export default function FarmImage({ snap, onOpen, onStation }: { snap: PivotNow[]; onOpen: (id: string) => void; onStation: (id: StationId) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [v, setV] = useState<View>({ s: 1, x: 0, y: 0 });
  const [drag, setDrag] = useState(false);
  const [menu, setMenu] = useState(false);
  const [rings, setRings] = useState(false);
  const [muted, setMuted] = useState(false);
  const moved = useRef(false);

  // keep the picture covering the whole box: it can be moved, never pulled off an edge
  const fit = useCallback((s: number, x: number, y: number): View => {
    const el = box.current;
    const w = el?.clientWidth ?? 0, h = el?.clientHeight ?? 0;
    return { s, x: Math.min(0, Math.max(w * (1 - s), x)), y: Math.min(0, Math.max(h * (1 - s), y)) };
  }, []);
  // zoom by a factor around a point of the box (default: its centre)
  const zoom = useCallback((f: number, cx?: number, cy?: number) => {
    setV((o) => {
      const el = box.current;
      const px = cx ?? (el?.clientWidth ?? 0) / 2, py = cy ?? (el?.clientHeight ?? 0) / 2;
      const s = Math.min(MAX, Math.max(1, o.s * f));
      return fit(s, px - ((px - o.x) * s) / o.s, py - ((py - o.y) * s) / o.s);
    });
  }, [fit]);
  const home = () => setV({ s: 1, x: 0, y: 0 });

  // mouse wheel zooms around the pointer (needs a non-passive listener to stop the page scrolling)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const on = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }, [zoom]);
  useEffect(() => { // a resized window keeps the picture covering the box
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setV((o) => fit(o.s, o.x, o.y)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // drag to move the zoomed picture
  const down = (e: React.PointerEvent) => {
    if (v.s === 1 || (e.target as HTMLElement).closest(".fi-tools, .fi-menu")) return;
    const sx = e.clientX, sy = e.clientY, o = v;
    moved.current = false;
    const mv = (m: PointerEvent) => {
      if (Math.abs(m.clientX - sx) + Math.abs(m.clientY - sy) > 4) { moved.current = true; setDrag(true); }
      if (moved.current) setV(fit(o.s, o.x + m.clientX - sx, o.y + m.clientY - sy));
    };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); setDrag(false); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  const open = (fn: () => void) => () => { if (!moved.current) fn(); moved.current = false; };
  const pct = Math.round(v.s * 100);

  return (
    <div ref={box} className={`fi ${v.s > 1 ? "zoomed" : ""} ${drag ? "drag" : ""}`} onPointerDown={down}>
      <div className={`fi-stage ${muted ? "muted" : ""}`} style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.s})` }}>
        <img src="/farm-map.jpg" alt="Satellite picture of the farm: eight pivots P1 to P8, three pump stations, the canal and the storage pond" draggable={false} />
        {snap.filter((n) => PIVOT_AT[n.p.id]).map((n) => {
          const [x, y] = PIVOT_AT[n.p.id], c = pivotColor("Soil moisture", n);
          return (
            <button key={n.p.id} className={`fi-hot ${rings ? "lit" : ""}`} onClick={open(() => onOpen(n.p.id))} aria-label={`Open pivot ${n.p.id}`} title={`Open pivot ${n.p.id}`}
              style={{ left: pc(x - RX, W), top: pc(y - RY, H), width: pc(2 * RX, W), height: pc(2 * RY, H), ["--c" as string]: c }}>
              {rings && <span className="fi-chip">{fmt(n.moist, 1)}%</span>}
            </button>
          );
        })}
        {(Object.entries(STATION_AT) as [StationId, number[]][]).map(([id, [x, y, w, h]]) => (
          <button key={id} className="fi-hot st" onClick={open(() => onStation(id))} aria-label={`Open pump station ${id}`} title={`Open pump station ${id}`}
            style={{ left: pc(x - w / 2, W), top: pc(y - h / 2, H), width: pc(w, W), height: pc(h, H) }} />
        ))}
        <button className="fi-hot st" onClick={open(() => onStation("PS-C"))} aria-label="Open the storage pond: the PS-C booster station draws from it" title="Storage pond: open the PS-C booster station that draws from it"
          style={{ left: pc(POND_AT[0] - POND_AT[2] / 2, W), top: pc(POND_AT[1] - POND_AT[3] / 2, H), width: pc(POND_AT[2], W), height: pc(POND_AT[3], H) }} />
      </div>

      <div className="fi-tools" role="toolbar" aria-label="Map controls">
        <button onClick={() => zoom(STEP)} disabled={v.s >= MAX} aria-label="Zoom in" title="Zoom in"><Plus size={16} /></button>
        <button onClick={() => zoom(1 / STEP)} disabled={v.s <= 1} aria-label="Zoom out" title="Zoom out"><Minus size={16} /></button>
        <button onClick={home} disabled={v.s === 1} aria-label="Reset the view" title="Reset the view"><Home size={16} /></button>
        <button className={menu ? "on" : ""} onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Map layers" title="Map layers"><Layers size={16} /></button>
      </div>
      {menu && (
        <div className="fi-menu" role="group" aria-label="Map layers">
          <b>Layers</b>
          <label><input type="checkbox" checked={rings} onChange={(e) => setRings(e.target.checked)} />Live soil moisture on each pivot</label>
          <label><input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />Muted picture</label>
        </div>
      )}
      {v.s > 1 && <span className="fi-zoom" aria-live="polite">Zoom {pct}% · drag to move</span>}
    </div>
  );
}
