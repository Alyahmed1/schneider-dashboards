import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { REDUCE } from "./ui";

/* A map you can drag and zoom (wheel, buttons). Children are drawn in map units and receive the zoom level k,
   so markers can stay a sensible size while zooming. */
interface T { k: number; x: number; y: number }
export interface Focus { x: number; y: number; k: number; n: number }

const MAX_K = 4;

export function MapStage({ W, H, label, base, children, overlay, focus, fixed = false }: { W: number; H: number; label: string; base: ReactNode; children: (k: number) => ReactNode; overlay?: ReactNode; focus?: Focus; fixed?: boolean }) {
  const [t, setT] = useState<T>({ k: 1, x: 0, y: 0 });
  const [drag, setDrag] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const tRef = useRef(t); tRef.current = t;

  const clamp = useCallback((k: number, x: number, y: number): T => ({ k, x: Math.min(0, Math.max(W - W * k, x)), y: Math.min(0, Math.max(H - H * k, y)) }), [W, H]);
  /** screen pixels to map units, for the svg as it is drawn right now */
  const geo = () => {
    const r = svg.current!.getBoundingClientRect();
    const sc = Math.min(r.width / W, r.height / H);
    return { r, sc, ox: (r.width - W * sc) / 2, oy: (r.height - H * sc) / 2 };
  };
  const zoomAt = useCallback((f: number, px: number, py: number) => {
    const c = tRef.current;
    const k = Math.min(MAX_K, Math.max(1, c.k * f));
    const wx = (px - c.x) / c.k, wy = (py - c.y) / c.k;
    setT(clamp(k, px - wx * k, py - wy * k));
  }, [clamp]);

  // the wheel listener must not be passive, otherwise the page scrolls while the map zooms
  useEffect(() => {
    const el = svg.current;
    if (!el || fixed) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const sc = Math.min(r.width / W, r.height / H);
      const px = (e.clientX - r.left - (r.width - W * sc) / 2) / sc, py = (e.clientY - r.top - (r.height - H * sc) / 2) / sc;
      zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, px, py);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [W, H, zoomAt, fixed]);

  const start = useRef<{ cx: number; cy: number; t: T; on: boolean; id: number } | null>(null);
  const down = (e: React.PointerEvent) => { if (e.button === 0) start.current = { cx: e.clientX, cy: e.clientY, t: tRef.current, on: false, id: e.pointerId }; };
  const move = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    if (!s.on) {
      if (Math.hypot(e.clientX - s.cx, e.clientY - s.cy) < 5) return;
      s.on = true; setDrag(true);
      try { svg.current!.setPointerCapture(s.id); } catch { /* pointer already gone */ }
    }
    const { sc } = geo();
    setT(clamp(s.t.k, s.t.x + (e.clientX - s.cx) / sc, s.t.y + (e.clientY - s.cy) / sc));
  };
  const up = () => { start.current = null; setDrag(false); };

  useEffect(() => { if (focus) setT(clamp(focus.k, W / 2 - focus.x * focus.k, H / 2 - focus.y * focus.k)); }, [focus?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const center = (f: number) => zoomAt(f, W / 2, H / 2);
  return (
    <div className="mapwrap">
      <svg ref={svg} className={`map pz-svg ${drag ? "grabbing" : ""}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}
        onPointerDown={fixed ? undefined : down} onPointerMove={fixed ? undefined : move} onPointerUp={up} onPointerCancel={up} onDoubleClick={fixed ? undefined : () => setT({ k: 1, x: 0, y: 0 })} style={fixed ? { cursor: "default" } : undefined}>
        <g className={`pz ${drag || REDUCE ? "still" : ""}`} style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }}>
          {base}
          {children(t.k)}
        </g>
      </svg>
      {overlay}
      {!fixed && <div className="zoomctl" role="group" aria-label="Map zoom">
        <button onClick={() => center(1.5)} aria-label="Zoom in" title="Zoom in"><Plus size={15} /></button>
        <button onClick={() => center(1 / 1.5)} aria-label="Zoom out" title="Zoom out"><Minus size={15} /></button>
        <button onClick={() => setT({ k: 1, x: 0, y: 0 })} aria-label="Reset the map view" title="Reset view"><Maximize2 size={14} /></button>
      </div>}
    </div>
  );
}

/** one shared stopwatch for a map tab: buses, cars and the details panel all read the same time, and pause together */
export interface Clock { get: () => number; setPlaying: (p: boolean) => void; subscribe: (f: () => void) => () => void; start: () => void; stop: () => void }
export function createClock(): Clock {
  let t = 0, playing = true, raf = 0, last = 0, on = false;
  const subs = new Set<() => void>();
  const loop = (now: number) => {
    if (playing) { t += (now - last) / 1000; subs.forEach((f) => f()); }
    last = now;
    raf = requestAnimationFrame(loop);
  };
  return {
    get: () => t,
    setPlaying: (p) => { playing = p; },
    subscribe: (f) => { subs.add(f); return () => { subs.delete(f); }; },
    start: () => { if (on || REDUCE) return; on = true; last = performance.now(); raf = requestAnimationFrame(loop); },
    stop: () => { on = false; cancelAnimationFrame(raf); },
  };
}

/** the simulated time in seconds; the calling component re-renders about `fps` times a second */
export function useSimTime(clock: Clock, fps = 15) {
  const [, force] = useState(0);
  const shown = useRef(0);
  useEffect(() => clock.subscribe(() => {
    const now = performance.now();
    if (now - shown.current >= 1000 / fps) { shown.current = now; force((n) => n + 1); }
  }), [clock, fps]);
  return clock.get();
}
