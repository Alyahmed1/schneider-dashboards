import { Fragment, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useInView } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  Activity, ArrowDownRight, ArrowUpRight, Box, Check, Clock, Coins, Download, Droplets, Factory, Flag, FlaskConical,
  Gauge, Globe, List, Minus, Palette, Pause, Recycle, Search, Thermometer, Truck, Wrench, X, Zap,
} from "lucide-react";
import { fmt, type Kpi, type Tone } from "./data";

const ICONS: Record<string, typeof Zap> = {
  factory: Factory, zap: Zap, gauge: Gauge, droplets: Droplets, activity: Activity, coins: Coins, recycle: Recycle,
  thermo: Thermometer, flask: FlaskConical, check: Check, pause: Pause, flag: Flag, clock: Clock, wrench: Wrench,
  list: List, truck: Truck, box: Box, globe: Globe, palette: Palette,
};

const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Shared Recharts animation: charts draw in just after the page fade and re-animate when their data changes. */
export const chartAnim = { isAnimationActive: !reduceMotion, animationBegin: 200, animationDuration: 1100, animationEasing: "ease-out" } as const;

/** Fades an element up each time it scrolls into view, not only on first load. */
export const rise = (i = 0) => ({
  initial: reduceMotion ? false : { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: false, amount: 0.2 },
  transition: { duration: 0.45, delay: Math.min(i, 6) * 0.05, ease: [0.2, 0.8, 0.2, 1] as const },
});

/** Redraws its charts every time it scrolls back into view, so the draw-in animation can be watched again. */
export function Replay({ children, className, style, amount = 0.3 }: { children: ReactNode; className?: string; style?: CSSProperties; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount });
  const [n, setN] = useState(0);
  useEffect(() => { if (inView) setN((v) => v + 1); }, [inView]);
  return <div ref={ref} className={className} style={style}>{n > 0 && <Fragment key={n}>{children}</Fragment>}</div>;
}

/** Counts from the previous value to the next one, so first load and live refreshes both animate. */
export function CountUp({ value, dp = 0 }: { value: number; dp?: number }) {
  const [shown, setShown] = useState(0);
  const prev = useRef(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.6 });
  useEffect(() => {
    if (!inView) { prev.current = 0; return; } // counts up from zero again on the next entry
    if (reduceMotion) { prev.current = value; setShown(value); return; }
    const c = animate(prev.current, value, { duration: 0.9, ease: [0.2, 0.8, 0.2, 1], onUpdate: (v) => { prev.current = v; setShown(v); } });
    return () => c.stop();
  }, [value, inView]);
  return <span ref={ref}>{fmt(shown, dp)}</span>;
}

