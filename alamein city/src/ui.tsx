import { useEffect, useRef, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LucideIcon } from "lucide-react";

export const REDUCE = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
export const compact = (n: number) => (n >= 1e6 ? `${fmt(n / 1e6, 1)}M` : n >= 1e4 ? `${fmt(n / 1e3, 1)}k` : fmt(n));

/** a number that counts up from 0 when it first appears, then glides to each new value */
export function CountUp({ value, decimals = 0, suffix = "", ms = 1000 }: { value: number; decimals?: number; suffix?: string; ms?: number }) {
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
      <header className="panel-h"><h2>{title}</h2>{aside && <div className="panel-aside">{aside}</div>}</header>
      <div className="panel-b">{children}</div>
    </section>
  );
}

export type Tone = "accent" | "good" | "warn" | "bad" | "info" | "violet";
export function Kpi({ label, value, decimals = 0, suffix = "", sub, icon: Icon, tone = "accent", spark, n = 0, onClick }:
  { label: string; value: number; decimals?: number; suffix?: string; sub?: string; icon: LucideIcon; tone?: Tone; spark?: number[]; n?: number; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`kpi tone-${tone}`} style={{ ["--n" as string]: n }} onClick={onClick}>
      <span className="kpi-l"><Icon size={14} />{label}</span>
      <b className="kpi-v"><CountUp value={value} decimals={decimals} suffix={suffix} /></b>
      {sub && <em className="kpi-s">{sub}</em>}
      {spark && <Spark data={spark} />}
    </Tag>
  );
}

export function Spark({ data }: { data: number[] }) {
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / span) * 24}`);
  return (
    <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
      <polyline className="spark-area" points={`0,30 ${pts.join(" ")} 100,30`} />
      <polyline className="spark-ln" points={pts.join(" ")} pathLength={1} />
    </svg>
  );
}

export const KpiRow = ({ children, cols }: { children: ReactNode; cols?: number }) => <div className="kpis" style={cols ? { ["--cols" as string]: cols } : undefined}>{children}</div>;

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => <button key={o.id} className={o.id === value ? "on" : ""} onClick={() => onChange(o.id)} aria-pressed={o.id === value}>{o.label}</button>)}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: "good" | "warn" | "bad" | "info" | "muted"; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

/* ---------------- charts ---------------- */
const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, color: "var(--ink)", boxShadow: "var(--shadow)" }, labelStyle: { color: "var(--muted)" }, itemStyle: { color: "var(--ink)" } };
const axis = { stroke: "var(--muted)", fontSize: 10.5, tickLine: false, axisLine: false } as const;

export const ChartBox = ({ children }: { children: ReactNode }) => <div className="chart"><ResponsiveContainer width="100%" height="100%">{children as React.ReactElement}</ResponsiveContainer></div>;

export function TimeChart({ rows, keys, unit = "", domain, kind = "area", legend = false }:
  { rows: Record<string, number | string>[]; keys: { k: string; color: string; dash?: boolean }[]; unit?: string; domain?: [number | string, number | string]; kind?: "area" | "line"; legend?: boolean }) {
  const interval = rows.length > 12 ? Math.floor(rows.length / 6) : 0;
  return (
    <ChartBox>
      {kind === "area" ? (
        <AreaChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <defs>{keys.map((k) => <linearGradient key={k.k} id={`g-${k.k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={k.color} stopOpacity={0.35} /><stop offset="100%" stopColor={k.color} stopOpacity={0.02} /></linearGradient>)}</defs>
          <CartesianGrid stroke="var(--line-2)" vertical={false} />
          <XAxis dataKey="t" {...axis} interval={interval} />
          <YAxis {...axis} domain={domain ?? ["auto", "auto"]} width={50} tickFormatter={(v) => compact(Number(v))} />
          <Tooltip {...tip} formatter={(v) => `${fmt(Number(v), Number(v) < 20 ? 1 : 0)}${unit}`} />
          {legend && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: "var(--ink)" }}>{v}</span>} />}
          {keys.map((k) => <Area key={k.k} type="monotone" dataKey={k.k} stroke={k.color} strokeWidth={2} strokeDasharray={k.dash ? "4 4" : undefined} fill={k.dash ? "none" : `url(#g-${k.k})`} dot={false} isAnimationActive={false} />)}
        </AreaChart>
      ) : (
        <LineChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line-2)" vertical={false} />
          <XAxis dataKey="t" {...axis} interval={interval} />
          <YAxis {...axis} domain={domain ?? ["auto", "auto"]} width={50} tickFormatter={(v) => compact(Number(v))} />
          <Tooltip {...tip} formatter={(v) => `${fmt(Number(v), Number(v) < 20 ? 1 : 0)}${unit}`} />
          {keys.map((k) => <Line key={k.k} type="monotone" dataKey={k.k} stroke={k.color} strokeWidth={2} dot={false} isAnimationActive={false} />)}
        </LineChart>
      )}
    </ChartBox>
  );
}

export function Bars({ data, color = "var(--accent)", unit = "", vertical = false, colors }: { data: { name: string; v: number }[]; color?: string; unit?: string; vertical?: boolean; colors?: string[] }) {
  return (
    <ChartBox>
      <BarChart data={data} layout={vertical ? "vertical" : "horizontal"} margin={{ top: 6, right: 8, left: vertical ? 0 : -14, bottom: 0 }}>
        <CartesianGrid stroke="var(--line-2)" horizontal={!vertical} vertical={vertical} />
        <XAxis type={vertical ? "number" : "category"} dataKey={vertical ? undefined : "name"} {...axis} tickFormatter={vertical ? (v) => compact(Number(v)) : undefined} />
        <YAxis type={vertical ? "category" : "number"} dataKey={vertical ? "name" : undefined} {...axis} width={vertical ? 100 : 50} interval={0} tickFormatter={vertical ? undefined : (v) => compact(Number(v))} />
        <Tooltip {...tip} cursor={{ fill: "var(--hover)" }} formatter={(v) => `${fmt(Number(v), Number(v) < 20 ? 1 : 0)}${unit}`} />
        <Bar dataKey="v" radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((_, i) => <Cell key={i} fill={colors ? colors[i % colors.length] : color} />)}
        </Bar>
      </BarChart>
    </ChartBox>
  );
}

export function Donut({ data, center, sub }: { data: { name: string; v: number; color: string }[]; center: string; sub: string }) {
  return (
    <div className="donut">
      <div className="donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="v" nameKey="name" innerRadius="66%" outerRadius="94%" paddingAngle={2} stroke="none" isAnimationActive={false}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip {...tip} formatter={(v) => fmt(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-c"><b>{center}</b><span>{sub}</span></div>
      </div>
      <ul className="legend">{data.map((d) => <li key={d.name}><i style={{ background: d.color }} />{d.name}<b>{fmt(d.v)}</b></li>)}</ul>
    </div>
  );
}

/** a horizontal gauge with a label and a value */
export function Meter({ label, value, max = 100, unit = "%", decimals = 0, tone = "accent", note }: { label: string; value: number; max?: number; unit?: string; decimals?: number; tone?: Tone; note?: string }) {
  return (
    <div className="meter">
      <div className="meter-t"><span>{label}</span><b>{fmt(value, decimals)}{unit}</b></div>
      <div className="meter-bar"><i className={`tone-${tone}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
      {note && <small>{note}</small>}
    </div>
  );
}

export const Stat = ({ label, value, tone }: { label: string; value: string; tone?: Tone }) => <div className={`stat ${tone ? `tone-${tone}` : ""}`}><b>{value}</b><span>{label}</span></div>;
