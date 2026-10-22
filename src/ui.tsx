import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { animate, motion, useInView, useMotionValue } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { fmt, type Kpi, type Tone } from "./data";

export const C = {
  teal: "#0e8f8a", aqua: "#2bc4c0", blue: "#1f6fd1", ink: "#0b2a33", muted: "#6b8089",
  line: "#e3ded2", good: "#1fa971", warn: "#f08a24", bad: "#e2495a", sun: "#f0b429",
};
export const TONE_COLOR: Record<Tone, string> = { good: C.good, warn: C.warn, bad: C.bad, info: C.blue };

/** fades + lifts an element every time it scrolls into view (up or down) */
export const rise = (i = 0) => ({
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: false, amount: 0.12 },
  transition: { duration: 0.55, delay: Math.min(i, 6) * 0.06, ease: [0.22, 1, 0.36, 1] as const },
});

/** one timing for items that pop in one after another (labels, boxes): starts at 0.15 s, 0.03 s apart, ending by about 0.75 s */
export const popDelay = (n: number) => 0.15 + Math.min(n * 0.03, 0.6);

/** number that counts up when it scrolls into view and glides to each new live value */
export function useCount(value: number, decimals = 0, ref?: RefObject<Element | null>) {
  const local = useRef<Element>(null);
  const seen = useInView(ref ?? local, { amount: 0.2 });
  const active = ref ? seen : true;
  const mv = useMotionValue(0);
  const [txt, setTxt] = useState(() => fmt(0, decimals));
  const first = useRef(true);
  useEffect(() => mv.on("change", (v) => setTxt(fmt(v, decimals))), [mv, decimals]);
  useEffect(() => {
    if (!active) { mv.jump(0); first.current = true; return; }
    const c = animate(mv, value, { duration: first.current ? 1.2 : 1.6, ease: [0.22, 1, 0.36, 1] });
    first.current = false;
    return () => c.stop();
  }, [active, value, mv]);
  return txt;
}
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { amount: 0.2 });
  const mv = useMotionValue(0);
  const first = useRef(true);
  // the text is written directly into the element, so a counting number never re-renders React
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
/** number-looking text ("45.2", "38,000") becomes a live count-up, anything else stays text */
export function LiveText({ value, wob = 1 }: { value: string; wob?: number }) {
  const clean = value.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(clean)) return <>{value}</>;
  const dec = clean.includes(".") ? clean.split(".")[1].length : 0;
  return <CountUp value={+clean * wob} decimals={dec} />;
}

/** charts replay their draw animation each time the block scrolls back into view */
export function Replay({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { amount: 0.2 });
  const [n, setN] = useState(0);
  const was = useRef(false);
  useEffect(() => { if (seen && !was.current) setN((x) => x + 1); was.current = seen; }, [seen]);
  return <div ref={ref} className={className} style={style}>{n > 0 && <Fragment key={n}>{children}</Fragment>}</div>;
}

export function Card({ title, sub, right, children, i = 0, className = "", style }: { title?: string; sub?: string; right?: ReactNode; children: ReactNode; i?: number; className?: string; style?: CSSProperties }) {
  return (
    <motion.section className={`card ${className}`} style={style} {...rise(i)}>
      {(title || right) && (
        <header className="card-h">
          <div>
            {title && <h3>{title}</h3>}
            {sub && <p>{sub}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </motion.section>
  );
}

export function Chip({ tone = "info", children }: { tone?: Tone | "mute"; children: ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
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

export function KpiCard({ k, i, hero }: { k: Kpi; i: number; hero?: boolean }) {
  const good = k.goodWhenDown ? k.delta <= 0 : k.delta >= 0;
  const Arrow = k.delta >= 0 ? ArrowUpRight : ArrowDownRight;
  const stroke = hero ? "#ffffff" : good ? C.teal : C.warn;
  return (
    <motion.div className={`kpi ${hero ? "kpi-hero" : ""}`} {...rise(i)}>
      <div className="kpi-top">
        <span className="kpi-label">{k.label}</span>
        <span className={`delta ${good ? "up" : "down"}`}><Arrow size={13} /><CountUp value={Math.abs(k.delta)} decimals={1} />%</span>
      </div>
      <div className="kpi-val"><b><CountUp value={k.value} decimals={k.decimals} />{k.suffix}</b><span>{k.unit}</span></div>
      <div className="kpi-note">{k.note}</div>
      <Replay className="kpi-spark">
        <ResponsiveContainer>
          <AreaChart data={k.spark.map((v, n) => ({ n, v }))} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={`sp-${k.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} fill={`url(#sp-${k.id})`} animationDuration={1100} />
          </AreaChart>
        </ResponsiveContainer>
      </Replay>
    </motion.div>
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

export const axis = { stroke: "#a9b6bb", fontSize: 11, tickLine: false, axisLine: false } as const;
export const gridProps = { stroke: "#ebe6da", strokeDasharray: "3 4", vertical: false } as const;

export function Legend({ items }: { items: { name: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="legend">
      {items.map((x) => (
        <span key={x.name}><i style={{ background: x.dashed ? "transparent" : x.color, borderTop: x.dashed ? `2px dashed ${x.color}` : undefined }} />{x.name}</span>
      ))}
    </div>
  );
}
