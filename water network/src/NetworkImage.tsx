import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from "react";
import { INSTRUMENTS, LEAKS, networkAt, pipeBetween, pipeById, readInstrument, ZONES, type ZoneId } from "./network";
import { BAD, GOOD, MID, type Metric } from "./mapcolor";
import { pipeColor, zoneInfo } from "./geo";

/* The Network Map drawn on the New Cairo picture (public/network-map.jpg, 1024 x 512). Everything that changes is drawn live on top of the picture,
   in the picture's own pixels: the zone colours, the pipes with moving water, the controller badges, the zone cards and the gauges.
   When a layer is switched off, the same spot of the picture is covered, so the picture never shows a stale colour or number. */

export interface GeoLayers { areas: boolean; pipes: boolean; ctl: boolean }

type P = [number, number];
type Rect = { x: number; y: number; w: number; h: number };
const IW = 1024, IH = 512;
const BG = "#0d2f4c";

const ZONE_SHAPE: Record<ZoneId, P[]> = {
  Z1: [[394, 118], [452, 108], [451, 175], [450, 240], [452, 285], [400, 292], [358, 285], [342, 262], [335, 220], [337, 195], [347, 172], [360, 160], [394, 158]],
  Z3: [[505, 94], [567, 90], [597, 104], [625, 115], [645, 131], [659, 149], [652, 172], [630, 207], [600, 217], [560, 209], [557, 190], [532, 172], [526, 164], [507, 152]],
  Z4: [[567, 290], [598, 268], [640, 235], [670, 212], [687, 214], [702, 254], [717, 287], [712, 330], [700, 362], [670, 410], [647, 394], [625, 365], [592, 335]],
  Z5: [[86, 114], [208, 108], [214, 166], [84, 172]],
  Z6: [[58, 266], [188, 260], [194, 314], [54, 318]],
  Z7: [[36, 334], [158, 328], [164, 382], [32, 388]],
  Z8: [[336, 368], [452, 364], [458, 408], [332, 412]],
};
/** the zone cards. The first three sit on cards printed on the picture. The four new ones sit in open gaps, clear of zones, pipes and badges. */
const CARD: Record<ZoneId, Rect> = {
  Z1: { x: 284, y: 21, w: 181, h: 75 }, Z3: { x: 567, y: 5, w: 178, h: 77 }, Z4: { x: 770, y: 163, w: 178, h: 78 },
  Z5: { x: 52, y: 8, w: 180, h: 76 }, Z6: { x: 8, y: 178, w: 180, h: 76 }, Z7: { x: 6, y: 396, w: 188, h: 76 }, Z8: { x: 248, y: 416, w: 178, h: 76 },
};
/** only these three cards are printed on the picture, so only they need covering when Zones is off */
const PRINTED_ZONES: ZoneId[] = ["Z1", "Z3", "Z4"];
const CARD_BG: Record<string, string> = { Z1: "#032742", Z3: "#01213d", Z4: "#01203b" };
/** where plain streets of the same size sit, as an offset from each card */
const CARD_FROM: Record<string, P> = { Z1: [-200, 0], Z3: [230, 0], Z4: [60, 180] };
const CARD_LEAD: Record<string, P[]> = { Z1: [[420, 96], [439, 129]], Z3: [[602, 82], [574, 115]], Z4: [[770, 206], [747, 206], [699, 264]] };

