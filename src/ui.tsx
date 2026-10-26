import { useEffect, useRef, useState, type ReactNode } from "react";

export const REDUCE = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** false for a moment after a tab opens, then true: bars and rings start empty and grow to their value */
export function useGrow(delay = 300) {
  const [on, setOn] = useState(REDUCE);
  useEffect(() => {
    if (REDUCE) return;
    const id = window.setTimeout(() => setOn(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);
  return on;
}

export const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

/** a number that counts up from 0 when it first appears, then glides to each new value */
export function CountUp({ value, decimals = 0, suffix = "", ms = 1100 }: { value: number; decimals?: number; suffix?: string; ms?: number }) {
  const [shown, setShown] = useState(REDUCE ? value : 0);
  const from = useRef(REDUCE ? value : 0);
  useEffect(() => {
    if (REDUCE) { setShown(value); return; }
    const a = from.current, b = value, t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      const v = a + (b - a) * e;
      from.current = v; setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <>{fmt(shown, decimals)}{suffix}</>;
}

export function Panel({ title, aside, children, className = "", i = 0 }: { title: string; aside?: ReactNode; children: ReactNode; className?: string; i?: number }) {
  return (
    <section className={`panel ${className}`} style={{ ["--i" as string]: i }}>
      <header className="panel-h"><h2>{title}</h2>{aside}</header>
      {children}
    </section>
  );
}
