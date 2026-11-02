import type { ReactNode } from "react";

/** small isometric drawing kit: ground units go to the screen with x to the right-down and y to the left-down, z straight up */
const K = Math.cos(Math.PI / 6);
const H = 0.5;
export type P2 = [number, number];
export const pt = (x: number, y: number, z = 0): P2 => [(x - y) * K, (x + y) * H - z];
const pts = (a: P2[]) => a.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

/** colour families: w white equipment, b teal equipment, g grey concrete, p purple chemicals, s water, c buildings, e earth and grass, m raw sewage, o sludge, t treated water, a biogas */
export type Pal = "w" | "b" | "g" | "p" | "s" | "c" | "e" | "m" | "o" | "t" | "a";
/** the liquid inside a tank: m raw sewage, o mixed liquor / sludge, t treated water */
export type Tone = "m" | "o" | "t";

export function Box({ x, y, z = 0, w, d, h, pal = "w" }: { x: number; y: number; z?: number; w: number; d: number; h: number; pal?: Pal }) {
  const top = [pt(x, y, z + h), pt(x + w, y, z + h), pt(x + w, y + d, z + h), pt(x, y + d, z + h)];
  const left = [pt(x, y + d, z), pt(x + w, y + d, z), pt(x + w, y + d, z + h), pt(x, y + d, z + h)];
  const right = [pt(x + w, y, z), pt(x + w, y + d, z), pt(x + w, y + d, z + h), pt(x + w, y, z + h)];
  return (
    <g>
      <polygon className={`iso-${pal}l`} points={pts(left)} />
      <polygon className={`iso-${pal}r`} points={pts(right)} />
      <polygon className={`iso-${pal}t`} points={pts(top)} />
    </g>
  );
}

/** an upright tank: body shaded left to right, a lit top, and an optional water surface inside */
export function Cyl({ cx, cy, z = 0, r, h, pal = "w", water, wt }: { cx: number; cy: number; z?: number; r: number; h: number; pal?: Pal; water?: boolean; wt?: Tone }) {
  const [ox, oy] = pt(cx, cy, z);
  const rx = r * 1.2247, ry = r * 0.7071;
  return (
    <g>
      <path className={`iso-${pal}b`} d={`M${(ox - rx).toFixed(1)} ${(oy - h).toFixed(1)} L${(ox - rx).toFixed(1)} ${oy.toFixed(1)} A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 0 ${(ox + rx).toFixed(1)} ${oy.toFixed(1)} L${(ox + rx).toFixed(1)} ${(oy - h).toFixed(1)} Z`} />
      <ellipse className={`iso-${pal}t`} cx={ox} cy={oy - h} rx={rx} ry={ry} />
      {water && <ellipse className={`iso-water ${wt ?? ""}`} cx={ox} cy={oy - h + 0.5} rx={rx * 0.82} ry={ry * 0.82} />}
    </g>
  );
}