/** each pipe of the picture, as the model pipe it stands for (drawn from the upstream end); bg is the picture's colour beside it, used to hide it */
const SEGS: { from: string; to: string; pts: P[]; bg: string; id: string; brown?: boolean }[] = ([
  // each line starts where the previous one ends, and the last point of a run is a plant, the reservoir, or a P badge
  { from: "wtp", to: "ps1", pts: [[493, 445], [491, 363]], bg: "#0a2a45" },
  { from: "ps1", to: "j0", pts: [[491, 363], [508, 278]], bg: "#0a2a45" },
  { from: "j0", to: "res", pts: [[508, 278], [470, 248], [430, 224], [392, 210]], bg: "#1e5a43" },
  { from: "j0", to: "j1", pts: [[508, 278], [505, 233]], bg: "#0a2a45" },
  { from: "j1", to: "a1", pts: [[505, 233], [448, 228]], bg: "#0f3a48" },
  { from: "a1", to: "a2", pts: [[448, 228], [348, 168]], bg: "#2d6b37" },
  { from: "j1", to: "c1", pts: [[505, 233], [531, 182]], bg: "#55783a", brown: true },
  { from: "c1", to: "c2", pts: [[531, 182], [575, 182]], bg: "#7a2634", brown: true },
  { from: "c2", to: "c4", pts: [[575, 182], [610, 168]], bg: "#8e1d31", brown: true },
  { from: "c2", to: "c3", pts: [[610, 168], [633, 142]], bg: "#702532", brown: true },
  { from: "j0", to: "ps2", pts: [[508, 278], [520, 295]], bg: "#0a2a45" },
  { from: "ps2", to: "d1", pts: [[520, 295], [590, 300]], bg: "#0d7144" },
  { from: "ps2", to: "d1", pts: [[590, 300], [605, 331]], bg: "#0d7144", brown: true },
  { from: "d1", to: "d3", pts: [[605, 331], [650, 348]], bg: "#298d28", brown: true },
  { from: "d2", to: "d4", pts: [[650, 348], [690, 350]], bg: "#089114", brown: true },
  { from: "d4", to: "d5", pts: [[690, 350], [700, 370]], bg: "#034c3d", brown: true },
  // one feeder each, from the hub to that district's P. The shared part is the same line, then they split.
  { from: "j0", to: "pa1", pts: [[508, 278], [450, 310], [250, 310], [220, 168], [200, 142], [98, 150]], bg: "#0a2a45" },
  { from: "j0", to: "nc1", pts: [[508, 278], [450, 310], [250, 310], [186, 292], [72, 292]], bg: "#0a2a45" },
  { from: "j0", to: "qg1", pts: [[508, 278], [450, 310], [250, 310], [160, 354], [50, 364]], bg: "#0a2a45" },
  { from: "j0", to: "mc1", pts: [[508, 278], [450, 310], [420, 376], [440, 400]], bg: "#0a2a45" },
] as { from: string; to: string; pts: P[]; bg: string; brown?: boolean }[]).map((s) => ({ ...s, id: pipeBetween(s.from, s.to).id }));

