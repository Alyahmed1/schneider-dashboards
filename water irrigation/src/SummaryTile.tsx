import { useId } from "react";
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { CountUp } from "./ui";

export type TileKind = "spark" | "line" | "bars" | "ring" | "bar";

export interface SumTileData {
  id: string;
  label: string;
  icon: LucideIcon;
  value: number;
  decimals?: number;
  unit?: string;
  kind: TileKind;
  /** points for spark, line and bars */
  series?: number[];
  /** 0 to 100, for ring and bar */
  pct?: number;
  /** change since before; leave it out to show no arrow */
  delta?: number;
  goodWhenDown?: boolean;
  onClick?: () => void;
  hint?: string;
}

const W = 100, H = 40;
const scale = (v: number[]) => {
  const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1;
  return v.map((n, i) => [(i / Math.max(1, v.length - 1)) * W, H - 4 - ((n - lo) / span) * (H - 8)] as const);
};

function Chart({ d, gid }: { d: SumTileData; gid: string }) {
  if (d.kind === "ring") {
    const p = Math.max(0, Math.min(100, d.pct ?? d.value)), C = 2 * Math.PI * 40;
    return (
      <div className="sumt-chart ring">
        <div className="sumt-ringbox">
          <svg viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="40" className="sumt-ring-bg" />
            <circle cx="50" cy="50" r="40" className="sumt-ring-fg" strokeDasharray={`${(p / 100) * C} ${C}`} transform="rotate(-90 50 50)" />
          </svg>
          <b>{p.toFixed(1)}%</b>
        </div>
      </div>
    );
  }
  if (d.kind === "bar") {
    const p = Math.max(0, Math.min(100, d.pct ?? d.value));
    return (
      <div className="sumt-chart bar">
        <div className="sumt-track"><i style={{ width: `${p}%` }} /></div>
        <b>{Math.round(p * 10) / 10}%</b>
      </div>
    );
  }
  const s = d.series && d.series.length > 1 ? d.series : [0, 0];
  if (d.kind === "bars") {
    const hi = Math.max(...s, 1e-9), w = W / s.length;
    return (
      <div className="sumt-chart">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
          {s.map((n, i) => { const h = Math.max(1.5, (n / hi) * (H - 2)); return <rect key={i} x={i * w + w * 0.15} y={H - h} width={w * 0.7} height={h} className="sumt-bar" />; })}
        </svg>
      </div>
    );
  }
  const pts = scale(s);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <div className="sumt-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        {d.kind === "spark" && (
          <>
            <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--teal)" stopOpacity=".55" /><stop offset="1" stopColor="var(--teal)" stopOpacity="0" /></linearGradient></defs>
            <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={`url(#${gid})`} />
          </>
        )}
        <path d={line} className="sumt-line" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/** one Summary tile: icon, name, a big live number with its arrow, and a small chart under it */
export default function SummaryTile({ d, n }: { d: SumTileData; n: number }) {
  const gid = useId();
  const Icon = d.icon;
  const hasDelta = d.delta !== undefined && Math.abs(d.delta) > 1e-9;
  const good = d.goodWhenDown ? (d.delta ?? 0) <= 0 : (d.delta ?? 0) >= 0;
  const Arrow = (d.delta ?? 0) >= 0 ? ArrowUp : ArrowDown;
  const body = (
    <>
      <div className="sumt-top"><Icon size={18} aria-hidden /><span>{d.label}</span></div>
      <div className="sumt-val">
        <b><CountUp value={d.value} decimals={d.decimals ?? 0} />{d.unit ? <small>{d.unit}</small> : null}</b>
        {hasDelta && <Arrow size={16} className={good ? "up" : "down"} aria-label={good ? "good" : "needs attention"} />}
      </div>
      <Chart d={d} gid={gid} />
    </>
  );
  const style = { ["--n" as string]: n };
  return d.onClick
    ? <button className="sum-tile" style={style} onClick={d.onClick} aria-label={d.hint ?? d.label}>{body}</button>
    : <div className="sum-tile" style={style}>{body}</div>;
}