/** a horizontal vessel or motor: a thick rounded line with a light stripe on top */
export function Tube({ a, b, r, pal = "b" }: { a: P2; b: P2; r: number; pal?: Pal }) {
  return (
    <g>
      <line className={`iso-${pal}tube`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={r * 2} strokeLinecap="round" />
      <line className={`iso-tubehi`} x1={a[0]} y1={a[1] - r * 0.45} x2={b[0]} y2={b[1] - r * 0.45} strokeWidth={r * 0.55} strokeLinecap="round" />
    </g>
  );
}

/** one pump: a base plate, a motor and the casing; (x, y) is the corner on the ground */
export function Pump({ x, y, z = 0 }: { x: number; y: number; z?: number }) {
  return (
    <g>
      <Box x={x} y={y} z={z} w={34} d={18} h={4} pal="w" />
      <Tube a={pt(x + 5, y + 9, z + 13)} b={pt(x + 22, y + 9, z + 13)} r={7} pal="b" />
      <Cyl cx={x + 27} cy={y + 9} z={z + 4} r={7} h={14} pal="b" />
    </g>
  );
}

/** a small tree: a short trunk and two stacked cones */
export function Tree({ x, y, z = 0, s = 1 }: { x: number; y: number; z?: number; s?: number }) {
  const [ox, oy] = pt(x, y, z);
  const cone = (w: number, top: number, bot: number) => `${ox - w},${oy - bot} ${ox},${oy - top} ${ox + w},${oy - bot}`;
  return (
    <g>
      <rect className="iso-trunk" x={ox - 1.6 * s} y={oy - 9 * s} width={3.2 * s} height={9 * s} />
      <polygon className="iso-leaf2" points={cone(10 * s, 28 * s, 8 * s)} />
      <polygon className="iso-leaf" points={cone(8 * s, 40 * s, 22 * s)} />
    </g>
  );
}

/** a concrete pit full of liquid, with a few ripple lines (the wet well) */
export function Pit({ size = 150, tone = "m" }: { size?: number; tone?: Pal }) {
  const h = size / 2;
  const waves = [-0.55, -0.1, 0.35].map((k) => {
    const y = k * h;
    const a = pt(-h * 0.7, y, 10), b = pt(h * 0.7, y, 10);
    const m1 = pt(-h * 0.2, y - 6, 10), m2 = pt(h * 0.25, y + 6, 10);
    return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${m1[0].toFixed(1)} ${(m1[1] - 4).toFixed(1)} ${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)} T${b[0].toFixed(1)} ${b[1].toFixed(1)} M${m2[0].toFixed(1)} ${m2[1].toFixed(1)}`;
  });
  return (
    <g>
      <Box x={-h} y={-h} w={size} d={size} h={10} pal="g" />
      <Box x={-h + 5} y={-h + 5} z={8} w={size - 10} d={size - 10} h={3} pal={tone} />
      {waves.map((d, i) => <path key={i} className="iso-wave" d={d} />)}
    </g>
  );
}

/** a long concrete basin seen in 3D, filled with liquid; bubbles rise from the diffusers */
export function Basin({ x, y, w, d, h = 10, tone = "m", bubbles = 0, alarm = false, seed = 0 }: { x: number; y: number; w: number; d: number; h?: number; tone?: Pal; bubbles?: number; alarm?: boolean; seed?: number }) {
  return (
    <g className={alarm ? "iso-alarm" : ""}>
      <Box x={x} y={y} w={w} d={d} h={h} pal="g" />
      <Box x={x + 3} y={y + 3} z={h - 1} w={w - 6} d={d - 6} h={2.4} pal={tone} />
      {Array.from({ length: bubbles }, (_, i) => {
        const p = pt(x + 8 + ((w - 16) * i) / Math.max(1, bubbles - 1), y + d / 2 + (i % 2 ? 4 : -4), h + 1.4);
        return <circle key={i} className="iso-bub" cx={p[0]} cy={p[1]} r="1.7" style={{ ["--d" as string]: `${(((i * 5 + seed * 3) % 9) / 4).toFixed(2)}s` }} />;
      })}
    </g>
  );
}

/** a round clarifier: low concrete wall, liquid surface and a scraper arm that turns slowly */
export function Clar({ cx, cy, z = 0, r, tone = "m", delay = 0 }: { cx: number; cy: number; z?: number; r: number; tone?: Tone; delay?: number }) {
  const h = 10;
  const [ox, oy] = pt(cx, cy, z);
  const rx = r * 1.2247;
  return (
    <g>
      <Cyl cx={cx} cy={cy} z={z} r={r} h={h} pal="g" water wt={tone} />
      <g transform={`translate(${ox.toFixed(1)} ${(oy - h).toFixed(1)}) scale(1 0.5774)`}>
        <g className="iso-arm" style={{ animationDelay: `${-delay}s` }}><line x1={-rx * 0.85} x2={rx * 0.85} y1="0" y2="0" /></g>
      </g>
    </g>
  );
}

/** an egg-shaped digester: a tall body with a tapered cap and foot */
export function Egg({ cx, cy, z = 0, r = 18, h = 44 }: { cx: number; cy: number; z?: number; r?: number; h?: number }) {
  return (
    <g>
      <Cyl cx={cx} cy={cy} z={z} r={r * 0.55} h={8} pal="g" />
      <Cyl cx={cx} cy={cy} z={z + 8} r={r} h={h} pal="w" />
      <Cyl cx={cx} cy={cy} z={z + 8 + h} r={r * 0.6} h={9} pal="w" />
    </g>
  );
}

/** a gas holder: a drum with a domed lid */
export function GasHolder({ cx, cy, z = 0, r = 18, h = 26 }: { cx: number; cy: number; z?: number; r?: number; h?: number }) {
  return (
    <g>
      <Cyl cx={cx} cy={cy} z={z} r={r} h={h} pal="g" />
      <Cyl cx={cx} cy={cy} z={z + h} r={r * 0.82} h={9} pal="a" />
    </g>
  );
}

export function Group({ x, y, children, onClick, label, className = "" }: { x: number; y: number; children: ReactNode; onClick?: () => void; label?: string; className?: string }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      className={`iso-stage ${onClick ? "clickable" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      {children}
    </g>
  );
}