/** F where the water enters a zone, P at the far end. id is the existing meter, when there is one. */
const BADGES: { id?: string; letter: "F" | "P"; x: number; y: number; z: ZoneId }[] = [
  { id: "FT-02", letter: "F", x: 448, y: 228, z: "Z1" }, { id: "PT-02", letter: "P", x: 348, y: 168, z: "Z1" },
  { id: "FT-04", letter: "F", x: 531, y: 182, z: "Z3" }, { id: "PT-03", letter: "P", x: 633, y: 142, z: "Z3" },
  { id: "FT-05", letter: "F", x: 590, y: 300, z: "Z4" }, { id: "PT-04", letter: "P", x: 700, y: 370, z: "Z4" },
  { id: "FT-06", letter: "F", x: 200, y: 142, z: "Z5" }, { id: "PT-05", letter: "P", x: 98, y: 150, z: "Z5" },
  { id: "FT-07", letter: "F", x: 186, y: 292, z: "Z6" }, { id: "PT-06", letter: "P", x: 72, y: 292, z: "Z6" },
  { id: "FT-08", letter: "F", x: 160, y: 354, z: "Z7" }, { id: "PT-07", letter: "P", x: 50, y: 364, z: "Z7" },
  { id: "FT-09", letter: "F", x: 420, y: 376, z: "Z8" }, { id: "PT-08", letter: "P", x: 440, y: 400, z: "Z8" },
];
/** letters and gauges printed on the picture that this map no longer uses, covered so they never show through */
const HIDE_DOTS: { x: number; y: number; bg: string }[] = [
  { x: 390, y: 153, bg: "#767e23" }, { x: 467, y: 236, bg: "#0a2a45" }, { x: 506, y: 211, bg: "#0a2a45" },
  { x: 595, y: 165, bg: "#852333" }, { x: 633, y: 130, bg: "#594546" }, { x: 629, y: 274, bg: "#178f2b" },
  { x: 639, y: 312, bg: "#437624" }, { x: 685, y: 343, bg: "#0e9a1f" },
];
const HIDE_PILLS: { id: string; r: Rect; from: P }[] = [
  { id: "g1", r: { x: 271, y: 124, w: 90, h: 27 }, from: [-60, 250] },
  { id: "g2", r: { x: 468, y: 129, w: 86, h: 26 }, from: [420, 120] },
  { id: "g3", r: { x: 726, y: 317, w: 94, h: 28 }, from: [120, 60] },
];
/** the plant, the pumps and the reservoir printed on the picture, and the meters that belong to each */
const FACS: { id: string; name: string; x: number; y: number; r: number; meters: string[] }[] = [
  { id: "wtp", name: "Treatment plant", x: 493, y: 445, r: 27, meters: ["FT-01"] },
  { id: "ps1", name: "PS-1 pumps", x: 491, y: 363, r: 20, meters: ["PU-01", "PT-01"] },
  { id: "res", name: "Reservoir", x: 392, y: 210, r: 27, meters: ["LT-01", "AT-01"] },
  { id: "ps2", name: "Booster (PS-2)", x: 520, y: 295, r: 18, meters: ["PU-02"] },
];
const RES_CARD: Rect = { x: 350, y: 236, w: 85, h: 52 };
/** the name boxes printed under the booster, PS-1 and the plant */
const FAC_LABELS: Rect[] = [{ x: 486, y: 307, w: 72, h: 27 }, { x: 502, y: 360, w: 75, h: 39 }, { x: 432, y: 466, w: 130, h: 33 }];
/** the zoom buttons printed on the picture: always covered, the working ones sit on top of the map */
const PRINTED_TOOLS: Rect = { x: 7, y: 6, w: 42, h: 106 };

const TONE_FILL: Record<string, string> = { good: "#1f8f45", warn: "#c58a10", bad: "#c8283f", info: "#1f6fd6" };
const lvl = (c: string) => (c === GOOD ? "lv0" : c === MID ? "lv1" : "lv2");
const pts = (p: P[]) => p.map((q) => q.join(",")).join(" ");
const line = (p: P[]) => `M${p.map((q) => q.join(" ")).join(" L")}`;
const INST = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i]));
const bbox = (p: P[]) => { const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }; };

/** a soft-edged copy of another part of the picture (offset `from`), laid over the box `r` */
function Clone({ id, r, from, rx = 8 }: { id: string; r: Rect; from: P; rx?: number }) {
  return (
    <>
      <mask id={`ni-m-${id}`} maskUnits="userSpaceOnUse" x={r.x - 12} y={r.y - 12} width={r.w + 24} height={r.h + 24}>
        <rect x={r.x - 3} y={r.y - 3} width={r.w + 6} height={r.h + 6} rx={rx} fill="#fff" filter="url(#ni-feather)" />
      </mask>
      <image href="/network-map.jpg" x={-from[0]} y={-from[1]} width={IW} height={IH} preserveAspectRatio="none" mask={`url(#ni-m-${id})`} pointerEvents="none" />
    </>
  );
}

/** one value per hour for a zone, for the little chart on its card */
function zoneDay(metric: Metric, id: ZoneId) {
  return Array.from({ length: 24 }, (_, h) => { const q = networkAt(h).zones[id]; return metric === "Consumption" ? q.supplied : metric === "Pressure" ? q.pressure : q.nrw * 100; });
}

interface Props {
  metric: Metric; hour: number;
  zone: ZoneId | null; onZone: (z: ZoneId | null) => void;
  layers: GeoLayers;
  sel: string | null; onSel: (id: string) => void;
}
type View = { z: number; cx: number; cy: number };
type Tip = { x: number; y: number; title: string; rows: string[] } | null;

