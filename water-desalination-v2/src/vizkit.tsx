import type { ComponentType } from "react";

/** small drawing pieces for the summary tiles: an icon badge, a sparkline, mini bars, a ring and a meter.
 *  They take plain numbers, draw with the theme colours, and play one entrance animation (see viz.css). */
type Icon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
type Tone = "teal" | "good" | "warn" | "bad";

export function IconBadge({ icon: I, tone = "teal", size = 15 }: { icon: Icon; tone?: Tone; size?: number }) {
  return <span className={`vz-badge ${tone}`} aria-hidden><I size={size} strokeWidth={1.9} /></span>;
}

/** scale a series to 0..1 (1 = highest) with a little room at the top and bottom */
const norm = (d: number[]) => {
  const lo = Math.min(...d), hi = Math.max(...d), span = hi - lo || 1;
  return d.map((v) => 0.1 + 0.8 * ((v - lo) / span));
};

/** a smooth line, optionally filled underneath, optionally with a dot on every point */
export function Spark({ data, fill = true, dots = false }: { data: number[]; fill?: boolean; dots?: boolean }) {
  if (data.length < 2) return null;
  const n = norm(data);
  const pts = n.map((v, i) => [(i / (n.length - 1)) * 100, (1 - v) * 100] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const id = `vzg${data.length}${Math.round(data[0] * 100)}`;
  return (
    <div className="vz-spark">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--teal)" stopOpacity=".45" />
            <stop offset="1" stopColor="var(--teal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {fill && <path className="vz-area" d={`${line} L100 100 L0 100Z`} fill={`url(#${id})`} />}
        <path className="vz-line" d={line} pathLength={1} fill="none" stroke="var(--teal)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {dots && pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1).map(([x, y], i) => <i key={i} className="vz-dot" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${500 + i * 60}ms` }} />)}
    </div>
  );
}

/** thin bars, the last one brighter */
export function MiniBars({ data }: { data: number[] }) {
  const n = norm(data);
  return (
    <div className="vz-bars" aria-hidden>
      {n.map((v, i) => <i key={i} className={i === n.length - 1 ? "last" : ""} style={{ height: `${Math.max(12, v * 100)}%`, animationDelay: `${300 + i * 35}ms` }} />)}
    </div>
  );
}

/** a ring with its number in the middle */
export function MiniRing({ frac, label, tone = "teal" }: { frac: number; label: string; tone?: Tone }) {
  const c = 2 * Math.PI * 40;
  return (
    <div className="vz-ring">
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle className="bg" cx="50" cy="50" r="40" />
        <circle className={`fg ${tone}`} cx="50" cy="50" r="40" strokeDasharray={`${c * Math.max(0.02, Math.min(1, frac))} ${c}`} transform="rotate(-90 50 50)" />
      </svg>
      <b>{label}</b>
    </div>
  );
}

/** a filled bar with its number on the right */
export function Meter({ frac, label, tone = "teal" }: { frac: number; label: string; tone?: Tone }) {
  return (
    <div className="vz-meter">
      <div className="track"><i className={tone} style={{ width: `${Math.max(2, Math.min(1, frac) * 100)}%` }} /></div>
      <small>{label}</small>
    </div>
  );
}

/** one bar split into parts, each with a class from viz.css */
export function Segments({ parts }: { parts: { v: number; tone: "teal" | "ink" | "bad" | "warn" }[] }) {
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  return (
    <div className="vz-seg" aria-hidden>
      {parts.filter((p) => p.v > 0).map((p, i) => <i key={i} className={p.tone} style={{ flex: p.v / total, animationDelay: `${300 + i * 120}ms` }} />)}
    </div>
  );
}
