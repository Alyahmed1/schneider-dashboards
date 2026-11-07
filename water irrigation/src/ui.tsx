import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { animate, useInView, useMotionValue } from "framer-motion";
import { fmt } from "./farm";

/** a number that counts up when it scrolls into view and glides to each new live value */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { amount: 0.2 });
  const mv = useMotionValue(0);
  const first = useRef(true);
  // the text is written straight into the element, so a counting number never re-renders React
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.textContent = fmt(mv.get(), decimals);
    return mv.on("change", (v) => { if (el) el.textContent = fmt(v, decimals); });
  }, [mv, decimals]);
  useEffect(() => {
    if (!seen) { mv.jump(0); first.current = true; return; }
    const c = animate(mv, value, { duration: first.current ? 1.2 : 1.6, ease: [0.22, 1, 0.36, 1] });
    first.current = false;
    return () => c.stop();
  }, [seen, value, mv]);
  return <span ref={ref} className="num" />;
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o} role="tab" aria-selected={o === value} className={o === value ? "on" : ""} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

/** a titled box that rises in when the tab opens */
export function Panel({ title, className = "", i = 0, right, icon: Icon, children }: { title: string; className?: string; i?: number; right?: ReactNode; icon?: LucideIcon; children: ReactNode }) {
  const h = <h3>{Icon && <Icon className="sym" size={16} aria-hidden />}{title}</h3>;
  return (
    <section className={`pn ${className}`} style={{ ["--i" as string]: i }}>
      {right ? <div className="pn-h">{h}{right}</div> : h}
      {children}
    </section>
  );
}

export const niceMax = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1e-9)));
  const n = v / p;
  return p * (n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 8 ? 8 : 10);
};
export const tick = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${+v.toFixed(1)}`);

/** bars with the value on top and a left scale; they grow from empty when `grow` turns true */
export function Bars({ labels, values, unit, grow, color, max: fixed }: { labels: string[]; values: number[]; unit: string; grow: boolean; color?: string; max?: number }) {
  const max = fixed ?? niceMax(Math.max(...values) * 1.1);
  return (
    <div className="bars">
      <div className="bars-y">{[1, 0.75, 0.5, 0.25, 0].map((f) => <span key={f}>{tick(max * f)}{f === 1 ? ` ${unit}` : ""}</span>)}</div>
      <div className="bars-cols">
        {values.map((v, i) => (
          <div key={i} className="bars-col">
            <b>{tick(v)}</b>
            <div className="bars-track"><i style={{ height: `${grow ? Math.max(2, (v / max) * 100) : 2}%`, transitionDelay: `${i * 90}ms`, background: color }} /></div>
            <span>{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** a round gauge: the arc grows to value/max, the number sits in the middle */
export function Ring({ value, max, unit, decimals = 0, grow, color = "var(--water)" }: { value: number; max: number; unit: string; decimals?: number; grow: boolean; color?: string }) {
  const C = 2 * Math.PI * 40;
  return (
    <div className="ring">
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="40" className="ring-bg" />
        <circle cx="50" cy="50" r="40" className="ring-fg" style={{ stroke: color, strokeDasharray: `${grow ? Math.min(1, value / max) * C : 0} ${C}` }} transform="rotate(-90 50 50)" />
      </svg>
      <div><b><CountUp value={value} decimals={decimals} /></b><span>{unit}</span></div>
    </div>
  );
}

const PIE = ["#3db8ff", "#4cc97a", "#e0b64a", "#9a8fd0", "#8fa9b3"];

export function Pie({ items }: { items: { name: string; value: number }[] }) {
  const total = items.reduce((s, x) => s + x.value, 0);
  let a0 = -Math.PI / 2;
  return (
    <div className="pie">
      <svg viewBox="0 0 100 100" aria-hidden>
        {items.map((x, i) => {
          const a1 = a0 + (x.value / total) * Math.PI * 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const d = `M50 50 L${(50 + 48 * Math.cos(a0)).toFixed(2)} ${(50 + 48 * Math.sin(a0)).toFixed(2)} A48 48 0 ${large} 1 ${(50 + 48 * Math.cos(a1)).toFixed(2)} ${(50 + 48 * Math.sin(a1)).toFixed(2)}Z`;
          a0 = a1;
          return <path key={x.name} d={d} fill={PIE[i % PIE.length]} stroke="var(--card)" strokeWidth="1" />;
        })}
      </svg>
      <ul>
        {items.map((x, i) => <li key={x.name}><i style={{ background: PIE[i % PIE.length] }} /><span>{x.name}</span><b>{Math.round((x.value / total) * 100)}%</b></li>)}
      </ul>
    </div>
  );
}


interface TipProps { active?: boolean; label?: string | number; payload?: { name?: string; value?: number; color?: string }[]; unit?: string }
export function Tip({ active, label, payload, unit = "" }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      <div className="tip-t">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="tip-r"><i style={{ background: p.color }} />{p.name}<b>{Math.round(p.value ?? 0).toLocaleString("en-US")} {unit}</b></div>
      ))}
    </div>
  );
}