export function Card({ title, sub, right, children, className = "", i = 0 }:
  { title?: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string; i?: number }) {
  return (
    <motion.section className={`card ${className}`} {...rise(i)}>
      {(title || right) && (
        <header className="card-head">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {sub && <p className="card-sub">{sub}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </motion.section>
  );
}

export function KpiCard({ k, i = 0 }: { k: Kpi; i?: number }) {
  const Icon = ICONS[k.icon] ?? Activity;
  const valRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = valRef.current; if (!el) return;
    el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick");
  }, [Math.round(k.num * 10 ** k.dp)]); // eslint-disable-line react-hooks/exhaustive-deps
  const dir = Math.abs(k.delta) < 0.3 ? "flat" : k.delta > 0 ? "up" : "down";
  const cls = dir === "flat" ? "flat" : dir === (k.good ?? "up") ? "up" : "down"; // green when the move is favourable
  const Arrow = dir === "flat" ? Minus : dir === "up" ? ArrowUpRight : ArrowDownRight;
  const gid = `sp-${k.id}-${useId().replace(/:/g, "")}`;
  const sparkData = useMemo(() => k.spark.map((v, n) => ({ n, v })), [k.spark]);
  return (
    <motion.div className="card kpi" {...rise(i)}>
      <div className="kpi-top">
        <span>{k.label}</span>
        <span className="kpi-icon" style={{ color: k.color }}><Icon size={16} /></span>
      </div>
      <div className="kpi-val" ref={valRef}><CountUp value={k.num} dp={k.dp} /><small>{k.unit}</small></div>
      <div className="kpi-foot">
        <div>
          <span className={`delta ${cls}`}><Arrow size={13} />{Math.abs(k.delta).toFixed(1)}%</span>
          <div className="kpi-note">{k.note}</div>
        </div>
        <Replay className="spark" amount={0.5}>
          <ResponsiveContainer>
            <AreaChart data={sparkData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={k.color} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={k.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area dataKey="v" type="monotone" stroke={k.color} strokeWidth={1.7} fill={`url(#${gid})`} {...chartAnim} animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </Replay>
      </div>
    </motion.div>
  );
}

export const Chip = ({ tone, children }: { tone: Tone; children: ReactNode }) => <span className={`chip ${tone}`}>{children}</span>;

export function Segmented<T extends string>({ value, options, onChange, label }:
  { value: T; options: readonly T[]; onChange: (v: T) => void; label?: string }) {
  const id = useId();
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o} className={o === value ? "on" : ""} onClick={() => onChange(o)} role="tab" aria-selected={o === value}>
          {o === value && <motion.i layoutId={id} className="seg-pill" transition={{ type: "spring", stiffness: 520, damping: 38 }} />}
          <span>{o}</span>
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="search">
      <Search size={14} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

export function Select<T extends string>({ value, options, onChange, label }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: string }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

export function Bar({ pct, color }: { pct: number; color: string }) {
  const w = `${Math.min(100, Math.max(0, pct))}%`;
  if (reduceMotion) return <div className="bar"><i style={{ width: w, background: color }} /></div>;
  return (
    <div className="bar">
      <motion.i initial={{ width: 0 }} whileInView={{ width: w }} viewport={{ once: false, amount: 0.6 }} transition={{ duration: 0.9, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }} style={{ background: color }} />
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return <div className="legend">{items.map((x) => <span key={x.name}><i style={{ background: x.color }} />{x.name}</span>)}</div>;
}

/** Keeps the last non-null value so a closing pop-up can finish its exit animation with its content intact. */
export function useLast<T>(v: T | null): T | null {
  const ref = useRef<T | null>(v);
  if (v !== null) ref.current = v;
  return ref.current;
}

export type ModalTone = "yellow" | "navy" | "orange" | "green";
export interface DetailProps {
  open: boolean; onClose: () => void; tone?: ModalTone; eyebrow: string; title: string; big?: ReactNode; bigNote?: string;
  steps?: { labels: string[]; current: number }; rows: [string, ReactNode][]; actions?: ReactNode;
}

/** Large detail card over a blurred page, closed with the X button, Esc, or a click outside. */
export function Detail({ open, onClose, tone = "yellow", eyebrow, title, big, bigNote, steps, rows, actions }: DetailProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [open, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose}>
          <motion.div className={`modal ${tone}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}>
            <button ref={closeRef} className="modal-x" onClick={onClose} aria-label="Close"><X size={16} /></button>
            <div className="modal-eyebrow">{eyebrow}</div>
            <h3>{title}</h3>
            {big !== undefined && <div className="modal-big">{big}{bigNote && <small>{bigNote}</small>}</div>}
            {steps && (
              <div>
                <div className="m-steps">{steps.labels.map((l, i) => <i key={l} className={i <= steps.current ? "on" : ""} />)}</div>
                <div className="m-step-labels">{steps.labels.map((l) => <span key={l}>{l}</span>)}</div>
              </div>
            )}
            <div className="m-rows">{rows.map(([k, v]) => <div key={k} className="m-row"><span>{k}</span><b>{v}</b></div>)}</div>
            <div className="m-actions">{actions}<button className="mbtn ghost" onClick={onClose}>Close</button></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export const axis = { stroke: "var(--dim)", fontSize: 11, tickLine: false, axisLine: false } as const;
export const grid = { stroke: "var(--line)", strokeDasharray: "3 4", vertical: false } as const;

export function Tip({ active, payload, label, unit = "" }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      {label && <div className="tip-label">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="tip-row">
          <i style={{ background: p.color }} />
          <span>{p.name}</span>
          <b>{p.value.toLocaleString()}{unit}</b>
        </div>
      ))}
    </div>
  );
}

export type CsvSection = { title: string; rows: Record<string, string | number>[] };
export function downloadCsv(name: string, sections: CsvSection[]) {
  const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines: string[] = [];
  for (const sec of sections) {
    if (!sec.rows.length) continue;
    if (lines.length) lines.push("");
    lines.push(esc(sec.title));
    const cols = Object.keys(sec.rows[0]);
    lines.push(cols.map(esc).join(","));
    for (const r of sec.rows) lines.push(cols.map((c) => esc(r[c])).join(","));
  }
  const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export function ExportButton({ onClick, label = "Export CSV" }: { onClick: () => void; label?: string }) {
  return <button className="btn" onClick={onClick}><Download size={14} />{label}</button>;
}

/** State that survives page changes and reloads. */
export function usePersisted<T>(key: string, init: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => { try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : init; } catch { return init; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } }, [key, v]);
  return [v, setV];
}