export default function NetworkImage({ metric, hour, zone, onZone, layers, sel, onSel }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const [drag, setDrag] = useState(false);
  const [tip, setTip] = useState<Tip>(null);
  const moved = useRef(false);

  useLayoutEffect(() => {
    const el = box.current!;
    const measure = () => setSize((o) => (o.w === el.clientWidth && o.h === el.clientHeight ? o : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  /* ---------- fitting and zooming ---------- */
  // the whole picture always shows at the start: nothing is cropped
  const k0 = size.w && size.h ? Math.min(size.w / IW, size.h / IH) : 1;
  const clamp = (v: View): View => {
    const z = Math.min(5, Math.max(1, v.z)), k = k0 * z, hw = size.w / (2 * k), hh = size.h / (2 * k);
    const cx = hw * 2 >= IW ? IW / 2 : Math.min(IW - hw, Math.max(hw, v.cx));
    const cy = hh * 2 >= IH ? IH / 2 : Math.min(IH - hh, Math.max(hh, v.cy));
    return { z, cx, cy };
  };
  const home = (): View => clamp({ z: 1, cx: IW / 2, cy: IH / 2 });
  const focus = (id: ZoneId): View => {
    const b = bbox([...ZONE_SHAPE[id], [CARD[id].x, CARD[id].y], [CARD[id].x + CARD[id].w, CARD[id].y + CARD[id].h]]);
    const z = Math.min(size.w / (b.x1 - b.x0 + 60), size.h / (b.y1 - b.y0 + 60)) / k0;
    return clamp({ z: Math.min(3, Math.max(1, z)), cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 });
  };
  const v = view ? clamp(view) : home();
  const k = k0 * v.z, tx = size.w / 2 - v.cx * k, ty = size.h / 2 - v.cy * k;

  useEffect(() => { if (size.w) setView(zone ? focus(zone) : null); }, [zone]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomBy = (f: number, mx = size.w / 2, my = size.h / 2) => {
    const px = (mx - tx) / k, py = (my - ty) / k, z = Math.min(5, Math.max(1, v.z * f)), k2 = k0 * z;
    setView(clamp({ z, cx: px - (mx - size.w / 2) / k2, cy: py - (my - size.h / 2) / k2 }));
  };
  const goHome = () => { setView(null); if (zone) onZone(null); };

  // the wheel zooms around the pointer (a listener that may stop the page from scrolling)
  const wheel = useRef(zoomBy); wheel.current = zoomBy;
  useEffect(() => {
    const el = box.current!;
    const on = (e: WheelEvent) => { e.preventDefault(); const r = el.getBoundingClientRect(); wheel.current(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); };
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }, []);

  // drag to move; a drag is not a click
  const start = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const onDown = (e: RPointerEvent) => { if (e.button !== 0 || (e.target as HTMLElement).closest(".ni-tools")) return; start.current = { x: e.clientX, y: e.clientY, cx: v.cx, cy: v.cy }; moved.current = false; };
  const onMove = (e: RPointerEvent) => {
    const s = start.current;
    if (s) {
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (!moved.current && Math.hypot(dx, dy) > 4) { moved.current = true; setDrag(true); setTip(null); box.current!.setPointerCapture(e.pointerId); }
      if (moved.current) { setView(clamp({ z: v.z, cx: s.cx - dx / k, cy: s.cy - dy / k })); return; }
    }
    if (tip) {
      if (!(e.target as Element).closest("[data-tip]")) { setTip(null); return; }
      const r = box.current!.getBoundingClientRect(); setTip({ ...tip, x: e.clientX - r.left, y: e.clientY - r.top });
    }
  };
  const onUp = () => { start.current = null; setDrag(false); };
  const click = (f: () => void) => () => { if (!moved.current) f(); };
  const key = (f: () => void) => (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } };
  const hover = (title: string, rows: string[]) => ({
    "data-tip": "",
    onPointerEnter: (e: RPointerEvent) => { if (start.current && moved.current) return; const r = box.current!.getBoundingClientRect(); setTip({ x: e.clientX - r.left, y: e.clientY - r.top, title, rows }); },
    onPointerLeave: () => setTip(null),
  });

  /* ---------- the live picture ---------- */
  const s = networkAt(hour);
  const day = useMemo(() => Object.fromEntries(ZONES.map((z) => [z.id, zoneDay(metric, z.id)])) as Record<ZoneId, number[]>, [metric]);
  const dimZ = (z: ZoneId | null) => zone !== null && z !== null && z !== zone;
  const pickZone = (id: ZoneId) => onZone(zone === id ? null : id);
  const ctlSel = (id: string) => onSel(id);

  return (
    <div ref={box} className={`ni ${drag ? "drag" : ""}`} style={{ background: BG }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      role="application" aria-label="Map of the water network over New Cairo. Drag to move, scroll or use the plus and minus to zoom, the house to see it all.">
      <div className="ni-stage" style={{ width: IW, height: IH, transform: `translate(${tx}px, ${ty}px) scale(${k})` }}>
        <svg className="ni-svg" width={IW} height={IH} viewBox={`0 0 ${IW} ${IH}`}>
          <defs>
            <filter id="ni-feather" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" /></filter>
            <filter id="ni-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <clipPath id="ni-keep">
              {FACS.map((f) => <circle key={f.id} cx={f.x} cy={f.y} r={f.r + 2} />)}
              {FAC_LABELS.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="5" />)}
            </clipPath>
          </defs>
          <image href="/network-map.jpg" width={IW} height={IH} preserveAspectRatio="none" />

          {/* zones: the printed colour is replaced by the live one; off, the zone goes back to plain streets */}
          {/* what is switched off is painted over in the colour of the picture around it; the zone colouring then goes over these patches too */}
          <g className="ni-cover" filter="url(#ni-feather)">
            {!layers.pipes && SEGS.map((g, i) => <path key={i} d={line(g.pts)} className="pipe" style={{ stroke: g.bg }} />)}
            {HIDE_DOTS.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r="17" style={{ fill: b.bg }} />)}
            {!layers.areas && PRINTED_ZONES.map((id) => (
              <g key={id} style={{ fill: CARD_BG[id], stroke: CARD_BG[id] }}>
                <path d={line(CARD_LEAD[id])} className="lead" />
                <circle cx={CARD_LEAD[id].at(-1)![0]} cy={CARD_LEAD[id].at(-1)![1]} r="6" />
              </g>
            ))}
          </g>
          {/* boxes printed on plain streets are covered with plain streets from elsewhere in the picture */}
          <Clone id="tools" r={PRINTED_TOOLS} from={[60, 0]} />
          {HIDE_PILLS.map((b) => <Clone key={b.id} id={b.id} r={b.r} from={b.from} rx={b.r.h / 2} />)}
          {!layers.areas && PRINTED_ZONES.map((id) => <Clone key={id} id={id} r={CARD[id]} from={CARD_FROM[id]} />)}

          <g className="ni-zones">
            {ZONES.map((z) => {
              const shape = pts(ZONE_SHAPE[z.id]);
              if (!layers.areas) return (
                <g key={z.id} className="ni-zoff">
                  <polygon className="mul" points={shape} />
                  <polygon className="col" points={shape} />
                  <polygon className="edge" points={shape} filter="url(#ni-feather)" />
                </g>
              );
              const info = zoneInfo(metric, s, z.id), q = s.zones[z.id], c = info.c, d = dimZ(z.id), on = zone === z.id;
              return (
                <g key={z.id} className={`ni-z ${d ? "dim" : ""} ${on ? "on" : ""}`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${z.name}: ${info.big} ${info.unit}. Focus this zone`}
                  onClick={click(() => pickZone(z.id))} onKeyDown={key(() => pickZone(z.id))}
                  {...hover(z.name, [`Use ${q.supplied.toFixed(0)} L/s · pressure ${q.pressure.toFixed(1)} bar`, `Water lost ${(q.nrw * 100).toFixed(0)}% · ${(q.loss * 86.4).toFixed(0)} m³/day`, on ? "Click to show every zone" : "Click to focus this zone"])}>
                  <polygon className="mul" points={shape} />
                  <polygon className="col" points={shape} style={{ fill: c }} />
                  <polygon className="tint" points={shape} style={{ fill: c }} />
                  <polygon className="edge" points={shape} style={{ stroke: c }} filter="url(#ni-glow)" />
                  {d && <polygon className="shade" points={shape} />}
                </g>
              );
            })}
          </g>

          {/* pipes: coloured by the chosen measure, with the water moving */}
          {layers.pipes && <g className="ni-pipes">
            {SEGS.map((g, i) => {
              const p = pipeById(g.id), st = s.pipes[g.id], d = dimZ(p.zone === "trunk" ? null : p.zone), moving = !st.closed && st.flow > 0.5;
              const zn = p.zone === "trunk" ? "Trunk main" : ZONES.find((z) => z.id === p.zone)!.name;
              return (
                <g key={i} className={d ? "dim" : ""} {...hover(`${p.id} · DN${p.dn} · ${zn}`, [`Flow ${st.flow.toFixed(0)} L/s · ${st.velocity.toFixed(2)} m/s`, `Pressure ${st.pressure.toFixed(1)} bar · ${p.length} m long`, ...(st.leak > 0 ? [`Leak ${st.leak} L/s`] : [])])}>
                  <path d={line(g.pts)} className="case" style={g.brown ? { stroke: "#8a5a32" } : undefined} />
                  <path d={line(g.pts)} className="pipe" style={{ stroke: g.brown ? "#8a5a32" : pipeColor(metric, s, p) }} filter="url(#ni-glow)" />
                  {moving && <path d={line(g.pts)} className={`flow ${st.reverse ? "rev" : ""}`} style={{ ["--dur" as string]: `${Math.max(0.35, Math.min(4, 13 / (Math.max(st.velocity, 0.05) * 14)))}s` }} />}
                  <path d={line(g.pts)} className="hit" />
                </g>
              );
            })}
          </g>}
          {/* the plant, pumps and reservoir, and their name boxes, keep their own picture colours above the zones and pipes */}
          <image href="/network-map.jpg" width={IW} height={IH} preserveAspectRatio="none" clipPath="url(#ni-keep)" pointerEvents="none" />

          {/* the plant, the pumps and the reservoir: printed on the picture, clickable here */}
          <g className="ni-facs">
            {FACS.map((f) => {
              const on = !!sel && f.meters.includes(sel);
              const rows = f.id === "res" ? [`Level ${s.tank.toFixed(0)}%`, `${s.tankFlow >= 0 ? "Filling" : "Emptying"} at ${Math.abs(s.tankFlow).toFixed(0)} L/s`]
                : f.id === "ps2" ? ["Boosts Lotus by 14 m", `${s.zones.Z4.supplied.toFixed(0)} L/s to Lotus`] : f.id === "ps1" ? ["Duty pump running, 2 + 1", `${s.plant.toFixed(0)} L/s`] : [`Output ${s.plant.toFixed(0)} L/s`];
              return (
                <g key={f.id} className={`ni-fac ${on ? "sel" : ""}`} role="button" tabIndex={0} aria-label={`${f.name}: ${rows.join(", ")}`}
                  onClick={click(() => ctlSel(f.meters[0]))} onKeyDown={key(() => ctlSel(f.meters[0]))} {...hover(f.name, rows)}>
                  <circle cx={f.x} cy={f.y} r={f.r + 3} className="hit" />
                  {on && <circle cx={f.x} cy={f.y} r={f.r + 5} className="ring" />}
                </g>
              );
            })}
          </g>

          {/* controllers */}
          {layers.ctl && <g className="ni-ctl">
            {BADGES.map((b) => {
              const q = s.zones[b.z];
              const inst = b.id ? INST[b.id] : undefined;
              const read = inst ? readInstrument(inst, hour) : null;
              const tone = read ? read.tone : b.letter === "P" && q.pressure < 2.5 ? "bad" : "good";
              const text = read ? read.text : b.letter === "F" ? `${q.supplied.toFixed(0)} L/s` : `${q.pressure.toFixed(1)} bar`;
              const title = inst ? `${b.letter} · ${inst.name}` : `${b.letter} · ${ZONES.find((z) => z.id === b.z)!.name}`;
              return (
                <g key={b.id ?? `${b.z}${b.letter}`} className={`ni-b ${tone} ${sel === b.id ? "sel" : ""} ${dimZ(b.z) ? "dim" : ""}`} role="button" tabIndex={0} aria-label={`${title}: ${text}`}
                  onClick={click(() => { if (b.id) ctlSel(b.id); else pickZone(b.z); })} onKeyDown={key(() => { if (b.id) ctlSel(b.id); else pickZone(b.z); })} {...hover(title, [text])}>
                  {tone === "bad" && <circle cx={b.x} cy={b.y} r="11" className="rip" />}
                  {b.id && sel === b.id && <circle cx={b.x} cy={b.y} r="17" className="ring" />}
                  <circle cx={b.x} cy={b.y} r="12.5" className="dot" style={{ fill: TONE_FILL[tone] }} />
                  <text x={b.x} y={b.y + 0.5}>{b.letter}</text>
                </g>
              );
            })}
          </g>}
        </svg>

        {/* zone cards, on the cards printed on the picture */}
        {layers.areas && ZONES.map((z) => {
          const info = zoneInfo(metric, s, z.id), c = CARD[z.id], vals = day[z.id], lo = Math.min(...vals), hi = Math.max(...vals);
          const sp = vals.map((x, i) => [4 + (i / 23) * 52, 22 - ((x - lo) / (hi - lo || 1)) * 18] as P);
          const leaks = LEAKS.filter((l) => pipeById(l.pipe).zone === z.id);
          return (
            <button key={z.id} type="button" className={`ni-card ${z.name.length > 12 ? "long" : ""} ${lvl(info.c)} ${dimZ(z.id) ? "dim" : ""} ${zone === z.id ? "on" : ""}`} style={{ left: c.x, top: c.y, width: c.w, height: c.h, ["--c" as string]: info.c }}
              onClick={click(() => pickZone(z.id))} aria-pressed={zone === z.id} title={leaks.length ? leaks.map((l) => `${l.id}: leak ${l.rate} L/s, ${l.status.toLowerCase()}`).join("\n") : undefined}>
              <b className="n">{z.name}</b>
              <span className="v"><b>{info.big}</b> {info.unit}</span>
              <span className="s">{info.sub}</span>
              <svg className="sp" viewBox="0 0 60 26" aria-hidden>
                <path d={`${line(sp)} L56 26 L4 26Z`} className="area" />
                <path d={line(sp)} className="ln" />
                <circle cx={4 + (Math.min(23, Math.round(hour)) / 23) * 52} cy={sp[Math.min(23, Math.round(hour))][1]} r="2" />
              </svg>
            </button>
          );
        })}

        {/* the reservoir level */}
        <div className="ni-res" style={{ left: RES_CARD.x, top: RES_CARD.y, width: RES_CARD.w, height: RES_CARD.h }}>
          <b>Reservoir</b>
          <span>{s.tank.toFixed(0)}% full</span>
          <i><u style={{ width: `${Math.max(0, Math.min(100, s.tank))}%`, background: s.tank < 25 ? BAD : s.tank < 35 ? MID : "#3ad7f0" }} /></i>
        </div>
      </div>

      <div className="ni-tools" role="group" aria-label="Zoom">
        <div className="pair">
          <button type="button" onClick={() => zoomBy(1.5)} aria-label="Zoom in" title="Zoom in" disabled={v.z >= 5}>+</button>
          <button type="button" onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out" title="Zoom out" disabled={v.z <= 1}>−</button>
        </div>
        <button type="button" className="home" onClick={goHome} aria-label="Show the whole network" title="Show the whole network">
          <svg viewBox="0 0 24 24" aria-hidden><path d="M3 11 12 3l9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>
        </button>
      </div>

      {tip && <div className="ni-tip" style={{ left: tip.x, top: tip.y }}><b>{tip.title}</b>{tip.rows.map((r) => <span key={r}>{r}</span>)}</div>}
    </div>
  );
}
