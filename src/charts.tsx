import type { ReactNode } from "react";

/** shared pieces of the dashboard panels: a titled box, nice axis numbers, and dark bars with a cyan fill */
export const niceMax = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1e-9)));
  const n = v / p;
  return p * (n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 8 ? 8 : 10);
};
export const tick = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${+v.toFixed(1)}`);

export function Panel({ title, className = "", i = 0, children }: { title: string; className?: string; i?: number; children: ReactNode }) {
  return <section className={`hm-p ${className}`} style={{ ["--i" as string]: i }}><h3>{title}</h3>{children}</section>;
}

/** dark bars with a cyan fill, the value on top and a left scale */
export function Bars({ labels, values, unit, grow, max: fixed, compact }: { labels: string[]; values: number[]; unit: string; grow: boolean; max?: number; compact?: boolean }) {
  const max = fixed ?? niceMax(Math.max(...values) * 1.1);
  return (
    <div className={`hm-bars ${compact ? "compact" : ""}`}>
      {!compact && <div className="hm-y">{[1, 0.75, 0.5, 0.25, 0].map((f) => <span key={f}>{tick(max * f)}{f === 1 ? ` ${unit}` : ""}</span>)}</div>}
      <div className="hm-cols">
        {values.map((v, i) => (
          <div key={i} className="hm-col">
            <b>{tick(v)}</b>
            <div className="hm-track"><i style={{ height: `${grow ? Math.max(2, (v / max) * 100) : 2}%`, transitionDelay: `${i * 90}ms` }} /></div>
            <span>{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
